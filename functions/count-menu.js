const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'bigi-awasaana-7b3ce'
});

async function countMenu() {
  const db = admin.firestore();
  const snapshot = await db.collection('menu').get();
  
  let total = 0;
  const categories = {};
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    const cat = (data.category || 'platters').toLowerCase();
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  console.log('Total items:', total);
  console.log('Categories:', categories);
}

countMenu().catch(console.error);
