const fs = require('fs');

const adminHtmlPath = 'admin.html';
let content = fs.readFileSync(adminHtmlPath, 'utf8');

const startMarker = '<section id="dashboard-view" class="crm-view active">';
const endMarker = '</section>';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  throw new Error('Could not find startMarker in admin.html');
}

const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  throw new Error('Could not find endMarker in admin.html');
}

const newDashboardHtml = `<section id="dashboard-view" class="crm-view active">
          <!-- Overview Header with Operating Status -->
          <div class="overview-header-row" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px;">
            <div>
              <h1 class="crm-view-title" style="margin-bottom: 4px !important;">Operations Command Overview</h1>
              <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Real-time business pulse across restaurant orders, catering banquets, retail, and operations.</p>
            </div>
            <div class="overview-status-cluster" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div id="dash-trailer-status-badge" class="flat-status-badge" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981;">
                <span class="flat-status-dot open" style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                <span id="dash-trailer-status-text">Checking Operating Hours...</span>
              </div>
              <a href="https://maps.google.com/?q=18411+Victory+Blvd,+Reseda,+CA+91335" target="_blank" rel="noopener" class="flat-location-link" title="Open in Google Maps" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface-admin); border: 1px solid var(--border-admin); text-decoration: none;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>Reseda, CA</span>
              </a>
            </div>
          </div>

          <!-- 1. Today's Executive Pulse (Flat 4-Card Grid) -->
          <div class="flat-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px;">
            <div class="flat-metric-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px;">
              <div class="flat-metric-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="flat-metric-label" style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--text-muted);">Today's Net Revenue</span>
                <span class="flat-icon-badge flat-badge-emerald" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(16,185,129,0.12); color: #10b981; display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </span>
              </div>
              <div class="flat-metric-val" id="today-revenue" style="font-size: 26px; font-weight: 800; color: #10b981; font-family: 'Outfit', sans-serif;">$0.00</div>
              <div class="flat-metric-subtext" id="today-revenue-subtext" style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Net receipts after refunds</div>
            </div>

            <div class="flat-metric-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px;">
              <div class="flat-metric-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="flat-metric-label" style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--text-muted);">Orders Processed</span>
                <span class="flat-icon-badge flat-badge-blue" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(59,130,246,0.12); color: #3b82f6; display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                </span>
              </div>
              <div class="flat-metric-val" id="today-orders" style="font-size: 26px; font-weight: 800; color: var(--text-main); font-family: 'Outfit', sans-serif;">0</div>
              <div class="flat-metric-subtext" style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Restaurant &amp; online orders</div>
            </div>

            <div class="flat-metric-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px;">
              <div class="flat-metric-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="flat-metric-label" style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--text-muted);">Items Prepared</span>
                <span class="flat-icon-badge flat-badge-rose" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(225,29,72,0.12); color: var(--accent-admin, #e11d48); display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                </span>
              </div>
              <div class="flat-metric-val" id="today-items-sold" style="font-size: 26px; font-weight: 800; color: var(--text-main); font-family: 'Outfit', sans-serif;">0</div>
              <div class="flat-metric-subtext" style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Platters, party trays &amp; skewers</div>
            </div>

            <div class="flat-metric-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px;">
              <div class="flat-metric-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="flat-metric-label" style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--text-muted);">Live Kitchen Queue</span>
                <span class="flat-icon-badge flat-badge-amber" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(245,158,11,0.12); color: #f59e0b; display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </span>
              </div>
              <div class="flat-metric-val" id="today-pending" style="font-size: 26px; font-weight: 800; color: #f59e0b; font-family: 'Outfit', sans-serif;">0</div>
              <div class="flat-metric-subtext" style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Orders awaiting kitchen prep</div>
            </div>
          </div>

          <!-- 2. Executive Quick Action Command Hub (Flat Interactive Grid) -->
          <div class="flat-action-hub" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 24px;">
            <button type="button" class="flat-action-tile" onclick="window.openCreateQuoteModal()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: #3b82f6; flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Create Quote</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Custom catering</div>
              </div>
            </button>

            <button type="button" class="flat-action-tile" onclick="window.openQuickWaiverModal()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: var(--accent-admin, #e11d48); flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Phone Waiver</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">E-sign agreement</div>
              </div>
            </button>

            <button type="button" class="flat-action-tile" onclick="document.querySelector('[data-target=\\'live-orders-view\\']').click()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: #f59e0b; flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Kitchen KDS</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Live prep queue</div>
              </div>
            </button>

            <button type="button" class="flat-action-tile" onclick="document.querySelector('[data-target=\\'shipping-manage-view\\']').click()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: #10b981; flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Retail Shipments</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Pack &amp; print labels</div>
              </div>
            </button>

            <button type="button" class="flat-action-tile" onclick="document.querySelector('[data-target=\\'expense-view\\']').click()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: #8b5cf6; flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"></path><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="13" y2="15"></line></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Upload Receipt</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Log expenses</div>
              </div>
            </button>

            <button type="button" class="flat-action-tile" onclick="document.querySelector('[data-target=\\'customers-view\\']').click()" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
              <span class="flat-tile-icon" style="color: #06b6d4; flex-shrink: 0; display: flex;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </span>
              <div class="flat-tile-text" style="min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Customer CRM</div>
                <div style="font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Guest profiles</div>
              </div>
            </button>
          </div>

          <div id="food-cost-alert-container" style="margin-bottom: 20px; display: none;"></div>

          <!-- 3. Cross-Department Pulse Grid (4 Flat Department Cards) -->
          <div class="flat-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
            <!-- Department 1: Catering & Banquets -->
            <div class="flat-dept-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flat-dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="flat-dept-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; display: inline-block;"></span>
                    <span class="flat-dept-title" style="font-size: 13px; font-weight: 700; color: var(--text-main);">Catering &amp; Events</span>
                  </div>
                  <span class="flat-pill-tag tag-blue" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25);">Pipeline</span>
                </div>
                <div class="flat-dept-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Inquiries</div>
                    <strong id="dash-cat-inquiries" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Quotes Sent</div>
                    <strong id="dash-cat-quotes" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Waivers</div>
                    <strong id="dash-cat-waivers" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Pipeline $</div>
                    <strong id="dash-cat-pipeline" style="font-size: 16px; font-weight: 800; color: #3b82f6;">$0.00</strong>
                  </div>
                </div>
              </div>
              <button type="button" class="flat-dept-action" onclick="document.querySelector('[data-target=\\'catering-view\\']').click()" style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; background: var(--hover-bg); border: 1px solid var(--border-admin); border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.15s ease;">
                <span>Manage Catering</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <!-- Department 2: Retail & Operations -->
            <div class="flat-dept-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flat-dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="flat-dept-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                    <span class="flat-dept-title" style="font-size: 13px; font-weight: 700; color: var(--text-main);">Retail &amp; Shipping</span>
                  </div>
                  <span class="flat-pill-tag tag-emerald" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25);">Fulfillment</span>
                </div>
                <div class="flat-dept-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">To Ship</div>
                    <strong id="dash-pending-shipments" style="font-size: 16px; font-weight: 700; color: #f59e0b;">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Retail Sales</div>
                    <strong id="dash-retail-sales" style="font-size: 16px; font-weight: 700; color: var(--text-main);">$0.00</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Pickups</div>
                    <strong id="dash-pickup-orders" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Standard</div>
                    <strong style="font-size: 12px; font-weight: 700; color: #10b981;">Zabiha Halal</strong>
                  </div>
                </div>
              </div>
              <button type="button" class="flat-dept-action" onclick="document.querySelector('[data-target=\\'shipping-manage-view\\']').click()" style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; background: var(--hover-bg); border: 1px solid var(--border-admin); border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.15s ease;">
                <span>Manage Shipments</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <!-- Department 3: Reviews & Loyalty -->
            <div class="flat-dept-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flat-dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="flat-dept-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
                    <span class="flat-dept-title" style="font-size: 13px; font-weight: 700; color: var(--text-main);">Reviews &amp; CRM</span>
                  </div>
                  <span class="flat-pill-tag tag-amber" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25);">Sentiment</span>
                </div>
                <div class="flat-dept-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Rating</div>
                    <strong id="dash-avg-rating" style="font-size: 16px; font-weight: 700; color: #f59e0b;">5.0 ★</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Reviews</div>
                    <strong id="dash-review-count" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">VIP Members</div>
                    <strong id="dash-loyalty-members" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Repeat Rate</div>
                    <strong id="dash-repeat-rate" style="font-size: 16px; font-weight: 800; color: #10b981;">0%</strong>
                  </div>
                </div>
              </div>
              <button type="button" class="flat-dept-action" onclick="document.querySelector('[data-target=\\'customers-view\\']').click()" style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; background: var(--hover-bg); border: 1px solid var(--border-admin); border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.15s ease;">
                <span>View CRM &amp; Loyalty</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <!-- Department 4: Economics & Volume -->
            <div class="flat-dept-card" style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flat-dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="flat-dept-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-admin, #e11d48); display: inline-block;"></span>
                    <span class="flat-dept-title" style="font-size: 13px; font-weight: 700; color: var(--text-main);">Economics &amp; Base</span>
                  </div>
                  <span class="flat-pill-tag tag-rose" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(225,29,72,0.12); color: var(--accent-admin, #e11d48); border: 1px solid rgba(225,29,72,0.25);">Financials</span>
                </div>
                <div class="flat-dept-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">30D Volume</div>
                    <strong id="dash-total-revenue" style="font-size: 16px; font-weight: 700; color: var(--text-main);">$0.00</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Avg Ticket</div>
                    <strong id="dash-aov" style="font-size: 16px; font-weight: 700; color: var(--text-main);">$0.00</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Total Guests</div>
                    <strong id="dash-total-customers" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                  <div class="flat-dept-stat-item">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Total Orders</div>
                    <strong id="dash-total-orders" style="font-size: 16px; font-weight: 700; color: var(--text-main);">0</strong>
                  </div>
                </div>
              </div>
              <button type="button" class="flat-dept-action" onclick="document.querySelector('[data-target=\\'economics-view\\']').click()" style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; background: var(--hover-bg); border: 1px solid var(--border-admin); border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.15s ease;">
                <span>View Economics</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <!-- 4. Analytical Charts & Feed (Flat Theme-Aware) -->
          <div class="crm-dashboard-grid mt-m" style="margin-bottom: 24px;">
            <div class="crm-panel" style="grid-column: 1 / -1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h2 class="crm-panel-title" style="margin: 0 0 2px 0;">30-Day Revenue Trend</h2>
                  <small style="color: var(--text-muted); font-size: 12px;">Daily sales receipts across restaurant &amp; online orders</small>
                </div>
              </div>
              <div class="chart-wrapper" style="position: relative; height: 260px; width: 100%;">
                <canvas id="revenueChart"></canvas>
              </div>
            </div>

            <div class="crm-panel">
              <h2 class="crm-panel-title" style="margin-bottom: 12px;">Top Selling Afghan Specialties</h2>
              <div class="chart-wrapper" style="position: relative; height: 200px; width: 100%; margin-bottom: 16px;">
                <canvas id="topItemsChart"></canvas>
              </div>
              <div id="dash-top-items" class="crm-list"></div>
            </div>

            <div class="crm-panel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h2 class="crm-panel-title" style="margin: 0;">Live Operations Feed</h2>
                <span style="font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.12); padding: 2px 8px; border-radius: 99px;">Real-Time</span>
              </div>
              <div id="dash-activity-feed" class="crm-feed"></div>
            </div>

            <div class="crm-panel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h2 class="crm-panel-title" style="margin: 0;">Top VIP Guests</h2>
                <span style="font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245,158,11,0.12); padding: 2px 8px; border-radius: 99px;">Loyalty</span>
              </div>
              <div id="dash-top-spenders" class="crm-list"></div>
            </div>
          </div>
        </section>`;

const updatedContent = content.slice(0, startIndex) + newDashboardHtml + content.slice(endIndex + endMarker.length);
fs.writeFileSync(adminHtmlPath, updatedContent, 'utf8');
console.log('Successfully applied Flat UI Master Command Center to admin.html!');
