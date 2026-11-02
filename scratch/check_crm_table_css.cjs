const fs = require('fs');

const adminCss = fs.readFileSync('src/admin.css', 'utf8');

const regex = /\.crm-table[\s\S]*?\}/g;
let m;
while ((m = regex.exec(adminCss)) !== null) {
  console.log(m[0]);
}
