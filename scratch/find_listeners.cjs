const fs = require('fs');

const indexJs = fs.readFileSync('src/admin/index.js', 'utf8');

const lines = indexJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('catering_quotes') || l.includes('catering_catalog') || l.includes('catering_inquiries')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
