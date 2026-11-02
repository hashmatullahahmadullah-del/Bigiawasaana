const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');

// Find all modal definitions: id="...modal"
const modalMatches = html.match(/id="[^"]*modal[^"]*"/gi) || [];
console.log('Found modals:', modalMatches);

// Find all occurrences of buttons inside modals or headers
const lines = html.split('\n');
lines.forEach((line, i) => {
  if (line.includes('class="crm-modal-header"') || line.includes('class="modal-header"') || line.includes('closeQuickWaiverModal') || line.includes('closeCatalogDishModal') || line.includes('closeQuoteEditorModal') || line.includes('closeDishPickerModal') || line.includes('closePackageRequestModal') || line.includes('closeImportFromMenuModal') || line.includes('closeWaiverProofModal') || line.includes('closeRecordCashModal')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
