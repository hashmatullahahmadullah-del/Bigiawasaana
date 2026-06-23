const admin = require('firebase-admin');

const serviceAccountPath = 'C:\\Users\\User\\.gemini\\config\\plugins\\firebase\\keys\\bigi-awasaana-7b3ce-firebase-adminsdk-hmy9z-b02b66d48d.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

async function fetchItems() {
  const items = ['bigi-s-doogh', 'bigi-s-samosa', 'bigi-s-qabuli-palou'];
  for (const id of items) {
    const doc = await db.collection('menu').doc(id).get();
    if (doc.exists) {
      console.log(`\n--- ${id} ---`);
      console.log(doc.data().desc || doc.data().description);
    } else {
      console.log(`\n--- ${id} not found ---`);
    }
  }
}

fetchItems().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
