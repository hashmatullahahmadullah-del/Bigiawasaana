const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const matches = adminHtml.match(/[^\n]*delivery[^\n]*/gi);
console.log('Matches in admin.html:', matches ? matches.length : 0);
if (matches) {
  matches.slice(0, 15).forEach(m => console.log(m.trim()));
}
