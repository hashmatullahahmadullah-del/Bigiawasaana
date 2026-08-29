const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');
html = html.replace(
  /onclick="document\.getElementById\('duplicate-warning-modal'\)\.style\.display = 'none'"/g,
  `onclick="const m = document.getElementById('duplicate-warning-modal'); m.classList.remove('open'); setTimeout(() => m.style.display = 'none', 300);"`
);
fs.writeFileSync('admin.html', html, 'utf8');
console.log('Fixed dup modal close');
