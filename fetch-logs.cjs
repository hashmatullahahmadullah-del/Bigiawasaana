process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const { execSync } = require('child_process');

const options = {
  hostname: 'api.github.com',
  path: '/repos/hashmatullahahmadullah-del/Bigiawasaana/actions/jobs/94003476906/logs',
  headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3+json' }
};

https.get(options, (res) => {
  if (res.statusCode === 302) {
    console.log('Downloading from:', res.headers.location);
    try {
      execSync(`curl -sL "${res.headers.location}" > log.txt`);
      console.log('Saved log.txt');
    } catch(e) {
      console.error(e);
    }
  } else {
    console.log('Status code:', res.statusCode);
  }
});
