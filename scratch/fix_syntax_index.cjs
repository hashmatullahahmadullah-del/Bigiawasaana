const fs = require('fs');
let code = fs.readFileSync('src/admin/index.js', 'utf8');

// Ensure window.switchAdminView is assigned
if (!code.includes('window.switchAdminView = switchAdminView;')) {
  code = code.replace('export function switchAdminView(targetId) {', 'export function switchAdminView(targetId) {\n');
  code = code.replace(/\n\}\s*\nwindow\.addEventListener\('resize'/, '\n}\nwindow.switchAdminView = switchAdminView;\n\nwindow.addEventListener(\'resize\'');
}

// Remove extra } around line 607
code = code.replace(/resolveInitialView\(\);\s*\}\s*\}\);/, 'resolveInitialView();\n});');

fs.writeFileSync('src/admin/index.js', code, 'utf8');
console.log('src/admin/index.js cleaned up.');
