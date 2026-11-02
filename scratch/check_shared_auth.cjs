const fs = require('fs');
const content = fs.readFileSync('src/admin/shared.js', 'utf8');
content.split('\n').forEach((l, i) => {
  if (l.includes('onAuthStateChanged') || l.includes('signInWith') || l.includes('auth.currentUser') || l.includes('login-') || l.includes('admin-login')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
