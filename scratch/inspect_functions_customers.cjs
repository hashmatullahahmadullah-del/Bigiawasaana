const fs = require('fs');
const content = fs.readFileSync('functions/customers.js', 'utf8');
const lines = content.split('\n');
console.log(`Total lines in functions/customers.js: ${lines.length}`);
lines.forEach((line, idx) => {
  if (/exports\.|function |lookupCustomer|setCustomerPin|getOrderHistory/i.test(line)) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 80)}`);
  }
});
