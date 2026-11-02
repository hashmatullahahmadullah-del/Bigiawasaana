const fs = require('fs');
const code = fs.readFileSync('src/admin/index.js', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(120, 180).join('\n'));
