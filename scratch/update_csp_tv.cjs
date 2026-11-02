const fs = require('fs');

const fj = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const headers = fj.hosting?.headers || [];

const newCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://www.googletagmanager.com https://web.squarecdn.com https://apis.google.com https://*.firebaseio.com https://cdn.jsdelivr.net https://cdn.quilljs.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.quilljs.com; font-src 'self' https://fonts.gstatic.com data: https://cdn.jsdelivr.net; img-src 'self' data: blob: https://www.bigiawasaana.com https://bigiawasaana.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com; media-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.firebasestorage.app; connect-src 'self' https://*.cloudfunctions.net https://*.run.app https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.google.com https://*.googleapis.com https://*.squarecdn.com https://pci-connect.squareup.com https://connect.squareup.com https://*.firebasestorage.app https://firebasestorage.googleapis.com; frame-src 'self' https://bigi-awasaana-7b3ce.firebaseapp.com https://www.google.com https://maps.google.com https://web.squarecdn.com; object-src 'none'; base-uri 'self';";

headers.forEach(h => {
  if (h.headers) {
    h.headers.forEach(hdr => {
      if (hdr.key === 'Content-Security-Policy') {
        hdr.value = newCSP;
      }
    });
  }
});

fs.writeFileSync('firebase.json', JSON.stringify(fj, null, 2) + '\n', 'utf8');
console.log('Successfully updated CSP in firebase.json for Tailwind and media-src!');
