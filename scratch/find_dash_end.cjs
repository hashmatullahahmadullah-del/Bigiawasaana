const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (idx > 255 && idx < 500 && l.startsWith('export function')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
