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

async function checkMenu() {
  const snapshot = await db.collection('menu').get();
  console.log('Total menu documents in Firestore:', snapshot.size);

  const items = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    items.push({
      id: doc.id,
      name: data.name,
      category: data.category,
      price: data.price,
      hidden: data.hidden,
      mealLinkId: data.mealLinkId
    });
  });

  console.log('\n--- Checking for duplicates in Firestore ---');
  const nameMap = {};
  items.forEach(item => {
    const norm = (item.name || '').trim().toLowerCase();
    if (!nameMap[norm]) nameMap[norm] = [];
    nameMap[norm].push(item);
  });

  let duplicateCount = 0;
  for (const [name, list] of Object.entries(nameMap)) {
    if (list.length > 1) {
      duplicateCount++;
      console.log(`Duplicate: "${name}" (${list.length} docs):`);
      list.forEach(i => console.log(`  - ID: ${i.id}, category: "${i.category}", price: ${i.price}, hidden: ${i.hidden}`));
    }
  }

  if (duplicateCount === 0) {
    console.log('NO DUPLICATE NAMES FOUND IN FIRESTORE menu collection!');
  }

  console.log('\n--- All Menu Items in Firestore ---');
  items.forEach(i => {
    console.log(`[${i.id}] ${i.name} | Cat: ${i.category} | Price: $${i.price} | Hidden: ${i.hidden}`);
  });
}

checkMenu();
