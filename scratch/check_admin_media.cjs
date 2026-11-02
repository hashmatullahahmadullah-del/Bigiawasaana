const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const regex = /@media[^{]+\([^)]*max-width:\s*(?:768|900|1024)px[\s\S]*?<\/style>/gi;
const matches = adminHtml.match(regex);
if (matches) {
  matches.forEach(m => console.log(m.slice(0, 500)));
} else {
  console.log('No max-width media query found in admin.html');
}
