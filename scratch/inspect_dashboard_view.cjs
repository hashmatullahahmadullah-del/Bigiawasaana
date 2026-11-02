const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');
let start = -1;
let end = -1;
lines.forEach((l, idx) => {
  if (l.includes('id="dashboard-view"')) start = idx;
  if (start !== -1 && end === -1 && idx > start && l.includes('</section>')) end = idx;
});
console.log('dashboard-view lines:', start + 1, 'to', end + 1);
console.log(lines.slice(start, end + 1).join('\n'));
