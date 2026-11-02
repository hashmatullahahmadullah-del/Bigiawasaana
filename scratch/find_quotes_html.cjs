const fs = require('fs');
const adminHtml = fs.readFileSync('admin.html', 'utf8');

const lines = adminHtml.split('\n');
lines.forEach((line, i) => {
  if (line.includes('quotes-table') || line.includes('catering-quotes-table') || line.includes('Quote #')) {
    console.log(`Line ${i+1}: ${line}`);
  }
});
