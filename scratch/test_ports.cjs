const http = require('http');

[4173, 5173, 3000].forEach(port => {
  const req = http.get(`http://localhost:${port}/catering`, (res) => {
    console.log(`Port ${port} responded with status: ${res.statusCode}`);
  });
  req.on('error', (e) => {
    console.log(`Port ${port} error: ${e.message}`);
  });
});
