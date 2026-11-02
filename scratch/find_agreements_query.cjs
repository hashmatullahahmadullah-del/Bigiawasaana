const fs = require('fs');
const code = fs.readFileSync('src/admin/catering.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('catering_agreements') || l.includes('agreements')) {
    if (l.includes('query') || l.includes('collection') || l.includes('onSnapshot') || l.includes('getDocs')) {
      console.log(`${idx+1}: ${l.trim()}`);
    }
  }
});
