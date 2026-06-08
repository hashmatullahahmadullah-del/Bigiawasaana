const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const { Client, Environment, ApiError } = require('square');

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
  const { sourceId, items, customerName, customerPhone, tipCents: rawTipCents } = data;

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
    const price = typeof menuData.price === 'number' ? menuData.price : parseFloat(menuData.price);
    if (isNaN(price) || price <= 0) {
      throw new functions.https.HttpsError('internal', `Invalid price for item: ${menuData.name}`);
    }

    const itemTotalCents = Math.round(price * 100) * cartItem.qty;
    subtotalCents += itemTotalCents;

    resolvedItems.push({
      name: menuData.name,
      quantity: cartItem.qty,
      price: price,
      totalCents: itemTotalCents,
    });
  }

  if (subtotalCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Order subtotal must be greater than zero.');
  }

  // ── Step 2: Server-side tax calculation ──
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents + tipCents;

  // ── Step 3: Create Square Order ──
  const squareClient = getSquareClient();
  const locationId = getLocationId();

  if (!locationId) {
    throw new functions.https.HttpsError('failed-precondition', 'Square location ID not configured.');
  }

  const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const paymentIdempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let squareOrderId;
  try {
    const orderResponse = await squareClient.ordersApi.createOrder({
      order: {
        locationId,
        referenceId: idempotencyKey,
        lineItems: resolvedItems.map(item => ({
          name: item.name,
          quantity: String(item.quantity),
          basePriceMoney: {
            amount: BigInt(Math.round(item.price * 100)),
            currency: 'USD',
          },
        })),
        metadata: {
          source: 'website',
          customerName: customerName.trim(),
          customerPhone: (customerPhone || '').trim(),
        },
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
    tax: taxCents / 100,
    tip: tipCents / 100,
    total: totalCents / 100,
    subtotalCents,
    taxCents,
    tipCents,
    totalCents,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: null,
  };

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
// updateOrderStatus
// Callable function — used by KDS to change order status
// ─────────────────────────────────────────────────────────────────
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  const { orderId, status } = data;

  if (!orderId || typeof orderId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');
  }

  const validStatuses = ['pending', 'preparing', 'ready', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const docRef = db.collection('orders').doc(orderId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found.');
  }

  await docRef.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, orderId, status };
});
