const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

['package-request-modal', 'import-menu-modal'].forEach(id => {
  const idx = adminHtml.indexOf(`id="${id}"`);
  console.log(`=== ${id} ===`);
  console.log(adminHtml.slice(idx, idx + 800));
});
