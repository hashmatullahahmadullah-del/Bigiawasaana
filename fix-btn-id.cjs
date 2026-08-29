const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');
html = html.replace('id="receipt-confirm-btn"', 'id="confirm-expense-btn"');
fs.writeFileSync('admin.html', html, 'utf8');
console.log('Fixed btn id');
