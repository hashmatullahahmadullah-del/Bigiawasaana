const fs = require('fs');
const execSync = require('child_process').execSync;
const out = execSync('git grep "export const state" src/', { encoding: 'utf8' });
console.log(out);
