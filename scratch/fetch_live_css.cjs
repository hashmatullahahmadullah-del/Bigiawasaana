const https = require('https');

https.get('https://www.bigiawasaana.com/index.html', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const css = data.match(/href="([^"]+\.css)"/g);
    console.log('CSS links in live index.html:', css);
  });
});
