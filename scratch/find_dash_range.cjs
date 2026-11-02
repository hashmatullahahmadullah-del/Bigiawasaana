const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');
let start = -1;
let end = -1;
lines.forEach((l, idx) => {
  if (l.includes('<section id="dashboard-view"')) start = idx;
  if (start !== -1 && end === -1 && idx > start && l.includes('</section>')) end = idx;
});
console.log('Start line:', start + 1, 'End line:', end + 1);
console.log('--- Start ---');
console.log(lines.slice(start, start + 15).join('\n'));
console.log('--- End ---');
console.log(lines.slice(end - 10, end + 2).join('\n'));
