const https = require('https');
https.get('https://www.bigiawasaana.com/blog/what-is-bolani-afghan-street-food', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const match = data.match(/<img[^>]*src=[\"']([^\"']*)[\"'][^>]*alt=[\"']Bigi Awasaana Logo[\"']/i);
    console.log(match ? match[1] : 'No logo found on blog');
  });
});
