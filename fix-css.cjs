const fs = require('fs');
let css = fs.readFileSync('src/admin-theme.css', 'utf8');

// Strip all null bytes
css = css.replace(/\0/g, '');

// The corrupted text looks like " / *   M o d a l ... "
const idx = css.indexOf('/ *   M o d a l');
if (idx > -1) {
  css = css.substring(0, Math.max(0, idx - 2));
}

// Add our overrides
css += '\n\n/* Modal Overrides */\n';
css += '.crm-modal-box { background: var(--surface-admin) !important; border-color: var(--border-admin) !important; }\n';
css += '.crm-modal-header { border-bottom-color: var(--border-admin) !important; }\n';

fs.writeFileSync('src/admin-theme.css', css, 'utf8');
