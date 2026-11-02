const fs = require('fs');
let code = fs.readFileSync('src/admin/shared.js', 'utf8');

const regex = /initCRMData\(\);\r?\n\s*loadMenuAdmin\(\);/;
const replacement = `initCRMData();
    loadMenuAdmin();

    // Preserve and switch to target view requested via deep link (?view=... or #...)
    if (typeof window.resolveInitialView === 'function') {
      window.resolveInitialView();
    } else {
      setTimeout(() => {
        if (typeof window.resolveInitialView === 'function') {
          window.resolveInitialView();
        }
      }, 50);
    }`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/admin/shared.js', code, 'utf8');
  console.log('Successfully replaced in src/admin/shared.js');
} else {
  console.error('Regex did not match');
}
