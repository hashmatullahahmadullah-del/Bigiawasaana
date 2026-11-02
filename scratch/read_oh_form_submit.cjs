const fs = require('fs');
const content = fs.readFileSync('src/order-history.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(418, 480).join('\n'));
