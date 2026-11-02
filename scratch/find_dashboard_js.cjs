const fs = require('fs');
const execSync = require('child_process').execSync;
const targets = ['today-revenue', 'today-orders', 'dash-total-revenue', 'revenueChart', 'dash-activity-feed'];
targets.forEach(t => {
  try {
    const out = execSync(`git grep "${t}" src/`, { encoding: 'utf8' });
    console.log(`Found ${t} in:\n`, out.trim());
  } catch (e) {
    console.log(`Not found for ${t}`);
  }
});
