const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const startToken = '<!-- Tab 2: Package Requests -->';
const endToken = '<!-- Retail / Spices View -->';

const startIndex = html.indexOf(startToken);
const endIndex = html.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find tokens in admin.html');
  process.exit(1);
}

const sectionCloseBeforeEnd = html.lastIndexOf('</section>', endIndex);
const misplacedBlock = html.substring(startIndex, sectionCloseBeforeEnd).trim();

// Remove from tv-layout-view
html = html.substring(0, startIndex) + '\n        ' + html.substring(sectionCloseBeforeEnd);

// Find closing </section> of catering-view
const bookingsIdx = html.indexOf('id="cat-tab-bookings"');
const catCloseIndex = html.indexOf('</section>', bookingsIdx);

if (catCloseIndex === -1) {
  console.error('Could not find catering-view closing section');
  process.exit(1);
}

// Insert before </section>
html = html.substring(0, catCloseIndex) + '\n\n          ' + misplacedBlock + '\n        ' + html.substring(catCloseIndex);

fs.writeFileSync('admin.html', html, 'utf8');
console.log('Successfully moved cat-tab-packages and cat-tab-catalog inside catering-view in admin.html!');
