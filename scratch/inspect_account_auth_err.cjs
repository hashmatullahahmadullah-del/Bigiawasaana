const fs = require('fs');
const content = fs.readFileSync('src/account-auth.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(440, 497).join('\n'));
