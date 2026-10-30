const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'bigi-awasaana-7b3ce'
});

const db = admin.firestore();

async function fetchMenu() {
  const snapshot = await db.collection('menu').get();
  const items = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    items.push({
      name: data.name,
      price: data.price,
      addOns: data.addOns || [],
      variants: data.variants || []
    });
  });

  console.log(`Total items: ${items.length}`);
  items.forEach(item => {
    console.log(`\nItem: ${item.name}`);
    console.log(`Price: $${item.price}`);
    if (item.variants && item.variants.length > 0) {
      console.log(`Variants:`);
      item.variants.forEach(v => console.log(`  - ${v.name}: $${v.price}`));
    }
    if (item.addOns && item.addOns.length > 0) {
      console.log(`Add-ons:`);
      item.addOns.forEach(a => console.log(`  - ${a.name}: $${a.price}`));
    }
  });
}

fetchMenu().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
