const fs = require('fs');
let code = fs.readFileSync('src/account-auth.js', 'utf8');

const target1 = `        } catch (err) {
          console.error('Phone lookup error:', err);
          showAuthError(err.message || 'Error checking phone. Try again.');
          phoneBtn.innerHTML = 'CONTINUE →';
          phoneBtn.disabled = false;
          return;
        }`;

const replacement1 = `        } catch (err) {
          console.error('Phone lookup error:', err);
          const rawMsg = err.message || '';
          const friendlyMsg = (rawMsg.toLowerCase() === 'internal' || err.code === 'functions/internal')
            ? 'Unable to connect to service. Please check your connection and try again.'
            : (rawMsg || 'Error checking phone. Try again.');
          showAuthError(friendlyMsg);
          phoneBtn.innerHTML = 'CONTINUE →';
          phoneBtn.disabled = false;
          return;
        }`;

const target2 = `        if (errMsg.includes('permission-denied') || errMsg.toLowerCase().includes('invalid phone or pin')) {
          showAuthError('Incorrect PIN. Please double-check your 4-digit PIN.');
        } else {
          showAuthError(errMsg || 'Error signing in. Please try again.');
        }`;

const replacement2 = `        if (errMsg.includes('permission-denied') || errMsg.toLowerCase().includes('invalid phone or pin')) {
          showAuthError('Incorrect PIN. Please double-check your 4-digit PIN.');
        } else if (errMsg.toLowerCase() === 'internal' || err.code === 'functions/internal') {
          showAuthError('Unable to connect to service. Please check your connection and try again.');
        } else {
          showAuthError(errMsg || 'Error signing in. Please try again.');
        }`;

// Normalize line endings for replacement
const normalize = s => s.replace(/\r\n/g, '\n');
code = normalize(code);

if (code.includes(normalize(target1)) && code.includes(normalize(target2))) {
  code = code.replace(normalize(target1), normalize(replacement1));
  code = code.replace(normalize(target2), normalize(replacement2));
  fs.writeFileSync('src/account-auth.js', code, 'utf8');
  console.log('Successfully patched src/account-auth.js!');
} else {
  console.log('Target blocks not found in src/account-auth.js');
}
