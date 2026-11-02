const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const modals = ['quote-editor-modal', 'dish-picker-modal', 'package-request-modal', 'catalog-dish-modal', 'import-menu-modal'];

modals.forEach(m => {
  const idx = adminHtml.indexOf(`id="${m}"`);
  if (idx !== -1) {
    console.log(`=== ${m} ===`);
    console.log(adminHtml.slice(idx, idx + 400));
  }
});
