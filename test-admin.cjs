const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Server listening on port ${port}`);

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto(`http://localhost:${port}/admin.html`);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("Done waiting.");
  await browser.close();
  server.close();
  process.exit(0);
});
