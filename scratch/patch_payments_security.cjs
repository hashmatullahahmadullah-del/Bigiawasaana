const fs = require('fs');
let code = fs.readFileSync('functions/payments.js', 'utf8');

// 1. Import isAdminContext
code = code.replace(
  "const { functions, admin, db, TAX_RATE, getSquareClient, getLocationId } = require('./shared');",
  "const { functions, admin, db, TAX_RATE, getSquareClient, getLocationId, isAdminContext } = require('./shared');"
);

// 2. Import verifyCustomerPinWithLockout
code = code.replace(
  "const { normalizePhone, verifyPin, hashPin } = require('./customers');",
  "const { normalizePhone, verifyPin, hashPin, verifyCustomerPinWithLockout } = require('./customers');"
);

// 3. Use verifyCustomerPinWithLockout in saved card payment
const oldPinCheck = `    const custData = custSnap.data();
    const storedPin = custData.pinHash || custData.pin;
    if (!storedPin) {
      throw new functions.https.HttpsError('permission-denied', 'A 4-digit PIN is required to authorize payment with a saved card.');
    }
    if (!pin || !verifyPin(pin, storedPin, phoneDigits)) {
      throw new functions.https.HttpsError('permission-denied', 'Incorrect 4-digit PIN for saved card authorization.');
    }`;

const newPinCheck = `    const custData = custSnap.data();
    await verifyCustomerPinWithLockout(custSnap.ref, custData, pin, phoneDigits);`;

if (code.includes(oldPinCheck)) {
  code = code.replace(oldPinCheck, newPinCheck);
} else {
  console.log('oldPinCheck not matched verbatim, using regex');
  code = code.replace(
    /const custData = custSnap\.data\(\);[\s\S]*?throw new functions\.https\.HttpsError\('permission-denied', 'Incorrect 4-digit PIN for saved card authorization\.'\);\s*\}/,
    newPinCheck
  );
}

// 4. Update admin checks in purchaseShippingLabel and registerApplePayDomain
code = code.replace(
  "if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can purchase shipping labels.');\n  }",
  "if (!isAdminContext(context)) {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can purchase shipping labels.');\n  }"
);

code = code.replace(
  "if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can register Apple Pay domains.');\n  }",
  "if (!isAdminContext(context)) {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can register Apple Pay domains.');\n  }"
);

fs.writeFileSync('functions/payments.js', code, 'utf8');
console.log('functions/payments.js updated successfully');
