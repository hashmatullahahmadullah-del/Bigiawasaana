import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push('Page error: ' + err.message);
  });

  console.log('Navigating to live production...');
  await page.goto('https://www.bigiawasaana.com/admin.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Errors caught on load:', errors);

  // Take screenshot of whatever is currently on screen
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/fe25b750-ebf4-49b5-a31d-e91e3923b4a6/live_check_1_initial.png' });

  // If there's login, bypass or inspect
  const isLoginVisible = await page.evaluate(() => {
    const login = document.getElementById('login-section');
    return login && getComputedStyle(login).display !== 'none';
  });
  console.log('Is login section visible:', isLoginVisible);

  // Bypass login locally in DOM to inspect Menu Manager and TV Layout exactly as the logged-in user sees it
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
  });

  // Click on Menu Manager nav item
  await page.evaluate(() => {
    const btn = document.querySelector('.crm-nav-item[data-target="menu-manage-view"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/fe25b750-ebf4-49b5-a31d-e91e3923b4a6/live_check_2_menu_top.png' });

  // Scroll down Menu Manager
  await page.evaluate(() => {
    const main = document.querySelector('.crm-main');
    if (main) main.scrollTop = 700;
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/fe25b750-ebf4-49b5-a31d-e91e3923b4a6/live_check_3_menu_items.png' });

  // Click on TV Layout nav item
  await page.evaluate(() => {
    const btn = document.querySelector('.crm-nav-item[data-target="tv-layout-view"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/fe25b750-ebf4-49b5-a31d-e91e3923b4a6/live_check_4_tv_top.png' });

  // Scroll down TV Layout
  await page.evaluate(() => {
    const main = document.querySelector('.crm-main');
    if (main) main.scrollTop = 900;
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/fe25b750-ebf4-49b5-a31d-e91e3923b4a6/live_check_5_tv_columns.png' });

  console.log('Errors caught after navigating:', errors);
  await browser.close();
})();
