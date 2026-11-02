const fs = require('fs');
const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

if (!getApps().length) initializeApp({ projectId: 'bigi-awasaana-7b3ce' });
const db = getFirestore();

async function fixDeal() {
  const dealRef = db.collection('deals').doc('EF0P7QIULRfhesTFdU35');
  const doc = await dealRef.get();
  if (!doc.exists) {
    console.error('Deal EF0P7QIULRfhesTFdU35 not found');
    return;
  }

  // Set startDate to yesterday so it is immediately active
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  await dealRef.update({
    startDate: Timestamp.fromDate(yesterday),
    active: true,
    showOnSite: true,
    'reward.rewardQty': 1 // 1 free Doogh
  });

  console.log('Successfully updated deal EF0P7QIULRfhesTFdU35 in Firestore: active now with 1x rewardQty!');
}

fixDeal().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
