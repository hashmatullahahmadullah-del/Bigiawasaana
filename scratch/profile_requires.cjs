const fs = require('fs');

const lines = fs.readFileSync('functions/index.js', 'utf8').split('\n');

for (const line of lines) {
  const match = line.match(/require\(['"]([^'"]+)['"]\)/);
  if (match) {
    const mod = match[1];
    const start = Date.now();
    try {
      require('./functions/' + mod);
      const elapsed = Date.now() - start;
      if (elapsed > 100) {
        console.log(`${mod}: ${elapsed}ms`);
      }
    } catch (e) {
      console.log(`${mod} error: ${e.message}`);
    }
  }
}
