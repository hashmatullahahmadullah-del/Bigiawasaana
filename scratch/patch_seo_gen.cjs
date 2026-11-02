const fs = require('fs');
let code = fs.readFileSync('generate-advanced-seo.mjs', 'utf8');

const helper = `function safeWriteFileSync(filePath, content) {
  let attempts = 5;
  while (attempts > 0) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (err) {
      attempts--;
      if (attempts === 0) throw err;
      const end = Date.now() + 150;
      while (Date.now() < end) {}
    }
  }
}
`;

code = helper + code;
code = code.replace(/fs\.writeFileSync\(path\.join\(outDir/g, 'safeWriteFileSync(path.join(outDir');
code = code.replace(/fs\.writeFileSync\(path\.join\(srcAreasDir/g, 'safeWriteFileSync(path.join(srcAreasDir');
code = code.replace(/fs\.writeFileSync\(path\.join\(pubAreasDir/g, 'safeWriteFileSync(path.join(pubAreasDir');

fs.writeFileSync('generate-advanced-seo.mjs', code, 'utf8');
console.log('generate-advanced-seo.mjs patched with safeWriteFileSync');
