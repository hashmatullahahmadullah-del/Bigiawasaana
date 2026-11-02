const puppeteer = require('puppeteer');

async function runQa() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: '375_mobile', width: 375, height: 812 },
    { name: '412_pixel', width: 412, height: 915 },
    { name: '1280_desktop', width: 1280, height: 800 }
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 768 });

    // 1. Test Admin Catering Quotes Tab (Dark Mode)
    await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-section').style.display = 'block';
      document.querySelectorAll('.crm-view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
      });
      const catView = document.getElementById('catering-view') || document.getElementById('view-catering');
      if (catView) {
        catView.classList.add('active');
        catView.style.display = 'block';
      }
      if (window.switchCateringTab) window.switchCateringTab('quotes');
      document.body.classList.remove('light-mode');
    });
    await new Promise(r => setTimeout(r, 600));

    // Check overflow
    const overflowReportDark = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth
    }));
    console.log(`Admin Dark Quotes (${vp.name}) scrollWidth: ${overflowReportDark.scrollWidth} / inner: ${overflowReportDark.innerWidth}`);
    await page.screenshot({ path: `scratch/qa_admin_quotes_dark_${vp.name}.png` });

    // 2. Test Admin Catering Quick Waiver Modal in Light Mode
    await page.evaluate(() => {
      document.body.classList.add('light-mode');
      if (window.openQuickWaiverModal) window.openQuickWaiverModal();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: `scratch/qa_admin_waiver_modal_light_${vp.name}.png` });

    // Close modal
    await page.evaluate(() => {
      if (window.closeQuickWaiverModal) window.closeQuickWaiverModal();
    });

    // 3. Test Customer Quote Page
    await page.goto('http://localhost:4173/quote.html?q=BA-Q-2610-TEST&token=test', { waitUntil: 'networkidle2' });
    const quoteOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth
    }));
    console.log(`Quote Portal (${vp.name}) scrollWidth: ${quoteOverflow.scrollWidth} / inner: ${quoteOverflow.innerWidth}`);
    await page.screenshot({ path: `scratch/qa_quote_portal_${vp.name}.png` });

    // 4. Test Customer Waiver Page
    await page.goto('http://localhost:4173/waiver.html?w=BA-W-2610-TEST&token=test', { waitUntil: 'networkidle2' });
    const waiverOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth
    }));
    console.log(`Waiver Portal (${vp.name}) scrollWidth: ${waiverOverflow.scrollWidth} / inner: ${waiverOverflow.innerWidth}`);
    await page.screenshot({ path: `scratch/qa_waiver_portal_${vp.name}.png` });

    await page.close();
  }

  await browser.close();
  console.log('\nAll Multi-Viewport QA tests completed!');
}

runQa().catch(console.error);
