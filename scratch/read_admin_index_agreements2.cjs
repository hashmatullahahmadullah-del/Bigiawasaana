const fs = require('fs');
const code = fs.readFileSync('src/admin/index.js', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(180, 225).join('\n'));
