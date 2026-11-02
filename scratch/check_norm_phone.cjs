const fs = require('fs');
const content = fs.readFileSync('functions/customers.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(30, 65).join('\n'));
