const fs = require('fs');
const code = fs.readFileSync('src/admin/catering.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('catering_agreements') || l.includes('agreementsUnsub') || l.includes('initCateringAgreementsListener')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
