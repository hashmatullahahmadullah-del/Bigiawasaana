const fs = require('fs');
let code = fs.readFileSync('src/kitchen.js', 'utf8');

const target = `      if (result.data.success) {
        sessionStorage.setItem('kds_authenticated', 'true');
        document.getElementById('kds-pin-screen').style.display = 'none';`;

const replacement = `      if (result.data.success) {
        sessionStorage.setItem('kds_authenticated', 'true');
        if (auth.currentUser) {
          try { await auth.currentUser.getIdToken(true); } catch (_) {}
        }
        document.getElementById('kds-pin-screen').style.display = 'none';`;

if (code.includes("sessionStorage.setItem('kds_authenticated', 'true');")) {
  code = code.replace(
    "sessionStorage.setItem('kds_authenticated', 'true');",
    "sessionStorage.setItem('kds_authenticated', 'true');\n        if (auth.currentUser) { try { await auth.currentUser.getIdToken(true); } catch (_) {} }"
  );
  fs.writeFileSync('src/kitchen.js', code, 'utf8');
  console.log('src/kitchen.js updated successfully');
} else {
  console.log('Target not found in kitchen.js');
}
