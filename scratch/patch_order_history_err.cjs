const fs = require('fs');
let code = fs.readFileSync('src/order-history.js', 'utf8');

const target1 = `      if (err.code === 'functions/not-found' || (err.message && err.message.toLowerCase().includes('not found'))) {
        showStep('not-found');
      } else {
        showAlert('error', err.message || 'Unable to check phone number. Please try again.');
      }`;

const replacement1 = `      if (err.code === 'functions/not-found' || (err.message && err.message.toLowerCase().includes('not found'))) {
        showStep('not-found');
      } else if (err.code === 'functions/internal' || (err.message && err.message.toLowerCase() === 'internal')) {
        showAlert('error', 'Unable to reach the server. Please check your connection and try again.');
      } else {
        showAlert('error', err.message || 'Unable to check phone number. Please try again.');
      }`;

const target2 = `      } else if (msg.toLowerCase().includes('pin') || err.code === 'functions/permission-denied' || err.code === 'functions/unauthenticated') {
        showAlert('error', 'Incorrect PIN. Please try again.');
        inputPin.value = '';
        inputPin.focus();
      } else {
        showAlert('error', msg || 'Failed to load order history. Please try again.');
      }`;

const replacement2 = `      } else if (msg.toLowerCase().includes('pin') || err.code === 'functions/permission-denied' || err.code === 'functions/unauthenticated') {
        showAlert('error', 'Incorrect PIN. Please try again.');
        inputPin.value = '';
        inputPin.focus();
      } else if (err.code === 'functions/internal' || msg.toLowerCase() === 'internal') {
        showAlert('error', 'Unable to reach the server. Please check your connection and try again.');
      } else {
        showAlert('error', msg || 'Failed to load order history. Please try again.');
      }`;

const normalize = s => s.replace(/\r\n/g, '\n');
code = normalize(code);

if (code.includes(normalize(target1)) && code.includes(normalize(target2))) {
  code = code.replace(normalize(target1), normalize(replacement1));
  code = code.replace(normalize(target2), normalize(replacement2));
  fs.writeFileSync('src/order-history.js', code, 'utf8');
  console.log('Successfully patched src/order-history.js!');
} else {
  console.log('Target blocks not found in src/order-history.js');
}
