const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchDir(full, query);
    } else if (f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      if (query.test(content)) {
        console.log(`Match in ${full}`);
      }
    }
  }
}

console.log("Searching for phone login...");
searchDir('src', /signInWithPhoneNumber|phone.*code|sendOtp|verifyOtp|lookupCustomer|startPhoneAuth|requestOtp/i);
searchDir('functions', /signInWithPhoneNumber|phone.*code|sendOtp|verifyOtp|lookupCustomer|startPhoneAuth|requestOtp|sendPhone/i);
