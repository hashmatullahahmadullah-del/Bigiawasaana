const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu?addItem=BNoJY3IGYgUxeLkdrMna', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const result = await page.evaluate(() => {
    const modal = document.getElementById('item-details-modal');
    const modalDisplay = modal ? modal.style.display : null;
    const cartItems = window.cart || [];
    return { modalDisplay, cartLength: cartItems.length, cartItems };
  });

  console.log("Evaluation result:", result);
  await browser.close();
})();
