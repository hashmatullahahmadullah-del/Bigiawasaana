const fs = require('fs');
const content = fs.readFileSync('src/admin/orders.js', 'utf8');
content.split('\n').slice(0, 80).forEach((l, i) => {
  console.log((i + 1) + ': ' + l);
});
