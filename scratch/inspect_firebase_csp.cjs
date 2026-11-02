const fs = require('fs');
const fj = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const headers = fj.hosting?.headers || [];
headers.forEach(h => {
  console.log('Source:', h.source);
  h.headers?.forEach(hdr => {
    if (hdr.key === 'Content-Security-Policy') {
      console.log('CSP:', hdr.value);
    }
  });
});
