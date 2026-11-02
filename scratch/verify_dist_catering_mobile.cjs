const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const viewports = [
    { name: 'iPhone SE (320px)', width: 320, height: 568 },
    { name: 'iPhone 13 (375px)', width: 375, height: 667 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 },
    { name: 'iPad Mini (768px)', width: 768, height: 1024 }
  ];

  console.log('=== AUDITING DIST/CATERING.HTML ===');
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/dist/catering.html', { waitUntil: 'domcontentloaded' });

    const audit = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const overflowingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1) {
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: Math.round(r.right),
            width: Math.round(r.width),
            docWidth: docW
          });
        }
      });
      return {
        clientWidth: docW,
        scrollWidth: scrollW,
        hasHorizontalOverflow: scrollW > docW,
        overflowCount: overflowingElements.length,
        sampleOverflows: overflowingElements.slice(0, 5)
      };
    });

    console.log(`[${vp.name}] Public Page: scrollW=${audit.scrollWidth}px vs clientW=${audit.clientWidth}px, overflow=${audit.hasHorizontalOverflow}`);
    if (audit.hasHorizontalOverflow) {
      console.log('  Overflow samples:', JSON.stringify(audit.sampleOverflows, null, 2));
    }
    await page.close();
  }

  console.log('\n=== AUDITING DIST/ADMIN.HTML CATERING SECTION ===');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/dist/admin.html', { waitUntil: 'domcontentloaded' });

    // Unhide dashboard and catering view
    await page.evaluate(() => {
      const login = document.getElementById('login-section');
      if (login) login.style.display = 'none';
      const dash = document.getElementById('dashboard-section');
      if (dash) dash.style.display = 'block';

      // Switch to catering view
      document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
      const cat = document.getElementById('catering-view');
      if (cat) {
        cat.style.display = 'block';
        cat.classList.add('active');
      }
    });

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
      await new Promise(r => setTimeout(r, 200));

      const tabAudit = await page.evaluate((tabName) => {
        const pane = document.getElementById(`cat-tab-${tabName}`);
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const overflows = [];
        if (pane) {
          pane.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > docW + 2) {
              overflows.push({
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
          docW,
          scrollW,
          hasOverflow: scrollW > docW,
          overflowCount: overflows.length,
          paneHeight: pane ? pane.offsetHeight : 0,
          sample: overflows.slice(0, 3)
        };
      }, t);

      console.log(`Admin Tab [${t}] on 375px: height=${tabAudit.paneHeight}px, scrollW=${tabAudit.scrollW}px vs docW=${tabAudit.docW}px, overflows=${tabAudit.overflowCount}`);
      if (tabAudit.overflowCount > 0) {
        console.log('  Overflow samples:', JSON.stringify(tabAudit.sample, null, 2));
      }
      await page.screenshot({ path: `scratch/dist_admin_mobile_${t}.png` });
    }
    await page.close();
  }

  await browser.close();
  console.log('=== DIST VERIFICATION COMPLETE ===');
})();
