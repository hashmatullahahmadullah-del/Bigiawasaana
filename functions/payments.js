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
  const { sourceId, items, customerName, customerPhone, customerEmail, tipCents: rawTipCents, pickupType, pickupTime, saveCard, pin } = data;

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

    if (cartItem.isMeal && cartItem.mealUpgradeId) {
      const mealDoc = await db.collection('menu').doc(cartItem.mealUpgradeId).get();
      if (mealDoc.exists) {
        const mealData = mealDoc.data();
        const mealPrice = typeof mealData.price === 'number' ? mealData.price : parseFloat(mealData.price);
        if (!isNaN(mealPrice)) {
          const upgradeCost = Math.max(0, mealPrice - basePrice);
          finalPrice += upgradeCost;
        }
      }
    }

    menuItems.push({ id: cartItem.id, ...menuData, price: finalPrice, originalPrice: basePrice });

    const itemTotalCents = Math.round(finalPrice * 100) * cartItem.qty;
    subtotalCents += itemTotalCents;

    let modsText = '';
    if (cartItem.selectedVariant) modsText += ` (${cartItem.selectedVariant})`;
    if (cartItem.isMeal) modsText += ` (Meal Upgrade)`;
    if (Array.isArray(cartItem.selectedAddOns) && cartItem.selectedAddOns.length > 0) modsText += ` [+${cartItem.selectedAddOns.join(', ')}]`;

    resolvedItems.push({
      itemId: cartItem.id,
      name: menuData.name + modsText,
      quantity: cartItem.qty,
      price: finalPrice,
      totalCents: itemTotalCents,
      selectedVariant: cartItem.selectedVariant || '',
      selectedAddOns: Array.isArray(cartItem.selectedAddOns) ? cartItem.selectedAddOns : [],
      isMeal: !!cartItem.isMeal,
      mealUpgradeId: cartItem.mealUpgradeId || null,
      cartKey: cartItem.cartKey || ''
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

  function isStoreOpenAtTime(dateObj, config) {
    const laDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const currentDay = laDate.getDay();
    const currentH = laDate.getHours();
    const currentM = laDate.getMinutes();
    
    if (config.openDays && Array.isArray(config.openDays)) {
      if (!config.openDays.includes(currentDay)) return false;
    }
    
    if (!config.businessHours) return true;
    
    const [openH, openM] = config.businessHours.open.split(':').map(Number);
    const [closeH, closeM] = config.businessHours.close.split(':').map(Number);
    
    const currentTime = currentH * 60 + currentM;
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    
    if (closeTime > openTime) {
      if (currentTime < openTime || currentTime >= closeTime) return false;
    } else {
      if (currentTime < openTime && currentTime >= closeTime) return false;
    }
    return true;
  }

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
    businessHours: { open: "13:00", close: "22:30" }
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
    
    if (!isStoreOpenAtTime(requestedDate, config)) {
      throw new functions.https.HttpsError('failed-precondition', 'The selected scheduled pickup time is outside of our business hours or on a closed day.');
    }
    
    requestedTime = admin.firestore.Timestamp.fromDate(requestedDate);
    estimatedReadyTime = requestedTime;
    releasedToKitchen = false;
  } else {
    // ASAP
    if (!isStoreOpenAtTime(now, config)) {
      throw new functions.https.HttpsError('failed-precondition', 'The store is currently closed. Please select a Scheduled pickup time instead.');
    }
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

  // ── Step 4: Resolve Payment Source & Customer Card Vault ──
  let actualPaymentSourceId = sourceId;
  let squareCustomerId = null;
  const { normalizePhone, verifyPin, hashPin } = require('./customers');
  const phoneDigits = normalizePhone(customerPhone);

  if (sourceId.startsWith('ccof:')) {
    // Paying with an existing saved card (Card on File)
    if (!phoneDigits || phoneDigits.length < 10) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is required for saved card payments.');
    }
    const custSnap = await db.collection('customers').doc(phoneDigits).get();
    if (!custSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Customer account not found.');
    }
    const custData = custSnap.data();
    const storedPin = custData.pinHash || custData.pin;
    if (!storedPin) {
      throw new functions.https.HttpsError('permission-denied', 'A 4-digit PIN is required to authorize payment with a saved card.');
    }
    if (!pin || !verifyPin(pin, storedPin, phoneDigits)) {
      throw new functions.https.HttpsError('permission-denied', 'Incorrect 4-digit PIN for saved card authorization.');
    }
    const savedCards = Array.isArray(custData.savedCards) ? custData.savedCards : [];
    const matchedCard = savedCards.find(c => c.id === sourceId);
    if (!matchedCard) {
      throw new functions.https.HttpsError('not-found', 'This saved card is not on file for your account.');
    }
    squareCustomerId = custData.squareCustomerId;
    if (!squareCustomerId) {
      throw new functions.https.HttpsError('internal', 'Customer card vault record is missing.');
    }
    actualPaymentSourceId = sourceId;
  } else if (saveCard === true && phoneDigits && phoneDigits.length >= 10) {
    // Customer requested to vault this new card for 1-tap checkout next time
    try {
      const custSnap = await db.collection('customers').doc(phoneDigits).get();
      const custData = custSnap.exists ? custSnap.data() : {};
      const storedPin = custData.pinHash || custData.pin;

      // Card vaulting security: Must have an existing verified PIN or provide a valid 4-digit PIN
      let canVault = false;
      const cleanPin = pin ? String(pin).trim() : '';

      if (storedPin) {
        if (cleanPin && verifyPin(cleanPin, storedPin, phoneDigits)) {
          canVault = true;
        } else {
          console.warn('Card vaulting skipped: Missing or incorrect PIN for existing account.');
        }
      } else if (cleanPin && /^\d{4}$/.test(cleanPin)) {
        const newHash = hashPin(cleanPin, phoneDigits);
        await db.collection('customers').doc(phoneDigits).set({
          pinHash: newHash,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        canVault = true;
      } else {
        console.warn('Card vaulting skipped: 4-digit PIN is required to save card on file.');
      }

      if (canVault) {
        // Get or create Square customer ID
        if (custData.squareCustomerId) {
          squareCustomerId = custData.squareCustomerId;
        } else {
          const sqCustomerResp = await squareClient.customersApi.createCustomer({
            idempotencyKey: crypto.randomUUID(),
            givenName: customerName.trim(),
            phoneNumber: customerPhone ? customerPhone.trim() : undefined,
            referenceId: phoneDigits
          });
          squareCustomerId = sqCustomerResp.result.customer.id;
          await db.collection('customers').doc(phoneDigits).set({
            squareCustomerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }

        // Vault card with Square Cards API
        const cardResp = await squareClient.cardsApi.createCard({
          idempotencyKey: crypto.randomUUID(),
          sourceId: sourceId, // single-use token (cnon:...)
          card: {
            customerId: squareCustomerId,
            cardholderName: customerName.trim()
          }
        });

        const vaulted = cardResp.result.card;
        if (vaulted && vaulted.id) {
          actualPaymentSourceId = vaulted.id;

          const newSavedCard = {
            id: vaulted.id,
            brand: vaulted.cardBrand || 'CARD',
            last4: vaulted.last4 || '••••',
            expMonth: vaulted.expMonth ? Number(vaulted.expMonth) : null,
            expYear: vaulted.expYear ? Number(vaulted.expYear) : null,
            createdAt: new Date().toISOString()
          };

          const existingCards = Array.isArray(custData.savedCards) ? custData.savedCards : [];
          const filtered = existingCards.filter(c => c.id !== vaulted.id && !(c.brand === newSavedCard.brand && c.last4 === newSavedCard.last4));
          const updatedList = [newSavedCard, ...filtered].slice(0, 3);

          await db.collection('customers').doc(phoneDigits).set({
            squareCustomerId,
            savedCards: updatedList,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (vaultErr) {
      console.warn('Square card vaulting warning (non-fatal, proceeding with direct charge):', vaultErr);
      actualPaymentSourceId = sourceId;
    }
  }

  // ── Step 5: Process Square Payment ──
  let squarePaymentId;
  try {
    const paymentPayload = {
      sourceId: actualPaymentSourceId,
      idempotencyKey: paymentIdempotencyKey,
      amountMoney: {
        amount: BigInt(totalCents),
        currency: 'USD',
      },
      orderId: squareOrderId,
      locationId,
      note: `Bigi Awasaana Web Order - ${customerName.trim()}`,
      referenceId: squareOrderId,
    };

    if (squareCustomerId) {
      paymentPayload.customerId = squareCustomerId;
    }

    const paymentResponse = await squareClient.paymentsApi.createPayment(paymentPayload);
    squarePaymentId = paymentResponse.result.payment.id;
    var paymentCard = paymentResponse.result.payment.cardDetails?.card || null;
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

  
  // ── Step 5b: Resolve Customer Email (from input or customer profile) ──
  let resolvedEmail = customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
    ? customerEmail.trim().toLowerCase()
    : null;

  if (!resolvedEmail && phoneDigits && phoneDigits.length >= 10) {
    try {
      const cSnap = await db.collection('customers').doc(phoneDigits).get();
      if (cSnap.exists && cSnap.data()?.email) {
        resolvedEmail = cSnap.data().email.trim().toLowerCase();
      }
    } catch (e) {}
  }

  // ── Step 6: Write order to Firestore ──
  const orderDoc = {
    squareOrderId,
    squarePaymentId,
    accessToken,  // short random token for order status page privacy
    cardBrand: paymentCard?.cardBrand || null,
    cardLast4: paymentCard?.last4 || null,
    source: 'website',
    customerName: customerName.trim(),
    customerPhone: (customerPhone || '').trim(),
    customerEmail: resolvedEmail,
    items: resolvedItems.map(item => ({
      itemId: item.itemId || null,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      selectedVariant: item.selectedVariant || '',
      selectedAddOns: item.selectedAddOns || [],
      isMeal: !!item.isMeal,
      mealUpgradeId: item.mealUpgradeId || null,
      cartKey: item.cartKey || ''
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

  // ── Step 7: Update Customer Profile ──
  try {
    const { updateCustomerOnOrder } = require('./customers');
    await updateCustomerOnOrder(customerPhone, customerName, resolvedEmail, totalCents);
  } catch (customerErr) {
    console.error('Failed to update customer profile (non-fatal):', customerErr);
    // Non-fatal: don't fail the order if customer profile update fails
  }

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
// processRetailPayment
// For nationwide shipped orders (Retail)
// ─────────────────────────────────────────────────────────────────
exports.processRetailPayment = functions.https.onCall(async (data, context) => {
  const { sourceId, items, customerName, customerEmail, customerPhone, address, city, state, zip, country, selectedShippingCents } = data;

  if (!sourceId || !items || !customerName || !address || !city || !state || !zip) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  const resolvedItems = [];
  let subtotalCents = 0;

  for (const cartItem of items) {
    if (!cartItem.id || typeof cartItem.qty !== 'number' || cartItem.qty < 1) {
      throw new functions.https.HttpsError('invalid-argument', `Invalid item: ${JSON.stringify(cartItem)}`);
    }

    const docSnap = await db.collection('retail_items').doc(cartItem.id).get();
    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Retail item not found: ${cartItem.id}`);
    }

    const itemData = docSnap.data();
    const priceCents = Math.round(itemData.price * 100);
    const amountCents = priceCents * cartItem.qty;
    subtotalCents += amountCents;

    resolvedItems.push({
      id: cartItem.id,
      name: itemData.name,
      price: itemData.price,
      qty: cartItem.qty,
      amountCents: amountCents,
      sku: itemData.sku || ''
    });
  }

  // Validate shipping against Shippo
  const shippingData = await fetchShippingRatesData(address, city, state, zip, country, resolvedItems);
  const validRates = shippingData.rates || [];
  
  let validShippingCents = 500; // safe fallback
  if (validRates.length > 0) {
    const requestedCents = typeof selectedShippingCents === "number" ? selectedShippingCents : -1;
    const matchedRate = validRates.find(r => r.cents === requestedCents);
    
    if (matchedRate) {
      validShippingCents = requestedCents;
    } else {
      console.warn(`Requested shipping ${requestedCents} not found in Shippo rates. Using lowest available.`);
      validShippingCents = validRates[0].cents;
    }
  } else {
    // fallback if Shippo fails or no rates
    const requestedCents = typeof selectedShippingCents === "number" ? selectedShippingCents : 500;
    if (requestedCents >= 400) {
      validShippingCents = requestedCents;
    } else {
      console.warn(`Invalid fallback shipping cost provided: ${requestedCents}. Defaulting to 500.`);
    }
  }
  
  let shippingCents = validShippingCents;
  
  // Retail tax rate (assuming same LA rate for simplicity, or 0 if out of state. We'll use 0 for now to be safe, or just keep it simple)
  // Actually, let's just do no tax for out of state, or if we need tax we can add it.
  const totalCents = subtotalCents + shippingCents;

  const idempotencyKey = crypto.randomUUID();
  const square = getSquareClient();
  const locationId = getLocationId();

  try {
    const paymentReq = {
      idempotencyKey,
      sourceId,
      amountMoney: {
        amount: BigInt(totalCents),
        currency: 'USD'
      },
      locationId,
      buyerEmailAddress: customerEmail,
      shippingAddress: {
        addressLine1: address,
        locality: city,
        administrativeDistrictLevel1: state,
        postalCode: zip,
        country: country || 'US'
      },
      note: `Retail Order for ${customerName}`,
    };

    const { result } = await square.paymentsApi.createPayment(paymentReq);
    
    // Save to Firestore
    const orderRef = db.collection('retail_orders').doc();
    await orderRef.set({
      id: orderRef.id,
      squarePaymentId: result.payment.id,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: { address, city, state, zip, country: country || 'US' },
      items: resolvedItems,
      subtotalCents,
      shippingCents,
      totalCents,
      status: 'paid',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Customer Profile
    try {
      const { updateCustomerOnOrder } = require('./customers');
      await updateCustomerOnOrder(customerPhone, customerName, customerEmail, totalCents);
    } catch (customerErr) {
      console.error('Failed to update customer profile (non-fatal):', customerErr);
    }

    return { 
      success: true, 
      paymentId: result.payment.id,
      orderId: orderRef.id
    };
  } catch (error) {
    console.error('Square Payment Error (Retail):', error);
    let msg = 'Payment failed.';
    if (error instanceof ApiError) {
      msg = error.errors?.[0]?.detail || msg;
    }
    throw new functions.https.HttpsError('internal', msg);
  }
});

// ============================================================================
// Helper to calculate rates
async function fetchShippingRatesData(address, city, state, zip, country, items) {
  if (!zip || !items || items.length === 0) return { rates: [] };
  
  // Calculate total weight in oz
  let totalWeightOz = 0;
  for (const item of items) {
     const docSnap = await db.collection('retail_items').doc(item.id).get();
     if (docSnap.exists) {
         const data = docSnap.data();
         totalWeightOz += (data.weight || 8) * item.qty;
     }
  }
  
  const shippoApiKey = process.env.SHIPPO_API_KEY || '';
  
  // If no API key, return mock rates
  if (!shippoApiKey || shippoApiKey === 'placeholder') {
     console.log('Using mock shipping rates (No SHIPPO_API_KEY)');
     return {
        rates: [
           { object_id: 'mock-1', provider: 'USPS', service: 'Ground Advantage', amount: '4.50', cents: 450, days: 3 },
           { object_id: 'mock-2', provider: 'USPS', service: 'Priority Mail', amount: '8.50', cents: 850, days: 2 },
           { object_id: 'mock-3', provider: 'UPS', service: 'Ground', amount: '11.00', cents: 1100, days: 4 }
        ]
     };
  }

  // Actually call Shippo using native fetch to avoid SDK version issues
  try {
     const addressFrom = {
        name: 'Bigi Awasaana',
        street1: '18317 Kittridge St',
        city: 'Reseda',
        state: 'CA',
        zip: '91335',
        country: 'US'
     };
     
     const addressTo = {
        street1: address || '',
        city: city || '',
        state: state || '',
        zip: zip,
        country: country || 'US'
     };
     
     const parcel = {
        length: '10',
        width: '8',
        height: '4',
        distance_unit: 'in',
        weight: Math.max(1, totalWeightOz).toString(),
        mass_unit: 'oz'
     };
     
     const shippoResponse = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: {
            'Authorization': 'ShippoToken ' + shippoApiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            address_from: addressFrom,
            address_to: addressTo,
            parcels: [parcel],
            async: false
        })
     });

     if (!shippoResponse.ok) {
        const errorText = await shippoResponse.text();
        throw new Error('Shippo API returned ' + shippoResponse.status + ': ' + errorText);
     }

     const shipment = await shippoResponse.json();
     
     // Normalize rates for the frontend
      const normalizedRates = (shipment.rates || [])
        .filter(r => r.amount && parseFloat(r.amount) > 0)
        .map(r => ({
          object_id: r.object_id,
          provider: r.provider || 'USPS',
          service: r.servicelevel ? r.servicelevel.name : 'Standard',
          amount: r.amount,
          cents: Math.round(parseFloat(r.amount) * 100),
          days: r.estimated_days || null,
          duration_terms: r.duration_terms || ''
        }))
        .sort((a, b) => a.cents - b.cents);
      
      console.log('Shippo returned', shipment.rates?.length, 'rates, normalized to', normalizedRates.length);
      return { rates: normalizedRates };
  } catch (error) {
     console.error('Shippo Error:', error);
     throw new functions.https.HttpsError('internal', 'Failed to calculate shipping rates.');
  }
}

exports.getShippingRates = functions.https.onCall(async (data, context) => {
  const { address, city, state, zip, country, items } = data;
  if (!zip || !items || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing zip code or items.');
  }
  return await fetchShippingRatesData(address, city, state, zip, country, items);
});


// ─────────────────────────────────────────────────────────────────
// purchaseShippingLabel (LIVE SHIPPO)
// Uses Shippo to purchase a label and marks the retail order as shipped.
// ─────────────────────────────────────────────────────────────────
exports.purchaseShippingLabel = functions.https.onCall(async (data, context) => {
  // 1. Verify Admin Authentication
  if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can purchase shipping labels.');
  }
  
  const { orderId } = data;
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
  }
  
  const orderRef = db.collection('retail_orders').doc(orderId);
  const doc = await orderRef.get();
  
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found.');
  }
  
  const orderData = doc.data();
  if (orderData.status === 'shipped') {
    throw new functions.https.HttpsError('failed-precondition', 'Order is already shipped.');
  }
  
  const shippoApiKey = process.env.SHIPPO_API_KEY || '';
  if (!shippoApiKey || shippoApiKey === 'placeholder') {
    throw new functions.https.HttpsError('failed-precondition', 'Shippo API key is missing.');
  }

  // 2. Create a shipment to get fresh rates
  let totalWeightOz = 0;
  for (const item of (orderData.items || [])) {
    // Basic weight assumption if not in DB, fallback to 8oz
    totalWeightOz += 8 * item.qty; 
  }

  const addressFrom = {
    name: 'Bigi Awasaana',
    street1: '18317 Kittridge St',
    city: 'Reseda',
    state: 'CA',
    zip: '91335',
    country: 'US'
  };
  
  const addressTo = {
    name: orderData.customerName || 'Customer',
    street1: orderData.shippingAddress.address || '',
    city: orderData.shippingAddress.city || '',
    state: orderData.shippingAddress.state || '',
    zip: orderData.shippingAddress.zip || '',
    country: 'US',
    phone: orderData.customerPhone || '',
    email: orderData.customerEmail || ''
  };
  
  const parcel = {
    length: '10',
    width: '8',
    height: '4',
    distance_unit: 'in',
    weight: Math.max(1, totalWeightOz).toString(),
    mass_unit: 'oz'
  };

  try {
    const shipmentResp = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: {
            'Authorization': 'ShippoToken ' + shippoApiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            address_from: addressFrom,
            address_to: addressTo,
            parcels: [parcel],
            async: false
        })
    });

    if (!shipmentResp.ok) {
        throw new functions.https.HttpsError('internal', 'Shippo failed to create shipment.');
    }
    const shipment = await shipmentResp.json();

    if (!shipment.rates || shipment.rates.length === 0) {
      throw new functions.https.HttpsError('internal', 'No shipping rates returned from Shippo.');
    }

    // Pick the cheapest rate (typically USPS Ground Advantage)
    const sortedRates = shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    const cheapestRate = sortedRates[0];

    // 3. Purchase the label
    const transactionResp = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: {
            'Authorization': 'ShippoToken ' + shippoApiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            rate: cheapestRate.object_id,
            label_file_type: "PDF",
            async: false
        })
    });

    const transaction = await transactionResp.json();

    if (transaction.status !== "SUCCESS") {
      console.error("Shippo transaction failed:", transaction);
      throw new functions.https.HttpsError('internal', 'Shippo failed to purchase label: ' + (transaction.messages?.[0]?.text || 'Unknown error'));
    }

    // 4. Update Order Status
    await orderRef.update({
      status: 'shipped',
      trackingNumber: transaction.tracking_number,
      labelUrl: transaction.label_url,
      shippedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      trackingNumber: transaction.tracking_number,
      labelUrl: transaction.label_url
    };

  } catch (error) {
    console.error('Shippo Live Purchase Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to purchase shipping label.');
  }
});

// ─────────────────────────────────────────────────────────────────
// registerApplePayDomain
// Callable function: registers domain(s) with Square and Apple
// ─────────────────────────────────────────────────────────────────
exports.registerApplePayDomain = functions.https.onCall(async (data, context) => {
  // Security Check: Only admins can register Apple Pay domains
  if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can register Apple Pay domains.');
  }

  const { domain } = data || {};
  const squareClient = getSquareClient();
  const domains = domain ? [domain] : ['www.bigiawasaana.com', 'bigiawasaana.com', 'bigi-awasaana-7b3ce.web.app'];
  const results = {};

  for (const d of domains) {
    try {
      const resp = await squareClient.applePayApi.registerDomain({ domainName: d });
      results[d] = resp.result;
    } catch (err) {
      console.warn(`Apple Pay domain registration warning for ${d}:`, err.message || err);
      const detail = err.errors ? err.errors.map(e => `${e.code}: ${e.detail}`).join('; ') : (err.message || String(err));
      results[d] = {
        status: 'FAILED',
        error: detail,
      };
    }
  }

  return { success: true, results };
});

