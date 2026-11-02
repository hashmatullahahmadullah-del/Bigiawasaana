const fs = require('fs');

// 1. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

// Remove style="display: none;" from quote-editor-modal and dish-picker-modal
adminHtml = adminHtml.replace(
  '<div class="crm-modal" id="quote-editor-modal" style="display: none;">',
  '<div class="crm-modal" id="quote-editor-modal">'
);

adminHtml = adminHtml.replace(
  '<div class="crm-modal" id="dish-picker-modal" style="display: none;">',
  '<div class="crm-modal" id="dish-picker-modal">'
);

// Fix package-request-modal structure to use crm-modal-box
const pkgModalTarget = `<div class="crm-modal" id="package-request-modal">
    <div class="crm-modal-content" style="max-width: 780px;">
      <div class="crm-modal-header" style="display: flex; justify-content: space-between; align-items: center;">`;

const pkgModalReplacement = `<div class="crm-modal" id="package-request-modal">
    <div class="crm-modal-box" style="max-width: 780px; width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">
      <div class="crm-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-admin); flex-shrink: 0;">`;

if (adminHtml.includes(pkgModalTarget)) {
  adminHtml = adminHtml.replace(pkgModalTarget, pkgModalReplacement);
  console.log('Patched package-request-modal opening in admin.html');
} else {
  console.warn('pkgModalTarget not found in admin.html');
}

// Fix minmax(320px, 1fr) in bookings list
adminHtml = adminHtml.replace(
  'grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));',
  'grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));'
);

// Fix minmax in catalog grids
adminHtml = adminHtml.replace(
  'grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));',
  'grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));'
);

// Fix quote search row min-width
adminHtml = adminHtml.replace(
  '<div style="display: flex; gap: 12px; flex: 1; min-width: 280px;">\n                  <input type="text" id="quote-search-input" class="crm-input" placeholder="Search by Quote #, Client, Phone, or Email..." oninput="window.renderCateringQuotes()" style="flex: 1; max-width: 380px;">\n                  <select id="quote-status-filter" class="crm-input" onchange="window.renderCateringQuotes()" style="max-width: 180px;">',
  '<div style="display: flex; flex-wrap: wrap; gap: 10px; flex: 1; width: 100%;">\n                  <input type="text" id="quote-search-input" class="crm-input" placeholder="Search by Quote #, Client, Phone, or Email..." oninput="window.renderCateringQuotes()" style="flex: 1; min-width: 180px;">\n                  <select id="quote-status-filter" class="crm-input" onchange="window.renderCateringQuotes()" style="min-width: 140px;">'
);

// Fix pkg-search row
adminHtml = adminHtml.replace(
  '<div style="display: flex; gap: 10px; flex: 1; max-width: 500px;">\n                  <input type="text" id="pkg-search" class="crm-input" placeholder="Search by client name, email, phone, or request #..." oninput="window.filterPackageRequests()" style="flex: 1;">\n                </div>\n                <div style="display: flex; gap: 10px; align-items: center;">\n                  <label style="font-size: 13px; color: var(--text-muted);">Status:</label>\n                  <select id="pkg-status-filter" class="crm-select" onchange="window.filterPackageRequests()" style="width: 150px;">',
  '<div style="display: flex; flex-wrap: wrap; gap: 10px; flex: 1; width: 100%;">\n                  <input type="text" id="pkg-search" class="crm-input" placeholder="Search by client name, email, phone, or request #..." oninput="window.filterPackageRequests()" style="flex: 1; min-width: 180px;">\n                  <div style="display: flex; gap: 8px; align-items: center;">\n                    <label style="font-size: 13px; color: var(--text-muted); white-space: nowrap;">Status:</label>\n                    <select id="pkg-status-filter" class="crm-select" onchange="window.filterPackageRequests()" style="min-width: 130px;">'
);

// Fix quote modal info grid minmax(310px, 1fr)
adminHtml = adminHtml.replace(
  'grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 24px;',
  'grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px;'
);

fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('Successfully updated admin.html');
