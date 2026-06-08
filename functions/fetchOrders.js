const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'bigi-awasaana-7b3ce' });
admin.firestore().collection('orders').orderBy('createdAt', 'desc').limit(5).get().then(snap => {
  if (snap.empty) {
    console.log("No orders found in Firestore.");
  }
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`[${doc.id}] Source: ${data.source}, Status: ${data.status}, CreatedAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'NULL'}`);
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
