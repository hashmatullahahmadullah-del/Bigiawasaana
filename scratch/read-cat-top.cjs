const fs = require('fs');
const lines = fs.readFileSync('admin.html', 'utf8').split('\n');
console.log(lines.slice(1110, 1150).join('\n'));
