const fs = require('fs');

let admin = fs.readFileSync('admin.html', 'utf8').replace(/\r\n/g, '\n');

// 1. Update receipt-slide-over
const oldReceipt = `<div id="receipt-slide-over" style="position: fixed; top: 0; right: 0; width: 100%; max-width: 450px; height: 100vh; background: var(--surface); box-shadow: -4px 0 24px rgba(0,0,0,0.5); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 9999; display: flex; flex-direction: column; overflow: hidden; border-left: 1px solid var(--border);">`;

const newReceipt = `<div id="receipt-slide-over" style="position: fixed; top: 0; right: 0; width: 100%; max-width: 450px; height: 100vh; background: var(--surface); box-shadow: none; visibility: hidden; pointer-events: none; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 9999; display: flex; flex-direction: column; overflow: hidden; border-left: 1px solid var(--border);">`;

if (admin.includes(oldReceipt)) {
  admin = admin.replace(oldReceipt, newReceipt);
  console.log('receipt-slide-over updated');
} else {
  console.log('receipt-slide-over not found');
}

// 2. Replace raw '×' in .crm-btn-icon
const svgClose = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

admin = admin.replace(/class="crm-btn-icon"([^>]*)>×<\/button>/g, `class="crm-btn-icon"$1>${svgClose}</button>`);
console.log('crm-btn-icon SVG close icons updated');

fs.writeFileSync('admin.html', admin, 'utf8');
