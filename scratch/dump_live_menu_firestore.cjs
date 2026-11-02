const { db } = require('../functions/shared');

(async () => {
  const snap = await db.collection('menu').get();
  console.log(`Found ${snap.size} menu items in Firestore:`);
  const items = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      price: data.price,
      img: data.img,
      category: data.category
    };
  });
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
})();
