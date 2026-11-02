const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(adminHtmlPath, 'utf8');

const startMarker = '<!-- Duplicate Warning Modal -->';
const endMarker = '<!-- Upload Progress -->';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `<!-- Duplicate Warning Modal -->
              <div id="duplicate-warning-modal" class="crm-modal" style="display: none;">
                <div class="crm-modal-box" style="max-width: 600px; width: 95vw; height: auto; max-height: 92dvh; border-radius: 4px; display: flex; flex-direction: column;">
                  <div style="width: 100%; display: flex; flex-direction: column; flex: 1; min-height: 0;">
                    <div class="crm-modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 18px 24px; flex-shrink: 0;">
                      <h2 style="color: #ef4444; margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        <span><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Duplicate Receipt Detected
                      </h2>
                      <button type="button" class="crm-btn-icon" aria-label="Close dialog" onclick="const m = document.getElementById('duplicate-warning-modal'); m.classList.remove('open'); setTimeout(() => m.style.display = 'none', 300);"><svg class="ui-icon ui-icon-no-margin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>
                    <div class="crm-modal-content" style="padding: 20px 24px; overflow-y: auto; flex: 1; min-height: 0;">
                      <p style="color: var(--text-main); font-size: 15px; margin-bottom: 16px;">
                        The receipt you just uploaded appears to be a duplicate of an existing expense in your database.
                      </p>
                      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
                        <div style="color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">VENDOR</div>
                        <div id="dup-modal-vendor" style="color: var(--text-main); font-size: 17px; font-weight: 700; margin-bottom: 10px;"></div>
                        
                        <div style="color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">TOTAL AMOUNT</div>
                        <div id="dup-modal-total" style="color: #ef4444; font-size: 20px; font-weight: 700;"></div>
                      </div>
                      <p style="color: var(--text-muted); font-size: 13.5px; margin-bottom: 20px; line-height: 1.5;">
                        To prevent double-counting your expenses, this upload has been securely deleted and no draft was created.
                      </p>
                      <button type="button" class="btn-primary" style="width: 100%; min-height: 44px; background: #ef4444; color: white; font-weight: 600;" onclick="const m = document.getElementById('duplicate-warning-modal'); m.classList.remove('open'); setTimeout(() => m.style.display = 'none', 300);">I Understand, Close</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Review Section (Drafts) -->
              <div id="review-section" class="crm-modal" style="display: none;">
                <div class="crm-modal-box" style="max-width: 1200px; width: 100vw; height: 100%; height: 100dvh; max-height: 100dvh; border-radius: 0; border: none; transform: none; display: flex; flex-direction: column;">
                  <div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1; min-height: 0;">
                    <div class="crm-modal-header" style="padding: 20px 28px; flex-shrink: 0; border-bottom: 1px solid var(--border-admin);">
                      <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text-main);">Review Receipt Draft</h2>
                      <button type="button" class="crm-btn-icon" onclick="document.getElementById('receipt-cancel-btn').click()" aria-label="Close receipt draft review"><svg class="ui-icon ui-icon-no-margin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>
                    <div class="crm-modal-content" style="padding: 20px 28px; overflow-y: auto; flex: 1 1 auto; min-height: 0; -webkit-overflow-scrolling: touch;">
                      <div id="review-meta" style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;"></div>
                      
                      <div class="crm-table-container" style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
                        <table class="crm-table" style="width: 100%; min-width: 520px;">
                          <thead>
                            <tr>
                              <th style="width: 28%">Item Name</th>
                              <th style="width: 28%">Category & Link</th>
                              <th style="width: 10%; text-align: center;">Qty</th>
                              <th style="width: 17%; text-align: right;">Unit Price</th>
                              <th style="width: 17%; text-align: right;">Total</th>
                            </tr>
                          </thead>
                          <tbody id="review-tbody"></tbody>
                        </table>
                      </div>
                    </div>

                    <div id="receipt-actions" class="crm-modal-footer" style="padding: 14px 28px max(14px, env(safe-area-inset-bottom, 14px)); border-top: 1px solid var(--border-admin); background: var(--surface-admin); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; box-sizing: border-box; flex-wrap: wrap;">
                      <button type="button" class="btn-outline btn-small" id="receipt-cancel-btn" style="color: var(--text-muted); display: none; min-height: 40px; padding: 8px 16px;">Cancel</button>
                      <button type="button" class="btn-outline btn-small" id="receipt-retake-btn" style="color: var(--text-muted); min-height: 40px; padding: 8px 16px;">Clear</button>
                      <button type="button" class="btn-outline btn-small" id="receipt-delete-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); min-height: 40px; padding: 8px 16px;">Delete</button>
                      <button type="button" class="btn-primary" id="confirm-expense-btn" style="min-height: 40px; padding: 8px 20px;">Confirm & Save Expense</button>
                    </div>
                  </div>
                </div>
              </div>

              `;

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

fs.writeFileSync(adminHtmlPath, before + replacement + after, 'utf8');
console.log('Successfully updated duplicate-warning-modal and review-section in admin.html');
