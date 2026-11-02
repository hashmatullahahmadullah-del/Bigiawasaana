const https = require('https');

// 1. Verify CSP header
https.get('https://www.bigiawasaana.com/admin', (res) => {
  console.log('Admin HTTP Status:', res.statusCode);
  console.log('CSP Header present:', Boolean(res.headers['content-security-policy']));
  console.log('CSP Report-Only present:', Boolean(res.headers['content-security-policy-report-only']));
  if (res.headers['content-security-policy']) {
    console.log('CSP snippet:', res.headers['content-security-policy'].slice(0, 150) + '...');
  }
  console.log('HSTS:', res.headers['strict-transport-security']);
  console.log('X-Frame-Options:', res.headers['x-frame-options']);
});

// 2. Verify direct access to /orders/ without auth is blocked via Firestore REST API
const options = {
  hostname: 'firestore.googleapis.com',
  path: '/v1/projects/bigi-awasaana-7b3ce/databases/(default)/documents/orders/test-order-id-probe',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nDirect Firestore GET /orders/{id} Status:', res.statusCode);
    console.log('Response:', data.trim());
  });
});
req.end();
