const fs = require('fs');
let code = fs.readFileSync('functions/customers.js', 'utf8');

const helperDef = `
/**
 * Shared PIN verification with rate-limiting and 15-minute brute-force lockout.
 */
async function verifyCustomerPinWithLockout(customerRef, customerData, candidatePin, phoneDigits) {
  const now = Date.now();
  let lockedUntilMs = 0;
  if (customerData.lockedUntil?.toMillis) {
    lockedUntilMs = customerData.lockedUntil.toMillis();
  } else if (customerData.lockedUntil?.seconds) {
    lockedUntilMs = customerData.lockedUntil.seconds * 1000;
  } else if (customerData.lockedUntil) {
    lockedUntilMs = new Date(customerData.lockedUntil).getTime();
  }

  if (lockedUntilMs > now) {
    const minsRemaining = Math.max(1, Math.ceil((lockedUntilMs - now) / 60000));
    throw new functions.https.HttpsError(
      'resource-exhausted',
      \`Account is temporarily locked due to multiple incorrect PIN attempts. Please try again in \${minsRemaining} minute\${minsRemaining === 1 ? '' : 's'}.\`
    );
  }

  const storedPinOrHash = customerData.pinHash || customerData.pin;
  if (!storedPinOrHash) {
    throw new functions.https.HttpsError('permission-denied', 'No PIN is set for this account.');
  }

  const isValid = verifyPin(candidatePin, storedPinOrHash, phoneDigits);
  if (!isValid) {
    const failedAttempts = (customerData.failedAttempts || 0) + 1;
    const lockUpdates = { failedAttempts };
    if (failedAttempts >= 5) {
      lockUpdates.lockedUntil = admin.firestore.Timestamp.fromMillis(now + 15 * 60 * 1000);
      lockUpdates.failedAttempts = 0;
    }
    await customerRef.update(lockUpdates).catch(() => {});
    throw new functions.https.HttpsError('permission-denied', 'Invalid phone or PIN.');
  }

  // Reset Failed Attempts on successful PIN verification
  const cleanupUpdates = {};
  if (customerData.failedAttempts || customerData.lockedUntil) {
    cleanupUpdates.failedAttempts = 0;
    cleanupUpdates.lockedUntil = null;
  }
  if (!customerData.pinHash && customerData.pin) {
    cleanupUpdates.pinHash = hashPin(candidatePin, phoneDigits);
    cleanupUpdates.pin = admin.firestore.FieldValue.delete();
  }
  if (Object.keys(cleanupUpdates).length > 0) {
    await customerRef.update(cleanupUpdates).catch(() => {});
  }
  return true;
}
`;

if (!code.includes('verifyCustomerPinWithLockout')) {
  // Insert helper before exports.getOrderHistory
  code = code.replace('exports.getOrderHistory = functions.https.onCall', helperDef + '\nexports.getOrderHistory = functions.https.onCall');
  
  // Replace the lockout logic in getOrderHistory with the helper call
  const targetRegex = /\/\/ ─── Brute-Force Rate Limiting & Lockout Check ───[\s\S]*?if \(Object\.keys\(cleanupUpdates\)\.length > 0\) \{[\s\S]*?await customerRef\.update\(cleanupUpdates\)\.catch\(\(\) => \{\}\);[\s\S]*?\}/;
  
  code = code.replace(targetRegex, 'await verifyCustomerPinWithLockout(customerRef, customer, pinStr, phoneDigits);');
  
  // Add to module.exports
  code = code.replace(
    'verifyPin,\n  hashPin',
    'verifyPin,\n  hashPin,\n  verifyCustomerPinWithLockout'
  );
  
  fs.writeFileSync('functions/customers.js', code, 'utf8');
  console.log('functions/customers.js updated with verifyCustomerPinWithLockout');
} else {
  console.log('verifyCustomerPinWithLockout already exists');
}
