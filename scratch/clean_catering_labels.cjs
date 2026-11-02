const fs = require('fs');
let code = fs.readFileSync('src/admin/catering.js', 'utf8');
code = code.replace(/<span class="copy-text">Copy Link<\/span>/g, '<span class="copy-text">Copy link</span>');
code = code.replace(/<span>Cash \$<\/span>/g, '<span>Record cash</span>');
fs.writeFileSync('src/admin/catering.js', code, 'utf8');
console.log('Action button labels in catering.js cleaned!');
