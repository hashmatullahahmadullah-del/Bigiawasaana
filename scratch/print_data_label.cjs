const fs = require('fs');

const adminThemeCss = fs.readFileSync('src/admin-theme.css', 'utf8');

const lines = adminThemeCss.split('\n');
lines.forEach((l, i) => {
  if (l.includes('data-label')) {
    console.log(`Line ${i+1}: ${l}`);
    for (let j = Math.max(0, i-5); j <= Math.min(lines.length-1, i+15); j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
  }
});
