const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');
const isCrlf = content.includes('\r\n');
const normalized = content.replace(/\r\n/g, '\n');

const target1 = `    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'bigiawasaana@gmail.com';
    }`;

const repl1 = `    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email.matches('(?i)^bigiawasaana@gmail\\\\.com$') ||
        request.auth.token.email.matches('(?i)^admin@bigiawasaana\\\\.com$')
      );
    }`;

const target2 = `    // Settings Collection
    match /settings/{doc} {
      allow read: if doc in ['pickupConfig', 'popup', 'cart_promo', 'tv_promo', 'tv_display', 'kds', 'loyalty'] || isAdmin();
      allow write: if isAdmin();
    }`;

const repl2 = `    // Settings Collection
    match /settings/{doc} {
      allow read: if doc in ['pickupConfig', 'popup', 'cart_promo', 'tv_promo', 'tv_display', 'kds', 'loyalty', 'fixed_costs'] || isAdmin();
      allow write: if isAdmin();
    }`;

const target3 = `    match /unitEconomics_platforms/{id} {
      allow read, write: if isAdmin();
    }
    match /sales_logs/{id} {`;

const repl3 = `    match /unitEconomics_platforms/{id} {
      allow read, write: if isAdmin();
    }
    match /unitEconomics_settings/{id} {
      allow read, write: if isAdmin();
    }
    match /receipt_mappings/{id} {
      allow read, write: if isAdmin();
    }
    match /sales_logs/{id} {`;

if (!normalized.includes(target1)) throw new Error('Target 1 not found');
if (!normalized.includes(target2)) throw new Error('Target 2 not found');
if (!normalized.includes(target3)) throw new Error('Target 3 not found');

// Use replacement functions to avoid '$' special replacement patterns!
let updated = normalized
  .replace(target1, () => repl1)
  .replace(target2, () => repl2)
  .replace(target3, () => repl3);

if (isCrlf) {
  updated = updated.replace(/\n/g, '\r\n');
}

fs.writeFileSync('firestore.rules', updated, 'utf8');
console.log('Successfully updated firestore.rules using function replacer');
