const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

const oldReviewSectionRegex = /<!-- Review Section \(Drafts\) -->[\s\S]*?<div id="review-section"[\s\S]*?<div class="crm-table-container">[\s\S]*?<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newReviewSection = `<!-- Review Section (Drafts) -->
              <div id="review-section" class="crm-modal" style="display: none;">
                <div class="crm-modal-box" style="max-width: 900px;">
                  <div class="crm-modal-header">
                    <h2 style="margin: 0;">Review Receipt Draft</h2>
                    <button class="crm-btn-icon" onclick="document.getElementById('receipt-cancel-btn').click()">✕</button>
                  </div>
                  <div class="crm-modal-content">
                    <div id="review-meta" style="color: var(--gray); font-size: 14px; margin-bottom: 16px;"></div>
                    
                    <div class="crm-table-container">
                      <table class="crm-table">
                        <thead>
                          <tr>
                            <th style="width: 25%">Item Name</th>
                            <th style="width: 25%">Category & Link</th>
                            <th style="width: 10%">Qty</th>
                            <th style="width: 15%">Unit Price</th>
                            <th style="width: 15%">Total</th>
                          </tr>
                        </thead>
                        <tbody id="review-tbody"></tbody>
                      </table>
                    </div>

                    <div id="receipt-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                      <button type="button" class="btn-outline btn-small" id="receipt-cancel-btn" style="color: var(--text-muted); display: none;">Cancel</button>
                      <button type="button" class="btn-outline btn-small" id="receipt-retake-btn" style="color: var(--text-muted);">Clear</button>
                      <button type="button" class="btn-outline btn-small" id="receipt-delete-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">Delete</button>
                      <button type="button" class="btn-primary btn-small" id="confirm-expense-btn">Confirm & Save Expense</button>
                    </div>
                  </div>
                </div>
              </div>`;

html = html.replace(oldReviewSectionRegex, newReviewSection);

fs.writeFileSync('admin.html', html, 'utf8');
console.log('Replaced review section');
