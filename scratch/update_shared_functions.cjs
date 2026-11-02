const fs = require('fs');
let code = fs.readFileSync('functions/shared.js', 'utf8');

const adminAuthCode = `
const ADMIN_EMAILS = [
  'bigiawasaana@gmail.com',
  'admin@bigiawasaana.com'
];

function isAdminContext(context) {
  const email = (context?.auth?.token?.email || '').toLowerCase().trim();
  return ADMIN_EMAILS.includes(email);
}
`;

if (!code.includes('isAdminContext')) {
  code = code.replace('function getLocationId() {', adminAuthCode + '\nfunction getLocationId() {');
  code = code.replace(
    'getLocationId\n};',
    'getLocationId,\n  ADMIN_EMAILS,\n  isAdminContext\n};'
  );
  fs.writeFileSync('functions/shared.js', code, 'utf8');
  console.log('functions/shared.js updated successfully');
} else {
  console.log('isAdminContext already present in functions/shared.js');
}
