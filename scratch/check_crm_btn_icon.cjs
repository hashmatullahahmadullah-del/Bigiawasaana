const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const regex = /\.crm-btn-icon[\s\S]*?\}/g;
let m;
while ((m = regex.exec(adminHtml)) !== null) {
  console.log(m[0]);
}
