const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

js = js.replace('reviewSection.style.display = "block";', '// removed block');

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed block');
