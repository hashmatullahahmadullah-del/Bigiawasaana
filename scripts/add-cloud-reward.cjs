const fs = require('fs');

const custPath = 'functions/customers.js';
let c = fs.readFileSync(custPath, 'utf8');

const target = 'module.exports = {';
const functionCode = `/**
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
        \`Insufficient points. You have \${currentPoints} points, but this reward requires \${pointsCost} points.\`
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

`;

if (c.includes(target) && !c.includes('redeemLoyaltyReward')) {
  c = c.replace(target, functionCode + target);
  // Also add to module.exports
  c = c.replace('syncAuthCustomer: exports.syncAuthCustomer,', 'syncAuthCustomer: exports.syncAuthCustomer,\n  redeemLoyaltyReward: exports.redeemLoyaltyReward,');
  fs.writeFileSync(custPath, c);
  console.log('Added redeemLoyaltyReward to functions/customers.js');
}

// Export in functions/index.js
const indexPath = 'functions/index.js';
let idxC = fs.readFileSync(indexPath, 'utf8');
if (idxC.includes('exports.syncAuthCustomer') && !idxC.includes('exports.redeemLoyaltyReward')) {
  idxC = idxC.replace(
    "exports.syncAuthCustomer = require('./customers').syncAuthCustomer;",
    "exports.syncAuthCustomer = require('./customers').syncAuthCustomer;\nexports.redeemLoyaltyReward = require('./customers').redeemLoyaltyReward;"
  );
  fs.writeFileSync(indexPath, idxC);
  console.log('Exported redeemLoyaltyReward in functions/index.js');
}
