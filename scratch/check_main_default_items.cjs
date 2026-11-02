const fs = require('fs');
const c = fs.readFileSync('src/main.js', 'utf8');
const idx = c.indexOf('DEFAULT_MENU_ITEMS');
console.log(c.substring(idx, idx + 400));
