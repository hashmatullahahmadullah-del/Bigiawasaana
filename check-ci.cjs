const https = require('https');
https.get({
  hostname: 'api.github.com',
  path: '/repos/hashmatullahahmadullah-del/Bigiawasaana/actions/runs?per_page=1',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    if (runs && runs.length > 0) {
      https.get({
        hostname: 'api.github.com',
        path: `/repos/hashmatullahahmadullah-del/Bigiawasaana/actions/runs/${runs[0].id}/jobs`,
        headers: { 'User-Agent': 'Node.js' }
      }, (res2) => {
        let data2 = '';
        res2.on('data', c => data2 += c);
        res2.on('end', () => {
          const jobs = JSON.parse(data2).jobs;
          jobs.forEach(j => console.log(`${j.name}: ${j.status} ${j.conclusion}`));
        });
      });
    }
  });
});
