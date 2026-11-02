const fs = require('fs');
const execSync = require('child_process').execSync;
const out = execSync('git grep "const state" src/admin/', { encoding: 'utf8' });
console.log(out);
