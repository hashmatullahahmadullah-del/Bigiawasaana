const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

// Update duplicate handling
const oldDuplicate = /if \(result\.data && result\.data\.duplicate\) \{[\s\S]*?showToast\(\`Duplicate receipt rejected for \$\{result\.data\.vendor\}\`\);\s*\}/;

const newDuplicate = `if (result.data && result.data.duplicate) {
               duplicateCount++;
               try { await deleteObject(storageReference); } catch(e) {}
               const dupModal = document.getElementById('duplicate-warning-modal');
               if (dupModal) {
                 document.getElementById('dup-modal-vendor').textContent = result.data.vendor || 'Unknown Vendor';
                 document.getElementById('dup-modal-total').textContent = result.data.total != null ? '$' + parseFloat(result.data.total).toFixed(2) : '---';
                 dupModal.style.display = 'flex';
                 setTimeout(() => dupModal.classList.add('open'), 10);
               } else {
                 showToast(\`Duplicate receipt rejected for \$\{result.data.vendor\}\`);
               }
            }`;

js = js.replace(oldDuplicate, () => newDuplicate);

// Update openDraftReview
js = js.replace(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);/g, () => `reviewSection.style.display = 'flex';
          setTimeout(() => reviewSection.classList.add('open'), 10);`);

// Update closing reviewSection
js = js.replace(/reviewSection\.style\.display = "none";/g, () => `reviewSection.classList.remove('open');
          setTimeout(() => reviewSection.style.display = 'none', 300);`);

// Update cancel btn
js = js.replace(/const cancelBtn = document\.getElementById\("receipt-cancel-btn"\);/g, () => `const cancelBtn = document.getElementById("receipt-cancel-btn");`);

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed expenses.js modal logic securely');
