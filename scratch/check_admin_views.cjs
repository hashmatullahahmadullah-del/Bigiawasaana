const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
content.split('\n').forEach((l, i) => {
  if (l.includes('class="crm-view') || l.includes('data-target=')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
