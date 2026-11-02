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
  const scriptRes = await get('https://www.bigiawasaana.com/assets/admin-D3q1B1-r.js');
  const idx = scriptRes.body.indexOf('Failed to create waiver:');
  console.log('Failed to create waiver idx:', idx);
  if (idx !== -1) {
    console.log(scriptRes.body.slice(idx - 250, idx + 100));
  }
}
run().catch(console.error);
