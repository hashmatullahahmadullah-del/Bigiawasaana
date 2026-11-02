const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Switch to Catering View and click Agreements & Waivers tab
  await page.evaluate(() => {
    // Show catering section
    const catView = document.getElementById('catering-view');
    if (catView) {
      document.querySelectorAll('.crm-view').forEach(v => v.style.display = 'none');
      catView.style.display = 'block';
    }
    // Switch to waivers tab
    if (typeof window.switchCateringTab === 'function') {
      window.switchCateringTab('waivers');
    }
  });

  await page.screenshot({ path: 'scratch/verified_admin_waivers_tab.png' });
  console.log('Saved scratch/verified_admin_waivers_tab.png');

  // Open Quick Phone Waiver Modal
  await page.evaluate(() => {
    if (typeof window.openQuickWaiverModal === 'function') {
      window.openQuickWaiverModal();
    }
  });

  await page.screenshot({ path: 'scratch/verified_admin_quick_waiver_modal.png' });
  console.log('Saved scratch/verified_admin_quick_waiver_modal.png');

  // Test Mobile Viewport for Admin Waivers (375x812)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.screenshot({ path: 'scratch/verified_admin_quick_waiver_modal_mobile.png' });
  console.log('Saved scratch/verified_admin_quick_waiver_modal_mobile.png');

  await browser.close();
})();
