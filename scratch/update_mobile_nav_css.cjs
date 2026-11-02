const fs = require('fs');
let css = fs.readFileSync('src/mobile-nav.css', 'utf8');

// 1. Update .site-nav background and add overflow: hidden
css = css.replace(
  /\.site-nav \{[\s\S]*?will-change: transform;\s*\}/,
  `.site-nav {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translate(-50%, var(--nav-banner-offset, 0px));
  width: calc(100% - 32px);
  max-width: 1200px;
  z-index: 1000;
  background: rgba(11, 11, 11, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 100px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s ease;
  will-change: transform;
  overflow: hidden;
}

.site-nav.scrolled {
  background: #0B0B0B !important;
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.7) !important;
}`
);

// 2. Update media queries from 860px to 1024px
css = css.replace(/@media \(max-width:\s*860px\)/g, '@media (max-width: 1024px)');

fs.writeFileSync('src/mobile-nav.css', css, 'utf8');
console.log('Successfully updated src/mobile-nav.css');
