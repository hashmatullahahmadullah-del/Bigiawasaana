const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to https://www.bigiawasaana.com/menu ...');
  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2', timeout: 30000 });

  const html = await page.content();
  console.log('Page HTML length:', html.length);
  const cardCount = await page.$$eval('.menu-card', cards => cards.length);
  console.log('Client-rendered .menu-card count:', cardCount);

  // Check if #menu-grid has children
  const gridChildren = await page.$eval('#menu-grid', el => el.children.length);
  console.log('#menu-grid children count:', gridChildren);

  await browser.close();
}

test().catch(console.error);
