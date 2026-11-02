const { execSync } = require('child_process');

const log = execSync('git log --oneline -- scripts/prerender-menu.cjs', { encoding: 'utf8' });
console.log('Commits for prerender-menu.cjs:\n', log);

const firstCommit = log.trim().split('\n').pop().split(' ')[0];
console.log('First commit:', firstCommit);

const origMenuHtml = execSync(`git show ${firstCommit}~1:menu.html`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
console.log('Original menu.html length before prerender-menu:', origMenuHtml.length);
const origGrid = origMenuHtml.match(/<section id="menu"[\s\S]*?<\/section>/)?.[0] || '';
console.log('Original menu section:\n', origGrid.slice(0, 1000));
