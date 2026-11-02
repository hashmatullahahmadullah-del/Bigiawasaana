const fs = require('fs');
const code = fs.readFileSync('src/admin/catering.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('state.agreements') || l.includes('agreements') && l.includes('state')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
