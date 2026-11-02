const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/admin').filter(f => f.endsWith('.js'));
let hasMissing = false;

files.forEach(file => {
  const content = fs.readFileSync(path.join('src/admin', file), 'utf8');
  // Look for onSnapshot
  const regex = /onSnapshot\([^)]+\)/g;
  // Let's do a more robust paren-counter check
  let pos = 0;
  while ((pos = content.indexOf('onSnapshot(', pos)) !== -1) {
    // Find matching closing paren
    let depth = 1;
    let i = pos + 'onSnapshot('.length;
    let inString = false;
    let stringChar = '';
    while (i < content.length && depth > 0) {
      const c = content[i];
      if (inString) {
        if (c === stringChar && content[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (c === "'" || c === '"' || c === '`') {
          inString = true;
          stringChar = c;
        } else if (c === '(') {
          depth++;
        } else if (c === ')') {
          depth--;
        }
      }
      i++;
    }
    const fullCall = content.substring(pos, i);
    // Check if fullCall has second or third argument for error handler
    // If it has `, (err)` or `, (e)` or `, (error)` or similar
    const hasErr = /,\s*\(err\)|,\s*\(e\)|,\s*\(error\)/.test(fullCall);
    const lineNum = content.substring(0, pos).split('\n').length;
    console.log(`${file}:${lineNum} hasErrorHandler: ${hasErr}`);
    if (!hasErr) {
      console.log('   Call snippet:', fullCall.substring(0, 100).replace(/\n/g, ' '));
      hasMissing = true;
    }
    pos = i;
  }
});

console.log('\nAll handled?', !hasMissing);
