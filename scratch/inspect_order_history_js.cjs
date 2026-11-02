const fs = require('fs');
const content = fs.readFileSync('src/order-history.js', 'utf8');
const lines = content.split('\n');
console.log(`Total lines in src/order-history.js: ${lines.length}`);
lines.forEach((line, idx) => {
  if (/lookupCustomer|getOrderHistory|phone|auth/i.test(line)) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 90)}`);
  }
});
