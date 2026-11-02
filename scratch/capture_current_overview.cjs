const puppeteer = require('puppeteer');

async function captureOverview() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.querySelectorAll('.crm-view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const dashView = document.getElementById('dashboard-view');
    if (dashView) {
      dashView.classList.add('active');
      dashView.style.display = 'block';
    }
    document.body.classList.remove('light-mode');
  });

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/overview_current_dark_1280.png', fullPage: true });

  await page.evaluate(() => {
    document.body.classList.add('light-mode');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/overview_current_light_1280.png', fullPage: true });

  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    document.body.classList.remove('light-mode');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/overview_current_dark_375.png', fullPage: true });

  await browser.close();
  console.log('Current overview screenshots captured!');
}

captureOverview().catch(console.error);
