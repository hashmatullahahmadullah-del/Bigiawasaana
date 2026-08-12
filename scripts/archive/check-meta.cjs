const https = require('https');
let data = '';
https.get('https://www.bigiawasaana.com', {
  headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const lines = data.match(/<(title|meta)[^>]*(og:|twitter:|name="description"|name="keywords"|name="robots"|name="google-site-verification"|rel="canonical")[^>]*>/gi);
    if (lines) lines.forEach(m => console.log(m));
    const title = data.match(/<title>(.*?)<\/title>/i);
    if (title) console.log('\nTITLE:', title[1]);
    // Check if og:image is present
    const ogImage = data.match(/og:image.*?content="([^"]+)"/i);
    if (ogImage) console.log('\nOG IMAGE:', ogImage[1]);
    // Check twitter image
    const twitterImg = data.match(/twitter:image.*?content="([^"]+)"/i);
    if (twitterImg) console.log('TWITTER IMAGE:', twitterImg[1]);
  });
}).on('error', e => console.error(e));
