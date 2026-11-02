const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('state =') || l.includes('state.') || l.includes('export let state') || l.includes('export const state')) {
    if (idx < 150) console.log(`${idx+1}: ${l.trim()}`);
  }
});
