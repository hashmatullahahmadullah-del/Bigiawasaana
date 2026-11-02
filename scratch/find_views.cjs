const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');

function showContext(str) {
  const idx = html.indexOf(str);
  if (idx !== -1) {
    console.log(`=== Context for ${str} ===`);
    console.log(html.substring(idx - 50, idx + 250));
  } else {
    console.log(`Not found: ${str}`);
  }
}

showContext('id="dashboard-view"');
showContext('id="live-orders-view"');
showContext('id="orders-view"');
