const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('renderDashboard') || l.includes('today-revenue') || l.includes('updateDashboardStats') || l.includes('renderLiveStats')) {
    console.log(`${idx+1}: ${l.trim()}`);
  }
});
