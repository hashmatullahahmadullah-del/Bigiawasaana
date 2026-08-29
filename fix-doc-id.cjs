const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

js = js.replace('snapshot.forEach(docSnap => docsArray.push(docSnap.data()));', 'snapshot.forEach(docSnap => docsArray.push({ id: docSnap.id, ...docSnap.data() }));');

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed doc id');
