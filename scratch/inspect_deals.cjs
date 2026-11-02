const fs = require('fs');
const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ projectId: 'bigi-awasaana-7b3ce' });
}
const db = getFirestore();

async function inspectDeals() {
  const snap = await db.collection('deals').get();
  console.log('Total deals found:', snap.size);
  snap.forEach(doc => {
    console.log('=== DEAL:', doc.id, '===');
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

inspectDeals().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
