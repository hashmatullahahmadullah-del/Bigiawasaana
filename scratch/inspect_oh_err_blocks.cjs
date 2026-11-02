const fs = require('fs');
const content = fs.readFileSync('src/order-history.js', 'utf8');
const lines = content.split('\n');
console.log("Lines 465-480:");
console.log(lines.slice(465, 480).join('\n'));
console.log("Lines 575-595:");
console.log(lines.slice(575, 595).join('\n'));
