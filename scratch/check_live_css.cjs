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
  console.log('Live admin css length:', css.length);
  const idx = css.indexOf('.crm-actions-grid');
  console.log('.crm-actions-grid idx:', idx);
  if (idx !== -1) {
    console.log(css.slice(idx - 50, idx + 250));
  }
  const idx2 = css.lastIndexOf('.crm-actions-grid');
  console.log('last .crm-actions-grid idx:', idx2);
  if (idx2 !== idx && idx2 !== -1) {
    console.log(css.slice(idx2 - 50, idx2 + 250));
  }
}
run().catch(console.error);
