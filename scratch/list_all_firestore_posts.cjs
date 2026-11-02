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

(async () => {
  const snap = await db.collection('blog_posts').get();
  console.log(`Total posts in Firestore: ${snap.size}`);
  snap.docs.forEach((doc, idx) => {
    const d = doc.data();
    console.log(`${idx + 1}. [${d.slug}] "${d.title}" (Keywords: ${d.targetKeyword || d.keywords || 'N/A'})`);
  });
})();
