const fs = require('fs');
const code = fs.readFileSync('src/admin/catering.js', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(0, 70).join('\n'));
