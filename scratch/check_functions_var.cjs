const fs = require('fs');
const cateringJs = fs.readFileSync('src/admin/catering.js', 'utf8');
const lines = cateringJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('functions')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
