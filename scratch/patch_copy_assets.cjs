const fs = require('fs');
let code = fs.readFileSync('scripts/copy-assets.js', 'utf8');

const helper = `function safeWrite(dest, content) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      fs.writeFileSync(dest, content);
      return;
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      const waitTill = new Date(new Date().getTime() + 200);
      while (waitTill > new Date()) {}
    }
  }
}

function safeCopy(src, dest) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      fs.copyFileSync(src, dest);
      return;
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      const waitTill = new Date(new Date().getTime() + 200);
      while (waitTill > new Date()) {}
    }
  }
}
`;

if (!code.includes('function safeWrite')) {
  code = code.replace('filesToCopy.forEach', helper + '\nfilesToCopy.forEach');
  code = code.replace('fs.writeFileSync(dest, content);', 'safeWrite(dest, content);');
  code = code.replace('fs.copyFileSync(src, dest);', 'safeCopy(src, dest);');
  code = code.replace("fs.copyFileSync('dist/shop.html', 'functions/shop-template.html');", "safeCopy('dist/shop.html', 'functions/shop-template.html');");
  fs.writeFileSync('scripts/copy-assets.js', code, 'utf8');
  console.log('Successfully patched scripts/copy-assets.js');
} else {
  console.log('Already patched');
}
