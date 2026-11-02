const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGEERROR] ${err.toString()}`));

  await page.goto('http://localhost:5099/admin', { waitUntil: 'networkidle2' });

  // Unhide dashboard and switch to catering-view
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    const dash = document.getElementById('dashboard-section');
    dash.style.display = 'block';
    dash.style.height = '100vh';

    const nav = document.querySelector('.crm-nav');
    if (nav) nav.classList.remove('open');
    const overlay = document.getElementById('crm-nav-overlay');
    if (overlay) overlay.style.display = 'none';

    if (typeof window.switchAdminView === 'function') {
      window.switchAdminView('catering-view');
    } else {
      document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
      const cat = document.getElementById('catering-view');
      if (cat) {
        cat.style.display = 'block';
        cat.classList.add('active');
      }
    }
  });

  await new Promise(r => setTimeout(r, 800));

  console.log('=== TESTING ADMIN CATERING TABS ON 375PX MOBILE ===');
  const tabs = ['inquiries', 'packages', 'quotes', 'bookings', 'catalog'];
  for (const t of tabs) {
    await page.evaluate((tabName) => {
      if (typeof window.switchCateringTab === 'function') {
        window.switchCateringTab(tabName);
      } else {
        const btn = document.getElementById(`btn-cat-${tabName}`);
        if (btn) btn.click();
      }
    }, t);
    await new Promise(r => setTimeout(r, 500));

    const audit = await page.evaluate((tabName) => {
      const pane = document.getElementById(`cat-tab-${tabName}`);
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const mainEl = document.querySelector('.crm-main');
      const mainScrollW = mainEl ? mainEl.scrollWidth : null;
      const mainClientW = mainEl ? mainEl.clientWidth : null;

      const overflowing = [];
      if (pane) {
        pane.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.right > docW + 1) {
            overflowing.push({
              tag: el.tagName,
              id: el.id,
              className: el.className,
              right: Math.round(r.right),
              width: Math.round(r.width)
            });
          }
        });
      }

      return {
        tab: tabName,
        paneVisible: pane ? window.getComputedStyle(pane).display !== 'none' : false,
        paneHeight: pane ? pane.offsetHeight : 0,
        docW,
        scrollW,
        hasDocOverflow: scrollW > docW,
        mainClientW,
        mainScrollW,
        hasMainOverflow: mainScrollW > mainClientW,
        overflowingCount: overflowing.length,
        sampleOverflows: overflowing.slice(0, 3)
      };
    }, t);

    console.log(`Tab [${t}]: height=${audit.paneHeight}px, docOverflow=${audit.hasDocOverflow} (${audit.scrollW}px vs ${audit.docW}px), mainOverflow=${audit.hasMainOverflow} (${audit.mainScrollW}px vs ${audit.mainClientW}px), overflows=${audit.overflowingCount}`);
    if (audit.overflowingCount > 0) {
      console.log('  Overflow samples:', JSON.stringify(audit.sampleOverflows, null, 2));
    }
    await page.screenshot({ path: `scratch/server_admin_mobile_${t}.png` });
  }

  await browser.close();
  console.log('=== LOCAL SERVER AUDIT COMPLETE ===');
  process.exit(0);
})();
