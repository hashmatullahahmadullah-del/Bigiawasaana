const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

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

async function backup() {
  const backupDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const snap = await db.collection('posts').get();
  const posts = [];
  snap.forEach(doc => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  const backupFile = path.join(backupDir, 'posts-20261026.json');
  fs.writeFileSync(backupFile, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`Successfully backed up ${posts.length} posts to: ${backupFile}`);

  // Backup firebase.json
  const firebaseJsonSrc = path.resolve(__dirname, '..', 'firebase.json');
  const firebaseJsonDest = path.join(backupDir, 'firebase-20261026.json.bak');
  fs.copyFileSync(firebaseJsonSrc, firebaseJsonDest);
  console.log(`Successfully backed up firebase.json to: ${firebaseJsonDest}`);
}

backup().then(() => process.exit(0)).catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
