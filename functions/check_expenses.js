const admin = require('firebase-admin');
admin.initializeApp({credential: admin.credential.applicationDefault()});
admin.firestore().collection('expenses').get().then(snap => {
    console.log('TOTAL EXPENSES:', snap.size);
    let missingCreatedAt = 0;
    let oldReceipts = [];
    snap.forEach(d => {
        if (!d.data().createdAt) missingCreatedAt++;
        if (d.data().purchaseDate) oldReceipts.push(d.data());
    });
    console.log('MISSING createdAt:', missingCreatedAt);
    console.log('Has purchaseDate instead:', oldReceipts.length);
    process.exit(0);
}).catch(console.error);
