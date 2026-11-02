const fs = require('fs');

const mainJs = fs.readFileSync('src/main.js', 'utf8');
const lines = mainJs.split('\n');
lines.forEach((l, i) => {
  if (l.includes('menu.html') || l.includes('buildCategoryPills') || l.includes('renderSEOItemLinks') || l.includes('renderMenu')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
