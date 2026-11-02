const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/admin.html', { waitUntil: 'networkidle2' });

  // Make dashboard-section visible and catering-view active
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    
    // Switch to catering view
    if (typeof window.switchAdminView === 'function') {
      window.switchAdminView('catering-view');
    } else {
      document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
      const catView = document.getElementById('catering-view');
      if (catView) {
        catView.style.display = 'block';
        catView.classList.add('active');
      }
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const pageOverflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const bodyScrollW = document.body.scrollWidth;
    const mainEl = document.querySelector('.crm-main');
    const mainScrollW = mainEl ? mainEl.scrollWidth : null;
    const mainClientW = mainEl ? mainEl.clientWidth : null;

    // Check which child of .crm-main or #catering-view exceeds mainClientW
    const culprits = [];
    if (mainEl) {
      mainEl.querySelectorAll('*').forEach(el => {
        // If element width or right relative to mainEl exceeds clientWidth
        if (el.scrollWidth > mainClientW + 2 || el.offsetWidth > mainClientW + 2) {
          // If it's an intended overflow-x scroll container like .crm-subnav or .crm-table-container, note it
          const style = window.getComputedStyle(el);
          culprits.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            scrollWidth: el.scrollWidth,
            offsetWidth: el.offsetWidth,
            overflowX: style.overflowX,
            mainClientW
          });
        }
      });
    }

    return {
      docW,
      scrollW,
      bodyScrollW,
      hasDocOverflow: scrollW > docW,
      mainClientW,
      mainScrollW,
      hasMainOverflow: mainScrollW > mainClientW,
      culprits: culprits.slice(0, 10)
    };
  });

  console.log('Admin Mobile Page Overflow:', JSON.stringify(pageOverflow, null, 2));

  await browser.close();
})();
