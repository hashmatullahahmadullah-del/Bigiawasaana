const { functions, admin, db } = require('./shared');

// ─────────────────────────────────────────────────────────────────
// verifyKdsPin
// Callable function — verifies the KDS PIN
// ─────────────────────────────────────────────────────────────────
exports.verifyKdsPin = functions.https.onCall(async (data, context) => {
  const { pin } = data;

  if (!pin || typeof pin !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid PIN.');
  }

  const docRef = db.collection('settings').doc('kds');
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'KDS settings not found.');
  }

  const kdsData = doc.data();
  if (kdsData.pin === pin) {
    // If context.auth exists, set custom user claim kds: true
    if (context.auth && context.auth.uid) {
      await admin.auth().setCustomUserClaims(context.auth.uid, { kds: true });
    }
    return { success: true };
  } else {
    return { success: false };
  }
});
