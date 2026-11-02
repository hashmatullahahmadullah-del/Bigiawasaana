const https = require('https');

https.get('https://www.bigiawasaana.com/', res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers.location);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Length:', data.length);
    const css = data.match(/href="([^"]+\.css[^"]*)"/g);
    console.log('CSS links:', css);
    const head = data.substring(0, 1500);
    console.log('Head snippet:', head);
  });
});
