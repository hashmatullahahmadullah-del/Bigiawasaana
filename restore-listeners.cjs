const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

const listenersCode = `
      if (cameraInput) {
        cameraInput.addEventListener("change", (e) => {
          handleFilesSelected(e.target.files);
          cameraInput.value = "";
        });
      }
      if (galleryInput) {
        galleryInput.addEventListener("change", (e) => {
          handleFilesSelected(e.target.files);
          galleryInput.value = "";
        });
      }
`;

js = js.replace('    const renderReview = (data) => {', listenersCode + '\n    const renderReview = (data) => {');
fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Restored missing event listeners');
