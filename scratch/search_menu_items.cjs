const fs = require('fs');
const mainJs = fs.readFileSync('src/main.js', 'utf8');
const lines = mainJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('menuItems =') || l.includes('menuItems.push') || l.includes("collection(db, 'menu')")) {
    console.log((i+1) + ': ' + l.trim());
  }
});
