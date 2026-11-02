const fs = require('fs');
let code = fs.readFileSync('src/admin/expenses.js', 'utf8');

code = code.replace(
  "console.error('Error fetching analytics page views:', err);",
  "console.warn('Analytics page views listener notice:', err);"
);
code = code.replace(
  'console.error("Expenses sync error:", err);',
  'console.warn("Expenses sync notice:", err);'
);

fs.writeFileSync('src/admin/expenses.js', code, 'utf8');
console.log('src/admin/expenses.js updated successfully');
