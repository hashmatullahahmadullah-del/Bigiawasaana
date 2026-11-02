const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('onSnapshot(')) {
      // get the block around onSnapshot
      const snippet = lines.slice(idx, Math.min(lines.length, idx + 100)).join('\n');
      // find closing of onSnapshot
      let depth = 0;
      let started = false;
      let callStr = '';
      for (let i = 0; i < snippet.length; i++) {
        if (snippet[i] === '(' && snippet.slice(Math.max(0, i - 11), i + 1).includes('onSnapshot(')) {
          started = true;
          depth = 1;
          callStr += '(';
          continue;
        }
        if (started) {
          callStr += snippet[i];
          if (snippet[i] === '(') depth++;
          else if (snippet[i] === ')') {
            depth--;
            if (depth === 0) break;
          }
        }
      }
      // Check if callStr has 2 or 3 arguments (or error handler)
      console.log(`=== ${file}:${idx + 1} ===`);
      console.log(line.trim());
      // Check if there is an error callback
      const hasErrorCb = callStr.includes('(err)') || callStr.includes('(error)') || callStr.includes('err =>') || callStr.includes('error =>');
      console.log(`Has error callback: ${hasErrorCb}`);
    }
  });
});
