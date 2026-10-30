const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {}

const db = admin.firestore();

function stripHtml(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>?/gm, '').trim();
}

exports.submitRetailReview = functions.https.onCall(async (data, context) => {
  const { productId, rating, name, reviewText } = data || {};
  
  if (!productId || typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid product ID or rating.');
  }

  const cleanName = stripHtml(name).substring(0, 50) || 'Anonymous';
  const cleanText = stripHtml(reviewText).substring(0, 500);

  const review = {
    productId: String(productId).trim(),
    rating: Math.max(1, Math.min(5, Math.floor(rating))),
    name: cleanName,
    text: cleanText,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'approved'
  };

  await db.collection('retail_reviews').add(review);
  return { success: true };
});
