const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    window.switchAdminView('catering-view');
  });
  
  const rules = await page.evaluate(() => {
    const modal = document.getElementById('quote-editor-modal');
    modal.classList.add('open');
    
    // Find all matching CSS rules
    const matched = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (modal.matches(rule.selectorText)) {
            matched.push({
              selector: rule.selectorText,
              cssText: rule.cssText
            });
          }
        }
      } catch (e) {}
    }
    return matched;
  });
  
  console.log('Matched rules:', JSON.stringify(rules, null, 2));
  await browser.close();
})();
