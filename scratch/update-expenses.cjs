const fs = require('fs');

let exp = fs.readFileSync('src/admin/expenses.js', 'utf8').replace(/\r\n/g, '\n');

const oldClose = `  window.closeReceiptSlide = () => {
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(100%)';
      if (backdrop) {
          backdrop.style.opacity = '0';
          backdrop.style.pointerEvents = 'none';
      }
  };`;

const newClose = `  window.closeReceiptSlide = () => {
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) {
          slide.classList.remove('open');
          slide.style.transform = 'translateX(100%)';
          slide.style.boxShadow = 'none';
          slide.style.visibility = 'hidden';
          slide.style.pointerEvents = 'none';
      }
      if (backdrop) {
          backdrop.style.opacity = '0';
          backdrop.style.pointerEvents = 'none';
      }
  };`;

const oldOpen = `      if (!receipt) return;
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(0)';
      if (backdrop) {
          backdrop.style.opacity = '1';
          backdrop.style.pointerEvents = 'auto';
      }`;

const newOpen = `      if (!receipt) return;
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) {
          slide.classList.add('open');
          slide.style.visibility = 'visible';
          slide.style.pointerEvents = 'auto';
          slide.style.boxShadow = '-4px 0 24px rgba(0,0,0,0.5)';
          slide.style.transform = 'translateX(0)';
      }
      if (backdrop) {
          backdrop.style.opacity = '1';
          backdrop.style.pointerEvents = 'auto';
      }`;

if (exp.includes(oldClose)) {
  exp = exp.replace(oldClose, newClose);
  console.log('closeReceiptSlide updated');
} else {
  console.log('closeReceiptSlide not found');
}

if (exp.includes(oldOpen)) {
  exp = exp.replace(oldOpen, newOpen);
  console.log('openReceiptSlide updated');
} else {
  console.log('openReceiptSlide not found');
}

fs.writeFileSync('src/admin/expenses.js', exp, 'utf8');
