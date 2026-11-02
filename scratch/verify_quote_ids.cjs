const fs = require('fs');
const html = fs.readFileSync('quote.html', 'utf8');
const ids = [
  'portal-loading', 'portal-auth-card', 'portal-content', 'auth-error-banner',
  'portal-quote-number', 'portal-client-title', 'portal-status-badge',
  'portal-event-datetime', 'portal-guest-count', 'portal-fulfillment-type',
  'portal-address-row', 'portal-delivery-address', 'portal-items-list',
  'portal-subtotal', 'portal-discount-row', 'portal-discount', 'portal-tax',
  'portal-delivery-row', 'portal-delivery-fee', 'portal-grand-total',
  'portal-deposit-label', 'portal-deposit-amount', 'pay-deposit-val',
  'label-pay-deposit-title', 'pay-full-val', 'btn-pay-text',
  'portal-acceptance-card', 'portal-payment-card', 'portal-confirmed-card',
  'receipt-tx-id', 'receipt-paid-amount', 'receipt-balance-amount',
  'pill-opt-deposit', 'pill-opt-full', 'radio-pay-deposit', 'radio-pay-full',
  'google-pay-button', 'apple-pay-button', 'wallets-or-divider',
  'payment-error-msg', 'btn-submit-payment', 'card-container',
  'digital-wallets', 'auth-quote-input', 'auth-contact-input',
  'signer-name-input', 'accept-terms-checkbox', 'btn-accept-proposal'
];
const missing = [];
ids.forEach(id => {
  if (!html.includes(`id="${id}"`)) missing.push(id);
});
console.log('Missing IDs:', missing);
if (missing.length === 0) console.log('All IDs verified 100%!');
