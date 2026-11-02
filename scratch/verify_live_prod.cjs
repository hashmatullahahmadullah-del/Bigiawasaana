const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http') ? res.headers.location : 'https://www.bigiawasaana.com' + res.headers.location;
        return resolve(get(nextUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function verifyLive() {
  console.log('--- Verifying Live Production Deployment (Following Redirects) ---');
  
  // 1. Quote portal
  const quote = await get('https://www.bigiawasaana.com/quote');
  console.log('Quote portal status:', quote.status, 'has logo:', quote.body.includes('/logo.webp'), 'has Lalezar:', quote.body.includes('Lalezar'));

  // 2. Waiver portal
  const waiver = await get('https://www.bigiawasaana.com/waiver');
  console.log('Waiver portal status:', waiver.status, 'has logo:', waiver.body.includes('/logo.webp'), 'has Lalezar:', waiver.body.includes('Lalezar'));

  // 3. Admin portal
  const admin = await get('https://www.bigiawasaana.com/admin');
  console.log('Admin status:', admin.status);
  const scriptMatches = [...admin.body.matchAll(/src="([^"]+admin-[^"]+\.js)"/g)].map(m => m[1]);
  console.log('Admin script bundle:', scriptMatches);

  if (scriptMatches[0]) {
    const adminJs = await get('https://www.bigiawasaana.com' + scriptMatches[0]);
    console.log('Admin JS length:', adminJs.body.length);
    console.log('createCateringWaiver present:', adminJs.body.includes('createCateringWaiver'));
    const idx = adminJs.body.indexOf('createCateringWaiver');
    if (idx !== -1) {
      console.log('Context:', adminJs.body.slice(idx - 60, idx + 80));
    }
  }
}

verifyLive().catch(console.error);
