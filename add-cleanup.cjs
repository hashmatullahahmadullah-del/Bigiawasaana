const fs = require('fs');
let js = fs.readFileSync('functions/index.js', 'utf8');

js += `
exports.cleanDuplicateDrafts = functions.https.onRequest(async (req, res) => {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const snap = await db.collection('expenses').orderBy('createdAt', 'desc').get();
  
  let seen = new Set();
  let deleted = 0;
  for(let d of snap.docs) {
    let data = d.data();
    let key = data.total + '_' + (data.vendor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if(seen.has(key) && data.status === 'draft') {
      await d.ref.delete();
      deleted++;
    } else {
      seen.add(key);
    }
  }
  res.send({deleted});
});
`;

fs.writeFileSync('functions/index.js', js, 'utf8');
console.log('Added cleanDuplicateDrafts');
