const fs = require('fs');

// 1. admin-theme.css
let theme = fs.readFileSync('src/admin-theme.css', 'utf8').replace(/\r\n/g, '\n');

const oldMobileSlide = `  /* Mobile Slide-Over */
  .crm-slide-over {
    width: 100vw !important;
    max-width: 100vw !important;
    right: -100vw !important;
  }
  .crm-slide-over.open {
    right: 0 !important;
  }`;

const newMobileSlide = `  /* Mobile Slide-Over */
  .crm-slide-over {
    width: 100vw !important;
    max-width: 100vw !important;
    right: -100vw !important;
    visibility: hidden !important;
    pointer-events: none !important;
    box-shadow: none !important;
  }
  .crm-slide-over.open {
    right: 0 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5) !important;
  }`;

if (theme.includes(oldMobileSlide)) {
  theme = theme.replace(oldMobileSlide, newMobileSlide);
  console.log('Mobile slide-over updated in admin-theme.css');
} else {
  console.log('Mobile slide-over NOT found in admin-theme.css');
}

// Append global offscreen drawer safety rules
const safetyRules = `
/* ==========================================================================
   Offscreen Slide-Over & Drawer Shadow Bleed Prevention
   ========================================================================== */
.crm-slide-over:not(.open) {
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}

#receipt-slide-over:not(.open) {
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}

#receipt-slide-over.open {
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateX(0) !important;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5) !important;
}
`;

if (!theme.includes('Offscreen Slide-Over & Drawer Shadow Bleed Prevention')) {
  theme += safetyRules;
  console.log('Safety rules appended to admin-theme.css');
}

fs.writeFileSync('src/admin-theme.css', theme, 'utf8');

// 2. account-auth.css
let auth = fs.readFileSync('src/account-auth.css', 'utf8').replace(/\r\n/g, '\n');

const oldAccountDrawer = `.account-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 440px;
  background: #111111;
  border-left: 1px solid #242424;
  box-shadow: -15px 0 40px rgba(0, 0, 0, 0.8);
  z-index: 99999;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.account-drawer.active {
  transform: translateX(0);
}`;

const newAccountDrawer = `.account-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 440px;
  background: #111111;
  border-left: 1px solid #242424;
  box-shadow: none;
  z-index: 99999;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.35s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}

.account-drawer.active {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
  box-shadow: -15px 0 40px rgba(0, 0, 0, 0.8);
}`;

if (auth.includes(oldAccountDrawer)) {
  auth = auth.replace(oldAccountDrawer, newAccountDrawer);
  console.log('Account drawer updated in account-auth.css');
} else {
  console.log('Account drawer NOT found in account-auth.css');
}

fs.writeFileSync('src/account-auth.css', auth, 'utf8');
