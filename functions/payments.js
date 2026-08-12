const { functions, admin, db, TAX_RATE, getSquareClient, getLocationId } = require('./shared');
const crypto = require('crypto');
const { ApiError } = require('square');
const { evaluateDeals } = require('./deals-evaluator');

// ─────────────────────────────────────────────────────────────────
// processSquarePayment
// Callable function: receives item IDs + quantities + card token + tipCents
// Fetches prices SERVER-SIDE from Firestore (browser cannot control amounts)
// Calculates tax server-side (10.25% LA County)
// Validates tip (max $100)
// Creates Square Order + Payment, then writes to Firestore
// ─────────────────────────────────────────────────────────────────
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
