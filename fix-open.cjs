const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

js = js.replace(/window\.openDraftReview = \(id\) => \{/g, 'window.openDraftReview = (id, autoSave = false) => {');

const regexOpenDraft = /\/\/ Start Auto-Save Countdown[\s\S]*?\}, 1000\);/m;
js = js.replace(regexOpenDraft, `if (autoSave) {
          // Start Auto-Save Countdown
          if (autoSaveInterval) clearInterval(autoSaveInterval);
          autoSaveCountdown = 10;
          confirmBtn.textContent = \`Confirm & Save Expense (\${autoSaveCountdown}s)\`;
          
          autoSaveInterval = setInterval(() => {
            autoSaveCountdown--;
            if (autoSaveCountdown > 0) {
              confirmBtn.textContent = \`Confirm & Save Expense (\${autoSaveCountdown}s)\`;
            } else {
              clearInterval(autoSaveInterval);
              confirmBtn.textContent = \`Confirm & Save Expense\`;
              confirmBtn.click(); // Auto-trigger save
            }
          }, 1000);
        } else {
          if (autoSaveInterval) clearInterval(autoSaveInterval);
          confirmBtn.textContent = \`Confirm & Save Expense\`;
        }`);

js = js.replace('} else if (result.data) {\n            successCount++;\n          }', `} else if (result.data) {
            successCount++;
            if (files.length === 1 && result.data.id) {
               window[\`draft_data_\${result.data.id}\`] = result.data;
               window.openDraftReview(result.data.id, true);
            }
          }`);

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Fixed auto-save flow');
