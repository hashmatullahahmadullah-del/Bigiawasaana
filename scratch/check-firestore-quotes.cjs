const fs = require('fs');
const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

async function checkQuotes() {
  const snap = await db.collection('catering_quotes').limit(5).get();
  console.log('Found quotes:', snap.size);
  snap.forEach(doc => {
    const d = doc.data();
    console.log('--- Quote ID:', doc.id, '---');
    console.log('Quote Number:', d.quoteNumber);
    console.log('Status:', d.status);
    console.log('Client:', d.customer?.name || d.clientName);
    console.log('Token in doc.security:', d.security?.directAccessToken);
    console.log('Pricing:', d.pricing || { total: d.grandTotal, deposit: d.depositDue });
  });
}

checkQuotes().catch(console.error);
