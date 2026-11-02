const https = require('https');

https.get('https://www.bigiawasaana.com/admin', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const scripts = data.match(/<script[^>]*src="([^"]+)"/g);
    console.log('Scripts on live /admin:', scripts);
    console.log('Contains cat-tab-packages:', data.includes('cat-tab-packages'));
    console.log('Contains btn-cat-packages:', data.includes('btn-cat-packages'));
    console.log('Contains switchCateringTab:', data.includes('switchCateringTab'));
  });
});
