const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 260, height: 700 });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    if (typeof window.switchAdminView === 'function') {
      window.switchAdminView('catering-view');
    } else {
      document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
      const cat = document.getElementById('catering-view');
      if (cat) cat.classList.add('active');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const info = await page.evaluate(() => {
    const main = document.querySelector('.crm-main');
    const cat = document.getElementById('catering-view');
    const hdr = document.querySelector('.mobile-only-header');
    const subnav = document.querySelector('.crm-subnav');
    return {
      windowWidth: window.innerWidth,
      bodyWidth: document.body.scrollWidth,
      mainPadding: window.getComputedStyle(main).padding,
      catDisplay: window.getComputedStyle(cat).display,
      catWidth: cat.scrollWidth,
      catClientWidth: cat.clientWidth,
      subnavScrollWidth: subnav ? subnav.scrollWidth : 0,
      subnavClientWidth: subnav ? subnav.clientWidth : 0
    };
  });
  console.log(info);
  await page.screenshot({ path: 'scratch/narrow_260_authenticated_catering_light.png' });
  await browser.close();
})();
