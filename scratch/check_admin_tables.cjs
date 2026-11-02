const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

// Find all thead in admin.html
const theads = adminHtml.match(/<thead[\s\S]*?<\/thead>/gi);
console.log('--- THEADS IN ADMIN.HTML ---');
if (theads) {
  theads.forEach((th, i) => console.log(`THEAD ${i}:\n${th}\n`));
}

// Find quotes render in src/admin/catering.js
const cateringJs = fs.readFileSync('src/admin/catering.js', 'utf8');
const renderQuotesMatch = cateringJs.match(/function renderQuotesTable[\s\S]*?<\/tr>`/i) || cateringJs.match(/renderQuotes[\s\S]*?<\/tr>`/i);
console.log('--- RENDER QUOTES ROW ---');
const rowMatch = cateringJs.match(/<tr>[\s\S]*?<\/tr>/gi);
if (rowMatch) {
  rowMatch.slice(0, 4).forEach((r, i) => console.log(`ROW ${i}:\n${r}\n`));
}
