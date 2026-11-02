const fs = require('fs');

const css = fs.readFileSync('src/style.css', 'utf8');

const regex = /\.crm-btn-icon[\s\S]*?\}/g;
let m;
while ((m = regex.exec(css)) !== null) {
  console.log(m[0]);
}
