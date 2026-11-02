const fs = require('fs');
const content = fs.readFileSync('src/quote.js', 'utf8');
const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = regex.exec(content)) !== null) {
  ids.add(m[1]);
}
console.log('IDs used in quote.js:', Array.from(ids));
