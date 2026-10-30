const crypto = require('crypto');
const { functions, admin, db } = require('./shared');

const PIN_SALT = 'bigi_awasaana_sec_salt_2026';

/**
 * Creates a salted SHA-256 hash of a customer's PIN.
 */
function hashPin(pin, phoneDigits) {
  return crypto
    .createHash('sha256')
    .update(`${phoneDigits}:${String(pin).trim()}:${PIN_SALT}`)
    .digest('hex');
}

/**
 * Securely verifies an input PIN against stored pinHash (or legacy plaintext).
 */
function verifyPin(inputPin, storedPinOrHash, phoneDigits) {
  if (!storedPinOrHash || !inputPin) return false;
  const pinStr = String(inputPin).trim();
  const computed = hashPin(pinStr, phoneDigits);
  if (storedPinOrHash === computed) return true;
  // Legacy plaintext fallback for backwards compatibility
  if (storedPinOrHash === pinStr) return true;
  return false;
}

/**
 * Normalizes phone numbers:
 * - Strip all non-digit characters
 * - If it starts with '1' and has 11 digits, keep as-is
 * - If it has 10 digits, prepend '1'
 * - Return the digit-only string
 */
function normalizePhone(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    return '';
  }
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
}

/**
 * Calculates customer loyalty tier:
 * - bronze: 0 - 499 points
 * - silver: 500 - 1499 points
 * - gold: 1500+ points
 */
function calculateTier(loyaltyPoints) {
  const points = typeof loyaltyPoints === 'number' && !isNaN(loyaltyPoints) ? loyaltyPoints : 0;
  if (points >= 1500) {
    return 'gold';
  }
  if (points >= 500) {
    return 'silver';
  }
  return 'bronze';
}

/**
 * Converts Firestore timestamp or Date to ISO string
 */
function toIsoString(timestamp) {
  if (!timestamp) return null;
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Helper: Updates or creates a customer profile after an order is placed.
 * Exported for use in payments.js.
 */
async function updateCustomerOnOrder(phone, name, email, orderTotalCents) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    console.log('updateCustomerOnOrder: No valid phone provided, skipping profile update.');
    return null;
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    console.log(`updateCustomerOnOrder: Normalized phone "${phoneDigits}" is invalid, skipping.`);
    return null;
  }

  const totalCents = (typeof orderTotalCents === 'number' && !isNaN(orderTotalCents) && orderTotalCents > 0)
    ? Math.floor(orderTotalCents)
    : 0;
  const earnedPoints = Math.floor(totalCents / 10);

  const customerRef = db.collection('customers').doc(phoneDigits);
  let resultCustomer = null;

  try {
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(customerRef);
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (!docSnap.exists) {
        const initialPoints = earnedPoints;
        const initialTier = calculateTier(initialPoints);
        const newCustomer = {
          name: typeof name === 'string' ? name.trim().slice(0, 100) : '',
          phone: String(phone).trim().slice(0, 30),
          email: email && typeof email === 'string' ? email.trim().slice(0, 120) : null,
          firstOrderDate: now,
          lastOrderDate: now,
          totalOrders: 1,
          totalSpentCents: totalCents,
          loyaltyPoints: initialPoints,
          tier: initialTier,
          favorites: [],
          pinHash: null,
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: now,
          updatedAt: now,
        };

        transaction.set(customerRef, newCustomer);
        resultCustomer = newCustomer;
      } else {
        const existing = docSnap.data();
        const currentPoints = typeof existing.loyaltyPoints === 'number' ? existing.loyaltyPoints : 0;
        const newPoints = currentPoints + earnedPoints;
        const newTier = calculateTier(newPoints);

        const updates = {
          totalOrders: admin.firestore.FieldValue.increment(1),
          totalSpentCents: admin.firestore.FieldValue.increment(totalCents),
          loyaltyPoints: admin.firestore.FieldValue.increment(earnedPoints),
          tier: newTier,
          lastOrderDate: now,
          updatedAt: now,
        };

        const trimmedName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
        if (trimmedName && trimmedName !== existing.name) {
          updates.name = trimmedName;
        }

        const trimmedEmail = typeof email === 'string' ? email.trim().slice(0, 120) : '';
        if (trimmedEmail && !existing.email) {
          updates.email = trimmedEmail;
        }

        transaction.update(customerRef, updates);
        resultCustomer = {
          ...existing,
          ...updates,
          totalOrders: (existing.totalOrders || 0) + 1,
          totalSpentCents: (existing.totalSpentCents || 0) + totalCents,
          loyaltyPoints: newPoints,
        };
      }
    });
  } catch (err) {
    console.error('updateCustomerOnOrder transaction error (non-fatal):', err);
    return null;
  }

  return resultCustomer;
}

/**
 * Helper: Reverts loyalty points and spent amounts on customer profile after an order is refunded.
 * Exported for use in orders.js / payments.js.
 */
async function revertCustomerOnRefund(phone, refundAmountCents, isFullRefund) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    return null;
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    return null;
  }

  const refundCents = (typeof refundAmountCents === 'number' && !isNaN(refundAmountCents) && refundAmountCents > 0)
    ? Math.floor(refundAmountCents)
    : 0;
  const pointsToDeduct = Math.floor(refundCents / 10);

  const customerRef = db.collection('customers').doc(phoneDigits);
  let updatedCustomer = null;

  try {
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(customerRef);
      if (!docSnap.exists) return;

      const existing = docSnap.data();
      const currentPoints = typeof existing.loyaltyPoints === 'number' ? existing.loyaltyPoints : 0;
      const currentSpent = typeof existing.totalSpentCents === 'number' ? existing.totalSpentCents : 0;
      const currentOrders = typeof existing.totalOrders === 'number' ? existing.totalOrders : 0;

      const newPoints = Math.max(0, currentPoints - pointsToDeduct);
      const newSpent = Math.max(0, currentSpent - refundCents);
      const newOrders = isFullRefund ? Math.max(0, currentOrders - 1) : currentOrders;
      const newTier = calculateTier(newPoints);

      const updates = {
        loyaltyPoints: newPoints,
        totalSpentCents: newSpent,
        totalOrders: newOrders,
        tier: newTier,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.update(customerRef, updates);
      updatedCustomer = { ...existing, ...updates };
    });
  } catch (err) {
    console.error('revertCustomerOnRefund error (non-fatal):', err);
    return null;
  }

  return updatedCustomer;
}

/**
 * 1. lookupCustomer (HTTPS Callable)
 * Takes { phone }
 * Normalizes phone, queries customers/{phoneDigits}
 * Does NOT require auth
 * Returns privacy-safe customer details (masked name, tier, points, etc.)
 */
exports.lookupCustomer = functions.https.onCall(async (data, context) => {
  const { phone } = data || {};
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number is required.');
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid phone number.');
  }

  const docSnap = await db.collection('customers').doc(phoneDigits).get();
  if (!docSnap.exists) {
    return { found: false };
  }

  const custData = docSnap.data();
  const rawName = (custData.name || '').trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Friend';
  const maskedName = parts.length > 1
    ? `${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join(' ')}`
    : rawName;

  const hasPin = Boolean(custData.pinHash || custData.pin);

  return {
    found: true,
    hasPin,
    customer: {
      firstName,
      name: maskedName,
      hasPin,
      totalOrders: custData.totalOrders || 0,
      loyaltyPoints: custData.loyaltyPoints || 0,
      tier: custData.tier || 'bronze',
      favorites: Array.isArray(custData.favorites) ? custData.favorites : [],
      savedCards: Array.isArray(custData.savedCards) ? custData.savedCards.map(c => ({
        id: c.id,
        brand: c.brand || 'CARD',
        last4: c.last4 || '••••',
        expMonth: c.expMonth ? Number(c.expMonth) : null,
        expYear: c.expYear ? Number(c.expYear) : null,
      })) : [],
      lastOrderDate: toIsoString(custData.lastOrderDate),
    },
  };
});

/**
 * 2. getOrderHistory (HTTPS Callable)
 * Takes { phone, pin }
 * Verifies PIN matches customer.pinHash (with rate-limiting & 15-minute lockouts against brute-force)
 * Queries orders (limit 20, desc) & retail_orders (limit 10, desc)
 * Returns { orders, retailOrders, customer }
 */
exports.getOrderHistory = functions.https.onCall(async (data, context) => {
  const { phone, pin } = data || {};
  let phoneDigits = '';
  let customer = null;
  let customerRef = null;

  // 1. If user is signed in via Firebase Auth (Google / Apple)
  if (context.auth && context.auth.uid) {
    if (phone) {
      phoneDigits = normalizePhone(phone);
      if (phoneDigits) {
        customerRef = db.collection('customers').doc(phoneDigits);
        const custSnap = await customerRef.get();
        if (custSnap.exists) {
          const cData = custSnap.data();
          if (cData.uid === context.auth.uid || (context.auth.token.email && cData.email === context.auth.token.email.toLowerCase())) {
            customer = cData;
          }
        }
      }
    }
    if (!customer) {
      // Find by uid
      const uidSnap = await db.collection('customers').where('uid', '==', context.auth.uid).limit(1).get();
      if (!uidSnap.empty) {
        customerRef = uidSnap.docs[0].ref;
        phoneDigits = uidSnap.docs[0].id;
        customer = uidSnap.docs[0].data();
      }
    }
    if (!customer && context.auth.token?.email) {
      // Find by email
      const emailSnap = await db.collection('customers').where('email', '==', context.auth.token.email.toLowerCase()).limit(1).get();
      if (!emailSnap.empty) {
        customerRef = emailSnap.docs[0].ref;
        phoneDigits = emailSnap.docs[0].id;
        customer = emailSnap.docs[0].data();
        await customerRef.update({ uid: context.auth.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
      }
    }
    if (!customer) {
      // User is authenticated via Firebase Auth (Google / Apple), but does not have a linked phone document yet.
      // Synthesize customer profile from auth token so they can view orders and don't get thrown an unauthenticated error!
      customer = {
        uid: context.auth.uid,
        name: context.auth.token.name || '',
        email: context.auth.token.email ? context.auth.token.email.toLowerCase() : '',
        phone: '',
        photoUrl: context.auth.token.picture || null,
        totalOrders: 0,
        totalSpentCents: 0,
        loyaltyPoints: 100, // 100 Welcome Points!
        tier: 'bronze',
        favorites: [],
        savedCards: [],
        firstOrderDate: null,
        lastOrderDate: null,
        createdAt: new Date().toISOString(),
        needsPhoneLink: true,
      };
    }
  }

  // 2. If not authenticated via Firebase Auth, verify via Phone + PIN
  if (!customer) {
    if (!phone || pin === undefined || pin === null) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone and PIN are required.');
    }

    const pinStr = String(pin).trim();
    if (!/^\d{4}$/.test(pinStr)) {
      throw new functions.https.HttpsError('invalid-argument', 'PIN must be a 4-digit number.');
    }

    phoneDigits = normalizePhone(phone);
    if (!phoneDigits || phoneDigits.length < 10) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
    }

    customerRef = db.collection('customers').doc(phoneDigits);
    const custSnap = await customerRef.get();
    if (!custSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
    }

    customer = custSnap.data();
    const now = Date.now();

    // ─── Brute-Force Rate Limiting & Lockout Check ───
    let lockedUntilMs = 0;
    if (customer.lockedUntil?.toMillis) {
      lockedUntilMs = customer.lockedUntil.toMillis();
    } else if (customer.lockedUntil?.seconds) {
      lockedUntilMs = customer.lockedUntil.seconds * 1000;
    } else if (customer.lockedUntil) {
      lockedUntilMs = new Date(customer.lockedUntil).getTime();
    }

    if (lockedUntilMs > now) {
      const minsRemaining = Math.max(1, Math.ceil((lockedUntilMs - now) / 60000));
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Account is temporarily locked due to multiple incorrect PIN attempts. Please try again in ${minsRemaining} minute${minsRemaining === 1 ? '' : 's'}.`
      );
    }

    const storedPinOrHash = customer.pinHash || customer.pin;
    const isValid = verifyPin(pinStr, storedPinOrHash, phoneDigits);

    if (!isValid) {
      const failedAttempts = (customer.failedAttempts || 0) + 1;
      const lockUpdates = { failedAttempts };
      if (failedAttempts >= 5) {
        lockUpdates.lockedUntil = admin.firestore.Timestamp.fromMillis(now + 15 * 60 * 1000); // 15-minute lockout
        lockUpdates.failedAttempts = 0;
      }
      await customerRef.update(lockUpdates).catch(() => {});
      throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
    }

    // Reset Failed Attempts on successful PIN verification
    const cleanupUpdates = {};
    if (customer.failedAttempts || customer.lockedUntil) {
      cleanupUpdates.failedAttempts = 0;
      cleanupUpdates.lockedUntil = null;
    }
    if (!customer.pinHash && customer.pin) {
      cleanupUpdates.pinHash = hashPin(pinStr, phoneDigits);
      cleanupUpdates.pin = admin.firestore.FieldValue.delete();
    }
    if (Object.keys(cleanupUpdates).length > 0) {
      await customerRef.update(cleanupUpdates).catch(() => {});
    }
  }

  // Raw phone variations for querying orders safely
  const phoneCandidates = Array.from(new Set([
    phone,
    customer.phone,
    phoneDigits,
  ].filter(p => typeof p === 'string' && p.trim().length > 0)));

  const customerEmail = (customer.email || context.auth?.token?.email || '').toLowerCase().trim();

  // Query food orders
  let orderDocs = [];
  try {
    const docMap = new Map();
    if (phoneCandidates.length > 0) {
      let q = db.collection('orders');
      if (phoneCandidates.length === 1) {
        q = q.where('customerPhone', '==', phoneCandidates[0]);
      } else {
        q = q.where('customerPhone', 'in', phoneCandidates.slice(0, 10));
      }
      const snap = await q.get();
      snap.docs.forEach(d => docMap.set(d.id, d));
    }
    if (customerEmail) {
      const emailSnap = await db.collection('orders').where('customerEmail', '==', customerEmail).get();
      emailSnap.docs.forEach(d => docMap.set(d.id, d));
    }
    orderDocs = Array.from(docMap.values()).sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || (a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : 0);
      const bTime = b.data().createdAt?.toMillis?.() || (b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : 0);
      return bTime - aTime;
    }).slice(0, 20);
  } catch (err) {
    console.warn('getOrderHistory: Query orders failed:', err.message);
    orderDocs = [];
  }

  // Query retail orders
  let retailDocs = [];
  try {
    const docMap = new Map();
    if (phoneCandidates.length > 0) {
      let q = db.collection('retail_orders');
      if (phoneCandidates.length === 1) {
        q = q.where('customerPhone', '==', phoneCandidates[0]);
      } else {
        q = q.where('customerPhone', 'in', phoneCandidates.slice(0, 10));
      }
      const snap = await q.get();
      snap.docs.forEach(d => docMap.set(d.id, d));
    }
    if (customerEmail) {
      const emailSnap = await db.collection('retail_orders').where('customerEmail', '==', customerEmail).get();
      emailSnap.docs.forEach(d => docMap.set(d.id, d));
    }
    retailDocs = Array.from(docMap.values()).sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || (a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : 0);
      const bTime = b.data().createdAt?.toMillis?.() || (b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : 0);
      return bTime - aTime;
    }).slice(0, 10);
  } catch (err) {
    console.warn('getOrderHistory: Query retail orders failed:', err.message);
    retailDocs = [];
  }

  const orders = orderDocs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      accessToken: typeof d.accessToken === 'string' ? d.accessToken : '',
      items: Array.isArray(d.items) ? d.items : [],
      total: typeof d.total === 'number' ? d.total : (typeof d.totalCents === 'number' ? d.totalCents / 100 : 0),
      totalCents: typeof d.totalCents === 'number' ? d.totalCents : (typeof d.total === 'number' ? Math.round(d.total * 100) : 0),
      refundedAmount: typeof d.refundedAmount === 'number' ? d.refundedAmount : (typeof d.refundedAmountCents === 'number' ? d.refundedAmountCents / 100 : 0),
      refundedAmountCents: typeof d.refundedAmountCents === 'number' ? d.refundedAmountCents : (typeof d.refundedAmount === 'number' ? Math.round(d.refundedAmount * 100) : 0),
      netTotal: typeof d.netTotal === 'number' ? d.netTotal : null,
      returns: Array.isArray(d.returns) ? d.returns : [],
      status: typeof d.status === 'string' ? d.status : 'pending',
      cancellationReason: typeof d.cancellationReason === 'string' ? d.cancellationReason : '',
      refundReason: typeof d.refundReason === 'string' ? d.refundReason : '',
      cardBrand: typeof d.cardBrand === 'string' ? d.cardBrand : '',
      cardLast4: typeof d.cardLast4 === 'string' ? d.cardLast4 : '',
      createdAt: toIsoString(d.createdAt),
      pickup: {
        type: d.pickup && d.pickup.type ? d.pickup.type : 'pickup',
      },
    };
  });

  const retailOrders = retailDocs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      items: Array.isArray(d.items) ? d.items : [],
      total: typeof d.total === 'number' ? d.total : (typeof d.totalCents === 'number' ? d.totalCents / 100 : 0),
      totalCents: typeof d.totalCents === 'number' ? d.totalCents : (typeof d.total === 'number' ? Math.round(d.total * 100) : 0),
      refundedAmount: typeof d.refundedAmount === 'number' ? d.refundedAmount : (typeof d.refundedAmountCents === 'number' ? d.refundedAmountCents / 100 : 0),
      refundedAmountCents: typeof d.refundedAmountCents === 'number' ? d.refundedAmountCents : (typeof d.refundedAmount === 'number' ? Math.round(d.refundedAmount * 100) : 0),
      netTotal: typeof d.netTotal === 'number' ? d.netTotal : null,
      returns: Array.isArray(d.returns) ? d.returns : [],
      status: typeof d.status === 'string' ? d.status : 'pending',
      cancellationReason: typeof d.cancellationReason === 'string' ? d.cancellationReason : '',
      refundReason: typeof d.refundReason === 'string' ? d.refundReason : '',
      cardBrand: typeof d.cardBrand === 'string' ? d.cardBrand : '',
      cardLast4: typeof d.cardLast4 === 'string' ? d.cardLast4 : '',
      createdAt: toIsoString(d.createdAt),
      pickup: {
        type: d.pickup && d.pickup.type ? d.pickup.type : 'shipping',
      },
    };
  });

  return {
    orders,
    retailOrders,
    customer: {
      name: customer.name || (context.auth?.token?.name || ''),
      email: customer.email || (context.auth?.token?.email ? context.auth.token.email.toLowerCase() : ''),
      photoUrl: customer.photoUrl || (context.auth?.token?.picture || null),
      phone: customer.phone || phoneDigits || '',
      needsPhoneLink: Boolean(!customer.phone && !phoneDigits),
      totalOrders: typeof customer.totalOrders === 'number' ? customer.totalOrders : (orders.length + retailOrders.length),
      loyaltyPoints: typeof customer.loyaltyPoints === 'number' ? customer.loyaltyPoints : (customer.needsPhoneLink ? 100 : 0),
      tier: customer.tier || 'bronze',
      totalSpentCents: customer.totalSpentCents || 0,
      favorites: Array.isArray(customer.favorites) ? customer.favorites : [],
      savedCards: Array.isArray(customer.savedCards) ? customer.savedCards.map(c => ({
        id: c.id,
        brand: c.brand || 'CARD',
        last4: c.last4 || '••••',
        expMonth: c.expMonth ? Number(c.expMonth) : null,
        expYear: c.expYear ? Number(c.expYear) : null,
        createdAt: c.createdAt || null
      })) : [],
      firstOrderDate: toIsoString(customer.firstOrderDate),
      lastOrderDate: toIsoString(customer.lastOrderDate),
      createdAt: toIsoString(customer.createdAt),
    },
  };
});

/**
 * 3. setCustomerPin (HTTPS Callable)
 * Takes { phone, pin, currentPin }
 * Validates PIN is exactly 4 digits
 * If customer already has a PIN, verifies currentPin to prevent unauthorized overwrite / account takeover!
 * Stores salted hash of PIN
 * Returns { success: true }
 */
exports.setCustomerPin = functions.https.onCall(async (data, context) => {
  const { phone, pin, currentPin } = data || {};
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number is required.');
  }

  const pinStr = typeof pin === 'number' ? String(pin).padStart(4, '0') : String(pin || '').trim();
  if (!/^\d{4}$/.test(pinStr)) {
    throw new functions.https.HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid phone number.');
  }

  const customerRef = db.collection('customers').doc(phoneDigits);
  const snap = await customerRef.get();
  if (!snap.exists) {
    const newHash = hashPin(pinStr, phoneDigits);
    const newCustomer = {
      name: '',
      phone: String(phone).trim(),
      email: null,
      pinHash: newHash,
      loyaltyPoints: 100,
      tier: 'bronze',
      favorites: [],
      savedCards: [],
      totalOrders: 0,
      totalSpentCents: 0,
      failedAttempts: 0,
      lockedUntil: null,
      firstOrderDate: null,
      lastOrderDate: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await customerRef.set(newCustomer);
    return { success: true, created: true };
  }

  const customer = snap.data();
  const existingPin = customer.pinHash || customer.pin;

  // ─── Account Takeover Defense: Require current PIN if one is already set ───
  if (existingPin) {
    if (!currentPin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Your existing PIN is required to change to a new PIN.'
      );
    }
    const isCurrentValid = verifyPin(currentPin, existingPin, phoneDigits);
    if (!isCurrentValid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Current PIN is incorrect.'
      );
    }
  }

  // Store salted hash and delete any legacy plaintext PIN
  const newHash = hashPin(pinStr, phoneDigits);

  await customerRef.update({
    pinHash: newHash,
    pin: admin.firestore.FieldValue.delete(),
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * 4. toggleFavorite (HTTPS Callable)
 * Takes { phone, pin, itemId }
 * Verifies phone+pin
 * Toggles itemId in favorites array
 * Returns { favorites: [...updated array...] }
 */
exports.toggleFavorite = functions.https.onCall(async (data, context) => {
  const { phone, pin, itemId } = data || {};
  if (!phone || pin === undefined || pin === null || !itemId) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone, PIN, and itemId are required.');
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
  }

  const customerRef = db.collection('customers').doc(phoneDigits);
  let updatedFavorites = [];

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(customerRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
    }

    const customer = snap.data();
    if (!verifyPin(pin, customer.pinHash || customer.pin, phoneDigits)) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
    }

    const currentFavorites = Array.isArray(customer.favorites) ? customer.favorites : [];
    const cleanItemId = String(itemId).slice(0, 100);
    if (currentFavorites.includes(cleanItemId)) {
      updatedFavorites = currentFavorites.filter((id) => id !== cleanItemId);
    } else {
      updatedFavorites = [...currentFavorites, cleanItemId].slice(0, 50);
    }

    transaction.update(customerRef, {
      favorites: updatedFavorites,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { favorites: updatedFavorites };
});

/**
 * 5. removeSavedCard (HTTPS Callable)
 * Takes { phone, pin, cardId }
 * Verifies PIN
 * Disables card in Square
 * Removes card from customer's savedCards array in Firestore
 * Returns { success: true, savedCards }
 */
exports.removeSavedCard = functions.https.onCall(async (data, context) => {
  const { phone, pin, cardId } = data || {};
  if (!phone || pin === undefined || pin === null || !cardId) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone, PIN, and cardId are required.');
  }

  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
  }

  const customerRef = db.collection('customers').doc(phoneDigits);
  const snap = await customerRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
  }

  const customer = snap.data();
  if (!verifyPin(pin, customer.pinHash || customer.pin, phoneDigits)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
  }

  // Attempt to disable card in Square
  try {
    const { getSquareClient } = require('./shared');
    const squareClient = getSquareClient();
    await squareClient.cardsApi.disableCard(cardId);
  } catch (sqErr) {
    console.warn('Square disableCard warning (non-fatal):', sqErr.message || sqErr);
  }

  const existingCards = Array.isArray(customer.savedCards) ? customer.savedCards : [];
  const updatedCards = existingCards.filter(c => c.id !== cardId);

  await customerRef.update({
    savedCards: updatedCards,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, savedCards: updatedCards };
});

/**
 * 6. getAuthCustomerProfile (HTTPS Callable)
 * Retrieves authenticated customer profile via Firebase Auth (Google / Apple / Phone)
 */
exports.getAuthCustomerProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    return { authenticated: false };
  }

  const uid = context.auth.uid;
  const email = (context.auth.token.email || '').toLowerCase().trim();

  // 1. Try querying by uid
  let snap = await db.collection('customers').where('uid', '==', uid).limit(1).get();
  
  // 2. Fallback: Query by email if not found by uid
  if (snap.empty && email) {
    snap = await db.collection('customers').where('email', '==', email).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({
        uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
  }

  if (snap.empty) {
    return {
      authenticated: true,
      found: false,
      needsPhone: true,
      email,
      name: context.auth.token.name || '',
      photoUrl: context.auth.token.picture || null,
    };
  }

  const custDoc = snap.docs[0];
  const custData = custDoc.data();
  return {
    authenticated: true,
    found: true,
    customer: {
      phoneDigits: custDoc.id,
      phone: custData.phone || custDoc.id,
      name: custData.name || context.auth.token.name || '',
      email: custData.email || email,
      photoUrl: custData.photoUrl || context.auth.token.picture || null,
      totalOrders: custData.totalOrders || 0,
      loyaltyPoints: custData.loyaltyPoints || 0,
      tier: custData.tier || 'bronze',
      favorites: Array.isArray(custData.favorites) ? custData.favorites : [],
      savedCards: Array.isArray(custData.savedCards) ? custData.savedCards.map(c => ({
        id: c.id,
        brand: c.brand || 'CARD',
        last4: c.last4 || '••••',
        expMonth: c.expMonth ? Number(c.expMonth) : null,
        expYear: c.expYear ? Number(c.expYear) : null,
      })) : [],
      lastOrderDate: toIsoString(custData.lastOrderDate),
    }
  };
});

/**
 * 7. syncAuthCustomer (HTTPS Callable)
 * Links an authenticated Google/Apple user to a phone number in customers/{phoneDigits}
 */
exports.syncAuthCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
  }

  const uid = context.auth.uid;
  const authEmail = (context.auth.token.email || data?.email || '').toLowerCase().trim();
  const authName = (context.auth.token.name || data?.name || '').trim();
  const photoUrl = context.auth.token.picture || data?.photoUrl || null;
  const rawPhone = data?.phone;

  if (!rawPhone) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number is required.');
  }

  const phoneDigits = normalizePhone(rawPhone);
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid phone number format.');
  }

  const customerRef = db.collection('customers').doc(phoneDigits);
  const snap = await customerRef.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (snap.exists) {
    const existing = snap.data();
    const updates = {
      uid,
      photoUrl: photoUrl || existing.photoUrl || null,
      authProvider: context.auth.token.firebase?.sign_in_provider || 'oauth',
      updatedAt: now,
    };
    if (authEmail && !existing.email) updates.email = authEmail;
    if (authName && !existing.name) updates.name = authName;

    await customerRef.update(updates);
    const updated = { ...existing, ...updates };

    return {
      success: true,
      customer: {
        phoneDigits,
        phone: updated.phone || phoneDigits,
        name: updated.name || authName,
        email: updated.email || authEmail,
        photoUrl: updated.photoUrl,
        totalOrders: updated.totalOrders || 0,
        loyaltyPoints: updated.loyaltyPoints || 0,
        tier: updated.tier || 'bronze',
        favorites: Array.isArray(updated.favorites) ? updated.favorites : [],
        savedCards: Array.isArray(updated.savedCards) ? updated.savedCards.map(c => ({
          id: c.id,
          brand: c.brand || 'CARD',
          last4: c.last4 || '••••',
          expMonth: c.expMonth ? Number(c.expMonth) : null,
          expYear: c.expYear ? Number(c.expYear) : null,
        })) : [],
        lastOrderDate: toIsoString(updated.lastOrderDate),
      }
    };
  } else {
    // Brand new customer signup! Give 100 Welcome Points!
    const newCustomer = {
      uid,
      name: authName || '',
      phone: String(rawPhone).trim(),
      email: authEmail || null,
      photoUrl,
      authProvider: context.auth.token.firebase?.sign_in_provider || 'oauth',
      firstOrderDate: null,
      lastOrderDate: null,
      totalOrders: 0,
      totalSpentCents: 0,
      loyaltyPoints: 100, // 100 Welcome Points!
      tier: 'bronze',
      favorites: [],
      savedCards: [],
      pinHash: null,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };

    await customerRef.set(newCustomer);

    return {
      success: true,
      welcomeBonus: 100,
      customer: {
        phoneDigits,
        phone: newCustomer.phone,
        name: newCustomer.name,
        email: newCustomer.email,
        photoUrl: newCustomer.photoUrl,
        totalOrders: 0,
        loyaltyPoints: 100,
        tier: 'bronze',
        favorites: [],
        savedCards: [],
        lastOrderDate: null,
      }
    };
  }
});

/**
 * 8. redeemLoyaltyReward (HTTPS Callable)
 * Validates customer points, deducts reward cost atomically, and creates a redemption voucher.
 */
exports.redeemLoyaltyReward = functions.https.onCall(async (data, context) => {
  const { rewardId, phone, pin } = data || {};
  if (!rewardId) {
    throw new functions.https.HttpsError('invalid-argument', 'Reward ID is required.');
  }

  // 1. Identify customer: either via context.auth.uid or phone+pin
  let customerRef = null;
  let phoneDigits = '';

  if (context.auth && context.auth.uid) {
    const snap = await db.collection('customers').where('uid', '==', context.auth.uid).limit(1).get();
    if (!snap.empty) {
      customerRef = snap.docs[0].ref;
      phoneDigits = snap.docs[0].id;
    }
  }

  if (!customerRef && phone) {
    phoneDigits = normalizePhone(phone);
    if (phoneDigits) {
      const snap = await db.collection('customers').doc(phoneDigits).get();
      if (snap.exists) {
        const custData = snap.data();
        if (custData.pinHash) {
          if (!pin || !verifyPin(pin, custData.pinHash)) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid PIN.');
          }
        }
        customerRef = snap.ref;
      }
    }
  }

  if (!customerRef) {
    throw new functions.https.HttpsError('unauthenticated', 'Customer profile not found or unauthenticated.');
  }

  // 2. Fetch reward document
  const rewardRef = db.collection('rewards').doc(rewardId);
  const rewardSnap = await rewardRef.get();
  if (!rewardSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Reward item not found.');
  }
  const rewardData = rewardSnap.data();
  if (rewardData.active === false) {
    throw new functions.https.HttpsError('failed-precondition', 'This reward is currently unavailable.');
  }

  const pointsCost = Math.max(1, parseInt(rewardData.pointsCost, 10) || 50);

  // 3. Run atomic transaction on customer doc
  let newBalance = 0;
  let voucherCode = '';

  await db.runTransaction(async (transaction) => {
    const custSnap = await transaction.get(customerRef);
    if (!custSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Customer document not found.');
    }
    const currentPoints = parseInt(custSnap.data().loyaltyPoints, 10) || 0;
    if (currentPoints < pointsCost) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient points. You have ${currentPoints} points, but this reward requires ${pointsCost} points.`
      );
    }

    newBalance = currentPoints - pointsCost;
    transaction.update(customerRef, {
      loyaltyPoints: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    voucherCode = 'RWD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const redemptionRef = db.collection('redemptions').doc();
    transaction.set(redemptionRef, {
      voucherCode,
      rewardId,
      rewardTitle: rewardData.title || 'Reward Item',
      rewardType: rewardData.rewardType || 'free_menu_item',
      menuItemId: rewardData.menuItemId || null,
      menuItemName: rewardData.menuItemName || null,
      discountAmount: rewardData.discountAmount || 0,
      pointsSpent: pointsCost,
      customerPhone: phoneDigits,
      customerId: customerRef.id,
      status: 'active',
      redeemedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return {
    success: true,
    newPoints: newBalance,
    voucherCode,
    reward: {
      id: rewardId,
      title: rewardData.title,
      rewardType: rewardData.rewardType,
      menuItemId: rewardData.menuItemId,
      menuItemName: rewardData.menuItemName,
      discountAmount: rewardData.discountAmount,
      pointsCost
    }
  };
});

module.exports = {
  lookupCustomer: exports.lookupCustomer,
  getOrderHistory: exports.getOrderHistory,
  setCustomerPin: exports.setCustomerPin,
  toggleFavorite: exports.toggleFavorite,
  removeSavedCard: exports.removeSavedCard,
  getAuthCustomerProfile: exports.getAuthCustomerProfile,
  syncAuthCustomer: exports.syncAuthCustomer,
  redeemLoyaltyReward: exports.redeemLoyaltyReward,
  updateCustomerOnOrder,
  revertCustomerOnRefund,
  normalizePhone,
  calculateTier,
  verifyPin,
  hashPin
};
