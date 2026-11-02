const fs = require('fs');

// 1. Update src/admin-theme.css
let adminCss = fs.readFileSync('src/admin-theme.css', 'utf8');

// Append the comprehensive flat UI button and TV layout overhaul at the bottom
const adminCssAdditions = `
/* ==========================================================================
   FLAT UI STANDARDIZATION & TV LAYOUT OVERHAUL (MATCHING SCREENSHOT 8)
   ========================================================================== */

/* Flat Primary Buttons & Active Tabs */
.btn-primary,
.crm-btn-primary,
.tv-btn-save-primary,
.btn-primary.active {
  background: #ff5722 !important;
  color: #ffffff !important;
  border: 1px solid #ff5722 !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  outline: none !important;
}

.btn-primary:hover,
.crm-btn-primary:hover,
.tv-btn-save-primary:hover {
  background: #f4511e !important;
  border-color: #f4511e !important;
  color: #ffffff !important;
}

/* Flat Outline Buttons & Inactive Subnav Tabs */
.btn-outline,
.crm-btn-outline,
.crm-subnav button:not(.active) {
  background: #18181b !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

.btn-outline:hover,
.crm-btn-outline:hover,
.crm-subnav button:not(.active):hover {
  background: #27272a !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

/* Active Outline / Subnav Button State */
.btn-outline.active,
.crm-btn-outline.active,
.crm-subnav button.active,
.crm-subnav .btn-outline.active {
  background: #ff5722 !important;
  color: #ffffff !important;
  border-color: #ff5722 !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

/* Clean Flat Sign Out Button */
.crm-logout-btn {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 10px 16px !important;
  margin-top: 8px !important;
  border-radius: 8px !important;
  color: #ef4444 !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  background: #18181b !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-sizing: border-box !important;
  box-shadow: none !important;
}

.crm-logout-btn svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
}

.crm-logout-btn span {
  line-height: 1 !important;
  display: inline-block !important;
  margin: 0 !important;
  padding: 0 !important;
}

.crm-logout-btn:hover {
  background: rgba(239, 68, 68, 0.12) !important;
  border-color: rgba(239, 68, 68, 0.45) !important;
  color: #f87171 !important;
}

/* Marketing & Promotions Responsive Stack */
.mkt-form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mkt-conditions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .mkt-form-row-2col,
  .crm-grid-col-2 {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
  }
  .mkt-conditions-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
  }
  #deal-cond-items {
    max-height: 180px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  #deal-cond-categories {
    max-height: 160px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
}

/* TV Screen Layout Modern Flat UI */
.tv-mobile-tab-bar {
  display: flex !important;
  gap: 6px !important;
  padding: 4px !important;
  border-radius: 8px !important;
  background: #18181b !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  margin-bottom: 14px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.tv-mobile-tab {
  flex: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  height: 38px !important;
  border-radius: 6px !important;
  border: 1px solid transparent !important;
  background: transparent !important;
  color: #a1a1aa !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.tv-mobile-tab:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #ffffff !important;
}

.tv-mobile-tab.active {
  background: #ff5722 !important;
  color: #ffffff !important;
  border-color: #ff5722 !important;
}

.tv-tab-badge {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #a1a1aa !important;
  font-size: 11px !important;
  padding: 2px 7px !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
}

.tv-mobile-tab.active .tv-tab-badge {
  background: rgba(0, 0, 0, 0.25) !important;
  color: #ffffff !important;
}

.tv-tab-accent-dot {
  display: none !important;
}

/* Compact Flat Single-Row Dish Card */
.tv-drag-item {
  display: flex !important;
  flex-direction: column !important;
  background: #18181b !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  margin-bottom: 6px !important;
  box-sizing: border-box !important;
  user-select: none !important;
  transition: background 0.15s ease, border-color 0.15s ease !important;
}

.tv-drag-item:hover {
  background: #222226 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.tv-card-main-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  width: 100% !important;
}

.tv-card-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
  flex: 1 !important;
}

.tv-card-rank {
  width: 24px !important;
  height: 24px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #a1a1aa !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  font-family: inherit !important;
}

.tv-card-thumb-wrap {
  width: 40px !important;
  height: 40px !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  background: #121214 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  flex-shrink: 0 !important;
}

.tv-card-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}

.tv-card-noimg {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #71717a !important;
}

.tv-card-info {
  min-width: 0 !important;
  flex: 1 !important;
}

.tv-card-title {
  font-size: 13.5px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.25 !important;
}

.tv-card-meta {
  font-size: 11px !important;
  color: #71717a !important;
  margin-top: 2px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.tv-card-price {
  font-weight: 700 !important;
  color: #ff5722 !important;
}

.tv-card-actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}

.tv-order-group {
  display: flex !important;
  gap: 4px !important;
  align-items: center !important;
}

.tv-btn-order {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #27272a !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 6px !important;
  color: #ffffff !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.tv-btn-order:hover {
  background: #3f3f46 !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
}

.tv-btn-order.disabled,
.tv-btn-order:disabled {
  opacity: 0.2 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

.tv-move-group {
  display: flex !important;
  gap: 4px !important;
  align-items: center !important;
}

.tv-pill-action {
  height: 28px !important;
  padding: 0 10px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  background: #27272a !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: #ffffff !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  white-space: nowrap !important;
  transition: all 0.15s ease !important;
}

.tv-pill-action:hover {
  background: #3f3f46 !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

.tv-action-to-tv1:hover,
.tv-action-to-tv2:hover {
  background: #ff5722 !important;
  border-color: #ff5722 !important;
  color: #ffffff !important;
}

.tv-action-hide {
  background: #27272a !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: #a1a1aa !important;
}

.tv-action-hide:hover {
  background: rgba(239, 68, 68, 0.15) !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  color: #ef4444 !important;
}

/* TV Mobile Screen & Scroll Optimizations */
@media (max-width: 768px) {
  .tv-dashboard-header {
    margin-bottom: 8px !important;
  }
  .tv-mobile-tab-bar {
    display: flex !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 50 !important;
    background: #0f0f11 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 8px !important;
    padding: 4px !important;
    margin: 0 0 12px 0 !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
  }
  .tv-drag-item {
    padding: 8px 10px !important;
    margin-bottom: 6px !important;
    border-radius: 8px !important;
  }
  .tv-card-thumb-wrap {
    width: 36px !important;
    height: 36px !important;
  }
  .tv-card-title {
    font-size: 13px !important;
  }
  .tv-hide-label {
    display: none !important;
  }
  .tv-action-hide {
    padding: 0 8px !important;
  }
}
`;

fs.writeFileSync('src/admin-theme.css', adminCss + '\n' + adminCssAdditions, 'utf8');
console.log('Successfully updated src/admin-theme.css!');

// 2. Also ensure src/style.css has the exact flat button design system
let styleCss = fs.readFileSync('src/style.css', 'utf8');
const styleCssAdditions = `
/* ==========================================================================
   FLAT UI BUTTON STANDARDIZATION (MATCHING SCREENSHOT 8)
   ========================================================================== */
.btn-primary,
button.btn-primary,
a.btn-primary {
  background: #ff5722 !important;
  color: #ffffff !important;
  border: 1px solid #ff5722 !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

.btn-primary:hover,
button.btn-primary:hover,
a.btn-primary:hover {
  background: #f4511e !important;
  border-color: #f4511e !important;
  color: #ffffff !important;
}

.btn-outline,
button.btn-outline,
a.btn-outline {
  background: #18181b !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

.btn-outline:hover,
button.btn-outline:hover,
a.btn-outline:hover {
  background: #27272a !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

.btn-outline.active,
button.btn-outline.active {
  background: #ff5722 !important;
  color: #ffffff !important;
  border-color: #ff5722 !important;
  border-radius: 8px !important;
}
`;

fs.writeFileSync('src/style.css', styleCss + '\n' + styleCssAdditions, 'utf8');
console.log('Successfully updated src/style.css!');
