const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const regex = /<div class="crm-modal-header"[^>]*>([\s\S]*?)<\/div>/g;
let m;
let i = 0;
while ((m = regex.exec(adminHtml)) !== null) {
  i++;
  console.log(`=== HEADER ${i} ===`);
  console.log(m[1].trim());
}
