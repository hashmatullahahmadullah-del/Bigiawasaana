const fs = require('fs');
const code = fs.readFileSync('src/main.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes("collection(db, 'menu')") || l.includes('collection(db, "menu")')) {
    console.log(lines.slice(Math.max(0, i-5), Math.min(lines.length, i+30)).join('\n'));
  }
});
