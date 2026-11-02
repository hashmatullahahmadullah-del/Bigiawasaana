const fs = require('fs');

const builderJs = fs.readFileSync('src/catering-builder.js', 'utf8');

console.log('--- CART INITIALIZATION ---');
builderJs.split('\n').forEach((line, i) => {
  if (line.includes('cart') || line.includes('localStorage') || line.includes('selectedDishes') || line.includes('state.cart') || line.includes('2778')) {
    if (i < 150) {
      console.log(`Line ${i+1}: ${line}`);
    }
  }
});
