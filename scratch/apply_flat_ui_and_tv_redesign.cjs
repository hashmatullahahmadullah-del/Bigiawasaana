const fs = require('fs');

// 1. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

// A. Fix TV Mobile Tabs in admin.html (remove childish colored dots)
adminHtml = adminHtml.replace(
  /<div class="tv-mobile-tab-bar">[\s\S]*?<\/div>\s*<!-- Quick Search/m,
  `<div class="tv-mobile-tab-bar">
            <button type="button" class="tv-mobile-tab active" data-tab="tv-col-screen1" id="tv-tab-btn-1">
              <span class="tv-tab-text">TV 1 (Left Screen)</span>
              <span class="tv-tab-badge" id="tv-tab-badge-1">0</span>
            </button>
            <button type="button" class="tv-mobile-tab" data-tab="tv-col-screen2" id="tv-tab-btn-2">
              <span class="tv-tab-text">TV 2 (Right Screen)</span>
              <span class="tv-tab-badge" id="tv-tab-badge-2">0</span>
            </button>
            <button type="button" class="tv-mobile-tab" data-tab="tv-col-unassigned" id="tv-tab-btn-u">
              <span class="tv-tab-text">Hidden Dishes</span>
              <span class="tv-tab-badge" id="tv-tab-badge-u">0</span>
            </button>
          </div>

          <!-- Quick Search`
);

// B. Redesign TV Theme picker in admin.html (clean, flat, mature)
adminHtml = adminHtml.replace(
  /<div style="display: grid; grid-template-columns: repeat\(2, 1fr\); gap: 10px;" id="tv-theme-picker">[\s\S]*?<\/div>\s*<\/div>\s*<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<label style="display: block; font-size: 11px; text-transform: uppercase;/m,
  `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;" id="tv-theme-picker">
                      <label class="tv-theme-option" data-theme="flame" style="border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: #18181b;">
                        <input type="radio" name="tv-theme" value="flame" checked style="accent-color: #ff5722;">
                        <div>
                          <div style="font-weight: 600; font-size: 13px; color: #ffffff;">Signature Afghan</div>
                          <div style="font-size: 11px; color: #a1a1aa;">Charcoal & Warm Amber</div>
                        </div>
                      </label>

                      <label class="tv-theme-option" data-theme="midnight" style="border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: #18181b;">
                        <input type="radio" name="tv-theme" value="midnight" style="accent-color: #ff5722;">
                        <div>
                          <div style="font-weight: 600; font-size: 13px; color: #ffffff;">Obsidian Minimal</div>
                          <div style="font-size: 11px; color: #a1a1aa;">Deep Carbon & Gold</div>
                        </div>
                      </label>

                      <label class="tv-theme-option" data-theme="charcoal" style="border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: #18181b;">
                        <input type="radio" name="tv-theme" value="charcoal" style="accent-color: #ff5722;">
                        <div>
                          <div style="font-weight: 600; font-size: 13px; color: #ffffff;">Platinum Slate</div>
                          <div style="font-size: 11px; color: #a1a1aa;">Monochrome Modern</div>
                        </div>
                      </label>

                      <label class="tv-theme-option" data-theme="neon" style="border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: #18181b;">
                        <input type="radio" name="tv-theme" value="neon" style="accent-color: #ff5722;">
                        <div>
                          <div style="font-weight: 600; font-size: 13px; color: #ffffff;">Silk Road Warm</div>
                          <div style="font-size: 11px; color: #a1a1aa;">Ember & Copper</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label style="display: block; font-size: 11px; text-transform: uppercase;`
);

// C. Fix Marketing & Promotion form rows: replace rigid inline grid with responsive classes
adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var\(--gray\); text-transform: uppercase; display: block; margin-bottom: 4px;">Start Date & Time/g,
  `<div class="mkt-form-row-2col">
                      <div>
                        <label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 4px;">Start Date & Time`
);

adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var\(--gray\); text-transform: uppercase; display: block; margin-bottom: 4px;">Usage Limit Per Order/g,
  `<div class="mkt-form-row-2col">
                      <div>
                        <label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 4px;">Usage Limit Per Order`
);

adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center;">\s*<label style="display: flex; align-items: center; gap: 8px; color: var\(--white\); font-size: 14px; user-select: none; cursor: pointer;">\s*<input type="checkbox" id="deal-cond-order"/g,
  `<div class="mkt-form-row-2col" style="align-items: center;">
                      <label style="display: flex; align-items: center; gap: 8px; color: var(--white); font-size: 14px; user-select: none; cursor: pointer;">
                        <input type="checkbox" id="deal-cond-order"`
);

// D. Fix Condition Grid in Marketing so Required Menu Items and Required Categories stack vertically on mobile
adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">\s*<label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var\(--gray\); text-transform: uppercase;">Required Menu Items<\/label>/g,
  `<div class="mkt-conditions-grid">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                          <label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase;">Required Menu Items</label>`
);

adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var\(--gray\); text-transform: uppercase; display: block; margin-bottom: 4px;">Discount Type<\/label>/g,
  `<div class="mkt-form-row-2col">
                      <div>
                        <label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 4px;">Discount Type</label>`
);

adminHtml = adminHtml.replace(
  /<div class="crm-grid-col-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\s*<div>\s*<label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var\(--gray\); text-transform: uppercase; display: block; margin-bottom: 4px;">Reward\/Free Items/g,
  `<div class="mkt-form-row-2col">
                      <div>
                        <label style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 4px;">Reward/Free Items`
);

// E. Fix Sign Out button icon and markup in admin.html
adminHtml = adminHtml.replace(
  /<button type="button" id="logout-btn" class="crm-logout-btn" style="display: none;">[\s\S]*?<\/button>/m,
  `<button type="button" id="logout-btn" class="crm-logout-btn" style="display: none;">
            <svg class="ui-icon ui-icon-no-margin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sign Out</span>
          </button>`
);

fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('Successfully updated admin.html!');
