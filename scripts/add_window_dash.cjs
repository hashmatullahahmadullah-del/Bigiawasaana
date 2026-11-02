const fs = require('fs');

const sharedPath = 'src/admin/shared.js';
let content = fs.readFileSync(sharedPath, 'utf8');

if (!content.includes('window.renderDashboard = renderDashboard;')) {
  content = content.replace(
    'export function renderDashboard() {',
    'window.renderDashboard = renderDashboard;\nwindow.getTrailerOperatingStatus = getTrailerOperatingStatus;\nexport function renderDashboard() {'
  );
  fs.writeFileSync(sharedPath, content, 'utf8');
  console.log('Added window.renderDashboard export!');
}
