const fs = require('fs');

let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

js = js.replace(/statusEl\.textContent = /g, 'if (statusEl) statusEl.textContent = ');

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed statusEl crash');
