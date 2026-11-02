const fs = require('fs');
const cateringJs = fs.readFileSync('src/admin/catering.js', 'utf8');

const lines = cateringJs.split('\n');
lines.forEach((line, i) => {
  if (line.includes('renderQuotes') || line.includes('quotes-table') || line.includes('tbody')) {
    console.log(`Line ${i+1}: ${line}`);
  }
});
