const fs = require('fs');
const path = require('path');

const lines = fs.readFileSync('functions/index.js', 'utf8').split('\n');
const required = new Set();

for (const line of lines) {
  const match = line.match(/require\(['"]\.\/([^'"]+)['"]\)/);
  if (match) {
    const mod = match[1];
    if (required.has(mod)) continue;
    required.add(mod);

    const fullPath = path.resolve('functions', mod);
    const start = Date.now();
    try {
      require(fullPath);
      const elapsed = Date.now() - start;
      console.log(`${mod}: ${elapsed}ms`);
    } catch (e) {
      console.log(`${mod} error: ${e.message}`);
    }
  }
}
