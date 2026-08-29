const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const reviewHtml = `
            <!-- Review Section (Drafts) -->
            <div id="review-section" class="crm-panel" style="display: none; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-admin); padding-bottom: 16px;">
                <div>
                  <h3 style="margin: 0; color: var(--text-main); font-size: 18px;">Review Receipt Draft</h3>
                  <div id="review-meta" style="color: var(--text-muted); font-size: 14px; margin-top: 4px;"></div>
                </div>
                <div id="receipt-actions" style="display: flex; gap: 8px;">
                  <button type="button" class="btn-outline btn-small" id="receipt-retake-btn" style="color: var(--text-muted);">Clear</button>
                  <button type="button" class="btn-outline btn-small" id="receipt-delete-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">Delete</button>
                  <button type="button" class="btn-primary btn-small" id="confirm-expense-btn">Confirm & Save Expense</button>
                </div>
              </div>
              
              <div class="crm-table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th style="width: 25%">Item Name</th>
                      <th style="width: 25%">Category & Link</th>
                      <th style="width: 10%">Qty</th>
                      <th style="width: 15%">Unit Price</th>
                      <th style="width: 15%">Line Total</th>
                    </tr>
                  </thead>
                  <tbody id="review-tbody">
                    <!-- JS Injected -->
                  </tbody>
                </table>
              </div>
            </div>
`;

html = html.replace('<!-- Upload Progress -->', reviewHtml + '\n            <!-- Upload Progress -->');
fs.writeFileSync('admin.html', html, 'utf8');
console.log('Injected review-section HTML');
