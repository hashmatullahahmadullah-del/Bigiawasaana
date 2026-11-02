const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', 'src'));
files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("'orders'") || line.includes('"orders"')) {
      console.log(`${path.relative(path.join(__dirname, '..'), f)}:${idx+1}: ${line.trim().slice(0, 90)}`);
    }
  });
});
