const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2' });

  // Get all category pills
  const pills = await page.$$eval('.category-pill', els => els.map(e => e.textContent.trim()));
  console.log('Available Category Pills:', pills);

  // Test clicking each category
  for (const pillText of pills) {
    await page.evaluate((text) => {
      const btn = Array.from(document.querySelectorAll('.category-pill')).find(b => b.textContent.trim() === text);
      if (btn) btn.click();
    }, pillText);

    // Give it 100ms
    await new Promise(r => setTimeout(r, 200));

    const renderedItems = await page.$$eval('.menu-card-title', els => els.map(e => e.textContent.trim()));
    const duplicates = renderedItems.filter((item, index) => renderedItems.indexOf(item) !== index);

    console.log(`Pill "${pillText}": ${renderedItems.length} items rendered. Duplicates: ${duplicates.length ? duplicates.join(', ') : 'NONE'}`);
  }

  await browser.close();
}

test().catch(console.error);
