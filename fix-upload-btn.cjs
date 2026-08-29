const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

js = js.replace('const cameraInput = document.getElementById("receipt-input-camera");', 'const cameraInput = document.getElementById("receipt-upload-input");');
js = js.replace('const galleryInput = document.getElementById("receipt-input-gallery");', 'const galleryInput = null;');

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed upload button id');
