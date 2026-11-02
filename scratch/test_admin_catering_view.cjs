const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    // Show catering view
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const cateringView = document.getElementById('view-catering');
    if (cateringView) cateringView.classList.add('active');

    if (window.switchCateringTab) {
      window.switchCateringTab('quotes');
    } else {
      document.querySelectorAll('#view-catering > div[id^="cat-tab-"]').forEach(d => d.style.display = 'none');
      document.getElementById('cat-tab-quotes').style.display = 'block';
    }

    // Populate quotes table with mock quotes matching screenshot 1
    const tbody = document.getElementById('cat-quotes-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td data-label="Quote #">
            <div class="crm-cell-value">
              <strong style="color: var(--accent-admin, #e11d48); font-family: monospace;">BA-Q-2610-03EC</strong>
              <small style="color: var(--text-muted); font-size: 11px;">10/30/2026</small>
            </div>
          </td>
          <td data-label="Client">
            <div class="crm-cell-value">
              <strong>reema Hannah</strong>
              <small style="color: var(--text-muted);">3235856621</small>
            </div>
          </td>
          <td data-label="Event Date">
            <div class="crm-cell-value">
              <strong>2026-11-06</strong>
              <small style="color: var(--text-muted);">05:00 PM</small>
            </div>
          </td>
          <td data-label="Guests">
            <div class="crm-cell-value">
              <strong>20</strong>
            </div>
          </td>
          <td data-label="Total">
            <div class="crm-cell-value">
              <strong style="font-size: 14px;">$509.90</strong>
            </div>
          </td>
          <td data-label="Deposit">
            <div class="crm-cell-value">
              <strong style="color: #10b981;">$152.97</strong>
              <small style="color: var(--text-muted);">(30%)</small>
            </div>
          </td>
          <td data-label="Status">
            <span class="quote-status-badge badge-viewed">VIEWED</span>
          </td>
          <td data-label="Actions">
            <div class="cat-actions-row">
              <button class="crm-btn crm-btn-secondary crm-btn-sm">COPY LINK</button>
              <button class="crm-btn crm-btn-secondary crm-btn-sm">PREVIEW</button>
              <button class="crm-btn crm-btn-secondary crm-btn-sm">DUPLICATE</button>
            </div>
          </td>
        </tr>
      `;
    }
  });

  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/quotes_tab_375_rendered.png', fullPage: true });

  const metrics = await page.evaluate(() => {
    const table = document.getElementById('cat-quotes-table');
    const container = table?.closest('.crm-table-container');
    const row = table?.querySelector('tr');
    const header = document.querySelector('.admin-top-bar') || document.querySelector('.admin-header');
    const tabsRow = document.querySelector('.catering-nav-tabs') || document.querySelector('#view-catering > div');
    
    // Check elements wider than 375
    const wideEls = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.offsetWidth > 375) {
        wideEls.push({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          offsetWidth: el.offsetWidth,
          scrollWidth: el.scrollWidth
        });
      }
    });

    return {
      windowWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      tableWidth: table?.offsetWidth,
      tableScrollWidth: table?.scrollWidth,
      containerWidth: container?.offsetWidth,
      containerScrollWidth: container?.scrollWidth,
      wideEls: wideEls.slice(0, 15)
    };
  });

  console.log('Metrics with Quotes Tab active at 375px:');
  console.log('docScrollWidth:', metrics.docScrollWidth);
  console.log('bodyScrollWidth:', metrics.bodyScrollWidth);
  console.log('Wide elements:', metrics.wideEls);

  await browser.close();
}

test().catch(console.error);
