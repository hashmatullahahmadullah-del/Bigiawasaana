const fs = require('fs');
let content = fs.readFileSync('functions/emailTemplate.js', 'utf8');

// Replace all non-canonical domains
content = content.replace(/https:\/\/bigiawasaana\.com\/admin\/orders\.html/g, 'https://www.bigiawasaana.com/admin?view=live-orders#live-orders-view');
content = content.replace(/https:\/\/bigiawasaana\.com/g, 'https://www.bigiawasaana.com');

fs.writeFileSync('functions/emailTemplate.js', content, 'utf8');
console.log('Updated functions/emailTemplate.js successfully.');
