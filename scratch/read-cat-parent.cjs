const fs = require('fs');
const lines = fs.readFileSync('admin.html', 'utf8').split('\n');
console.log(lines.slice(1070, 1110).join('\n'));
