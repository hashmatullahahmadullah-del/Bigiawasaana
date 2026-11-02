const fs = require('fs');
const content = fs.readFileSync('order-history.html', 'utf8');
const idx = content.indexOf('id="form-phone"');
console.log(content.substring(idx - 100, idx + 800));
