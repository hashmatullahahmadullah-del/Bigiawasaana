const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const modalMatches = adminHtml.match(/<div[^>]*id=["'][^"']*modal[^"']*["'][^>]*>/gi);
console.log('Modals in admin.html:');
if (modalMatches) {
  modalMatches.forEach(m => console.log(m));
}
