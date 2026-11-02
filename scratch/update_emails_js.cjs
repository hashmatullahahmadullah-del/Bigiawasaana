const fs = require('fs');
let code = fs.readFileSync('functions/emails.js', 'utf8');

// Add maskEmail helper function if not present
if (!code.includes('function maskEmail(')) {
  const helper = `/**
 * Masks an email for safe logging (e.g. j***e@example.com).
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'anonymous';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name[0] + '*' : name[0] + '***' + name[name.length - 1];
  return \`\${maskedName}@\${domain}\`;
}

`;
  code = helper + code;
}

// Replace occurrences of raw customer email in logs
code = code.replace(
  'console.log(`Order receipt email sent to customer (${customerEmail}) for order ${orderId}`);',
  'console.log(`Order receipt email sent to customer (${maskEmail(customerEmail)}) for order ${orderId}`);'
);
code = code.replace(
  'console.error(`Failed to send order receipt email to ${customerEmail}:`, err);',
  'console.error(`Failed to send order receipt email to ${maskEmail(customerEmail)}:`, err);'
);
code = code.replace(
  'console.log(`Refund notice email sent to customer (${customerEmail}) for order ${orderId}`);',
  'console.log(`Refund notice email sent to customer (${maskEmail(customerEmail)}) for order ${orderId}`);'
);
code = code.replace(
  'console.error(`Failed to send refund notice to customer ${customerEmail}:`, err);',
  'console.error(`Failed to send refund notice to customer ${maskEmail(customerEmail)}:`, err);'
);
code = code.replace(
  'console.log(`Retail order receipt email sent to ${customerEmail} for order ${orderId}`);',
  'console.log(`Retail order receipt email sent to ${maskEmail(customerEmail)} for order ${orderId}`);'
);
code = code.replace(
  'console.error(`Failed to send retail receipt email to ${customerEmail}:`, err);',
  'console.error(`Failed to send retail receipt email to ${maskEmail(customerEmail)}:`, err);'
);

fs.writeFileSync('functions/emails.js', code, 'utf8');
console.log('functions/emails.js updated successfully');
