const fs = require('fs');

const indexJs = fs.readFileSync('src/admin/index.js', 'utf8');

const lines = indexJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('cateringQuotesUnsub') || l.includes('cateringCatalogUnsub')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
