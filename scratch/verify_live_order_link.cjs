const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    console.log('Navigating to live https://www.bigiawasaana.com/admin/orders.html ...');
    await page.goto('https://www.bigiawasaana.com/admin/orders.html', { waitUntil: 'networkidle2' });
    console.log('Final URL in browser:', page.url());

    const isLiveOrdersTargeted = await page.evaluate(() => {
      const activeNav = document.querySelector('.crm-nav-item.active');
      const liveOrdersView = document.getElementById('live-orders-view');
      return {
        activeNavTarget: activeNav ? activeNav.dataset.target : null,
        liveOrdersDisplay: liveOrdersView ? liveOrdersView.style.display : null,
        liveOrdersClasses: liveOrdersView ? liveOrdersView.className : null
      };
    });
    console.log('Live page state:', isLiveOrdersTargeted);
  } catch (e) {
    console.error('Puppeteer live test error:', e);
  } finally {
    await browser.close();
  }
})();
