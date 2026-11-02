const fs = require('fs');
const content = fs.readFileSync('src/account-auth.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(35, 60).join('\n'));
