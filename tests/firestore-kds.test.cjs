/**
 * BIGI AWASAANA — KDS Security Rules Unit Tests
 * 
 * Verifies:
 * 1. Public KDS settings reads are denied.
 * 2. Admin access remains functional.
 * 3. Legitimate KDS status changes succeed.
 * 4. KDS users cannot modify prices, payment information, customer data, or access tokens.
 * 5. KDS users can set kdsHidden: true.
 * 6. KDS users cannot jump statuses backward (e.g., ready -> pending).
 */

const assert = require('assert');

// ─────────────────────────────────────────────────────────────────
// Simulated Rule Engine matching firestore.rules logic
// ─────────────────────────────────────────────────────────────────

function evaluateRules({ auth, path, method, existingData, incomingData }) {
  const isAdmin = auth != null && auth.token && auth.token.email === 'bigiawasaana@gmail.com';
  const isKds = auth != null && auth.token && auth.token.kds === true;
  const isAdminOrKds = isAdmin || isKds;

  // 1. Settings Collection
  if (path.startsWith('settings/')) {
    const docId = path.split('/')[1];
    const allowedPublicDocs = ['pickupConfig', 'popup', 'cart_promo', 'tv_promo', 'tv_display', 'loyalty'];

    if (method === 'get' || method === 'read') {
      if (allowedPublicDocs.includes(docId) || isAdmin) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'PERMISSION_DENIED: settings doc not public' };
    }

    if (method === 'write' || method === 'update' || method === 'delete') {
      if (isAdmin) return { allowed: true };
      return { allowed: false, reason: 'PERMISSION_DENIED: settings write requires admin' };
    }
  }

  // 2. Orders Collection
  if (path.startsWith('orders/')) {
    if (method === 'create') {
      return { allowed: false, reason: 'PERMISSION_DENIED: direct client order creation forbidden' };
    }

    if (method === 'get') {
      // Kept public in Phase 1 awaiting Phase 2 tracking migration
      return { allowed: true };
    }

    if (method === 'list') {
      if (isAdminOrKds) return { allowed: true };
      return { allowed: false, reason: 'PERMISSION_DENIED: listing orders requires admin or KDS' };
    }

    if (method === 'delete') {
      if (isAdmin) return { allowed: true };
      return { allowed: false, reason: 'PERMISSION_DENIED: order deletion requires admin' };
    }

    if (method === 'update') {
      if (isAdmin) return { allowed: true };

      // Helper: affectedKeys
      const diffKeys = [];
      const allKeys = new Set([...Object.keys(existingData || {}), ...Object.keys(incomingData || {})]);
      for (const k of allKeys) {
        if (JSON.stringify(existingData[k]) !== JSON.stringify(incomingData[k])) {
          diffKeys.push(k);
        }
      }

      // Check isKdsStatusUpdate
      const isStatusOnly = diffKeys.length > 0 && diffKeys.every(k => k === 'status' || k === 'updatedAt');
      const validTransition = 
        (existingData.status === 'pending' && incomingData.status === 'preparing') ||
        (existingData.status === 'preparing' && incomingData.status === 'ready') ||
        (existingData.status === 'ready' && incomingData.status === 'completed');

      const isKdsStatusUpdate = isKds && isStatusOnly && validTransition;

      // Check isKdsDismiss
      const isDismissOnly = diffKeys.length > 0 && diffKeys.every(k => k === 'kdsHidden' || k === 'updatedAt');
      const isKdsDismiss = isKds && isDismissOnly && typeof incomingData.kdsHidden === 'boolean';

      if (isKdsStatusUpdate || isKdsDismiss) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'PERMISSION_DENIED: KDS update strictly restricted to status progression or kdsHidden' };
    }
  }

  return { allowed: false, reason: 'PERMISSION_DENIED: default deny' };
}

// ─────────────────────────────────────────────────────────────────
// Test Cases
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

console.log('\n--- Running KDS & Settings Security Rules Verification Suite ---\n');

// 1. Settings Collection Tests
runTest('Public unauthenticated read on settings/kds is DENIED', () => {
  const res = evaluateRules({
    auth: null,
    path: 'settings/kds',
    method: 'get'
  });
  assert.strictEqual(res.allowed, false, 'Expected public read of settings/kds to be denied');
});

runTest('Public unauthenticated read on settings/pickupConfig is ALLOWED', () => {
  const res = evaluateRules({
    auth: null,
    path: 'settings/pickupConfig',
    method: 'get'
  });
  assert.strictEqual(res.allowed, true, 'Expected pickupConfig to remain publicly readable');
});

runTest('Admin read on settings/kds is ALLOWED', () => {
  const res = evaluateRules({
    auth: { uid: 'admin_1', token: { email: 'bigiawasaana@gmail.com' } },
    path: 'settings/kds',
    method: 'get'
  });
  assert.strictEqual(res.allowed, true, 'Expected admin to be able to read settings/kds');
});

runTest('Admin write on settings/kds is ALLOWED', () => {
  const res = evaluateRules({
    auth: { uid: 'admin_1', token: { email: 'bigiawasaana@gmail.com' } },
    path: 'settings/kds',
    method: 'update',
    incomingData: { pin: '999888' }
  });
  assert.strictEqual(res.allowed, true, 'Expected admin to be able to update settings/kds');
});

// 2. KDS Order Updates: Legitimate Actions
const sampleOrder = {
  id: 'ord_sample_123',
  customerName: 'Ahmad Khan',
  customerPhone: '8185551234',
  customerEmail: 'ahmad@example.com',
  cardBrand: 'VISA',
  cardLast4: '1234',
  squareOrderId: 'sq_123',
  squarePaymentId: 'sq_pay_123',
  accessToken: 'secret_track_tok_abc',
  items: [{ name: 'Chicken Gyro', price: 14.99, quantity: 2 }],
  subtotal: 29.98,
  tax: 2.85,
  tip: 5.00,
  total: 37.83,
  status: 'pending',
  kdsHidden: false,
  createdAt: '2026-10-27T20:00:00Z',
  updatedAt: '2026-10-27T20:00:00Z'
};

const kdsAuth = {
  uid: 'tablet_kds_anon_1',
  token: { kds: true }
};

runTest('KDS transition: pending -> preparing succeeds', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, status: 'preparing', updatedAt: '2026-10-27T20:05:00Z' }
  });
  assert.strictEqual(res.allowed, true, 'Expected KDS to transition pending -> preparing');
});

runTest('KDS transition: preparing -> ready succeeds', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: { ...sampleOrder, status: 'preparing' },
    incomingData: { ...sampleOrder, status: 'ready', updatedAt: '2026-10-27T20:15:00Z' }
  });
  assert.strictEqual(res.allowed, true, 'Expected KDS to transition preparing -> ready');
});

runTest('KDS transition: ready -> completed succeeds', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: { ...sampleOrder, status: 'ready' },
    incomingData: { ...sampleOrder, status: 'completed', updatedAt: '2026-10-27T20:25:00Z' }
  });
  assert.strictEqual(res.allowed, true, 'Expected KDS to transition ready -> completed');
});

runTest('KDS dismissal: toggling kdsHidden: true succeeds', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, kdsHidden: true, updatedAt: '2026-10-27T20:30:00Z' }
  });
  assert.strictEqual(res.allowed, true, 'Expected KDS to toggle kdsHidden');
});

// 3. KDS Order Updates: Unauthorized Tampering Rejections
runTest('KDS tampering: modifying price / total is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, total: 0.00, status: 'preparing' }
  });
  assert.strictEqual(res.allowed, false, 'Expected price tampering to be blocked');
});

runTest('KDS tampering: modifying customer phone or email is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, customerPhone: '0000000000', status: 'preparing' }
  });
  assert.strictEqual(res.allowed, false, 'Expected customer PII modification to be blocked');
});

runTest('KDS tampering: modifying payment ID or cardLast4 is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, cardLast4: '9999', status: 'preparing' }
  });
  assert.strictEqual(res.allowed, false, 'Expected card tampering to be blocked');
});

runTest('KDS tampering: modifying accessToken is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: sampleOrder,
    incomingData: { ...sampleOrder, accessToken: 'hacked_token', status: 'preparing' }
  });
  assert.strictEqual(res.allowed, false, 'Expected accessToken tampering to be blocked');
});

runTest('KDS invalid status transition: ready -> pending is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: { ...sampleOrder, status: 'ready' },
    incomingData: { ...sampleOrder, status: 'pending', updatedAt: '2026-10-27T20:20:00Z' }
  });
  assert.strictEqual(res.allowed, false, 'Expected backward status transition to be blocked');
});

runTest('KDS invalid status transition: completed -> canceled is REJECTED', () => {
  const res = evaluateRules({
    auth: kdsAuth,
    path: 'orders/ord_sample_123',
    method: 'update',
    existingData: { ...sampleOrder, status: 'completed' },
    incomingData: { ...sampleOrder, status: 'canceled', updatedAt: '2026-10-27T20:40:00Z' }
  });
  assert.strictEqual(res.allowed, false, 'Expected KDS cancellation to be blocked');
});

console.log(`\nResults: ${testResults.filter(r => r.passed).length} / ${testResults.length} tests passed.\n`);

const failedCount = testResults.filter(r => !r.passed).length;
if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
