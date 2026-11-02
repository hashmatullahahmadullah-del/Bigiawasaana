const fs = require('fs');

let index = fs.readFileSync('src/admin/index.js', 'utf8');
const isCrlf = index.includes('\r\n');
const normalized = index.replace(/\r\n/g, '\n');

const search = `    renderLoyalty();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });

  // 4. Listen to Catering Inquiries`;

const repl = `    renderLoyalty();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Orders listener notice:', err);
  });

  // 4. Listen to Catering Inquiries`;

if (!normalized.includes(search)) throw new Error('Search string not found in index.js');
let updated = normalized.replace(search, () => repl);
if (isCrlf) updated = updated.replace(/\n/g, '\r\n');
fs.writeFileSync('src/admin/index.js', updated, 'utf8');
console.log('Successfully patched window.ordersUnsub in src/admin/index.js');
