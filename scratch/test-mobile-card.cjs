const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'flex';
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Hide all views and show catering-view
    document.querySelectorAll('.crm-view').forEach(v => v.style.display = 'none');
    const catView = document.getElementById('catering-view');
    if (catView) catView.style.display = 'block';

    if (typeof window.switchCateringTab === 'function') window.switchCateringTab('quotes');
  });

  // Inject a mock quote if state is empty
  await page.evaluate(() => {
    const tbody = document.getElementById('catering-quotes-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td data-label="Quote #">
            <div class="crm-cell-value">
              <strong style="color: var(--accent-admin); font-family: monospace; font-size: 13px;">BA-Q-2610-02BA</strong>
              <small style="color: var(--text-muted); font-size: 11px;">10/30/2026</small>
            </div>
          </td>
          <td data-label="Customer">
            <div class="crm-cell-value">
              <strong style="color: var(--text-main); font-weight: 600;">Areema Hannah</strong>
              <small style="color: var(--text-muted); font-size: 12px;">3235856621</small>
            </div>
          </td>
          <td data-label="Event Date & Guests">
            <div class="crm-cell-value">
              <span style="font-weight: 600; color: var(--text-main);">2026-11-06</span>
              <small style="color: var(--text-muted); font-size: 12px;">20 guests</small>
            </div>
          </td>
          <td data-label="Total">
            <div class="crm-cell-value">
              <strong style="color: var(--text-main); font-weight: 700;">$509.90</strong>
            </div>
          </td>
          <td data-label="Deposit (30%)">
            <div class="crm-cell-value">
              <span style="color: #10b981; font-weight: 700;">$152.97</span>
              <small style="color: var(--text-muted); font-size: 11px;">(30%)</small>
            </div>
          </td>
          <td data-label="Status">
            <div class="crm-cell-value">
              <span class="status-badge" style="background: rgba(161, 161, 170, 0.15); color: rgb(161, 161, 170);">draft</span>
            </div>
          </td>
          <td data-label="Actions" class="crm-actions-cell">
            <div class="crm-actions-grid crm-actions-4">
              <button type="button" class="btn-outline btn-sm action-edit-quote">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-outline btn-sm action-copy-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span>Copy Link</span>
              </button>
              <button type="button" class="btn-outline btn-sm action-preview-quote">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Preview</span>
              </button>
              <button type="button" class="btn-outline btn-sm action-dup-quote">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Duplicate</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }
  });

  const layout = await page.evaluate(() => {
    const card = document.querySelector('#catering-quotes-table-body tr');
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const cardRect = card ? card.getBoundingClientRect() : null;
    const actionsRect = card ? card.querySelector('.crm-actions-cell').getBoundingClientRect() : null;
    const buttons = card ? Array.from(card.querySelectorAll('.crm-actions-grid button')).map(b => ({
      text: b.innerText.trim(),
      width: Math.round(b.getBoundingClientRect().width),
      height: Math.round(b.getBoundingClientRect().height)
    })) : [];

    return {
      docW,
      scrollW,
      hasOverflow: scrollW > docW,
      cardWidth: cardRect ? Math.round(cardRect.width) : 0,
      actionsWidth: actionsRect ? Math.round(actionsRect.width) : 0,
      buttons
    };
  });

  console.log('Mobile Card Layout Details:', JSON.stringify(layout, null, 2));

  await page.screenshot({ path: 'scratch/verified-mobile-card.png' });
  console.log('Screenshot saved to scratch/verified-mobile-card.png');

  await browser.close();
})();
