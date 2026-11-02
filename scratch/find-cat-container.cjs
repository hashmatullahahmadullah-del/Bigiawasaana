const fs = require('fs');
const lines = fs.readFileSync('admin.html', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('CATERING MANAGEMENT') || l.includes('cat-tab-inquiries')) {
    console.log((i+1) + ': ' + l);
  }
});
