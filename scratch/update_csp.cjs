const fs = require('fs');
let content = fs.readFileSync('firebase.json', 'utf8');

const target = '"Content-Security-Policy-Report-Only"';
if (content.includes(target)) {
  const newCsp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://web.squarecdn.com https://apis.google.com https://*.firebaseio.com https://cdn.jsdelivr.net https://cdn.quilljs.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.quilljs.com; font-src 'self' https://fonts.gstatic.com data: https://cdn.jsdelivr.net; img-src 'self' data: blob: https://www.bigiawasaana.com https://bigiawasaana.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com; connect-src 'self' https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://*.google.com https://*.squarecdn.com https://pci-connect.squareup.com https://connect.squareup.com https://*.firebasestorage.app https://firebasestorage.googleapis.com; frame-src 'self' https://bigi-awasaana-7b3ce.firebaseapp.com https://www.google.com https://maps.google.com https://web.squarecdn.com; object-src 'none'; base-uri 'self';";
  
  content = content.replace('"Content-Security-Policy-Report-Only"', '"Content-Security-Policy"');
  content = content.replace(/("key": "Content-Security-Policy",\s*"value": ")[^"]*(")/, '$1' + newCsp + '$2');
  fs.writeFileSync('firebase.json', content, 'utf8');
  console.log('firebase.json updated successfully');
} else {
  console.log('Target not found in firebase.json');
}
