const fs = require('fs');
const content = fs.readFileSync('src/account-auth.js', 'utf8');
const lines = content.split('\n');
console.log(`Total lines in src/account-auth.js: ${lines.length}`);
// Print sections related to phone
lines.forEach((line, idx) => {
  if (/phone|otp|send|code|internal error|login|signin/i.test(line)) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 100)}`);
  }
});
