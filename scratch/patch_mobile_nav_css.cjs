const fs = require('fs');

let css = fs.readFileSync('src/mobile-nav.css', 'utf8');

// 1. Replace .site-nav background
css = css.replace(
  /background:\s*rgba\(17,\s*17,\s*17,\s*0\.85\);/g,
  'background: rgba(11, 11, 11, 0.96);'
);

// 2. Add scoped lang-toggle styling and .nav-cta-outline breakpoint
const customNavAdditions = `
/* ─── Lang Toggle in Floating Navbar ─── */
.site-nav .site-lang-toggle {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
  padding: 5px 12px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  font-family: 'Outfit', sans-serif !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 9999px !important;
  color: var(--white, #fff) !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
  line-height: 1 !important;
}
.site-nav .site-lang-toggle:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  color: #fff !important;
  transform: translateY(-1px) !important;
}

@media (max-width: 1220px) {
  .site-nav .nav-cta-outline {
    display: none !important;
  }
}
`;

if (!css.includes('.site-nav .site-lang-toggle')) {
  css = css.replace(
    '/* ─── Desktop Links ─── */',
    customNavAdditions + '\n/* ─── Desktop Links ─── */'
  );
}

// 3. Update gap in .nav-links
css = css.replace(
  /gap:\s*20px;/g,
  'gap: clamp(8px, 1.15vw, 16px); flex-wrap: nowrap;'
);

// 4. Update mobile media query from 768px to 860px
css = css.replace(
  /@media \(max-width: 768px\) \{/g,
  '@media (max-width: 860px) {'
);

fs.writeFileSync('src/mobile-nav.css', css, 'utf8');
console.log('Successfully updated src/mobile-nav.css!');
