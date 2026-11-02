const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
console.log('window.renderDashboard:', code.includes('window.renderDashboard = renderDashboard'));
