const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  for (const pageName of ['tv1.html', 'tv2.html']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 }); // Standard 1080p TV resolution

    const errors = [];
    const broken = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('response', res => { if (res.status() >= 400) broken.push(`${res.status()} ${res.url()}`); });

    await page.goto(`https://bigi-awasaana-7b3ce.web.app/${pageName}`, { waitUntil: 'networkidle2' });

    console.log(`\n=== ${pageName} ===`);
    console.log("Broken resources:", broken);
    console.log("Console errors:", errors);

    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const winHeight = await page.evaluate(() => window.innerHeight);
    console.log(`Document scroll height: ${docHeight}px vs Window height: ${winHeight}px`);

    await page.close();
  }

  await browser.close();
})();
