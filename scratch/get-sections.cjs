const fs = require('fs');
const admin = fs.readFileSync('admin.html', 'utf8');
const matches = admin.match(/<(?:section|div)[^>]*class="[^"]*crm-section[^"]*"[^>]*>/g);
console.log('CRM Sections:', matches);
