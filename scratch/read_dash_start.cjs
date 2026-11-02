const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(258, 305).join('\n'));
