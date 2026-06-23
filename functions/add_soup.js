const admin = require('firebase-admin');

const serviceAccountPath = 'C:\\Users\\User\\.gemini\\config\\plugins\\firebase\\keys\\bigi-awasaana-7b3ce-firebase-adminsdk-hmy9z-b02b66d48d.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

async function addSoup() {
  const docRef = db.collection('menu').doc('bigi-s-chicken-soup');
  await docRef.set({
    name: "Bigi's Chicken Soup",
    category: "Soups",
    price: 8.99,
    desc: "A warm and comforting traditional Afghan Shorba near me. Our Halal Chicken Soup in Reseda is made with slow-simmered chicken broth, fresh vegetables, and delicate Afghan spices. Perfect for a cold day or when you need something wholesome.",
    description: "A warm and comforting traditional Afghan Shorba near me. Our Halal Chicken Soup in Reseda is made with slow-simmered chicken broth, fresh vegetables, and delicate Afghan spices. Perfect for a cold day or when you need something wholesome.",
    available: true,
    featured: false,
    img: "",
    imageUrl: "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("Chicken Soup added successfully!");
}

addSoup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
