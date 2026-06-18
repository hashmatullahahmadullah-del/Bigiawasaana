const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const { Client, Environment, ApiError } = require('square');
const { evaluateDeals } = require('./deals-evaluator');
const fs = require('fs');
const path = require('path');

admin.initializeApp();
const db = admin.firestore();

// CORS middleware
const corsHandler = cors({ origin: true });

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
    
    // Basic server-side validation
    const leadMs = config.minLeadTimeMinutes * 60000;
    if (requestedDate.getTime() < now.getTime() + leadMs - 5 * 60000) { // 5 min grace period for latency
      throw new functions.https.HttpsError('invalid-argument', 'Pickup time is too soon.');
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
        if (metadata.source === 'website' || sourceName.includes('website') || sourceName.includes('bigi')) {
          continue;
        }

        // ── SKIP: Unpaid draft orders (Square creates a draft when card form initializes) ──
        // An order with no tenders has not been paid — don't show it on KDS yet
        if (!order.tenders || order.tenders.length === 0) {
          continue;
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

    // Skip website orders and unpaid drafts
    if (metadata.source === 'website' || sourceName.includes('website')) {
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
      // Return hard 404 with fallback HTML as requested
      const notFoundHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Area Not Found | Bigi Awasaana</title>
        <style>
          body { background: #060606; color: #fff; font-family: 'Barlow Condensed', sans-serif; text-align: center; padding-top: 20vh; margin: 0; }
          h1 { color: #ff4500; font-size: 3rem; text-transform: uppercase; margin-bottom: 1rem; }
          p { color: #a0a0a0; font-family: 'Outfit', sans-serif; font-size: 1.1rem; }
          a { color: #ff4500; text-decoration: none; border: 1px solid #ff4500; padding: 10px 20px; border-radius: 4px; display: inline-block; margin-top: 20px; }
          a:hover { background: rgba(255, 69, 0, 0.1); }
        </style>
      </head>
      <body>
        <h1>Area Not Found</h1>
        <p>We couldn't find the neighborhood page you're looking for.</p>
        <p>Check out our authentic Halal Afghan menu instead!</p>
        <a href="/menu.html">View Menu</a> <a href="/" style="margin-left: 10px; border-color: #333; color: #fff;">Homepage</a>
      </body>
      </html>`;
      return res.status(404).send(notFoundHtml);
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

    // Thin content safeguard
    if (areaData.isPublished === false) {
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
    } else {
      html = html.replace(/{{META_ROBOTS}}/g, ''); // leave blank
    }

    // Build the injected content
    const areaContent = `
      <section class="section pt-xl" style="background-color: var(--bg); min-height: 60vh;">
        <div class="container text-center-mobile" style="max-width: 800px; margin: 0 auto;">
          <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 64px); color: var(--accent); margin-bottom: var(--space-xs);">${areaData.headline || 'Halal Afghan Food in ' + (areaData.name || areaId)}</h1>
          ${areaData.driveTime ? `<p style="color: var(--gray); font-family: 'Barlow Condensed'; font-size: 1.2rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: var(--space-m);">Just a ${areaData.driveTime} drive to Reseda</p>` : ''}
          <div style="font-size: 1.1rem; line-height: 1.8; color: var(--gray-light); margin-bottom: var(--space-l);">
            ${areaData.introText ? `<p>${areaData.introText}</p>` : '<p>Experience the authentic taste of the Silk Road right here in the San Fernando Valley.</p>'}
          </div>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <a href="/menu.html" class="btn-primary">Order for Pickup</a>
            <a href="/#delivery" class="btn-outline">Order Delivery</a>
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

    xml += `\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Internal Server Error');
  }
});
