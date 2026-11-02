const fs = require('fs');
const code = fs.readFileSync('src/main.js', 'utf8');
const idx = code.indexOf('function openItemModal');
console.log(code.substring(idx + 6500, idx + 7200));
