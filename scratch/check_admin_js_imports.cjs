const fs = require('fs');

const adminJs = fs.readFileSync('src/admin.js', 'utf8');

const lines = adminJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('catering') || l.includes('renderCatering')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
