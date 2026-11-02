const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`[PAGE ERROR] ${err.toString()}`);
    });

    console.log('Opening https://www.bigiawasaana.com/admin ...');
    await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2', timeout: 30000 });

    // In case auth form is visible, let's see if dashboard-section is displayed
    const isLoginVisible = await page.evaluate(() => {
      const loginSec = document.getElementById('login-section');
      return loginSec ? window.getComputedStyle(loginSec).display !== 'none' : false;
    });

    console.log('Login form visible:', isLoginVisible);

    // Let's force show dashboard-section to test all views and their JavaScript triggers
    await page.evaluate(() => {
      const loginSec = document.getElementById('login-section');
      const dashSec = document.getElementById('dashboard-section');
      if (loginSec) loginSec.style.display = 'none';
      if (dashSec) dashSec.style.display = 'block';
    });

    const navTargets = [
      'dashboard-view',     'live-orders-view',
      'menu-manage-view',   'tv-layout-view',
      'retail-manage-view', 'shipping-manage-view',
      'inventory-view',     'customers-view',
      'orders-view',        'reviews-view',
      'loyalty-view',       'catering-view',
      'marketing-view',     'pickup-view',
      'economics-view',     'analytics-view',
      'expense-view',       'blog-management',
      'settings-view'
    ];

    for (const target of navTargets) {
      console.log(`Clicking tab: ${target}...`);
      await page.evaluate((targetId) => {
        if (typeof window.switchAdminView === 'function') {
          window.switchAdminView(targetId);
        } else {
          const btn = document.querySelector(`.crm-nav-item[data-target="${targetId}"]`);
          if (btn) btn.click();
        }
      }, target);

      // Wait a moment for any render functions or chart calls
      await new Promise(r => setTimeout(r, 400));
    }

    // Check if #global-error ever became visible
    const globalError = await page.evaluate(() => {
      const el = document.getElementById('global-error');
      const textEl = document.getElementById('global-error-text');
      return {
        display: el ? window.getComputedStyle(el).display : 'none',
        text: textEl ? textEl.textContent.trim() : ''
      };
    });

    console.log('\n=== FINAL RESULTS ===');
    console.log('Global Error element:', globalError);
    console.log('Total console/page errors:', errors.length);
    if (errors.length > 0) {
      console.log('Logged errors:');
      errors.forEach(e => console.log('  ' + e));
    } else {
      console.log('ALL TABS SWITCHED AND RENDERED WITH ZERO ERRORS!');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
