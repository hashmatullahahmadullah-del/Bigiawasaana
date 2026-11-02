const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const start = adminHtml.indexOf('id="quote-editor-modal"');
console.log(adminHtml.slice(start, start + 1200));
