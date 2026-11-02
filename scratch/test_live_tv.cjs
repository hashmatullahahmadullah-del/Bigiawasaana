const https = require('https');

function check(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('URL:', url);
        console.log('Status:', res.statusCode);
        console.log('Title:', (data.match(/<title>(.*?)<\/title>/) || [])[1]);
        console.log('Contains menu-container:', data.includes('menu-container'));
        console.log('Contains old menu-img:', data.includes('id="menu-img"'));
        console.log('-------------------------------------------');
        resolve();
      });
    });
  });
}

async function run() {
  await check('https://www.bigiawasaana.com/tv1');
  await check('https://www.bigiawasaana.com/tv2');
}
run();
