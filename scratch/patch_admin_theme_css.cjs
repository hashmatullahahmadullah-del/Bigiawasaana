const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'src', 'admin-theme.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Insert desktop base rules right after `.crm-table tbody tr:hover { background: var(--hover-bg); }`
const desktopTarget = `.crm-table tbody tr:hover {
  background: var(--hover-bg);
}`;

const desktopAdd = `
/* Table Cell Values & Action Grids (Desktop Base) */
.crm-cell-value {
  display: block;
  text-align: inherit;
  min-width: 0;
  word-break: break-word;
}
.crm-actions-cell {
  text-align: right;
  white-space: nowrap;
}
.crm-actions-grid {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  white-space: nowrap;
}
.crm-actions-grid button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  white-space: nowrap;
  transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}
.crm-actions-grid button:active {
  transform: scale(0.95);
}
@keyframes popCheck {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.copy-link-success svg {
  animation: popCheck 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
`;

if (css.includes('.crm-actions-grid')) {
  console.log('Desktop rules already exist, skipping insertion');
} else {
  // Normalize line breaks for matching
  const hasCRLF = css.includes('\r\n');
  const target = hasCRLF ? desktopTarget.replace(/\n/g, '\r\n') : desktopTarget;
  const replacement = hasCRLF ? (desktopTarget + desktopAdd).replace(/\n/g, '\r\n') : (desktopTarget + desktopAdd);
  if (!css.includes(target)) {
    throw new Error('Failed to find desktopTarget in css');
  }
  css = css.replace(target, replacement);
  console.log('Inserted desktop table & action grid styles');
}

// 2. Upgrade mobile table card styles inside @media (max-width: 768px)
const mobileSearchStr = `.crm-table td {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    text-align: right !important;
    border-bottom: 1px solid var(--border-admin) !important;
    padding: 12px 16px !important;
    gap: 16px;
  }`;

const mobileReplacementStr = `.crm-table-container {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  .crm-table {
    width: 100% !important;
    max-width: 100% !important;
  }
  .crm-table tr {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }
  .crm-table td {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    text-align: right !important;
    border-bottom: 1px solid var(--border-admin) !important;
    padding: 12px 14px !important;
    gap: 12px !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  .crm-table td:last-child {
    border-bottom: none !important;
  }
  .crm-table td::before {
    content: attr(data-label);
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-align: left;
    flex-shrink: 0;
    max-width: 38%;
  }
  .crm-cell-value {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-end !important;
    text-align: right !important;
    min-width: 0 !important;
    max-width: 62% !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  .crm-cell-value > * {
    max-width: 100% !important;
  }

  /* Actions Cell on Mobile - Clean 2x2 Touch Grid */
  .crm-table td.crm-actions-cell {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    padding: 14px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .crm-table td.crm-actions-cell::before {
    max-width: 100% !important;
    margin-bottom: 2px !important;
    font-size: 11px !important;
    color: var(--text-muted) !important;
  }
  .crm-actions-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
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
    margin: 0 !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
  }
  .crm-actions-grid.crm-actions-2 {
    grid-template-columns: 1fr 1fr !important;
  }`;

const hasCRLF = css.includes('\r\n');
const mobileTarget = hasCRLF ? mobileSearchStr.replace(/\n/g, '\r\n') : mobileSearchStr;
const mobileReplacement = hasCRLF ? mobileReplacementStr.replace(/\n/g, '\r\n') : mobileReplacementStr;

if (css.includes('.crm-table td.crm-actions-cell')) {
  console.log('Mobile rules already exist, skipping mobile replacement');
} else {
  if (!css.includes(mobileTarget)) {
    throw new Error('Failed to find mobileTarget in css');
  }
  css = css.replace(mobileTarget, mobileReplacement);
  console.log('Replaced mobile table card styles');
}

// 3. Global tactile button interaction styles
if (!css.includes('/* Global tactile button feedback */')) {
  const tactileRules = (hasCRLF ? '\r\n' : '\n') + `/* Global tactile button feedback */
button:active, .btn-primary:active, .btn-outline:active, .btn-secondary:active, .crm-btn-icon:active {
  transform: scale(0.96) !important;
  transition: transform 0.08s ease !important;
}
`;
  css += tactileRules;
  console.log('Appended global tactile button feedback');
}

fs.writeFileSync(cssPath, css);
console.log('src/admin-theme.css successfully updated!');
