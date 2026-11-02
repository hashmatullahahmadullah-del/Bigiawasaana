const fs = require('fs');
const content = fs.readFileSync('src/mobile-nav.css', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(350, 450).join('\n'));
