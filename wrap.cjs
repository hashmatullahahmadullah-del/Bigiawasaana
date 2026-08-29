const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Wrap duplicate modal contents
const dupRegex = /<div class="crm-modal-header" style="border-bottom: 1px solid rgba\(239, 68, 68, 0\.3\); padding: 32px 48px;">\s*<h2[\s\S]*?<\/div>\s*<div class="crm-modal-content">/;
const dupNew = `<div style="max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1;">
                    <div class="crm-modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 32px 48px;">
                      <h2 style="color: #ef4444; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <span>⚠️</span> Duplicate Receipt Detected
                      </h2>
                      <button class="crm-btn-icon" onclick="const m = document.getElementById('duplicate-warning-modal'); m.classList.remove('open'); setTimeout(() => m.style.display = 'none', 300);">✕</button>
                    </div>
                    <div class="crm-modal-content">`;
html = html.replace(dupRegex, dupNew);

// Close the wrapper div for duplicate modal
html = html.replace(/I Understand, Close<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- Review Section/, 'I Understand, Close</button>\n                    </div>\n                  </div>\n                </div>\n              </div>\n\n              <!-- Review Section');


// Wrap review modal contents
const reviewRegex = /<div class="crm-modal-header" style="padding: 32px 48px;">\s*<h2 style="margin: 0;">Review Receipt Draft<\/h2>\s*<button class="crm-btn-icon"\s*onclick="document\.getElementById\('receipt-cancel-btn'\)\.click\(\)">[^\<]+<\/button>\s*<\/div>\s*<div class="crm-modal-content">/;
const reviewNew = `<div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1;">
                    <div class="crm-modal-header" style="padding: 32px 48px;">
                      <h2 style="margin: 0;">Review Receipt Draft</h2>
                      <button class="crm-btn-icon" onclick="document.getElementById('receipt-cancel-btn').click()">✕</button>
                    </div>
                    <div class="crm-modal-content">`;
html = html.replace(reviewRegex, reviewNew);

// Close wrapper div for review modal
html = html.replace(/id="confirm-expense-btn">Confirm & Save Expense<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- Upload Progress -->/, 'id="confirm-expense-btn">Confirm & Save Expense</button>\n                      </div>\n                    </div>\n                  </div>\n                </div>\n              </div>\n\n              <!-- Upload Progress -->');

fs.writeFileSync('admin.html', html, 'utf8');
