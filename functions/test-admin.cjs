const admin = require("firebase-admin");

try {
  admin.initializeApp();
  const db = admin.firestore();
  
  db.collection("menu").limit(1).get()
    .then(snap => {
      console.log("Successfully connected to Firestore as Admin! Found items:", snap.size);
      process.exit(0);
    })
    .catch(err => {
      console.error("Firestore error:", err.message);
      process.exit(1);
    });
} catch(err) {
  console.error("Init error:", err.message);
  process.exit(1);
}
