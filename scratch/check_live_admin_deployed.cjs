const https = require('https');

https.get('https://www.bigiawasaana.com/admin', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Fetched admin length:', data.length);
    console.log('Has cat-tab-packages:', data.includes('cat-tab-packages'));
    console.log('Has btn-cat-packages:', data.includes('btn-cat-packages'));
    const scriptMatch = data.match(/src="[^"]+"/g);
    console.log('Scripts:', scriptMatch);
  });
});
