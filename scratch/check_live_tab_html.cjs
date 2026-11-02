const https = require('https');
https.get('https://www.bigiawasaana.com/admin', res => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const idx = html.indexOf('id="cat-tab-packages"');
    console.log('Index of cat-tab-packages:', idx);
    if (idx !== -1) {
      console.log(html.substring(idx - 100, idx + 400));
    }
  });
});
