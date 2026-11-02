const fs = require('fs');
let deals = fs.readFileSync('src/admin/deals.js', 'utf8');
const isCrlf = deals.includes('\r\n');
const normalized = deals.replace(/\r\n/g, '\n');

const search = `    renderDealsList();
  });

  if (filterSelect) {`;

const repl = `    renderDealsList();
  }, (err) => {
    console.warn('deals listener notice:', err);
  });

  if (filterSelect) {`;

if (!normalized.includes(search)) throw new Error('Search string not found in deals.js');
let updated = normalized.replace(search, () => repl);
if (isCrlf) updated = updated.replace(/\n/g, '\r\n');
fs.writeFileSync('src/admin/deals.js', updated, 'utf8');
console.log('Successfully patched src/admin/deals.js');
