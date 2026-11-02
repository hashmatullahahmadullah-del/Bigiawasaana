const fs = require('fs');

// 1. Update src/admin-theme.css
let css = fs.readFileSync('src/admin-theme.css', 'utf8');

// Ensure html and body.crm-body have overflow-x: hidden !important
if (!css.includes('body.crm-body {')) {
  css = `/* Viewport overflow protection */
html, body.crm-body {
  max-width: 100vw !important;
  width: 100% !important;
  overflow-x: hidden !important;
  position: relative;
}
` + css;
}

// Update offscreen slide-over display: none !important
const oldSlideOver = `.crm-slide-over:not(.open) {
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}

#receipt-slide-over:not(.open) {
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}`;

const newSlideOver = `.crm-slide-over:not(.open),
#receipt-slide-over:not(.open) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}

.crm-slide-over.open,
#receipt-slide-over.open {
  display: flex !important;
  visibility: visible !important;
  pointer-events: auto !important;
}`;

if (css.includes(oldSlideOver)) {
  css = css.replace(oldSlideOver, newSlideOver);
}

// Update mobile actions grid in .crm-table
const oldActionsGridMobile = `.crm-actions-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }`;

const newActionsGridMobile = `.crm-table td.crm-actions-cell {
    display: block !important;
    padding: 12px 14px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    border-bottom: none !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .crm-table td.crm-actions-cell::before {
    display: none !important;
  }
  .crm-actions-grid {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .crm-actions-grid button {
    width: 100% !important;
    min-height: 40px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    padding: 8px 10px !important;
    margin: 0 !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    text-transform: capitalize !important;
  }`;

if (css.includes(oldActionsGridMobile)) {
  css = css.replace(oldActionsGridMobile, newActionsGridMobile);
}

fs.writeFileSync('src/admin-theme.css', css, 'utf8');
console.log('src/admin-theme.css updated!');

// 2. Update admin.html
let html = fs.readFileSync('admin.html', 'utf8');

// Update body tag
html = html.replace(
  '<body\n class="crm-body" style="overflow-y: auto;">',
  '<body class="crm-body" style="overflow-x: hidden; overflow-y: auto; width: 100%; max-width: 100vw; position: relative;">'
);
html = html.replace(
  '<body class="crm-body" style="overflow-y: auto;">',
  '<body class="crm-body" style="overflow-x: hidden; overflow-y: auto; width: 100%; max-width: 100vw; position: relative;">'
);

// Update Quick Waiver button colors to --accent-admin
html = html.replace(
  'border-color: var(--accent-admin, #FF4500); color: var(--accent-admin, #FF4500);',
  'border-color: var(--accent-admin, #e11d48); color: var(--accent-admin, #e11d48);'
);

// Update Quick Waiver submit button text & style
html = html.replace(
  '<span id="qwm-submit-text">GENERATE WAIVER LINK →</span>',
  '<span id="qwm-submit-text">Generate waiver link</span>'
);

html = html.replace(
  'style="background: var(--accent-admin, #FF4500); color: #fff; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(255,69,0,0.3);"',
  'style="background: var(--accent-admin, #e11d48); color: #fff; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(225,29,72,0.3);"'
);

fs.writeFileSync('admin.html', html, 'utf8');
console.log('admin.html updated!');
