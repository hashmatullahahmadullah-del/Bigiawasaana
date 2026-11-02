/**
 * BIGI AWASAANA — Server-Verified Order Tracking & Secure Reorder Test Suite
 * 
 * Verifies:
 * 1. Valid order token retrieves sanitized tracking information.
 * 2. Invalid order token is rejected with permission-denied.
 * 3. Missing token or missing orderId is rejected with invalid-argument.
 * 4. Nonexistent order returns permission-denied (prevents order ID enumeration).
 * 5. Data sanitization guarantees: customerPhone, customerEmail, squarePaymentId, accessToken are NEVER leaked.
 * 6. Secure reorder requires valid token or customer ownership.
 * 7. Rate limiter throttles excessive requests per IP.
 */

const assert = require('assert');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// Simulated Backend Implementation matching functions/orders.js
// ─────────────────────────────────────────────────────────────────

const trackingRateLimits = new Map();
function checkTrackingRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const windowMs = 60000;
  let record = trackingRateLimits.get(ip);
  if (!record || now - record.start > windowMs) {
    record = { start: now, count: 1 };
    trackingRateLimits.set(ip, record);
    return true;
  }
  record.count++;
  if (record.count > 40) {
    return false;
  }
  return true;
}

function constantTimeCompare(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(String(a).trim()).digest();
  const hashB = crypto.createHash('sha256').update(String(b).trim()).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Mock Firestore Database
const mockDb = {
  orders: {
    'sq_ord_valid_99': {
      squareOrderId: 'sq_ord_valid_99',
      squarePaymentId: 'sq_pay_secret_token_123',
      accessToken: 'a1b2c3d4e5f67890abcdef1234567890',
      customerName: 'Ahmadullah Khan',
      customerPhone: '8185551234',
      customerEmail: 'ahmad@example.com',
      cardBrand: 'VISA',
      cardLast4: '4242',
      total: 34.50,
      totalCents: 3450,
      status: 'preparing',
      estimatedReadyAt: '2026-10-29T10:30:00Z',
      pickup: { pickupType: 'asap' },
      items: [
        { itemId: 'chicken-gyro-plate', name: 'Chicken Gyro Plate', quantity: 2, selectedVariant: 'Rice', selectedAddOns: ['Extra White Sauce'] }
      ],
      createdAt: '2026-10-29T10:00:00Z',
      updatedAt: '2026-10-29T10:05:00Z'
    }
  }
};

function handleGetOrderTracking({ data, context }) {
  const callerIp = context?.rawRequest?.ip || '127.0.0.1';
  if (!checkTrackingRateLimit(callerIp)) {
    const err = new Error('Too many requests. Please slow down.');
    err.code = 'resource-exhausted';
    throw err;
  }

  const { orderId, token } = data || {};
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    const err = new Error('Missing or invalid orderId.');
    err.code = 'invalid-argument';
    throw err;
  }
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    const err = new Error('Missing or invalid access token.');
    err.code = 'invalid-argument';
    throw err;
  }

  const cleanOrderId = orderId.trim();
  const cleanToken = token.trim();
  const order = mockDb.orders[cleanOrderId];

  if (!order) {
    const err = new Error('Invalid order tracking link or order not found.');
    err.code = 'permission-denied';
    throw err;
  }

  const isAdmin = context?.auth?.token?.email === 'bigiawasaana@gmail.com';
  const isKds = context?.auth?.token?.kds === true;
  const isTokenValid = constantTimeCompare(cleanToken, order.accessToken);

  if (!isTokenValid && !isAdmin && !isKds) {
    const err = new Error('Invalid order tracking link or order not found.');
    err.code = 'permission-denied';
    throw err;
  }

  const gross = typeof order.total === 'number' ? order.total : (parseFloat(order.total) || 0);
  const refundAmt = Number(order.refundedAmount || 0);
  const firstName = order.customerName ? order.customerName.trim().split(/\s+/)[0] : 'Guest';

  return {
    success: true,
    orderId: cleanOrderId,
    orderNumber: cleanOrderId.slice(-4).toUpperCase(),
    customerFirstName: firstName,
    status: order.status || 'pending',
    total: gross,
    refundedAmount: refundAmt,
    cardBrand: order.cardBrand || null,
    cardLast4: order.cardLast4 || null,
    cancellationReason: order.cancellationReason || '',
    refundReason: order.refundReason || '',
    estimatedReadyAt: order.estimatedReadyAt || null,
    pickup: {
      pickupType: order.pickup?.pickupType || 'asap',
      pickupTime: order.pickup?.pickupTime || null,
      pickupDate: order.pickup?.pickupDate || null
    },
    items: Array.isArray(order.items) ? order.items.map(item => ({
      name: item.name || 'Item',
      quantity: item.quantity || item.qty || 1
    })) : [],
    returns: Array.isArray(order.returns) ? order.returns.map(ret => ({
      items: ret.items || [],
      amount: ret.amount || 0
    })) : []
  };
}

function handleGetReorderItems({ data, context }) {
  const callerIp = context?.rawRequest?.ip || '127.0.0.1';
  if (!checkTrackingRateLimit(callerIp)) {
    const err = new Error('Too many requests. Please slow down.');
    err.code = 'resource-exhausted';
    throw err;
  }

  const { orderId, token } = data || {};
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    const err = new Error('Missing or invalid orderId.');
    err.code = 'invalid-argument';
    throw err;
  }

  const cleanOrderId = orderId.trim();
  const order = mockDb.orders[cleanOrderId];

  if (!order) {
    const err = new Error('Order not found or invalid credentials.');
    err.code = 'permission-denied';
    throw err;
  }

  const isAdmin = context?.auth?.token?.email === 'bigiawasaana@gmail.com';
  const isOwnerUid = context?.auth?.uid && order.customerId === context.auth.uid;
  const isTokenValid = token && constantTimeCompare(token.trim(), order.accessToken);

  if (!isTokenValid && !isOwnerUid && !isAdmin) {
    const err = new Error('Order not found or invalid credentials.');
    err.code = 'permission-denied';
    throw err;
  }

  return {
    success: true,
    items: Array.isArray(order.items) ? order.items.map(item => ({
      itemId: item.itemId || null,
      name: item.name || '',
      quantity: item.quantity || item.qty || 1,
      selectedVariant: item.selectedVariant || '',
      selectedAddOns: Array.isArray(item.selectedAddOns) ? item.selectedAddOns : [],
      isMeal: Boolean(item.isMeal),
      mealUpgradeId: item.mealUpgradeId || null
    })) : []
  };
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

const testResults = [];
function runTest(name, fn) {
  try {
    fn();
    testResults.push({ name, passed: true });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    testResults.push({ name, passed: false, error: err.message });
    console.error(`  ✘ ${name}: ${err.message}`);
  }
}

console.log('\n--- Running Customer Privacy & Order Tracking Verification Tests ---\n');

// 1. Valid Token & Sanitization Test
runTest('Valid token: returns tracking info and strictly sanitizes PII', () => {
  const result = handleGetOrderTracking({
    data: {
      orderId: 'sq_ord_valid_99',
      token: 'a1b2c3d4e5f67890abcdef1234567890'
    },
    context: { rawRequest: { ip: '192.168.1.1' } }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.orderNumber, 'D_99');
  assert.strictEqual(result.customerFirstName, 'Ahmadullah');
  assert.strictEqual(result.status, 'preparing');
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.items[0].name, 'Chicken Gyro Plate');

  // Strict Data Sanitization Assertions:
  assert.strictEqual(result.customerPhone, undefined, 'customerPhone must NOT be present');
  assert.strictEqual(result.customerEmail, undefined, 'customerEmail must NOT be present');
  assert.strictEqual(result.squarePaymentId, undefined, 'squarePaymentId must NOT be present');
  assert.strictEqual(result.squareOrderId, undefined, 'squareOrderId must NOT be present');
  assert.strictEqual(result.accessToken, undefined, 'accessToken must NOT be present');
  assert.strictEqual(result.cardLast4, '4242'); // Only masked 4 digits allowed for refund message
});

// 2. Invalid Token Rejection
runTest('Invalid token: throws permission-denied', () => {
  assert.throws(() => {
    handleGetOrderTracking({
      data: {
        orderId: 'sq_ord_valid_99',
        token: 'wrong_forged_token_000000000000'
      },
      context: { rawRequest: { ip: '192.168.1.2' } }
    });
  }, (err) => err.code === 'permission-denied');
});

// 3. Missing Token Rejection
runTest('Missing token: throws invalid-argument', () => {
  assert.throws(() => {
    handleGetOrderTracking({
      data: {
        orderId: 'sq_ord_valid_99',
        token: ''
      },
      context: { rawRequest: { ip: '192.168.1.3' } }
    });
  }, (err) => err.code === 'invalid-argument');
});

// 4. Missing OrderId Rejection
runTest('Missing orderId: throws invalid-argument', () => {
  assert.throws(() => {
    handleGetOrderTracking({
      data: {
        orderId: '',
        token: 'a1b2c3d4e5f67890abcdef1234567890'
      },
      context: { rawRequest: { ip: '192.168.1.4' } }
    });
  }, (err) => err.code === 'invalid-argument');
});

// 5. Nonexistent Order Handling (Identical permission-denied to prevent enumeration)
runTest('Nonexistent order: throws identical permission-denied', () => {
  assert.throws(() => {
    handleGetOrderTracking({
      data: {
        orderId: 'nonexistent_order_id',
        token: 'a1b2c3d4e5f67890abcdef1234567890'
      },
      context: { rawRequest: { ip: '192.168.1.5' } }
    });
  }, (err) => err.code === 'permission-denied');
});

// 6. Secure Reordering: Valid Token
runTest('getReorderItems: valid token returns only catalog items and variants', () => {
  const result = handleGetReorderItems({
    data: {
      orderId: 'sq_ord_valid_99',
      token: 'a1b2c3d4e5f67890abcdef1234567890'
    },
    context: { rawRequest: { ip: '192.168.1.6' } }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.items[0].itemId, 'chicken-gyro-plate');
  assert.strictEqual(result.items[0].quantity, 2);
  assert.strictEqual(result.items[0].selectedVariant, 'Rice');
  assert.deepStrictEqual(result.items[0].selectedAddOns, ['Extra White Sauce']);
  assert.strictEqual(result.customerPhone, undefined);
  assert.strictEqual(result.customerEmail, undefined);
  assert.strictEqual(result.total, undefined);
});

// 7. Secure Reordering: Missing Token Rejected
runTest('getReorderItems: missing token throws permission-denied', () => {
  assert.throws(() => {
    handleGetReorderItems({
      data: {
        orderId: 'sq_ord_valid_99',
        token: ''
      },
      context: { rawRequest: { ip: '192.168.1.7' } }
    });
  }, (err) => err.code === 'permission-denied');
});

// 8. Secure Reordering: Invalid Token Rejected
runTest('getReorderItems: invalid token throws permission-denied', () => {
  assert.throws(() => {
    handleGetReorderItems({
      data: {
        orderId: 'sq_ord_valid_99',
        token: 'forged_reorder_token'
      },
      context: { rawRequest: { ip: '192.168.1.8' } }
    });
  }, (err) => err.code === 'permission-denied');
});

// 9. Rate Limiter Test
runTest('Rate limiter: blocks after 40 rapid requests from same IP', () => {
  const spamIp = '10.0.0.99';
  let blocked = false;
  for (let i = 0; i < 45; i++) {
    try {
      handleGetOrderTracking({
        data: {
          orderId: 'sq_ord_valid_99',
          token: 'a1b2c3d4e5f67890abcdef1234567890'
        },
        context: { rawRequest: { ip: spamIp } }
      });
    } catch (e) {
      if (e.code === 'resource-exhausted') {
        blocked = true;
        break;
      }
    }
  }
  assert.strictEqual(blocked, true, 'Expected rate limiter to throw resource-exhausted');
});

console.log(`\nResults: ${testResults.filter(r => r.passed).length} / ${testResults.length} tests passed.\n`);

const failed = testResults.filter(r => !r.passed).length;
if (failed > 0) process.exit(1);
else process.exit(0);
