const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const dupModal = `
              <!-- Duplicate Warning Modal -->
              <div id="duplicate-warning-modal" class="crm-modal" style="display: none;">
                <div class="crm-modal-box" style="max-width: 500px;">
                  <div class="crm-modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.3);">
                    <h2 style="color: #ef4444; margin: 0; display: flex; align-items: center; gap: 8px;">
                      <span>⚠️</span> Duplicate Receipt Detected
                    </h2>
                    <button class="crm-btn-icon" onclick="document.getElementById('duplicate-warning-modal').style.display = 'none'">✕</button>
                  </div>
                  <div class="crm-modal-content">
                    <p style="color: var(--white); font-size: 16px; margin-bottom: 16px;">
                      The receipt you just uploaded appears to be a duplicate of an existing expense in your database.
                    </p>
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                      <div style="color: var(--gray); font-size: 13px; margin-bottom: 4px;">VENDOR</div>
                      <div id="dup-modal-vendor" style="color: var(--white); font-size: 18px; font-weight: bold; margin-bottom: 12px;"></div>
                      
                      <div style="color: var(--gray); font-size: 13px; margin-bottom: 4px;">TOTAL AMOUNT</div>
                      <div id="dup-modal-total" style="color: #ef4444; font-size: 20px; font-weight: bold;"></div>
                    </div>
                    <p style="color: var(--gray); font-size: 14px; margin-bottom: 24px;">
                      To prevent double-counting your expenses, this upload has been securely deleted and no draft was created.
                    </p>
                    <button type="button" class="btn-primary" style="width: 100%; background: #ef4444; color: white;" onclick="document.getElementById('duplicate-warning-modal').style.display = 'none'">I Understand, Close</button>
                  </div>
                </div>
              </div>
`;

if (!html.includes('duplicate-warning-modal')) {
  html = html.replace('<!-- Review Section (Drafts) -->', dupModal + '\n              <!-- Review Section (Drafts) -->');
  fs.writeFileSync('admin.html', html, 'utf8');
  console.log('Injected duplicate warning modal');
} else {
  console.log('Already has duplicate modal');
}
