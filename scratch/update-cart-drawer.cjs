const fs = require('fs');
const path = require('path');

// 1. Append rule to src/style.css
let style = fs.readFileSync('src/style.css', 'utf8').replace(/\r\n/g, '\n');
const cartDrawerCss = `
/* ==========================================================================
   Cart Drawer Offscreen Shadow Bleed Prevention
   ========================================================================== */
#cart-drawer:not(.open):not([style*="right: 0"]):not([style*="right:0"]) {
  visibility: hidden !important;
  pointer-events: none !important;
  box-shadow: none !important;
}

#cart-drawer.open,
#cart-drawer[style*="right: 0"],
#cart-drawer[style*="right:0"] {
  visibility: visible !important;
  pointer-events: auto !important;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5) !important;
}
`;

if (!style.includes('Cart Drawer Offscreen Shadow Bleed Prevention')) {
  style += cartDrawerCss;
  fs.writeFileSync('src/style.css', style, 'utf8');
  console.log('Appended cart drawer rule to src/style.css');
}

// 2. Update window.toggleCart in src/main.js
let main = fs.readFileSync('src/main.js', 'utf8').replace(/\r\n/g, '\n');
const oldToggleCart = `window.toggleCart = (show) => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.style.right = show ? '0' : '-100%';
  } else if (show) {
    window.location.href = '/menu?openCart=true';
  }
};`;

const newToggleCart = `window.toggleCart = (show) => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.style.right = show ? '0' : '-100%';
    drawer.style.visibility = show ? 'visible' : 'hidden';
    drawer.style.pointerEvents = show ? 'auto' : 'none';
    drawer.style.boxShadow = show ? '-10px 0 30px rgba(0,0,0,0.5)' : 'none';
    if (show) drawer.classList.add('open');
    else drawer.classList.remove('open');
  } else if (show) {
    window.location.href = '/menu?openCart=true';
  }
};`;

if (main.includes(oldToggleCart)) {
  main = main.replace(oldToggleCart, newToggleCart);
  fs.writeFileSync('src/main.js', main, 'utf8');
  console.log('Updated toggleCart in src/main.js');
} else {
  console.log('toggleCart not found in src/main.js');
}

// 3. Update HTML files with cart-drawer
const targetCartStr = `box-shadow: -10px 0 30px rgba(0,0,0,0.5);`;
const replacementCartStr = `box-shadow: none; visibility: hidden; pointer-events: none;`;

function updateHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    if (fs.statSync(full).isDirectory()) {
      updateHtmlFiles(full);
    } else if (f.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('id="cart-drawer"') && content.includes(targetCartStr)) {
        content = content.replace(targetCartStr, replacementCartStr);
        fs.writeFileSync(full, content, 'utf8');
        console.log('Updated cart-drawer in:', full);
      }
    }
  }
}

updateHtmlFiles('.');
