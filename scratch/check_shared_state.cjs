const fs = require('fs');
const code = fs.readFileSync('src/admin/shared.js', 'utf8');
const lines = code.split('\n');
console.log('Total lines in shared.js:', lines.length);

// Check what global state has
console.log('Has state.catering:', code.includes('state.catering'));
console.log('Has state.quotes:', code.includes('state.quotes'));
console.log('Has state.agreements:', code.includes('state.agreements'));
console.log('Has state.reviews:', code.includes('state.reviews'));
console.log('Has state.retailOrders:', code.includes('state.retailOrders'));
console.log('Has state.inventory:', code.includes('state.inventory'));
