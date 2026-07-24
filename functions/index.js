const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const { Client, Environment, ApiError } = require('square');
const { evaluateDeals } = require('./deals-evaluator');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.parseReceipt = require("./parseReceipt").parseReceipt;

// CORS middleware
const corsHandler = cors({ origin: true });

const nodemailer = require('nodemailer');
const { generateCateringEmail } = require('./emailTemplate');

// ─────────────────────────────────────────────────────────────────
// Square client — initialized from Firebase environment config
// ─────────────────────────────────────────────────────────────────
function getSquareClient() {
  const config = functions.config().square || {};
  const accessToken = config.access_token || process.env.SQUARE_ACCESS_TOKEN;
  const env = config.env || process.env.SQUARE_ENV || 'sandbox';

  if (!accessToken) {
    throw new Error('Square access token not configured. Run: firebase functions:config:set square.access_token="YOUR_TOKEN"');
  }

  return new Client({
    accessToken,
    environment: env === 'production' ? Environment.Production : Environment.Sandbox,
  });
}

function getLocationId() {
  const config = functions.config().square || {};
  return config.location_id || process.env.SQUARE_LOCATION_ID;
}

// ─────────────────────────────────────────────────────────────────
// processSquarePayment
// Callable function: receives item IDs + quantities + card token + tipCents
// Fetches prices SERVER-SIDE from Firestore (browser cannot control amounts)
// Calculates tax server-side (10.25% LA County)
// Validates tip (max $100)
// Creates Square Order + Payment, then writes to Firestore
// ─────────────────────────────────────────────────────────────────
const TAX_RATE = 0.1025; // LA County / Reseda sales tax rate

exports.processSquarePayment = functions.https.onCall(async (data, context) => {
  const { sourceId, items, customerName, customerPhone, tipCents: rawTipCents, pickupType, pickupTime } = data;

  // ── Validate inputs ──
  if (!sourceId || typeof sourceId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid payment token (sourceId).');
  }
  if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'Items must be a non-empty array (max 50).');
  }
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Customer name is required.');
  }

  // ── Validate tip ──
  const tipCents = typeof rawTipCents === 'number' ? Math.floor(rawTipCents) : 0;
  if (tipCents < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Tip cannot be negative.');
  }
  if (tipCents > 10000) {
    throw new functions.https.HttpsError('invalid-argument', 'Tip cannot exceed $100.00.');
  }

  // ── Step 1: Fetch item prices from Firestore (server-side, tamper-proof) ──
  const resolvedItems = [];
  const menuItems = [];
  let subtotalCents = 0;

  for (const cartItem of items) {
    if (!cartItem.id || typeof cartItem.qty !== 'number' || cartItem.qty < 1 || cartItem.qty > 100) {
      throw new functions.https.HttpsError('invalid-argument', `Invalid item: ${JSON.stringify(cartItem)}`);
    }

    const menuDoc = await db.collection('menu').doc(cartItem.id).get();
    if (!menuDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Menu item not found: ${cartItem.id}`);
    }

    const menuData = menuDoc.data();
    const basePrice = typeof menuData.price === 'number' ? menuData.price : parseFloat(menuData.price);
    if (isNaN(basePrice) || basePrice <= 0) {
      throw new functions.https.HttpsError('internal', `Invalid price for item: ${menuData.name}`);
    }

    let finalPrice = basePrice;
    
    if (cartItem.selectedVariant && Array.isArray(menuData.variants)) {
      const v = menuData.variants.find(va => va.name === cartItem.selectedVariant);
      if (v) finalPrice = (parseFloat(v.price) || 0);
    }

    if (Array.isArray(cartItem.selectedAddOns) && Array.isArray(menuData.addOns)) {
      cartItem.selectedAddOns.forEach(addonName => {
        const a = menuData.addOns.find(ad => ad.name === addonName);
        if (a) finalPrice += (parseFloat(a.price) || 0);
      });
    }

    menuItems.push({ id: cartItem.id, ...menuData, price: finalPrice, originalPrice: basePrice });

    const itemTotalCents = Math.round(finalPrice * 100) * cartItem.qty;
    subtotalCents += itemTotalCents;

    let modsText = '';
    if (cartItem.selectedVariant) modsText += ` (${cartItem.selectedVariant})`;
    if (Array.isArray(cartItem.selectedAddOns) && cartItem.selectedAddOns.length > 0) modsText += ` [+${cartItem.selectedAddOns.join(', ')}]`;

    resolvedItems.push({
      name: menuData.name + modsText,
      quantity: cartItem.qty,
      price: finalPrice,
      totalCents: itemTotalCents,
    });
  }

  if (subtotalCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Order subtotal must be greater than zero.');
  }

  // ── Step 1.5: Evaluate Deals ──
  const dealsSnapshot = await db.collection('deals').where('active', '==', true).get();
  const activeDeals = dealsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const evalResult = evaluateDeals(items, activeDeals, menuItems);
  const discountCents = evalResult.discountCents;
  
  const discountedSubtotalCents = Math.max(0, subtotalCents - discountCents);

  // ── Step 2: Server-side tax calculation ──
  const taxCents = Math.round(discountedSubtotalCents * TAX_RATE);
  const totalCents = discountedSubtotalCents + taxCents + tipCents;

  // ── Step 5.5: Validate Pickup & Calculate Dynamic Wait Time ──
  const pickupConfigDoc = await db.collection('settings').doc('pickupConfig').get();
  const config = pickupConfigDoc.exists ? pickupConfigDoc.data() : {
    basePrepTimeMinutes: 15,
    perOrderIncrementMinutes: 3,
    maxWaitMinutes: 60,
    minLeadTimeMinutes: 20,
    maxScheduleDaysAhead: 3,
    slotIntervalMinutes: 15,
    prepBufferBeforeCloseMinutes: 30,
    businessHours: { open: "12:00", close: "22:30" }
  };

  const pType = pickupType === 'scheduled' ? 'scheduled' : 'asap';
  let requestedTime = null;
  let estimatedReadyTime;
  let releasedToKitchen = true;

  const now = new Date();
  
  if (pType === 'scheduled') {
    if (!pickupTime) {
      throw new functions.https.HttpsError('invalid-argument', 'Scheduled pickup requires a pickupTime.');
    }
    const requestedDate = new Date(pickupTime);
    if (isNaN(requestedDate.getTime())) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid pickupTime.');
    }
    
    // Relaxed server-side validation - allow any time in the future, or up to 15 mins in the past (if they took a while to checkout)
    if (requestedDate.getTime() < now.getTime() - 15 * 60000) {
      throw new functions.https.HttpsError('invalid-argument', 'Pickup time is in the past. Please select a later time.');
    }
    
    const maxDaysMs = config.maxScheduleDaysAhead * 24 * 60 * 60 * 1000;
    if (requestedDate.getTime() > now.getTime() + maxDaysMs + 24 * 60 * 60 * 1000) { // 1 day grace
      throw new functions.https.HttpsError('invalid-argument', 'Pickup time is too far in the future.');
    }
    
    requestedTime = admin.firestore.Timestamp.fromDate(requestedDate);
    estimatedReadyTime = requestedTime;
    releasedToKitchen = false;
  } else {
    // ASAP
    let activeAsapOrderCount = 0;
    try {
      const statsDoc = await db.collection('liveStats').doc('current').get();
      if (statsDoc.exists) {
        activeAsapOrderCount = statsDoc.data().activeAsapOrderCount || 0;
      }
    } catch (err) {
      console.error('Failed to get liveStats:', err);
    }
    
    const rawWait = config.basePrepTimeMinutes + (activeAsapOrderCount * config.perOrderIncrementMinutes) + (config.busyModeOffsetMinutes || 0);
    const waitTimeMinutes = Math.min(rawWait, config.maxWaitMinutes);
    estimatedReadyTime = admin.firestore.Timestamp.fromDate(new Date(now.getTime() + waitTimeMinutes * 60000));
    releasedToKitchen = true;
  }

  const pickupObj = {
    type: pType,
    requestedTime,
    estimatedReadyTime,
    releasedToKitchen
  };


    // ── Step 3: Create Square Order ──
  const squareClient = getSquareClient();
  const locationId = getLocationId();

  if (!locationId) {
    throw new functions.https.HttpsError('failed-precondition', 'Square location ID not configured.');
  }

  const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const paymentIdempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const squareLineItems = [];
  const unitGroups = {};
  for (const u of evalResult.units) {
    const key = `${u.itemId}_${u.discountCents}`;
    if (!unitGroups[key]) {
      unitGroups[key] = {
        name: u.name,
        priceCents: u.priceCents,
        discountCents: u.discountCents,
        quantity: 0
      };
    }
    unitGroups[key].quantity++;
  }

  for (const key in unitGroups) {
    const group = unitGroups[key];
    const itemName = group.discountCents > 0 ? `${group.name} (Discounted)` : group.name;
    squareLineItems.push({
      name: itemName,
      quantity: String(group.quantity),
      basePriceMoney: {
        amount: BigInt(group.priceCents),
        currency: 'USD',
      },
    });
  }

  let squareOrderId;
  try {
    const orderResponse = await squareClient.ordersApi.createOrder({
      order: {
        locationId,
        referenceId: idempotencyKey,
        lineItems: squareLineItems,
        taxes: [{
          name: 'Sales Tax',
          scope: 'ORDER',
          type: 'ADDITIVE',
          percentage: (TAX_RATE * 100).toFixed(2),
          appliedMoney: {
            amount: BigInt(taxCents),
            currency: 'USD',
          }
        }],
        metadata: {
          source: 'website',
          customerName: customerName.trim(),
          customerPhone: (customerPhone || '').trim(),
        },
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickupDetails: {
            recipient: {
              displayName: customerName.trim(),
              phoneNumber: (customerPhone || '').trim(),
            },
            scheduleType: 'ASAP'
          }
        }],
      },
      idempotencyKey,
    });

    squareOrderId = orderResponse.result.order.id;
  } catch (err) {
    console.error('Square Order creation failed:', err);
    if (err instanceof ApiError) {
      throw new functions.https.HttpsError('internal', `Square error: ${err.errors?.[0]?.detail || err.message}`);
    }
    throw new functions.https.HttpsError('internal', 'Failed to create order with Square.');
  }

  // ── Step 4: Process Square Payment ──
  let squarePaymentId;
  try {
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: paymentIdempotencyKey,
      amountMoney: {
        amount: BigInt(totalCents),
        currency: 'USD',
      },
      orderId: squareOrderId,
      locationId,
      note: `Bigi Awasaana Web Order - ${customerName.trim()}`,
      referenceId: squareOrderId,
    });

    squarePaymentId = paymentResponse.result.payment.id;
  } catch (err) {
    console.error('Square Payment failed:', err);
    if (err instanceof ApiError) {
      const detail = err.errors?.[0]?.detail || err.message;
      throw new functions.https.HttpsError('internal', `Payment failed: ${detail}`);
    }
    throw new functions.https.HttpsError('internal', 'Payment processing failed. Your card was not charged.');
  }

  // ── Step 5: Generate access token for order status page ──
  const accessToken = crypto.randomBytes(8).toString('hex');

  
  // ── Step 6: Write order to Firestore ──
  const orderDoc = {
    squareOrderId,
    squarePaymentId,
    accessToken,  // short random token for order status page privacy
    source: 'website',
    customerName: customerName.trim(),
    customerPhone: (customerPhone || '').trim(),
    items: resolvedItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    discountedSubtotal: discountedSubtotalCents / 100,
    tax: taxCents / 100,
    tip: tipCents / 100,
    total: totalCents / 100,
    subtotalCents,
    discountCents,
    discountedSubtotalCents,
    taxCents,
    tipCents,
    totalCents,
    status: pType === 'scheduled' ? 'scheduled' : 'pending', // Use a custom status or stick to pending. Let's use pending but it won't show if releasedToKitchen is false.
    pickup: pickupObj,
    estimatedReadyAt: estimatedReadyTime,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (pType === 'scheduled') {
     orderDoc.status = 'pending'; 
  }

  await db.collection('orders').doc(squareOrderId).set(orderDoc);

  return {
    success: true,
    orderId: squareOrderId,
    accessToken,
    subtotal: `$${(subtotalCents / 100).toFixed(2)}`,
    tax: `$${(taxCents / 100).toFixed(2)}`,
    tip: `$${(tipCents / 100).toFixed(2)}`,
    total: `$${(totalCents / 100).toFixed(2)}`,
    message: `Order confirmed! Your order #${squareOrderId.slice(-4).toUpperCase()} is being prepared.`,
  };
});


// ─────────────────────────────────────────────────────────────────
// syncSquareOrders
// HTTP function — called by the KDS every 30 seconds (polling)
// Fetches today's PAID orders from Square Orders API,
// parses source/channel, writes/updates Firestore
// Skips: unpaid draft orders (no tenders) and website orders (handled by processSquarePayment)
// ─────────────────────────────────────────────────────────────────
exports.syncSquareOrders = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const squareClient = getSquareClient();
      const locationId = getLocationId();

      if (!locationId) {
        return res.status(500).json({ error: 'Square location ID not configured.' });
      }

      // Get start of today (UTC)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const searchResponse = await squareClient.ordersApi.searchOrders({
        locationIds: [locationId],
        query: {
          filter: {
            dateTimeFilter: {
              createdAt: {
                startAt: startOfDay.toISOString(),
              },
            },
            stateFilter: {
              states: ['OPEN', 'COMPLETED'],
            },
          },
          sort: {
            sortField: 'CREATED_AT',
            sortOrder: 'DESC',
          },
        },
      });

      const orders = searchResponse.result.orders || [];
      const batch = db.batch();
      const syncedOrders = [];

      for (const order of orders) {
        const metadata = order.metadata || {};
        const sourceName = (order.source?.name || '').toLowerCase();

        // ── SKIP: Website orders (already written by processSquarePayment with full data) ──
        // Only skip orders explicitly tagged by our processSquarePayment function
        if (metadata.source === 'website') {
          continue;
        }

        // ── SKIP: Unpaid draft orders (Square creates a draft when card form initializes) ──
        // An order with no tenders has not been paid — don't show it on KDS yet
        // EXCEPTION: Third-party integrators may not attach tenders immediately.
        if (!order.tenders || order.tenders.length === 0) {
          const isThirdParty = sourceName.includes('doordash') || 
                               sourceName.includes('door dash') ||
                               sourceName.includes('uber') || 
                               sourceName.includes('ubereats') ||
                               sourceName.includes('grubhub') || 
                               sourceName.includes('grub hub') ||
                               sourceName.includes('square online') || 
                               sourceName.includes('online store') || 
                               sourceName.includes('online');

          if (!isThirdParty) {
            continue;
          }
        }

        // ── SKIP: Already completed orders in Firestore ──
        const existingDoc = await db.collection('orders').doc(order.id).get();
        if (existingDoc.exists && existingDoc.data().status === 'completed') {
          continue;
        }

        // Determine source
        let source = 'pos'; // default = Square POS
        if (sourceName.includes('doordash') || sourceName.includes('door dash')) {
          source = 'doordash';
        } else if (sourceName.includes('uber') || sourceName.includes('ubereats')) {
          source = 'ubereats';
        } else if (sourceName.includes('grubhub') || sourceName.includes('grub hub')) {
          source = 'grubhub';
        } else if (sourceName.includes('square online') || sourceName.includes('online store') || sourceName.includes('online')) {
          source = 'squareonline';
        }

        // Map Square order state to our status
        let status = 'pending';
        if (order.state === 'COMPLETED') {
          status = 'completed';
        } else if (order.fulfillments && order.fulfillments.length > 0) {
          const fulfillmentState = order.fulfillments[0].state;
          if (fulfillmentState === 'PROPOSED') status = 'pending';
          else if (fulfillmentState === 'RESERVED' || fulfillmentState === 'PREPARED') status = 'preparing';
          else if (fulfillmentState === 'COMPLETED') status = 'ready';
        }

        // Extract customer name
        let customerName = 'Guest';
        if (metadata.customerName) {
          customerName = metadata.customerName;
        } else if (order.fulfillments?.[0]?.pickupDetails?.recipient?.displayName) {
          customerName = order.fulfillments[0].pickupDetails.recipient.displayName;
        } else if (order.fulfillments?.[0]?.deliveryDetails?.recipient?.displayName) {
          customerName = order.fulfillments[0].deliveryDetails.recipient.displayName;
        }

        // Extract items
        const items = (order.lineItems || []).map(li => ({
          name: li.name || 'Unknown Item',
          quantity: parseInt(li.quantity || '1', 10),
          price: li.basePriceMoney ? Number(li.basePriceMoney.amount) / 100 : 0,
        }));

        // Total
        const totalCents = order.totalMoney ? Number(order.totalMoney.amount) : 0;

        const orderData = {
          squareOrderId: order.id,
          source,
          customerName,
          customerPhone: metadata.customerPhone || '',
          items,
          total: totalCents / 100,
          totalCents,
          status,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(order.createdAt)),
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Use squareOrderId as doc ID for natural dedup
        const docRef = db.collection('orders').doc(order.id);
        batch.set(docRef, orderData, { merge: true });

        syncedOrders.push({
          id: order.id,
          source,
          customerName,
          status,
          itemCount: items.length,
        });
      }

      await batch.commit();

      return res.json({
        success: true,
        synced: syncedOrders.length,
        orders: syncedOrders,
      });
    } catch (err) {
      console.error('syncSquareOrders error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
});


// ─────────────────────────────────────────────────────────────────
// handleSquareWebhook
// HTTP endpoint — register this URL in Square Developer Dashboard
// under Webhooks for real-time order updates
// Events: order.created, order.updated
// ─────────────────────────────────────────────────────────────────
exports.handleSquareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const event = req.body;

    if (!event || !event.type || !event.data) {
      return res.status(400).send('Invalid webhook payload');
    }

    const eventType = event.type;
    const orderData = event.data?.object?.order;

    if (!orderData || !orderData.id) {
      return res.status(200).send('No order data, ignoring.');
    }

    if (!eventType.startsWith('order.')) {
      return res.status(200).send('Not an order event, ignoring.');
    }

    const metadata = orderData.metadata || {};
    const sourceName = (orderData.source?.name || '').toLowerCase();

    // Skip website orders (only those explicitly tagged by processSquarePayment)
    if (metadata.source === 'website') {
      return res.status(200).send('Website order handled by processSquarePayment, ignoring.');
    }
    if (!orderData.tenders || orderData.tenders.length === 0) {
      return res.status(200).send('Unpaid draft order, ignoring.');
    }

    // Determine source
    let source = 'pos';
    if (sourceName.includes('doordash')) source = 'doordash';
    else if (sourceName.includes('uber')) source = 'ubereats';
    else if (sourceName.includes('grubhub')) source = 'grubhub';
    else if (sourceName.includes('square online') || sourceName.includes('online store') || sourceName.includes('online')) source = 'squareonline';

    // Map state
    let status = 'pending';
    if (orderData.state === 'COMPLETED') {
      status = 'completed';
    } else if (orderData.fulfillments?.length > 0) {
      const fState = orderData.fulfillments[0].state;
      if (fState === 'RESERVED' || fState === 'PREPARED') status = 'preparing';
      else if (fState === 'COMPLETED') status = 'ready';
    }

    // Customer name
    let customerName = metadata.customerName || 'Guest';
    if (customerName === 'Guest') {
      const fulfillment = orderData.fulfillments?.[0];
      customerName = fulfillment?.pickupDetails?.recipient?.displayName
        || fulfillment?.deliveryDetails?.recipient?.displayName
        || 'Guest';
    }

    // Items
    const items = (orderData.lineItems || []).map(li => ({
      name: li.name || 'Unknown Item',
      quantity: parseInt(li.quantity || '1', 10),
      price: li.basePriceMoney ? Number(li.basePriceMoney.amount) / 100 : 0,
    }));

    const totalCents = orderData.totalMoney ? Number(orderData.totalMoney.amount) : 0;

    const firestoreData = {
      squareOrderId: orderData.id,
      source,
      customerName,
      customerPhone: metadata.customerPhone || '',
      items,
      total: totalCents / 100,
      totalCents,
      status,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(orderData.createdAt)),
      webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('orders').doc(orderData.id).set(firestoreData, { merge: true });

    console.log(`Webhook processed: ${eventType} for order ${orderData.id} (source: ${source})`);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Internal error');
  }
});


// ─────────────────────────────────────────────────────────────────
// updateSquareOrderStatus
// Callable function — used by KDS to change order status & sync to Square
// ─────────────────────────────────────────────────────────────────
exports.updateSquareOrderStatus = functions.https.onCall(async (data, context) => {
  // Security Check: Only admins can update Square order status
  if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update Square orders.');
  }

  const { orderId, status } = data;

  if (!orderId || typeof orderId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');
  }

  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'canceled'];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const docRef = db.collection('orders').doc(orderId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found.');
  }

  const orderData = doc.data();

  // Determine Square fulfillment state
  let squareState = '';
  if (status === 'preparing') squareState = 'RESERVED';
  else if (status === 'ready') squareState = 'PREPARED';
  else if (status === 'completed') squareState = 'COMPLETED';
  else if (status === 'canceled') squareState = 'CANCELED';

  if (squareState && orderData.squareOrderId) {
    try {
      const squareClient = getSquareClient();
      const locationId = getLocationId();

      // Step 1 — fetch current order
      const currentOrder = await squareClient.ordersApi.retrieveOrder(orderData.squareOrderId);
      const version = currentOrder.result.order.version;
      const fulfillmentUid = currentOrder.result.order.fulfillments?.[0]?.uid;

      if (fulfillmentUid) {
        // Step 2 — update fulfillment state
        const orderUpdate = {
          locationId: locationId,
          version: version,
          fulfillments: [{
            uid: fulfillmentUid,
            state: squareState
          }]
        };

        if (status === 'completed') {
          orderUpdate.state = 'COMPLETED';
        }

        await squareClient.ordersApi.updateOrder(orderData.squareOrderId, {
          order: orderUpdate,
          idempotencyKey: crypto.randomUUID()
        });
      }
    } catch (err) {
      console.error('Square update failed:', err);
      if (err instanceof ApiError) {
        console.error('Square error detail:', err.errors?.[0]?.detail);
      }
      // Depending on strictness, we might throw here, but let's allow Firestore update
    }
  }

  // Send Push Notification
  if (status === 'ready' && orderData.fcmToken) {
    try {
      await admin.messaging().send({
        token: orderData.fcmToken,
        notification: {
          title: 'Your order is ready! 🔥',
          body: `Your Bigi Awasaana order #${orderId.slice(-4).toUpperCase()} is ready for pickup!`
        }
      });
      console.log(`Push notification sent for order ${orderId}`);
    } catch (err) {
      console.error('Failed to send FCM push notification:', err);
    }
  }

  await docRef.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, orderId, status };
});

// ─────────────────────────────────────────────────────────────────
// verifyKdsPin
// Callable function — verifies the KDS PIN
// ─────────────────────────────────────────────────────────────────
exports.verifyKdsPin = functions.https.onCall(async (data, context) => {
  const { pin } = data;

  if (!pin || typeof pin !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid PIN.');
  }

  const docRef = db.collection('settings').doc('kds');
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'KDS settings not found.');
  }

  const kdsData = doc.data();
  if (kdsData.pin === pin) {
    // If context.auth exists, set custom user claim kds: true
    if (context.auth && context.auth.uid) {
      await admin.auth().setCustomUserClaims(context.auth.uid, { kds: true });
    }
    return { success: true };
  } else {
    return { success: false };
  }
});

// ─────────────────────────────────────────────────────────────────
// updateLiveStats
// Firestore trigger to maintain active ASAP order count
// ─────────────────────────────────────────────────────────────────
exports.updateLiveStats = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    // Only proceed if it's a creation or if status/pickup type changed
    const before = change.before.data();
    const after = change.after.data();

    if (before && after) {
      const beforeActive = before.status === 'pending' || before.status === 'preparing';
      const afterActive = after.status === 'pending' || after.status === 'preparing';
      const beforeAsap = before.pickup && before.pickup.type === 'asap';
      const afterAsap = after.pickup && after.pickup.type === 'asap';
      
      if (beforeActive === afterActive && beforeAsap === afterAsap) {
        return null; // No relevant change
      }
    }

    // Do a full aggregation of active ASAP orders
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeSnapshot = await db.collection('orders')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
        .where('status', 'in', ['pending', 'preparing'])
        .get();
        
      let count = 0;
      activeSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.pickup && data.pickup.type === 'asap') {
          count++;
        }
      });
      
      await db.collection('liveStats').doc('current').set({
        activeAsapOrderCount: count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Failed to update liveStats:', err);
    }
    return null;
  });

// ─────────────────────────────────────────────────────────────────
// releaseScheduledOrders
// Scheduled function running every minute
// ─────────────────────────────────────────────────────────────────
exports.releaseScheduledOrders = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    try {
      const pickupConfigDoc = await db.collection('settings').doc('pickupConfig').get();
      const config = pickupConfigDoc.exists ? pickupConfigDoc.data() : { basePrepTimeMinutes: 15 };
      const basePrepMs = (config.basePrepTimeMinutes || 15) * 60000;
      
      const now = new Date();
      const releaseThreshold = admin.firestore.Timestamp.fromDate(new Date(now.getTime() + basePrepMs));
      
      // We can't do a compound query on requestedTime <= releaseThreshold and releasedToKitchen == false
      // easily without an index. We will query by releasedToKitchen == false and filter.
      const scheduledSnapshot = await db.collection('orders')
        .where('pickup.releasedToKitchen', '==', false)
        .where('pickup.type', '==', 'scheduled')
        .get();
        
      const batch = db.batch();
      let count = 0;
      
      scheduledSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.pickup && data.pickup.requestedTime) {
          const reqTime = data.pickup.requestedTime.toDate();
          // due or overdue for release
          if (reqTime.getTime() - basePrepMs <= now.getTime()) {
            batch.update(doc.ref, {
              'pickup.releasedToKitchen': true,
              'status': 'pending', // Enter KDS flow
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
          }
        }
      });
      
      if (count > 0) {
        await batch.commit();
        console.log(`Released ${count} scheduled orders to the kitchen.`);
      }
    } catch (err) {
      console.error('Failed to release scheduled orders:', err);
    }
    return null;
  });

// ─────────────────────────────────────────────────────────────────
// renderBlogPage (SSR for /blog/**)
// ─────────────────────────────────────────────────────────────────
exports.renderBlogPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const postSlug = urlParts[urlParts.length - 1];

    if (!postSlug) {
      return res.status(404).send('Not Found');
    }

    const snapshot = await db.collection('posts').where('slug', '==', postSlug).limit(1).get();
    
    const templatePath = path.join(__dirname, 'blog-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    if (snapshot.empty) {
      html = html.replace(/{{TITLE}}/g, 'Blog Post Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the article you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, 'https://bigiawasaana.com/logo.webp');
      html = html.replace(/{{POST_SLUG}}/g, postSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');
      
      const notFoundContent = `
        <section class="blog-article" style="text-align: center; padding-top: clamp(150px, 15vw, 200px); min-height: 60vh;">
          <h1 class="blog-title">404</h1>
          <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); margin-bottom: 24px;">Post Not Found</h2>
          <p style="color: var(--gray); margin-bottom: 32px;">This post may have been removed or the URL is incorrect.</p>
          <a href="/blog.html" class="btn-primary">View All Posts</a>
        </section>
      `;
      html = html.replace(/{{POST_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const postDoc = snapshot.docs[0];
    const post = postDoc.data();

    // Check if published
    if (!post.isPublished) {
      html = html.replace(/{{TITLE}}/g, 'Draft | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "Draft post.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, 'https://bigiawasaana.com/logo.webp');
      html = html.replace(/{{POST_SLUG}}/g, postSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');
      html = html.replace(/{{POST_CONTENT}}/g, '<section class="blog-article"><h2>This post is not published yet.</h2></section>');
      return res.status(404).send(html);
    }

    const title = post.title + ' | Bigi Awasaana Blog';
    const desc = post.excerpt || `Read ${post.title} on the Bigi Awasaana Blog.`;
    let image = post.coverImage || 'https://bigiawasaana.com/logo.webp';
    if (image.startsWith('/')) {
      image = `https://bigiawasaana.com${image}`;
    }
    const pubDate = post.publishedAt ? new Date(post.publishedAt.toMillis()).toISOString() : new Date().toISOString();
    const modDate = post.updatedAt ? new Date(post.updatedAt.toMillis()).toISOString() : pubDate;
    const formattedDate = new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, desc);
    html = html.replace(/{{META_ROBOTS}}/g, '');
    html = html.replace(/{{OG_IMAGE}}/g, image);
    html = html.replace(/{{POST_SLUG}}/g, postSlug);
    
    // Keywords
    if (post.keywords) {
      html = html.replace(/{{META_KEYWORDS}}/g, `<meta name="keywords" content="${post.keywords}">`);
    } else {
      html = html.replace(/{{META_KEYWORDS}}/g, '');
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://bigiawasaana.com/blog/${postSlug}`
      },
      "headline": post.title,
      "description": desc,
      "image": image,  
      "author": {
        "@type": "Organization",
        "name": "Bigi Awasaana"
      },  
      "publisher": {
        "@type": "Organization",
        "name": "Bigi Awasaana",
        "logo": {
          "@type": "ImageObject",
          "url": "https://bigiawasaana.com/logo.webp"
        }
      },
      "datePublished": pubDate,
      "dateModified": modDate
    };
    if (post.keywords) {
      schema.keywords = post.keywords;
    }

    html = html.replace(/{{SCHEMA_DATA}}/g, JSON.stringify(schema, null, 2));

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://bigiawasaana.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": "https://bigiawasaana.com/blog.html"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": `https://bigiawasaana.com/blog/${postSlug}`
        }
      ]
    };
    html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, JSON.stringify(breadcrumbSchema, null, 2));

    let cleanContent = post.content || '';
    if (post.coverImage) {
      const escapedUrl = post.coverImage.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Remove the image if it's wrapped in a <p>
      cleanContent = cleanContent.replace(new RegExp(`<p>\\s*<img[^>]*src=["']${escapedUrl}["'][^>]*>\\s*</p>`, 'gi'), '');
      // Remove just the <img> tag if it wasn't caught above
      cleanContent = cleanContent.replace(new RegExp(`<img[^>]*src=["']${escapedUrl}["'][^>]*>`, 'gi'), '');
    }

    const contentHtml = `
      <article class="blog-article">
        <div class="container">
          <header class="blog-header">
            <a href="/blog.html" class="back-to-blog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Blog</a>
            <div class="blog-meta">
              <span class="blog-date">${formattedDate}</span>
              ${post.keywords ? `<span class="blog-category">${post.keywords.split(',')[0].trim()}</span>` : ''}
            </div>
            <h1 class="blog-title">${post.title}</h1>
          </header>
        </div>

        ${post.coverImage ? `
        <div class="blog-hero-image-wrapper">
          <div class="container">
            <img src="${post.coverImage}" alt="${post.title}" class="blog-cover">
          </div>
        </div>
        ` : ''}

        <div class="container">
          <div class="blog-content-wrapper">
            <div class="blog-content">
              ${cleanContent}
            </div>
            
            <div class="blog-share">
              <span class="share-text">Share this article</span>
              <div class="share-buttons">
                <a href="https://twitter.com/intent/tweet?url=https://bigiawasaana.com/blog/${postSlug}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-btn">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://bigiawasaana.com/blog/${postSlug}" target="_blank" class="share-btn">Facebook</a>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;

    html = html.replace(/{{POST_CONTENT}}/g, contentHtml);

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering blog page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// renderItemPage (SSR for /item/**)
// ─────────────────────────────────────────────────────────────────
exports.renderItemPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const itemSlug = urlParts[urlParts.length - 1]; 

    if (!itemSlug) {
      return res.status(404).send('Not Found');
    }

    const snapshot = await db.collection('menu').get();
    let selectedItem = null;
    const allItems = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name || '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      allItems.push({ name, slug, data });
      if (slug === itemSlug) {
        selectedItem = data;
      }
    });

    if (!selectedItem) {
      // Fallback matching for old SEO links
      let strippedSlug = itemSlug.replace(/^bigi-s-/, '');
      const oldToNew = {
        'shami-kabob': 'shami-kabab-plate',
        'qabuli-palou': 'qabuli-palaw',
        'doogh-yogurt-drink': 'doogh',
        'shawarma': 'chicken-shawarma-wrap',
        'samosa': 'chicken-samosa',
        'smash-burger-with-fries': 'smash-burger-meal',
        'tikka-kabob': 'tikka-kabab-plate'
      };
      if (oldToNew[strippedSlug]) {
        strippedSlug = oldToNew[strippedSlug];
      }
      
      selectedItem = allItems.find(i => i.slug === strippedSlug)?.data;

      if (!selectedItem) {
        const partialMatch = allItems.find(i => i.slug.includes(strippedSlug) || strippedSlug.includes(i.slug));
        if (partialMatch) {
          selectedItem = partialMatch.data;
        }
      }
    }

    const templatePath = path.join(__dirname, 'item-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    if (!selectedItem) {
      html = html.replace(/{{TITLE}}/g, 'Item Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the menu item you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, '/assets/logo.png');
      html = html.replace(/{{ITEM_SLUG}}/g, itemSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');

      const notFoundContent = `
        <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center;">
          <div class="container" style="max-width: 600px;">
            <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: var(--space-s);">404</h1>
            <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: var(--white); margin-bottom: var(--space-m);">Item Not Found</h2>
            <p style="color: var(--gray-light); font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-l);">
              We couldn't find the menu item you're looking for. It might have been removed or renamed.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="/menu.html" class="btn-primary" style="min-width: 160px;">View Menu</a>
            </div>
          </div>
        </section>
      `;
      html = html.replace(/{{ITEM_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const areasSnapshot = await db.collection('serviceAreas').where('isPublished', '==', true).get();
    const areas = [];
    areasSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name) areas.push(data.name);
    });

    const priceFormatted = typeof selectedItem.price === 'number' ? selectedItem.price.toFixed(2) : parseFloat(selectedItem.price || 0).toFixed(2);
    const itemName = selectedItem.name;
    const itemDesc = selectedItem.desc || selectedItem.description || `Delicious ${itemName} prepared fresh.`;
    let itemImg = selectedItem.img || selectedItem.image || selectedItem.imageUrl || '/assets/logo.png';
    if (itemImg.startsWith('/')) {
      itemImg = `https://bigiawasaana.com${itemImg}`;
    }
    
    // Create SEO title and desc
    const title = `${itemName} Near Me in Reseda, CA | Bigi Awasaana`;
    const description = `Order the best ${itemName} near you. ${itemDesc}`;
    const keywords = `best ${itemName} Reseda, ${itemName} near me, Afghan food Reseda, halal food Reseda, halal food truck Los Angeles, Afghan food truck near me, Zabiha Halal, delivery area Reseda, pickup area Reseda`;
    
    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, description);

    html = html.replace(/{{META_KEYWORDS}}/g, keywords);
    html = html.replace(/{{META_ROBOTS}}/g, '');
    html = html.replace(/{{OG_IMAGE}}/g, itemImg);
    html = html.replace(/{{ITEM_SLUG}}/g, itemSlug);
    const schemaData = `
    <script type="application/ld+json">
    [{
      "@context": "https://schema.org",
      "@type": "MenuItem",
      "name": "${itemName.replace(/"/g, '\\"')}",
      "description": "${itemDesc.replace(/"/g, '\\"')}",
      "image": "${itemImg}",
      "suitableForDiet": "https://schema.org/HalalDiet",
      "offers": {
        "@type": "Offer",
        "price": "${priceFormatted}",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "Is the ${itemName} halal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our ${itemName} is 100% Zabiha Halal, cooked to perfection at Bigi Awasaana."
        }
      }, {
        "@type": "Question",
        "name": "Do you deliver ${itemName} in Los Angeles?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we deliver ${itemName} across Los Angeles via Uber Eats and DoorDash, and offer pickup in Reseda."
        }
      }]
    }]
    </script>
    `;
    html = html.replace(/{{SCHEMA_DATA}}/g, schemaData);

    const areasText = areas.length > 0 
      ? `We proudly serve our famous ${itemName} to customers in Reseda and surrounding areas including ${areas.slice(0, -1).join(', ')}${areas.length > 1 ? ' and ' : ''}${areas[areas.length - 1]}. Stop by for pickup or order delivery today!` 
      : `Stop by for pickup or order delivery today in Reseda, CA!`;

    const itemContent = `
      <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 80vh;">
        <div class="container" style="max-width: 1000px; margin: 0 auto;">
          
          <!-- Back button -->
          <a href="/menu.html" style="display: inline-flex; align-items: center; gap: 8px; color: var(--gray); text-decoration: none; font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 32px; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Menu
          </a>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 48px; align-items: start;">
            <!-- Image -->
            <div style="width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--surface); border: 1px solid var(--border);">
              <img src="${itemImg}" alt="${itemName.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>

            <!-- Content -->
            <div>
              <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 56px); color: var(--accent); margin-bottom: 8px; line-height: 1.1;">Halal ${itemName} in Los Angeles</h1>
              <div style="font-size: 28px; color: var(--white); font-family: 'Barlow Condensed'; font-weight: 600; margin-bottom: 24px;">$${priceFormatted}</div>
              
              <div style="font-size: 1.1rem; line-height: 1.8; color: var(--gray-light); margin-bottom: 32px;">
                <p>${itemDesc}</p>
              </div>

              <!-- SEO Local Text -->
              <div style="background: rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.2); border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Order ${itemName} Near Me</h3>
                <p style="color: var(--gray); font-size: 14px; line-height: 1.6;">${areasText}</p>
              </div>

              <!-- CTA Buttons -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <a href="/menu.html" class="btn-primary" style="text-align: center; width: 100%;">Order for Pickup</a>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; border-color: rgba(6, 193, 103, 0.5); background: rgba(6, 193, 103, 0.1);">Uber Eats</a>
                  <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; border-color: rgba(255, 48, 8, 0.5); background: rgba(255, 48, 8, 0.1);">DoorDash</a>
                </div>
              </div>
            </div>
            </div>
          </div>
          
          <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border);">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-bottom: 16px;">Explore More Halal Afghan Food</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              ${allItems.filter(i => i.slug !== itemSlug).map(i => `<a href="/item/${i.slug}" style="color: var(--gray); text-decoration: none;">Order Halal ${i.name}</a>`).join(' | ')}
            </p>
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-top: 32px; margin-bottom: 16px;">Delivery Service Areas</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              ${areas.map(a => { const s = a.toLowerCase().replace(/\s+/g, '-'); return `<a href="/areas/${s}" style="color: var(--gray); text-decoration: none;">Halal Afghan Food Delivery in ${a}</a>`; }).join(' | ')}
            </p>
          </div>

        </div>
      </section>
    `;

    html = html.replace(/{{ITEM_CONTENT}}/g, itemContent);

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error rendering item page:', error);
    res.status(500).send('Internal Server Error');
  }
});
// renderAreaPage (SSR for /areas/**)
// ─────────────────────────────────────────────────────────────────
exports.renderAreaPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const areaId = urlParts[urlParts.length - 1]; // e.g. "tarzana"

    if (!areaId) {
      return res.status(404).send('Not Found');
    }

    const areaDoc = await db.collection('serviceAreas').doc(areaId).get();
    
    if (!areaDoc.exists) {
      const templatePath = path.join(__dirname, 'area-template.html');
      let html = fs.readFileSync(templatePath, 'utf8');

      html = html.replace(/{{TITLE}}/g, 'Area Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the neighborhood page you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');

      const notFoundContent = `
        <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center;">
          <div class="container" style="max-width: 600px;">
            <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: var(--space-s);">404</h1>
            <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: var(--white); margin-bottom: var(--space-m);">Area Not Found</h2>
            <p style="color: var(--gray-light); font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-l);">
              We couldn't find the neighborhood page you're looking for. It might have been moved or doesn't exist yet.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="/menu.html" class="btn-primary" style="min-width: 160px;">View Menu</a>
              <a href="/" class="btn-outline" style="min-width: 160px;">Go Home</a>
            </div>
          </div>
        </section>
      `;

      html = html.replace(/{{AREA_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const areaData = areaDoc.data();
    
    // Read the bundled template
    const templatePath = path.join(__dirname, 'area-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace SEO placeholders
    const title = areaData.title || `Halal Afghan Food Delivery in ${areaData.name || areaId} | Bigi Awasaana`;
    const description = areaData.metaDescription || `Order the best Halal Afghan street food, kabobs, and bolani in ${areaData.name || areaId}.`;
    
    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, description);

    // Generate area schema and inject
    const areaSchemaData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "name": "Bigi Awasaana",
      "image": "https://bigiawasaana.com/logo.png",
      "url": "https://bigiawasaana.com/areas/${areaId}",
      "telephone": "+13239211646",
      "servesCuisine": ["Afghan", "Middle Eastern", "Halal"],
      "areaServed": {
        "@type": "City",
        "name": "${areaData.name || areaId}"
      }
    }
    </script>
    `;
    html = html.replace(/{{SCHEMA_DATA}}/g, areaSchemaData);


    // Thin content safeguard
    if (areaData.isPublished === false) {
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
    } else {
      html = html.replace(/{{META_ROBOTS}}/g, ''); // leave blank
    }
    html = html.replace(/{{AREA_ID}}/g, areaId);

    const areaContent = `
      <section class="section" style="margin-top: 100px; padding-top: 60px; background-color: var(--bg); min-height: 60vh; position: relative;">
        <div class="hero-watermark" style="position: absolute; top: -20px; left: 0; width: 100%; text-align: center; font-family: 'Lalezar', cursive; font-size: clamp(60px, 12vw, 150px); color: rgba(255,255,255,0.03); z-index: 0; pointer-events: none; white-space: nowrap; overflow: hidden;">Premium Halal Afghan</div>
        <div class="container text-center-mobile" style="max-width: 800px; margin: 0 auto; position: relative; z-index: 1;">
          <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 64px); color: var(--accent); margin-bottom: var(--space-xs);">${areaData.headline || 'Takeout Near ' + (areaData.name || areaId)}</h1>
          ${areaData.driveTime ? `<p style="color: var(--gray); font-family: 'Barlow Condensed'; font-size: 1.2rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: var(--space-m);">Just a ${areaData.driveTime} drive to Reseda</p>` : ''}
          <div style="font-size: 1.1rem; line-height: 1.8; color: var(--gray-light); margin-bottom: var(--space-l);">
            ${areaData.introText ? `<p>${areaData.introText}</p>` : '<p>Experience the authentic taste of the Silk Road right here in the San Fernando Valley.</p>'}
          </div>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px;">
            <a href="/menu.html" class="btn-primary">Order for Pickup</a>
            <a href="/#delivery" class="btn-outline">Order Delivery</a>
          </div>
          
          <!-- Location and Contact -->
          <div style="background: var(--surface); padding: 24px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 40px;">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Visit Us</h3>
            <p style="color: var(--gray-light); font-size: 1.1rem; margin-bottom: 8px;">18411 Victory Blvd, Reseda, CA 91335</p>
            <p style="margin-bottom: 24px;">
              <a href="tel:+13239211646" style="color: var(--white); font-weight: bold; font-size: 1.2rem; text-decoration: none;">📞 (323) 921-1646</a>
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Get Directions
              </a>
            </div>
          </div>

          <div class="map-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <iframe width="100%" height="350" style="border:0;" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=18411+Victory+Blvd,+Reseda,+CA&t=&z=14&ie=UTF8&iwloc=&output=embed"></iframe>
          </div>

          <!-- Internal Menu Links for Area Pages -->
          <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border); text-align: left;">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-bottom: 16px;">Popular Delivery Items in ${areaData.name || areaId}</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              <a href="/item/bigi-s-tikka-kabob" style="color: var(--gray); text-decoration: none;">Order Halal Chicken Tikka Kabob in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-shami-kabob" style="color: var(--gray); text-decoration: none;">Order Halal Shami Kabob in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-qabuli-palou" style="color: var(--gray); text-decoration: none;">Order Halal Qabuli Palou in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-samosa" style="color: var(--gray); text-decoration: none;">Order Halal Samosa in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-bolani" style="color: var(--gray); text-decoration: none;">Order Halal Bolani in ${areaData.name || areaId}</a>
            </p>
          </div>

        </div>
      </section>
    `;

    html = html.replace(/{{AREA_CONTENT}}/g, areaContent);

    // Cache headers: 1 hour CDN cache
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error rendering area page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// renderSitemap (SSR for /sitemap.xml)
// ─────────────────────────────────────────────────────────────────
exports.renderSitemap = functions.https.onRequest(async (req, res) => {
  try {
    const baseUrl = 'https://bigiawasaana.com';
    const now = new Date().toISOString().split('T')[0];
    
    // Core static URLs
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/menu.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/specials.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/locations.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/catering.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/faq.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

    // Fetch published areas dynamically
    const areasSnapshot = await db.collection('serviceAreas')
      .where('isPublished', '==', true)
      .get();
      
    areasSnapshot.forEach(doc => {
      xml += `
  <url>
    <loc>${baseUrl}/areas/${doc.id}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    // Fetch menu items for individual item pages
    const menuSnapshot = await db.collection('menu').get();
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name) {
        const itemSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        xml += `
  <url>
    <loc>${baseUrl}/item/${itemSlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });

    // Fetch published blog posts
    const postsSnapshot = await db.collection('posts')
      .where('isPublished', '==', true)
      .get();
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.slug) {
        xml += `
  <url>
    <loc>${baseUrl}/blog/${data.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    });

    xml += `\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// Email Notification for Catering Inquiries
// ─────────────────────────────────────────────────────────────────
exports.onNewCateringInquiry = functions.firestore
  .document('catering_inquiries/{inquiryId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    const gmailEmail = functions.config().gmail ? functions.config().gmail.email : process.env.GMAIL_EMAIL;
    const gmailPassword = functions.config().gmail ? functions.config().gmail.password : process.env.GMAIL_PASSWORD;

    if (!gmailEmail || !gmailPassword) {
      console.error('Missing Gmail credentials. Run: firebase functions:config:set gmail.email="your@gmail.com" gmail.password="app_password"');
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailPassword
      }
    });

    const mailOptions = {
      from: `"Bigi Awasaana Catering" <${gmailEmail}>`,
      to: 'bigiawasaanallc@gmail.com',
      replyTo: data.email,
      subject: `New Catering Inquiry from ${data.name}`,
      html: generateCateringEmail(data)
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Catering notification email sent for inquiry:', context.params.inquiryId);
    } catch (error) {
      console.error('Error sending catering email:', error);
    }

    return null;
  });
