const { ITEMS } = require('../scripts/menu-items-data.cjs');
const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

async function compare() {
  const snapshot = await db.collection('menu').get();
  const fsItems = [];
  snapshot.forEach(d => {
    const data = d.data();
    if (!data.hidden) {
      fsItems.push({ id: d.id, name: data.name, price: data.price });
    }
  });

  console.log('Visible Firestore items count:', fsItems.length);
  console.log('scripts/menu-items-data.cjs count:', ITEMS.length);

  console.log('\n--- Checking IDs ---');
  ITEMS.forEach(item => {
    const found = fsItems.find(f => f.id === item.id);
    if (!found) {
      console.log(`Item in menu-items-data.cjs NOT in Firestore visible: [${item.id}] ${item.name}`);
    }
  });

  fsItems.forEach(f => {
    const found = ITEMS.find(i => i.id === f.id);
    if (!found) {
      console.log(`Visible Firestore item NOT in menu-items-data.cjs: [${f.id}] ${f.name}`);
    }
  });
}

compare();
