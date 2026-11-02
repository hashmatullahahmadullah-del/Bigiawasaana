const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

async function run() {
  const css = await get('https://www.bigiawasaana.com/assets/admin-DK1w3f3d.css');
  const idx = css.lastIndexOf('.crm-actions-grid');
  console.log(css.slice(idx - 200, idx + 200));
}
run().catch(console.error);
