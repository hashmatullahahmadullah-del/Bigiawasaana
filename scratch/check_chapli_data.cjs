const fs = require('fs');
const c = fs.readFileSync('scripts/menu-items-data.cjs', 'utf8');
const idx = c.indexOf('XvAjowz3KjiWQopaHAvb');
console.log(c.substring(idx - 20, idx + 300));
