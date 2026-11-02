const fs = require('fs');
const content = fs.readFileSync('src/nav.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(25, 120).join('\n'));
