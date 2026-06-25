const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const items = await db.collection('menuItems').get();
  items.forEach(doc => {
    const data = doc.data();
    console.log(data.name + ' -> ' + data.image);
  });
}
run();
