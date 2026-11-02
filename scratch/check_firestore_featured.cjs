const { admin, db } = require('../functions/shared');

(async () => {
  try {
    const snap = await db.collection('menu').get();
    console.log('Firestore menu docs count:', snap.size);
    snap.forEach(d => {
      const data = d.data();
      if (data.featured) {
        console.log('⭐ FEATURED in Firestore:', d.id, data.name, 'Price:', data.price, 'Hidden:', data.hidden, 'Img:', data.img);
      }
    });
    console.log('\nAll items:');
    snap.forEach(d => {
      const data = d.data();
      console.log(`- [${d.id}] "${data.name}" ($${data.price}) featured: ${data.featured} hidden: ${data.hidden} img: ${data.img}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Firestore check error:', err);
    process.exit(1);
  }
})();
