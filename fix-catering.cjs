const fs = require('fs');

// Fix catering.js
let catJs = fs.readFileSync('functions/catering.js', 'utf8');
catJs = catJs.replace(/const gmailEmail = functions\.config\(\)\.gmail \? functions\.config\(\)\.gmail\.email : process\.env\.GMAIL_EMAIL;/g, 
  "let gmailEmail = process.env.GMAIL_EMAIL;\n    let gmailPassword = process.env.GMAIL_PASSWORD;\n    try { if (functions.config().gmail) { gmailEmail = functions.config().gmail.email || gmailEmail; gmailPassword = functions.config().gmail.password || gmailPassword; } } catch(e){ /* ignore config error */ }");

catJs = catJs.replace(/const gmailPassword = functions\.config\(\)\.gmail \? functions\.config\(\)\.gmail\.password : process\.env\.GMAIL_PASSWORD;/g, "");
fs.writeFileSync('functions/catering.js', catJs, 'utf8');
console.log('Fixed catering.js');

// Fix orders.js
let ordJs = fs.readFileSync('src/admin/orders.js', 'utf8');
ordJs = ordJs.replace(
  '<div style="background: var(--surface); padding: 12px; border-radius: 4px;">${inquiry.details}</div>',
  '<div style="background: var(--surface); padding: 12px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(inquiry.details || "")}</div>'
);
fs.writeFileSync('src/admin/orders.js', ordJs, 'utf8');
console.log('Fixed orders.js');
