const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const idx = content.indexOf('peace of mind');
console.log(content.substring(idx - 600, idx + 600));
