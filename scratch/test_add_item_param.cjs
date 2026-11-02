const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu?addItem=2YsE0bWoYyJyrMvHQZ5v', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const display = await page.evaluate(() => {
    const modal = document.getElementById('item-details-modal');
    return modal ? modal.style.display : null;
  });

  console.log("Modal display style:", display);
  await browser.close();
})();
