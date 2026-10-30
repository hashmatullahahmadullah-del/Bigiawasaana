const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to initialize admin with default credentials
try {
  admin.initializeApp();
} catch (e) {}

const db = admin.firestore();

async function run() {
  console.log("Migrating slugs...");
  const snapshot = await db.collection('retail_items').get();
  
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.name && !data.slug) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      console.log(`Setting slug for ${doc.id}: ${slug}`);
      await doc.ref.update({ slug });
      count++;
    }
  }
  console.log(`Successfully updated ${count} items.`);
}

run().catch(console.error);
