const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');

// Find all crm-view divs
const viewRegex = /<div\s+id="([^"]+)"\s+class="crm-view[^"]*"/g;
let match;
const views = [];
while ((match = viewRegex.exec(html)) !== null) {
  views.push(match[1]);
}

console.log('CRM Views found in admin.html:', views);

// Check if all nav targets have a corresponding crm-view
const navRegex = /class="crm-nav-item[^"]*"\s+data-target="([^"]+)"/g;
const navTargets = [];
while ((match = navRegex.exec(html)) !== null) {
  navTargets.push(match[1]);
}

console.log('\nNav targets in admin.html:', navTargets);

navTargets.forEach(t => {
  const found = views.includes(t);
  console.log(`Nav target '${t}': ${found ? 'EXISTS in DOM' : 'MISSING FROM DOM'}`);
});
