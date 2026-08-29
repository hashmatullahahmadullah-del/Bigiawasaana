const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');
js = js.replace('data.total.toFixed(2)', 'parseFloat(data.total).toFixed(2)');
fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed parseFloat');
