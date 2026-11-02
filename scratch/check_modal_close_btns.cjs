const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

// Find all elements with class modal-close or onclick close
const regex = /<button[^>]*class=["'][^"']*modal[^"']*["'][^>]*>[\s\S]*?<\/button>/gi;
const matches = adminHtml.match(regex);
console.log('Admin modal buttons:');
if (matches) {
  matches.forEach(m => console.log(m));
}

// Find any button with ✕ or &times; or x
const closeBtns = adminHtml.match(/<button[^>]*>[^<]*(?:&times;|✕|×)[^<]*<\/button>/gi);
console.log('Close buttons with symbol:');
if (closeBtns) {
  closeBtns.forEach(m => console.log(m));
}
