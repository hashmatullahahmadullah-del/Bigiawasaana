const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function run() {
  const res = await get('https://www.bigiawasaana.com/admin');
  console.log('Status:', res.status);
  console.log('Headers:', res.headers.location);
  console.log('Body length:', res.body.length);
  const regex = /src="([^"]+)"/g;
  let m;
  const scriptMatches = [];
  while ((m = regex.exec(res.body)) !== null) {
    scriptMatches.push(m[1]);
  }
  console.log('Scripts:', scriptMatches);
  for (const src of scriptMatches) {
    if (src.indexOf('admin') !== -1) {
      const scriptRes = await get('https://www.bigiawasaana.com' + src);
      console.log('Script size:', scriptRes.body.length);
      const idx = scriptRes.body.indexOf('createCateringWaiver');
      console.log('createCateringWaiver idx:', idx);
      if (idx !== -1) {
        console.log('Code around createCateringWaiver:', scriptRes.body.slice(idx - 100, idx + 100));
      }
    }
  }
}
run().catch(console.error);
