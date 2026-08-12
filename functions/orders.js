const { functions, admin, db, getSquareClient, getLocationId, corsHandler } = require('./shared');
const crypto = require('crypto');
const { ApiError } = require('square');

// ─────────────────────────────────────────────────────────────────
// syncSquareOrders
// HTTP function — called by the KDS every 30 seconds (polling)
// Fetches today's PAID orders from Square Orders API,
// parses source/channel, writes/updates Firestore
// Skips: unpaid draft orders (no tenders) and website orders (handled by processSquarePayment)
// ─────────────────────────────────────────────────────────────────
async function performSquareSync() {
  const squareClient = getSquareClient();
  const locationId = getLocationId();

  if (!locationId) {
    throw new Error('Square location ID not configured.');
  }

  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const searchResponse = await squareClient.ordersApi.searchOrders({
    locationIds: [locationId],
    query: {
      filter: {
        dateTimeFilter: {
          createdAt: {
            startAt: last24Hours.toISOString(),
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

    // ── HANDLE WEBSITE ORDERS SEPARATELY ──
    if (metadata.source === 'website') {
      let status = 'pending';
      const fState = order.fulfillments && order.fulfillments.length > 0 ? order.fulfillments[0].state : 'NONE';
      console.log(`[Sync] Website Order ${order.id} | Square State: ${order.state} | Fulfillment: ${fState}`);
      
      if (order.state === 'COMPLETED') {
        status = 'completed';
      } else if (fState !== 'NONE') {
        if (fState === 'PROPOSED') status = 'pending';
        else if (fState === 'RESERVED') status = 'preparing';
        else if (fState === 'PREPARED') status = 'ready';
        else if (fState === 'COMPLETED') status = 'completed';
      }
      
      console.log(`[Sync] Website Order ${order.id} | Mapped to Firestore Status: ${status}`);
      
      const docRef = db.collection('orders').doc(order.id);
      batch.set(docRef, {
        status,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      syncedOrders.push({
        id: order.id,
        source: 'website',
        customerName: metadata.customerName || 'Guest',
        status,
        itemCount: order.lineItems ? order.lineItems.length : 0,
      });
      continue;
    }

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

    const existingDoc = await db.collection('orders').doc(order.id).get();
    if (existingDoc.exists && existingDoc.data().status === 'completed') {
      continue;
    }

    let source = 'pos';
    if (sourceName.includes('doordash') || sourceName.includes('door dash')) source = 'doordash';
    else if (sourceName.includes('uber') || sourceName.includes('ubereats')) source = 'ubereats';
    else if (sourceName.includes('grubhub') || sourceName.includes('grub hub')) source = 'grubhub';
    else if (sourceName.includes('square online') || sourceName.includes('online store') || sourceName.includes('online')) source = 'squareonline';

    let status = 'pending';
    if (order.state === 'COMPLETED') {
      status = 'completed';
    } else if (order.fulfillments && order.fulfillments.length > 0) {
      const fulfillmentState = order.fulfillments[0].state;
      if (fulfillmentState === 'PROPOSED') status = 'pending';
      else if (fulfillmentState === 'RESERVED') status = 'preparing';
      else if (fulfillmentState === 'PREPARED') status = 'ready';
      else if (fulfillmentState === 'COMPLETED') status = 'completed';
    }

    let customerName = 'Guest';
    if (metadata.customerName) {
      customerName = metadata.customerName;
    } else if (order.fulfillments?.[0]?.pickupDetails?.recipient?.displayName) {
      customerName = order.fulfillments[0].pickupDetails.recipient.displayName;
    } else if (order.fulfillments?.[0]?.deliveryDetails?.recipient?.displayName) {
      customerName = order.fulfillments[0].deliveryDetails.recipient.displayName;
    }

    const items = (order.lineItems || []).map(li => ({
      name: li.name || 'Unknown Item',
      quantity: parseInt(li.quantity || '1', 10),
      price: li.basePriceMoney ? Number(li.basePriceMoney.amount) / 100 : 0,
    }));

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
  return syncedOrders;
}

exports.syncSquareOrders = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const syncedOrders = await performSquareSync();
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

exports.syncSquareOrdersCron = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  try {
    await performSquareSync();
    console.log('Cron: Synced Square orders successfully');
  } catch (err) {
    console.error('Cron syncSquareOrders failed:', err);
  }
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

    // ── HANDLE WEBSITE ORDERS SEPARATELY ──
    if (metadata.source === 'website') {
      let status = 'pending';
      if (orderData.state === 'COMPLETED') {
        status = 'completed';
      } else if (orderData.fulfillments?.length > 0) {
        const fState = orderData.fulfillments[0].state;
        if (fState === 'PROPOSED') status = 'pending';
        else if (fState === 'RESERVED') status = 'preparing';
        else if (fState === 'PREPARED') status = 'ready';
        else if (fState === 'COMPLETED') status = 'completed';
      }
      
      await db.collection('orders').doc(orderData.id).set({
        status,
        webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`Webhook processed for WEBSITE order ${orderData.id}: status=${status}`);
      return res.status(200).send('OK (Website order status updated)');
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
      if (fState === 'PROPOSED') status = 'pending';
      else if (fState === 'RESERVED') status = 'preparing';
      else if (fState === 'PREPARED') status = 'ready';
      else if (fState === 'COMPLETED') status = 'completed';
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
