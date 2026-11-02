const fs = require('fs');
let code = fs.readFileSync('functions/customers.js', 'utf8');

const regex = /savedCards:\s*Array\.isArray\(custData\.savedCards\)\s*\?\s*custData\.savedCards\.map\([\s\S]*?\)\s*:\s*\[\],/;

const replacement = `hasSavedCards: Array.isArray(custData.savedCards) && custData.savedCards.length > 0,
      savedCards: [], // Card metadata strictly protected: requires PIN via getOrderHistory`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('functions/customers.js', code, 'utf8');
  console.log('functions/customers.js updated successfully');
} else {
  console.log('Regex did not match in functions/customers.js');
}
