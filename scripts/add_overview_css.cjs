const fs = require('fs');

const cssPath = 'src/admin-theme.css';
let css = fs.readFileSync(cssPath, 'utf8');

const flatUiRules = `

/* ==========================================================================
   Flat UI Admin Overview Command Center Styling & Responsiveness
   ========================================================================== */

.flat-metric-card, .flat-dept-card, .flat-action-tile {
  box-shadow: none !important;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease !important;
}

.flat-action-tile:hover {
  border-color: var(--accent-admin, #e11d48) !important;
  background-color: var(--hover-bg) !important;
}

.flat-action-tile:active {
  transform: scale(0.98) !important;
}

.flat-dept-card:hover {
  border-color: rgba(255, 255, 255, 0.16) !important;
}

:root[data-theme="light"] .flat-dept-card:hover {
  border-color: #cbd5e1 !important;
}

.flat-status-dot.open {
  background-color: #10b981 !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.flat-status-dot.closed {
  background-color: #64748b !important;
}

.flat-status-dot.busy {
  background-color: #f59e0b !important;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

/* Tablet & Mobile Breakpoints for Overview */
@media (max-width: 1024px) {
  .flat-grid-4 {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
  .flat-action-hub {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
  }
}

@media (max-width: 640px) {
  .flat-grid-4 {
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
  }
  .flat-metric-card, .flat-dept-card {
    padding: 14px 12px !important;
  }
  .flat-metric-val {
    font-size: 22px !important;
  }
  .flat-action-hub {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
  }
  .flat-action-tile {
    padding: 10px 10px !important;
    gap: 8px !important;
  }
  .flat-tile-text > div:first-child {
    font-size: 11.5px !important;
  }
  .flat-tile-text > div:last-child {
    font-size: 10px !important;
  }
  .overview-header-row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
  }
  .overview-status-cluster {
    width: 100% !important;
    justify-content: space-between !important;
  }
}

@media (max-width: 360px) {
  .flat-grid-4 {
    grid-template-columns: 1fr !important;
  }
  .flat-action-hub {
    grid-template-columns: 1fr !important;
  }
}
`;

if (!css.includes('Flat UI Admin Overview Command Center Styling')) {
  css += flatUiRules;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Successfully added Flat UI Overview rules to src/admin-theme.css!');
} else {
  console.log('Flat UI rules already present in src/admin-theme.css');
}
