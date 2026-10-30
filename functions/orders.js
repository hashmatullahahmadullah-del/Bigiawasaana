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
// ─────────────────────────────────────────────────────────────────
// Refund & Status Helpers
// ─────────────────────────────────────────────────────────────────
function extractReturnAmountCents(order, returnObj, refundObj) {
  // 1. Check returnObj.returnAmounts (totalMoney / grossReturnMoney)
  const retTotal = returnObj?.returnAmounts?.totalMoney?.amount;
  if (retTotal !== undefined && retTotal !== null && Number(retTotal) > 0) {
    return Number(retTotal);
  }
  const retGross = returnObj?.returnAmounts?.grossReturnMoney?.amount;
  if (retGross !== undefined && retGross !== null && Number(retGross) > 0) {
    return Number(retGross);
  }

  // 2. Check returnObj.returnTenders (actual money returned to card/cash)
  if (returnObj?.returnTenders && Array.isArray(returnObj.returnTenders) && returnObj.returnTenders.length > 0) {
    const tenderSum = returnObj.returnTenders.reduce((sum, t) => sum + Number(t.amountMoney?.amount || 0), 0);
    if (tenderSum > 0) return tenderSum;
  }

  // 3. Check returnObj.returnLineItems (sum of items returned)
  if (returnObj?.returnLineItems && Array.isArray(returnObj.returnLineItems) && returnObj.returnLineItems.length > 0) {
    const itemsSum = returnObj.returnLineItems.reduce((sum, rli) => {
      return sum + Number(rli.totalMoney?.amount || rli.grossReturnMoney?.amount || rli.basePriceMoney?.amount || 0);
    }, 0);
    if (itemsSum > 0) return itemsSum;
  }

  // 4. Check order root return amounts / totalMoney
  const ordRetTotal = order?.returnAmounts?.totalMoney?.amount;
  if (ordRetTotal !== undefined && ordRetTotal !== null && Number(ordRetTotal) > 0) {
    return Number(ordRetTotal);
  }
  const ordTotal = order?.totalMoney?.amount;
  if (ordTotal !== undefined && ordTotal !== null && Number(ordTotal) > 0) {
    return Number(ordTotal);
  }

  // 5. Check refundObj
  const refAmt = refundObj?.amountMoney?.amount;
  if (refAmt !== undefined && refAmt !== null && Number(refAmt) > 0) {
    return Number(refAmt);
  }

  return 0;
}

function extractOrderRefundData(order, linkedReturn = null) {
  const grossTotalCents = order.totalMoney ? Number(order.totalMoney.amount) : 0;
  let netTotalCents = grossTotalCents;

  if (order.netAmounts && order.netAmounts.totalMoney) {
    netTotalCents = Number(order.netAmounts.totalMoney.amount);
  }

  let refundedCents = Math.max(0, grossTotalCents - netTotalCents);
  let refundReason = '';

  // 1. Check linked return orders (created by Square POS / Dashboard returns)
  if (linkedReturn) {
    if (linkedReturn.refundAmountCents > 0) {
      refundedCents = Math.max(refundedCents, linkedReturn.refundAmountCents);
    }
    if (linkedReturn.reason) {
      refundReason = linkedReturn.reason;
    }
  }

  // 2. Check order.refunds
  if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
    const sumRefunds = order.refunds.reduce((sum, r) => sum + (r.amountMoney ? Number(r.amountMoney.amount) : 0), 0);
    refundedCents = Math.max(refundedCents, sumRefunds);
    const lastWithReason = order.refunds.slice().reverse().find(r => r.reason);
    if (lastWithReason && !refundReason) refundReason = lastWithReason.reason;
  }

  // 3. Check order.returnAmounts and order.returns
  if (order.returnAmounts && order.returnAmounts.totalMoney) {
    const returnCents = Number(order.returnAmounts.totalMoney.amount);
    refundedCents = Math.max(refundedCents, returnCents);
  }
  if (order.returns && Array.isArray(order.returns)) {
    order.returns.forEach(r => {
      const amt = extractReturnAmountCents(order, r, null);
      if (amt > 0) refundedCents = Math.max(refundedCents, amt);
    });
  }

  // 4. Check if tender card was VOIDED or payment was cancelled
  const tender = order.tenders?.[0];
  const isVoided = tender?.cardDetails?.status === 'VOIDED' || tender?.cardDetails?.status === 'FAILED';
  if (isVoided) {
    refundedCents = grossTotalCents;
    if (!refundReason) refundReason = 'Payment voided / cancelled on Square';
  }

  const isCanceled = order.state === 'CANCELED' || isVoided;
  const isFullRefund = (grossTotalCents > 0 && refundedCents >= grossTotalCents) || isCanceled;
  const isPartialRefund = refundedCents > 0 && !isFullRefund;

  return {
    grossTotalCents,
    grossTotal: grossTotalCents / 100,
    refundedAmountCents: refundedCents,
    refundedAmount: refundedCents / 100,
    netTotalCents: Math.max(0, grossTotalCents - refundedCents),
    netTotal: Math.max(0, grossTotalCents - refundedCents) / 100,
    isFullRefund,
    isPartialRefund,
    isCanceled,
    refundStatus: isFullRefund ? 'full' : (isPartialRefund ? 'partial' : 'none'),
    refundReason,
    cancellationReason: isCanceled ? (refundReason || 'Order cancelled on Square') : (isFullRefund ? (refundReason || 'Order refunded') : '')
  };
}

function resolveOrderStatus(order, fState, refundData) {
  if (refundData.isCanceled || refundData.isFullRefund) return 'cancelled';
  if (refundData.isPartialRefund) return 'partially_refunded';
  if (order.state === 'COMPLETED') return 'completed';
  if (fState && fState !== 'NONE') {
    if (fState === 'PROPOSED') return 'pending';
    if (fState === 'RESERVED') return 'preparing';
    if (fState === 'PREPARED') return 'ready';
    if (fState === 'COMPLETED') return 'completed';
    if (fState === 'CANCELED') return 'cancelled';
  }
  return 'pending';
}

async function performSquareSync() {
  const squareClient = getSquareClient();
  const locationId = getLocationId();

  if (!locationId) {
    throw new Error('Square location ID not configured.');
  }

  const now = new Date();
  const last48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const searchResponse = await squareClient.ordersApi.searchOrders({
    locationIds: [locationId],
    query: {
      filter: {
        dateTimeFilter: {
          createdAt: {
            startAt: last48Hours.toISOString(),
          },
        },
        stateFilter: {
          states: ['OPEN', 'COMPLETED', 'CANCELED'],
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

  // ── Step 0: Pre-scan Square orders to detect Return Orders and map to source orders ──
  const returnOrdersMap = new Map(); // origOrderId -> { refundAmountCents, reason, returns, refundStatus, refundId }

  for (const o of orders) {
    const returnObj = (o.returns && o.returns.length > 0) ? o.returns[0] : null;
    const refundObj = (o.refunds && o.refunds.length > 0) ? o.refunds[0] : null;
    const origId = returnObj?.sourceOrderId || refundObj?.transactionId;

    if (origId) {
      const retAmt = extractReturnAmountCents(o, returnObj, refundObj);
      const prev = returnOrdersMap.get(origId) || { refundAmountCents: 0, returns: [] };
      prev.refundAmountCents = Math.max(prev.refundAmountCents, retAmt);
      prev.reason = refundObj?.reason || returnObj?.reason || prev.reason || 'Returned Goods';
      prev.refundStatus = refundObj?.status || 'COMPLETED';
      prev.refundId = refundObj?.id || o.id;
      if (returnObj?.returnLineItems) {
        prev.returns.push(...returnObj.returnLineItems.map(rli => ({
          name: rli.name || 'Returned Item',
          quantity: rli.quantity,
          amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : (rli.totalMoney ? Number(rli.totalMoney.amount) / 100 : 0)
        })));
      }
      returnOrdersMap.set(origId, prev);
    }
  }

  console.log(`[Sync] Found ${returnOrdersMap.size} return order mapping(s) from Square`);

  for (const order of orders) {
    // Skip standalone return orders from being treated as regular sales orders
    if (order.returns && order.returns.length > 0 && order.returns[0].sourceOrderId) {
      continue;
    }
    if (order.refunds && order.refunds.length > 0 && order.refunds[0].transactionId) {
      continue;
    }

    const metadata = order.metadata || {};
    const sourceName = (order.source?.name || '').toLowerCase();
    const linkedReturn = returnOrdersMap.get(order.id) || null;
    const refundData = extractOrderRefundData(order, linkedReturn);

    // ── HANDLE WEBSITE ORDERS SEPARATELY ──
    if (metadata.source === 'website') {
      const fState = order.fulfillments && order.fulfillments.length > 0 ? order.fulfillments[0].state : 'NONE';
      const status = resolveOrderStatus(order, fState, refundData);
      
      console.log(`[Sync] Website Order ${order.id} | Square State: ${order.state} | Fulfillment: ${fState} | Status: ${status} | Refunded: $${refundData.refundedAmount}`);
      
      const docRef = db.collection('orders').doc(order.id);
      const updateData = {
        status,
        grossTotal: refundData.grossTotal,
        grossTotalCents: refundData.grossTotalCents,
        refundedAmount: refundData.refundedAmount,
        refundedAmountCents: refundData.refundedAmountCents,
        netTotal: refundData.netTotal,
        netTotalCents: refundData.netTotalCents,
        refundStatus: refundData.refundStatus,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (refundData.refundReason) {
        updateData.refundReason = refundData.refundReason;
      }
      if (refundData.cancellationReason) {
        updateData.cancellationReason = refundData.cancellationReason;
      }

      if (linkedReturn?.returns && linkedReturn.returns.length > 0) {
        updateData.returns = linkedReturn.returns;
      } else if (order.returns && order.returns.length > 0) {
        updateData.returns = order.returns.map(r => ({
          id: r.id,
          sourceOrderId: r.sourceOrderId,
          returnLineItems: (r.returnLineItems || []).map(rli => ({
            name: rli.name || 'Returned Item',
            quantity: rli.quantity,
            amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : 0
          }))
        }));
      }

      batch.set(docRef, updateData, { merge: true });

      // If refunded, revert customer loyalty points & spend
      const customerPhone = metadata.customerPhone || '';
      if (customerPhone && refundData.refundedAmountCents > 0) {
        try {
          const { revertCustomerOnRefund } = require('./customers');
          await revertCustomerOnRefund(customerPhone, refundData.refundedAmountCents, refundData.isFullRefund || refundData.isCanceled);
        } catch (e) {
          console.warn('revertCustomerOnRefund error (non-fatal):', e);
        }
      }
      
      syncedOrders.push({
        id: order.id,
        source: 'website',
        customerName: metadata.customerName || 'Guest',
        status,
        itemCount: order.lineItems ? order.lineItems.length : 0,
        refundedAmount: refundData.refundedAmount,
        netTotal: refundData.netTotal,
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
    const fulfillmentState = order.fulfillments && order.fulfillments.length > 0 ? order.fulfillments[0].state : 'NONE';
    const status = resolveOrderStatus(order, fulfillmentState, refundData);

    if (existingDoc.exists) {
      const prevData = existingDoc.data();
      const prevRefundCents = prevData.refundedAmountCents || 0;
      // Skip ONLY if status hasn't changed and no new refund has occurred and was completed
      if (prevData.status === status && prevRefundCents === refundData.refundedAmountCents && status === 'completed') {
        continue;
      }
    }

    let source = 'pos';
    if (sourceName.includes('doordash') || sourceName.includes('door dash')) source = 'doordash';
    else if (sourceName.includes('uber') || sourceName.includes('ubereats')) source = 'ubereats';
    else if (sourceName.includes('grubhub') || sourceName.includes('grub hub')) source = 'grubhub';
    else if (sourceName.includes('square online') || sourceName.includes('online store') || sourceName.includes('online')) source = 'squareonline';

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

    const orderData = {
      squareOrderId: order.id,
      source,
      customerName,
      customerPhone: metadata.customerPhone || '',
      items,
      total: refundData.grossTotal,
      totalCents: refundData.grossTotalCents,
      grossTotal: refundData.grossTotal,
      grossTotalCents: refundData.grossTotalCents,
      refundedAmount: refundData.refundedAmount,
      refundedAmountCents: refundData.refundedAmountCents,
      netTotal: refundData.netTotal,
      netTotalCents: refundData.netTotalCents,
      refundStatus: refundData.refundStatus,
      status,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(order.createdAt)),
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (refundData.refundReason) orderData.refundReason = refundData.refundReason;
    if (refundData.cancellationReason) orderData.cancellationReason = refundData.cancellationReason;

    if (linkedReturn?.returns && linkedReturn.returns.length > 0) {
      orderData.returns = linkedReturn.returns;
    } else if (order.returns && order.returns.length > 0) {
      orderData.returns = order.returns.map(r => ({
        id: r.id,
        sourceOrderId: r.sourceOrderId,
        returnLineItems: (r.returnLineItems || []).map(rli => ({
          name: rli.name || 'Returned Item',
          quantity: rli.quantity,
          amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : 0
        }))
      }));
    }

    const docRef = db.collection('orders').doc(order.id);
    batch.set(docRef, orderData, { merge: true });

    const phone = metadata.customerPhone || '';
    if (phone && refundData.refundedAmountCents > 0) {
      try {
        const { revertCustomerOnRefund } = require('./customers');
        await revertCustomerOnRefund(phone, refundData.refundedAmountCents, refundData.isFullRefund || refundData.isCanceled);
      } catch (e) {
        console.warn('revertCustomerOnRefund error (non-fatal):', e);
      }
    }

    syncedOrders.push({
      id: order.id,
      source,
      customerName,
      status,
      itemCount: items.length,
      refundedAmount: refundData.refundedAmount,
      netTotal: refundData.netTotal,
    });
  }

  await batch.commit();

  // ── Step 2: Directly apply return orders to Firestore documents ──
  for (const [sourceOrderId, retData] of returnOrdersMap.entries()) {
    try {
      const docRef = db.collection('orders').doc(sourceOrderId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const existing = docSnap.data();
        const grossCents = existing.grossTotalCents || existing.totalCents || Math.round((existing.total || 0) * 100);
        const prevRefundCents = existing.refundedAmountCents || 0;
        let newRefundCents = Math.max(prevRefundCents, retData.refundAmountCents);

        const retLinesCount = retData.returns ? retData.returns.length : 0;
        const origLinesCount = (existing.items && Array.isArray(existing.items)) ? existing.items.length : 1;
        const retItemsAmountCents = retData.returns ? Math.round(retData.returns.reduce((sum, r) => sum + (Number(r.amount) || 0) * 100, 0)) : 0;

        if (newRefundCents === 0 && retItemsAmountCents > 0) {
          newRefundCents = retItemsAmountCents;
        }

        // If returned line items equal/exceed order items, or refund covers subtotal, it is a 100% full refund & cancel
        if (retLinesCount >= origLinesCount || newRefundCents >= (existing.subtotalCents || Math.round(grossCents * 0.9))) {
          newRefundCents = grossCents;
        }

        const isFull = grossCents > 0 && newRefundCents >= grossCents;
        const netCents = Math.max(0, grossCents - newRefundCents);
        const newStatus = isFull ? 'cancelled' : (newRefundCents > 0 ? 'partially_refunded' : existing.status);

        if (existing.status !== newStatus || prevRefundCents !== newRefundCents || existing.netTotalCents !== netCents) {
          console.log(`[Sync] Updating Order ${sourceOrderId} from Return Map: Refund=$${(newRefundCents / 100).toFixed(2)}, Status=${newStatus}, Reason=${retData.reason}`);
          await docRef.set({
            status: newStatus,
            refundedAmountCents: newRefundCents,
            refundedAmount: newRefundCents / 100,
            netTotalCents: netCents,
            netTotal: netCents / 100,
            refundStatus: isFull ? 'full' : 'partial',
            refundReason: retData.reason || existing.refundReason || 'Returned Goods',
            cancellationReason: isFull ? (retData.reason || 'Order cancelled on Square') : (existing.cancellationReason || ''),
            returns: (retData.returns && retData.returns.length > 0) ? retData.returns : (existing.returns || []),
            squareRefundId: retData.refundId || existing.squareRefundId || null,
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          if (existing.customerPhone && newRefundCents > prevRefundCents) {
            try {
              const { revertCustomerOnRefund } = require('./customers');
              await revertCustomerOnRefund(existing.customerPhone, newRefundCents - prevRefundCents, isFull);
            } catch (e) {}
          }

          syncedOrders.push({
            id: sourceOrderId,
            source: existing.source || 'website',
            customerName: existing.customerName || 'Guest',
            status: newStatus,
            refundedAmount: newRefundCents / 100,
            netTotal: netCents / 100,
            isReturnSync: true
          });
        }
      }
    } catch (err) {
      console.warn(`[Sync] Error updating return order ${sourceOrderId}:`, err.message);
    }
  }

  // ── Step 3: Direct Query to Square Refunds API (catches refunds issued via Square Dashboard / POS) ──
  try {
    const last48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    // Call listPaymentRefunds with only beginTime to avoid INVALID_URL query parameter errors
    const refundsResponse = await squareClient.refundsApi.listPaymentRefunds(
      last48Hours.toISOString()
    );
    const refunds = refundsResponse.result.refunds || [];
    console.log(`[Sync] Found ${refunds.length} Square payment refund(s) in the last 48h`);

    for (const ref of refunds) {
      if (ref.status !== 'COMPLETED' && ref.status !== 'PENDING' && ref.status !== 'APPROVED') continue;
      const orderId = ref.orderId;
      const paymentId = ref.paymentId;
      const refundAmtCents = ref.amountMoney ? Number(ref.amountMoney.amount) : 0;
      if (refundAmtCents <= 0) continue;

      let targetRef = null;
      let orderDoc = null;

      // 1. Try finding by squarePaymentId
      if (paymentId) {
        const qSnap = await db.collection('orders').where('squarePaymentId', '==', paymentId).limit(1).get();
        if (!qSnap.empty) {
          targetRef = qSnap.docs[0].ref;
          orderDoc = qSnap.docs[0].data();
        }
      }

      // 2. Try finding by orderId directly
      if (!targetRef && orderId) {
        const snap = await db.collection('orders').doc(orderId).get();
        if (snap.exists) {
          targetRef = snap.ref;
          orderDoc = snap.data();
        }
      }

      // 3. Try finding if orderId in refund is a Square Return Order pointing to original order
      if (!targetRef && orderId) {
        try {
          const retOrd = await squareClient.ordersApi.retrieveOrder(orderId);
          const origId = retOrd.result.order?.returns?.[0]?.sourceOrderId || retOrd.result.order?.refunds?.[0]?.transactionId;
          if (origId) {
            const sSnap = await db.collection('orders').doc(origId).get();
            if (sSnap.exists) {
              targetRef = sSnap.ref;
              orderDoc = sSnap.data();
            }
          }
        } catch (e) {}
      }

      if (targetRef && orderDoc) {
        const grossTotalCents = orderDoc.grossTotalCents || orderDoc.totalCents || Math.round((orderDoc.total || 0) * 100);
        const prevRefundedCents = orderDoc.refundedAmountCents || 0;
        const newRefundedCents = Math.max(prevRefundedCents, refundAmtCents);
        const isFull = grossTotalCents > 0 && newRefundedCents >= grossTotalCents;
        const newStatus = isFull ? 'cancelled' : 'partially_refunded';
        const netTotalCents = Math.max(0, grossTotalCents - newRefundedCents);

        // If data is already up to date, skip
        if (orderDoc.status === newStatus && prevRefundedCents === newRefundedCents) {
          continue;
        }

        console.log(`[Sync] Updating Order ${targetRef.id} with Payment Refund: $${(newRefundedCents / 100).toFixed(2)}, status -> ${newStatus}`);

        const reason = ref.reason || orderDoc.refundReason || 'Returned Goods';
        await targetRef.set({
          refundedAmountCents: newRefundedCents,
          refundedAmount: newRefundedCents / 100,
          netTotalCents: netTotalCents,
          netTotal: netTotalCents / 100,
          status: newStatus,
          refundStatus: isFull ? 'full' : 'partial',
          refundReason: reason,
          cancellationReason: isFull ? reason : (orderDoc.cancellationReason || ''),
          squareRefundId: ref.id,
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const phone = orderDoc.customerPhone || '';
        if (phone && prevRefundedCents < newRefundedCents) {
          try {
            const { revertCustomerOnRefund } = require('./customers');
            await revertCustomerOnRefund(phone, newRefundedCents - prevRefundedCents, isFull);
          } catch (e) {
            console.warn('revertCustomerOnRefund error (non-fatal):', e);
          }
        }

        syncedOrders.push({
          id: targetRef.id,
          source: orderDoc.source || 'website',
          customerName: orderDoc.customerName || 'Guest',
          status: newStatus,
          refundedAmount: newRefundedCents / 100,
          netTotal: netTotalCents / 100,
          isRefundSync: true
        });
      }
    }
  } catch (refErr) {
    console.warn('[Sync] listPaymentRefunds warning (non-fatal):', refErr.message);
  }

  return syncedOrders;
}

exports.syncSquareOrders = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const syncedOrders = await performSquareSync();
      return res.json({
        success: true,
        synced: syncedOrders.length
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
    console.log(`[Square Webhook] Received event: ${eventType}`);

    // ── Handle refund events (refund.created, refund.updated) ──
    if (eventType === 'refund.created' || eventType === 'refund.updated') {
      const refund = event.data?.object?.refund;
      if (!refund) return res.status(200).send('No refund payload');

      const orderId = refund.order_id;
      const paymentId = refund.payment_id;
      const refundAmountCents = refund.amount_money ? Number(refund.amount_money.amount) : 0;
      const refundStatus = refund.status; // e.g. 'COMPLETED'

      console.log(`[Square Webhook] Refund event ${refund.id} for order ${orderId}, amount: ${refundAmountCents} cents, status: ${refundStatus}`);

      // Locate the order in Firestore
      let targetOrderRef = null;
      let orderDoc = null;

      // 1. Try finding by squarePaymentId
      if (paymentId) {
        const qSnap = await db.collection('orders').where('squarePaymentId', '==', paymentId).limit(1).get();
        if (!qSnap.empty) {
          targetOrderRef = qSnap.docs[0].ref;
          orderDoc = qSnap.docs[0].data();
        }
      }

      // 2. Try finding by transaction_id (which is original order ID in Square)
      if (!targetOrderRef && refund.transaction_id) {
        const docSnap = await db.collection('orders').doc(refund.transaction_id).get();
        if (docSnap.exists) {
          targetOrderRef = docSnap.ref;
          orderDoc = docSnap.data();
        }
      }

      // 3. Try finding by orderId directly
      if (!targetOrderRef && orderId) {
        const docSnap = await db.collection('orders').doc(orderId).get();
        if (docSnap.exists) {
          targetOrderRef = docSnap.ref;
          orderDoc = docSnap.data();
        }
      }

      // 4. If orderId is a return order, fetch it from Square to get sourceOrderId
      if (!targetOrderRef && orderId) {
        try {
          const squareClient = getSquareClient();
          const retOrd = await squareClient.ordersApi.retrieveOrder(orderId);
          const origId = retOrd.result.order?.returns?.[0]?.sourceOrderId || retOrd.result.order?.refunds?.[0]?.transactionId;
          if (origId) {
            const sSnap = await db.collection('orders').doc(origId).get();
            if (sSnap.exists) {
              targetOrderRef = sSnap.ref;
              orderDoc = sSnap.data();
            }
          }
        } catch (e) {}
      }

      if (targetOrderRef && orderDoc) {
        const grossTotalCents = orderDoc.grossTotalCents || orderDoc.totalCents || Math.round((orderDoc.total || 0) * 100);
        const existingRefundedCents = orderDoc.refundedAmountCents || 0;
        const newRefundedCents = Math.min(grossTotalCents, Math.max(existingRefundedCents, refundAmountCents));
        const isFull = grossTotalCents > 0 && newRefundedCents >= grossTotalCents;

        const updateData = {
          status: isFull ? 'cancelled' : 'partially_refunded',
          refundStatus: isFull ? 'full' : 'partial',
          refundReason: refund.reason || orderDoc.refundReason || 'Returned Goods',
          cancellationReason: isFull ? (refund.reason || orderDoc.cancellationReason || 'Order cancelled on Square') : (orderDoc.cancellationReason || ''),
          refundedAmountCents: newRefundedCents,
          refundedAmount: newRefundedCents / 100,
          netTotalCents: Math.max(0, grossTotalCents - newRefundedCents),
          netTotal: Math.max(0, grossTotalCents - newRefundedCents) / 100,
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          refunds: admin.firestore.FieldValue.arrayUnion({
            id: refund.id,
            amountCents: refundAmountCents,
            amount: refundAmountCents / 100,
            status: refundStatus,
            reason: refund.reason || 'Returned Goods',
            createdAt: new Date().toISOString()
          })
        };

        await targetOrderRef.set(updateData, { merge: true });

        if (orderDoc.customerPhone && refundAmountCents > 0) {
          try {
            const { revertCustomerOnRefund } = require('./customers');
            await revertCustomerOnRefund(orderDoc.customerPhone, refundAmountCents, isFull);
          } catch (e) {
            console.warn('revertCustomerOnRefund error (webhook):', e);
          }
        }

        console.log(`[Square Webhook] Order ${targetOrderRef.id} updated with refund of $${(refundAmountCents / 100).toFixed(2)}`);
      }

      return res.status(200).send('OK (Refund processed)');
    }

    // ── Handle payment events (payment.updated with refund or void) ──
    if (eventType === 'payment.updated') {
      const payment = event.data?.object?.payment;
      if (payment) {
        const isVoided = payment.status === 'CANCELED' || payment.card_details?.status === 'VOIDED' || payment.card_details?.status === 'FAILED';
        const refundedCents = (payment.refunded_money && Number(payment.refunded_money.amount)) || 0;

        if (isVoided || refundedCents > 0) {
          const qSnap = await db.collection('orders').where('squarePaymentId', '==', payment.id).limit(1).get();
          if (!qSnap.empty) {
            const docSnap = qSnap.docs[0];
            const orderDoc = docSnap.data();
            const grossTotalCents = orderDoc.grossTotalCents || orderDoc.totalCents || Math.round((orderDoc.total || 0) * 100);
            const isFull = isVoided || (refundedCents >= grossTotalCents);
            const actualRefundCents = isVoided ? grossTotalCents : refundedCents;

            const updateData = {
              status: isFull ? 'cancelled' : 'partially_refunded',
              refundStatus: isFull ? 'full' : 'partial',
              refundedAmountCents: actualRefundCents,
              refundedAmount: actualRefundCents / 100,
              netTotalCents: Math.max(0, grossTotalCents - actualRefundCents),
              netTotal: Math.max(0, grossTotalCents - actualRefundCents) / 100,
              refundReason: isVoided ? 'Payment voided / cancelled on Square' : (orderDoc.refundReason || 'Returned Goods'),
              cancellationReason: isFull ? (isVoided ? 'Payment voided / cancelled on Square' : (orderDoc.cancellationReason || 'Order cancelled on Square')) : '',
              refundedAt: admin.firestore.FieldValue.serverTimestamp(),
              webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await docSnap.ref.set(updateData, { merge: true });

            if (orderDoc.customerPhone && actualRefundCents > 0) {
              try {
                const { revertCustomerOnRefund } = require('./customers');
                await revertCustomerOnRefund(orderDoc.customerPhone, actualRefundCents, isFull);
              } catch (e) {}
            }
          }
        }
      }
      return res.status(200).send('OK (Payment event processed)');
    }

    // ── Handle order events (order.created, order.updated) ──
    const orderData = event.data?.object?.order;
    if (!orderData || !orderData.id) {
      return res.status(200).send('No order data, ignoring.');
    }

    // ── If order is a Square Return Order, update its source order in Firestore ──
    if (orderData.returns && orderData.returns.length > 0 && orderData.returns[0].sourceOrderId) {
      const origId = orderData.returns[0].sourceOrderId;
      const docRef = db.collection('orders').doc(origId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const existing = docSnap.data();
        const grossCents = existing.grossTotalCents || existing.totalCents || Math.round((existing.total || 0) * 100);
        const returnObj = orderData.returns[0];
        const retLineItems = (returnObj.returnLineItems || []).map(rli => ({
          name: rli.name || 'Returned Item',
          quantity: rli.quantity,
          amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : (rli.totalMoney ? Number(rli.totalMoney.amount) / 100 : 0)
        }));

        const retAmtCents = extractReturnAmountCents(orderData, returnObj, orderData.refunds?.[0]);
        let newRefundCents = Math.max(existing.refundedAmountCents || 0, retAmtCents);

        const retLinesCount = retLineItems.length;
        const origLinesCount = (existing.items && Array.isArray(existing.items)) ? existing.items.length : 1;
        const retItemsAmountCents = Math.round(retLineItems.reduce((sum, r) => sum + (Number(r.amount) || 0) * 100, 0));

        if (newRefundCents === 0 && retItemsAmountCents > 0) {
          newRefundCents = retItemsAmountCents;
        }

        // If returned line items equal/exceed order items, or refund covers subtotal, it is a 100% full refund & cancel
        if (retLinesCount >= origLinesCount || newRefundCents >= (existing.subtotalCents || Math.round(grossCents * 0.9))) {
          newRefundCents = grossCents;
        }

        const isFull = grossCents > 0 && newRefundCents >= grossCents;
        const reason = orderData.refunds?.[0]?.reason || returnObj.reason || existing.refundReason || 'Returned Goods';

        await docRef.set({
          status: isFull ? 'cancelled' : 'partially_refunded',
          refundedAmountCents: newRefundCents,
          refundedAmount: newRefundCents / 100,
          netTotalCents: Math.max(0, grossCents - newRefundCents),
          netTotal: Math.max(0, grossCents - newRefundCents) / 100,
          refundStatus: isFull ? 'full' : 'partial',
          refundReason: reason,
          cancellationReason: isFull ? (reason || 'Order cancelled on Square') : (existing.cancellationReason || ''),
          returns: retLineItems,
          squareRefundId: orderData.refunds?.[0]?.id || orderData.id,
          webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (existing.customerPhone && newRefundCents > (existing.refundedAmountCents || 0)) {
          try {
            const { revertCustomerOnRefund } = require('./customers');
            await revertCustomerOnRefund(existing.customerPhone, newRefundCents - (existing.refundedAmountCents || 0), isFull);
          } catch (e) {}
        }
      }
      return res.status(200).send('OK (Square return order linked to source)');
    }

    const metadata = orderData.metadata || {};
    const sourceName = (orderData.source?.name || '').toLowerCase();
    const refundData = extractOrderRefundData(orderData);
    const fState = orderData.fulfillments && orderData.fulfillments.length > 0 ? orderData.fulfillments[0].state : 'NONE';
    const status = resolveOrderStatus(orderData, fState, refundData);

    // ── HANDLE WEBSITE ORDERS SEPARATELY ──
    if (metadata.source === 'website') {
      const updateData = {
        status,
        grossTotal: refundData.grossTotal,
        grossTotalCents: refundData.grossTotalCents,
        refundedAmount: refundData.refundedAmount,
        refundedAmountCents: refundData.refundedAmountCents,
        netTotal: refundData.netTotal,
        netTotalCents: refundData.netTotalCents,
        refundStatus: refundData.refundStatus,
        webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (refundData.refundReason) updateData.refundReason = refundData.refundReason;
      if (refundData.cancellationReason) updateData.cancellationReason = refundData.cancellationReason;

      if (orderData.returns && orderData.returns.length > 0) {
        updateData.returns = orderData.returns.map(r => ({
          id: r.id,
          sourceOrderId: r.sourceOrderId,
          returnLineItems: (r.returnLineItems || []).map(rli => ({
            name: rli.name || 'Returned Item',
            quantity: rli.quantity,
            amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : 0
          }))
        }));
      }

      await db.collection('orders').doc(orderData.id).set(updateData, { merge: true });

      const customerPhone = metadata.customerPhone || '';
      if (customerPhone && refundData.refundedAmountCents > 0) {
        try {
          const { revertCustomerOnRefund } = require('./customers');
          await revertCustomerOnRefund(customerPhone, refundData.refundedAmountCents, refundData.isFullRefund || refundData.isCanceled);
        } catch (e) {}
      }
      
      console.log(`Webhook processed for WEBSITE order ${orderData.id}: status=${status}, refunded=$${refundData.refundedAmount}`);
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

    const firestoreData = {
      squareOrderId: orderData.id,
      source,
      customerName,
      customerPhone: metadata.customerPhone || '',
      items,
      total: refundData.grossTotal,
      totalCents: refundData.grossTotalCents,
      grossTotal: refundData.grossTotal,
      grossTotalCents: refundData.grossTotalCents,
      refundedAmount: refundData.refundedAmount,
      refundedAmountCents: refundData.refundedAmountCents,
      netTotal: refundData.netTotal,
      netTotalCents: refundData.netTotalCents,
      refundStatus: refundData.refundStatus,
      status,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(orderData.createdAt)),
      webhookUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (orderData.returns && orderData.returns.length > 0) {
      firestoreData.returns = orderData.returns.map(r => ({
        id: r.id,
        sourceOrderId: r.sourceOrderId,
        returnLineItems: (r.returnLineItems || []).map(rli => ({
          name: rli.name || 'Returned Item',
          quantity: rli.quantity,
          amount: rli.basePriceMoney ? Number(rli.basePriceMoney.amount) / 100 : 0
        }))
      }));
    }

    await db.collection('orders').doc(orderData.id).set(firestoreData, { merge: true });

    const phone = metadata.customerPhone || '';
    if (phone && refundData.refundedAmountCents > 0) {
      try {
        const { revertCustomerOnRefund } = require('./customers');
        await revertCustomerOnRefund(phone, refundData.refundedAmountCents, refundData.isFullRefund || refundData.isCanceled);
      } catch (e) {}
    }

    console.log(`Webhook processed: ${eventType} for order ${orderData.id} (source: ${source}, status: ${status}, refunded: $${refundData.refundedAmount})`);
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

  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'canceled', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const docRef = db.collection('orders').doc(orderId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found.');
  }

  const orderData = doc.data();
  const isCancel = status === 'canceled' || status === 'cancelled';
  const normStatus = isCancel ? 'cancelled' : status;

  // Determine Square fulfillment state
  let squareState = '';
  if (status === 'preparing') squareState = 'RESERVED';
  else if (status === 'ready') squareState = 'PREPARED';
  else if (status === 'completed') squareState = 'COMPLETED';
  else if (isCancel) squareState = 'CANCELED';

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
        } else if (isCancel) {
          orderUpdate.state = 'CANCELED';
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
    }
  }

  const updateFields = {
    status: normStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (isCancel && data.reason) {
    updateFields.cancellationReason = data.reason.trim();
    updateFields.refundReason = data.reason.trim();
  }

  // If canceling a paid order and refund requested (or default true)
  if (isCancel && data.refundPayment !== false && orderData.squarePaymentId) {
    const grossCents = orderData.grossTotalCents || orderData.totalCents || Math.round((orderData.total || 0) * 100);
    const prevRefundedCents = orderData.refundedAmountCents || 0;
    const toRefundCents = Math.max(0, grossCents - prevRefundedCents);

    if (toRefundCents > 0) {
      try {
        const squareClient = getSquareClient();
        const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const refundResp = await squareClient.refundsApi.refundPayment({
          idempotencyKey,
          amountMoney: {
            amount: BigInt(toRefundCents),
            currency: 'USD'
          },
          paymentId: orderData.squarePaymentId,
          reason: data.reason || 'Order cancelled by restaurant'
        });

        updateFields.refundedAmountCents = grossCents;
        updateFields.refundedAmount = grossCents / 100;
        updateFields.netTotalCents = 0;
        updateFields.netTotal = 0;
        updateFields.refundStatus = 'full';
        updateFields.refundedAt = admin.firestore.FieldValue.serverTimestamp();
        updateFields.squareRefundId = refundResp.result.refund?.id || null;

        if (orderData.customerPhone) {
          try {
            const { revertCustomerOnRefund } = require('./customers');
            await revertCustomerOnRefund(orderData.customerPhone, toRefundCents, true);
          } catch (e) {}
        }
      } catch (sqRefundErr) {
        console.error('Automatic cancel refund failed:', sqRefundErr);
      }
    }
  }

  // Send Push Notification
  if (orderData.fcmToken) {
    try {
      if (status === 'ready') {
        await admin.messaging().send({
          token: orderData.fcmToken,
          notification: {
            title: 'Your order is ready!',
            body: `Your Bigi Awasaana order #${orderId.slice(-4).toUpperCase()} is ready for pickup!`
          }
        });
      } else if (isCancel) {
        await admin.messaging().send({
          token: orderData.fcmToken,
          notification: {
            title: 'Order Cancelled & Refunded',
            body: data.reason ? `Reason: ${data.reason}. Full refund processed.` : 'Your order was cancelled and a full refund has been issued.'
          }
        });
      }
    } catch (err) {
      console.error('Failed to send FCM push notification:', err);
    }
  }

  await docRef.update(updateFields);

  return { success: true, orderId, status: normStatus };
});

// ─────────────────────────────────────────────────────────────────
// updateLiveStats
// Firestore trigger to maintain active ASAP order count
// ─────────────────────────────────────────────────────────────────
exports.updateLiveStats = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    // Only proceed if it's a creation, deletion, or if status/pickup type changed
    const before = change.before.data();
    const after = change.after.data();

    if (before && after) {
      const beforeActive = ['pending', 'preparing', 'ready'].includes(before.status);
      const afterActive = ['pending', 'preparing', 'ready'].includes(after.status);
      const beforeAsap = before.pickup && before.pickup.type === 'asap';
      const afterAsap = after.pickup && after.pickup.type === 'asap';
      
      if (before.status === after.status && beforeActive === afterActive && beforeAsap === afterAsap) {
        return null; // No relevant change
      }
    }

    // Do a full aggregation of active orders
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeSnapshot = await db.collection('orders')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
        .where('status', 'in', ['pending', 'preparing', 'ready'])
        .get();
        
      let asapCount = 0;
      let readyCount = 0;
      activeSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'ready') {
          readyCount++;
        } else if (data.pickup && data.pickup.type === 'asap') {
          asapCount++;
        }
      });
      
      const payload = {
        activeAsapOrderCount: asapCount,
        readyOrdersCount: readyCount,
        kitchenStatus: readyCount > 0 ? 'ORDER READY' : 'PREPARING FRESH',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // If an order just transitioned into 'ready', record timestamp
      if (after && after.status === 'ready' && (!before || before.status !== 'ready')) {
        payload.lastOrderReadyAt = admin.firestore.FieldValue.serverTimestamp();
        payload.lastOrderReadyId = context.params.orderId;
      }

      await db.collection('liveStats').doc('current').set(payload, { merge: true });
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
// refundSquarePayment
// HTTPS Callable function: Issues a refund via Square Refunds API
// and updates Firestore orders, net amounts, and customer metrics
// ─────────────────────────────────────────────────────────────────
exports.refundSquarePayment = functions.https.onCall(async (data, context) => {
  // Security Check: Only admins can issue Square refunds
  if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can issue refunds.');
  }

  const { orderId, amount, reason } = data || {};
  if (!orderId || typeof orderId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid orderId.');
  }

  const orderDocRef = db.collection('orders').doc(orderId);
  const snap = await orderDocRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', `Order ${orderId} not found.`);
  }

  const orderData = snap.data();
  const squarePaymentId = orderData.squarePaymentId;
  const grossCents = orderData.grossTotalCents || orderData.totalCents || Math.round((orderData.total || 0) * 100);
  const currentRefundedCents = orderData.refundedAmountCents || 0;
  const availableToRefundCents = Math.max(0, grossCents - currentRefundedCents);

  if (availableToRefundCents <= 0) {
    throw new functions.https.HttpsError('failed-precondition', 'This order is already fully refunded.');
  }

  let refundAmtCents = availableToRefundCents;
  if (typeof amount === 'number' && amount > 0) {
    refundAmtCents = Math.min(Math.round(amount * 100), availableToRefundCents);
  }

  if (refundAmtCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Refund amount must be greater than zero.');
  }

  let squareRefund = null;
  if (squarePaymentId) {
    try {
      const squareClient = getSquareClient();
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const refundResp = await squareClient.refundsApi.refundPayment({
        idempotencyKey,
        amountMoney: {
          amount: BigInt(refundAmtCents),
          currency: 'USD'
        },
        paymentId: squarePaymentId,
        reason: reason || 'Customer refund issued from Bigi Awasaana Admin'
      });
      squareRefund = refundResp.result.refund;
    } catch (sqErr) {
      console.error('Square refund API call failed:', sqErr);
      throw new functions.https.HttpsError('internal', `Square refund failed: ${sqErr.message || 'Payment provider error'}`);
    }
  }

  const isCancel = Boolean(data.cancelOrder) || isFull;
  const newStatus = isCancel ? 'cancelled' : (isFull ? 'refunded' : 'partially_refunded');
  const newNetCents = Math.max(0, grossCents - newTotalRefundedCents);

  // Sync cancellation to Square Orders API if requested
  if (isCancel && orderData.squareOrderId) {
    try {
      const squareClient = getSquareClient();
      const locationId = getLocationId();
      const currentOrder = await squareClient.ordersApi.retrieveOrder(orderData.squareOrderId);
      const version = currentOrder.result.order.version;
      const fulfillmentUid = currentOrder.result.order.fulfillments?.[0]?.uid;
      const orderUpdate = {
        locationId,
        version,
        state: 'CANCELED'
      };
      if (fulfillmentUid) {
        orderUpdate.fulfillments = [{ uid: fulfillmentUid, state: 'CANCELED' }];
      }
      await squareClient.ordersApi.updateOrder(orderData.squareOrderId, {
        order: orderUpdate,
        idempotencyKey: crypto.randomUUID()
      });
      console.log(`[Refund] Canceled Square Order ${orderData.squareOrderId}`);
    } catch (sqCancelErr) {
      console.warn('Square order cancel failed (non-fatal):', sqCancelErr.message);
    }
  }

  const cleanReason = reason && typeof reason === 'string' ? reason.trim() : 'Cancelled and refunded';

  await orderDocRef.update({
    refundedAmountCents: newTotalRefundedCents,
    refundedAmount: newTotalRefundedCents / 100,
    netTotalCents: newNetCents,
    netTotal: newNetCents / 100,
    status: newStatus,
    refundStatus: isFull ? 'full' : 'partial',
    refundReason: cleanReason,
    cancellationReason: isCancel ? cleanReason : (orderData.cancellationReason || ''),
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    squareRefundId: squareRefund?.id || null
  });

  // Send Push Notification if registered
  if (orderData.fcmToken) {
    try {
      await admin.messaging().send({
        token: orderData.fcmToken,
        notification: {
          title: isCancel ? 'Order Cancelled & Refunded' : 'Item Refund Issued',
          body: cleanReason ? `Reason: ${cleanReason}. $${(refundAmtCents / 100).toFixed(2)} refunded.` : `$${(refundAmtCents / 100).toFixed(2)} refunded to your card.`
        }
      });
    } catch (fcmErr) {
      console.warn('FCM push notification failed (non-fatal):', fcmErr.message);
    }
  }

  if (orderData.customerPhone) {
    try {
      const { revertCustomerOnRefund } = require('./customers');
      await revertCustomerOnRefund(orderData.customerPhone, refundAmtCents, isFull);
    } catch (custErr) {
      console.warn('revertCustomerOnRefund error (non-fatal):', custErr);
    }
  }

  return {
    success: true,
    orderId,
    refundedAmount: refundAmtCents / 100,
    totalRefunded: newTotalRefundedCents / 100,
    netTotal: newNetCents / 100,
    status: newStatus
  };
});
