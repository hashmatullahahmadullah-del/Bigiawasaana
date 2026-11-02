const fs = require('fs');

const adminThemeCss = fs.readFileSync('src/admin-theme.css', 'utf8');

const regex = /data-label/g;
let m;
let count = 0;
while ((m = regex.exec(adminThemeCss)) !== null) {
  count++;
}
console.log('Count of data-label in src/admin-theme.css:', count);
