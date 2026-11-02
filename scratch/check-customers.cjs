const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ projectId: 'bigi-awasaana-7b3ce' });
}
const db = getFirestore();

(async () => {
  const snap = await db.collection('customers').limit(3).get();
  console.log('Customer count:', snap.size);
  snap.forEach(doc => {
    const data = doc.data();
    console.log('Customer id (phone):', doc.id, 'name:', data.name, 'hasPin:', Boolean(data.pin || data.pinHash), 'points:', data.loyaltyPoints);
  });
})();
