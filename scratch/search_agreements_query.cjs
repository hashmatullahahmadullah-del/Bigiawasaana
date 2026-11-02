const fs = require('fs');
const execSync = require('child_process').execSync;
try {
  const out = execSync('git grep "catering_agreements" src/admin/', { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log('Error searching for catering_agreements:', e.message);
}
