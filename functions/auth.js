const { functions, admin, db } = require('./shared');
const crypto = require('crypto');

// In-memory brute-force prevention for KDS PIN attempts (IP-based)
const failedKdsAttempts = new Map();
const MAX_KDS_ATTEMPTS = 5;
const KDS_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkKdsRateLimit(callerIp) {
  const now = Date.now();
  const entry = failedKdsAttempts.get(callerIp);
  if (!entry) return true;
  
  if (now - entry.firstAttempt > KDS_LOCKOUT_MS) {
    failedKdsAttempts.delete(callerIp);
    return true;
  }
  
  return entry.count < MAX_KDS_ATTEMPTS;
}

function recordKdsFailure(callerIp) {
  const now = Date.now();
  const entry = failedKdsAttempts.get(callerIp) || { count: 0, firstAttempt: now };
  entry.count += 1;
  failedKdsAttempts.set(callerIp, entry);
}

function clearKdsFailure(callerIp) {
  failedKdsAttempts.delete(callerIp);
}

// ─────────────────────────────────────────────────────────────────
// verifyKdsPin
// Callable function — verifies the KDS PIN with timing-safe check and rate limiting
// ─────────────────────────────────────────────────────────────────
exports.verifyKdsPin = functions.https.onCall(async (data, context) => {
  const callerIp = context.rawRequest?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() || context.rawRequest?.ip || 'kds_terminal';

  if (!checkKdsRateLimit(callerIp)) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts. Please wait 15 minutes.');
  }

  const { pin } = data || {};

  if (!pin || typeof pin !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid PIN.');
  }

  const docRef = db.collection('settings').doc('kds');
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'KDS settings not found.');
  }

  const kdsData = doc.data();
  const storedPin = String(kdsData.pin || '');
  const candidatePin = String(pin);

  // Constant-time string comparison to prevent timing attacks
  const bufA = Buffer.from(candidatePin);
  const bufB = Buffer.from(storedPin);
  const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

  if (isMatch) {
    clearKdsFailure(callerIp);
    // If context.auth exists, set custom user claim kds: true
    if (context.auth && context.auth.uid) {
      await admin.auth().setCustomUserClaims(context.auth.uid, { kds: true });
    }
    return { success: true };
  } else {
    recordKdsFailure(callerIp);
    return { success: false };
  }
});
