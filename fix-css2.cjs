const fs = require('fs');
let css = fs.readFileSync('src/admin-theme.css', 'utf8');

// The literal string
const literal = '\\n\\n/* Modal Overrides */\\n.crm-modal-box { background: var(--surface-admin) !important; border-color: var(--border-admin) !important; }\\n.crm-modal-header { border-bottom-color: var(--border-admin) !important; }\\n';

css = css.replace(literal, '');
css = css.replace(/\/\* Modal Overrides \*\/[\s\S]*$/, '');

css += '\n/* Modal Overrides */\n';
css += '.crm-modal-box { background: var(--surface-admin) !important; border-color: var(--border-admin) !important; }\n';
css += '.crm-modal-header { border-bottom-color: var(--border-admin) !important; }\n';

fs.writeFileSync('src/admin-theme.css', css.trim() + '\n', 'utf8');
