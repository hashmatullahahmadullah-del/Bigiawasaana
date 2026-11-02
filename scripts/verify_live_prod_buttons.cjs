const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to live production site: https://www.bigiawasaana.com/admin...');
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });

  // Inspect live admin buttons
  const liveAdminCheck = await page.evaluate(() => {
    // Check buttons inside login or visible area
    const buttons = Array.from(document.querySelectorAll('button'));
    const duplicatePlus = buttons.filter(b => /\+\s*\+/.test(b.textContent));
    const btnPrimary = document.querySelector('.btn-primary');

    return {
      totalButtons: buttons.length,
      duplicatePlusCount: duplicatePlus.length,
      btnPrimaryOverflow: btnPrimary ? window.getComputedStyle(btnPrimary).overflow : null,
      btnPrimaryPosition: btnPrimary ? window.getComputedStyle(btnPrimary).position : null
    };
  });

  console.log('Live Production Admin Check:');
  console.log(JSON.stringify(liveAdminCheck, null, 2));

  // Check live catering page
  console.log('\nNavigating to live catering page: https://www.bigiawasaana.com/catering...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('https://www.bigiawasaana.com/catering', { waitUntil: 'networkidle2' });

  const liveCateringCheck = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const builderBtn = document.getElementById('btn-start-builder');

    return {
      docWidth,
      scrollWidth,
      hasHorizontalOverflow: scrollWidth > docWidth,
      builderBtnText: builderBtn ? builderBtn.textContent.trim() : null,
      builderBtnDisplay: builderBtn ? window.getComputedStyle(builderBtn).display : null
    };
  });

  console.log('Live Production Catering Check (375px):');
  console.log(JSON.stringify(liveCateringCheck, null, 2));

  await browser.close();
  console.log('\n✅ Live Production Smoke Test Complete!');
})();
