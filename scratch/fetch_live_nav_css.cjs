const https = require('https');

https.get('https://www.bigiawasaana.com/assets/mobile-nav-U5gWWi1e.css', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('mobile-nav css first 300 chars:');
    console.log(data.substring(0, 300));
  });
});
