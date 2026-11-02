const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');

// 1. Badge color for waivers tab
adminHtml = adminHtml.replace(
  'id="badge-cat-waivers" style="display: none; background: #FF4500;',
  'id="badge-cat-waivers" style="display: none; background: var(--accent-admin, #e11d48);'
);

// 2. ID for waivers stats row
adminHtml = adminHtml.replace(
  '<div class="crm-stats-grid" style="margin-top: 8px; margin-bottom: 24px;">\n              <div class="crm-stat-card" style="padding: 16px;">\n                <div class="stat-title">Total Agreements</div>',
  '<div id="cat-waivers-stats-row" class="crm-stats-grid" style="margin-top: 8px; margin-bottom: 24px;">\n              <div class="crm-stat-card" style="padding: 16px;">\n                <div class="stat-title">Total Agreements</div>'
);

// Also try CRLF version
adminHtml = adminHtml.replace(
  '<div class="crm-stats-grid" style="margin-top: 8px; margin-bottom: 24px;">\r\n              <div class="crm-stat-card" style="padding: 16px;">\r\n                <div class="stat-title">Total Agreements</div>',
  '<div id="cat-waivers-stats-row" class="crm-stats-grid" style="margin-top: 8px; margin-bottom: 24px;">\r\n              <div class="crm-stat-card" style="padding: 16px;">\r\n                <div class="stat-title">Total Agreements</div>'
);

// 3. Pipeline value color
adminHtml = adminHtml.replace(
  '<div class="stat-value" id="waivers-stat-value" style="color: var(--accent);">$0.00</div>',
  '<div class="stat-value" id="waivers-stat-value" style="color: var(--accent-admin, #e11d48);">$0.00</div>'
);

// 4. Quick waiver pricing card
adminHtml = adminHtml.replace(
  'style="background: rgba(255,69,0,0.06); padding: 16px; border-radius: 8px; border: 1.5px solid rgba(255,69,0,0.25); display: flex; flex-direction: column; gap: 12px;"',
  'style="background: var(--hover-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border-admin); display: flex; flex-direction: column; gap: 12px;"'
);

adminHtml = adminHtml.replace(
  'style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);"',
  'style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-admin); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-admin);"'
);

adminHtml = adminHtml.replace(
  'font-family: \'Barlow Condensed\', sans-serif;" id="qwm-deposit-display"',
  'font-family: \'Outfit\', sans-serif; font-weight: 700;" id="qwm-deposit-display"'
);

adminHtml = adminHtml.replace(
  '<div id="qwm-success-box" style="display: none; background: #000; border: 1px solid #10b981;',
  '<div id="qwm-success-box" style="display: none; background: var(--surface-admin); border: 1px solid var(--success, #10b981);'
);

adminHtml = adminHtml.replace(
  '<div class="crm-modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid var(--border-admin); flex-shrink: 0; background: rgba(0,0,0,0.2);"',
  '<div class="crm-modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid var(--border-admin); flex-shrink: 0; background: var(--surface-admin);"'
);

// 5. Signed proof modal surfaces
adminHtml = adminHtml.replace(
  /style="background:\s*rgba\(0,0,0,0\.2\);\s*padding:\s*12px;\s*border-radius:\s*6px;\s*border:\s*1px\s*solid\s*var\(--border-admin\);"/g,
  'style="background: var(--surface-admin); padding: 12px; border-radius: 6px; border: 1px solid var(--border-admin);"'
);

adminHtml = adminHtml.replace(
  'style="background: #000; border: 1px solid var(--border-admin); border-radius: 8px; padding: 16px; text-align: center;"',
  'style="background: #0f172a; border: 1px solid var(--border-admin); border-radius: 8px; padding: 16px; text-align: center;"'
);

adminHtml = adminHtml.replace(
  'style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-admin); border-radius: 6px; padding: 12px; font-size: 11px; color: var(--text-dim); line-height: 1.6;"',
  'style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 6px; padding: 12px; font-size: 11px; color: var(--text-dim); line-height: 1.6;"'
);

fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('✅ admin.html updated with matching admin theme tokens');
