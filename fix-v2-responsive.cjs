const fs = require('fs');

// 1. Update admin.html
let html = fs.readFileSync('admin.html', 'utf8');

// Replace Wrapper
html = html.replace(
  /<div id="blog-editor-section" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var\(--bg-admin\); z-index: 9000; overflow: hidden; flex-direction: column;">/g,
  '<div id="blog-editor-section" class="v2-composer-wrapper" style="display: none;">'
);

// Replace Header
html = html.replace(
  /<div style="padding: 20px 40px; border-bottom: 1px solid var\(--border-admin\); display: flex; justify-content: space-between; align-items: center; background: var\(--surface-admin\);">/g,
  '<div class="v2-composer-header">'
);

// Hide title on mobile
html = html.replace(
  /<span style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: var\(--text-muted\);" id="blog-editor-title">/g,
  '<span class="hide-on-mobile" style="font-family: \'Inter\', sans-serif; font-size: 14px; font-weight: 500; color: var(--text-muted);" id="blog-editor-title">'
);

// Replace Body container
html = html.replace(
  /<div style="display: flex; flex: 1; overflow: hidden;">/g,
  '<div class="v2-composer-body">'
);

// Replace Main Editor Area
html = html.replace(
  /<div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; align-items: center;">/g,
  '<div class="v2-composer-main">'
);

// Replace Sidebar
html = html.replace(
  /<div style="width: 350px; background: var\(--surface-admin\); border-left: 1px solid var\(--border-admin\); overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px;">/g,
  '<div class="v2-composer-sidebar">'
);

// Reduce title font size for mobile
html = html.replace(
  /font-size: 42px; font-weight: 700;/g,
  'font-size: clamp(28px, 5vw, 42px); font-weight: 700;'
);

fs.writeFileSync('admin.html', html, 'utf8');

// 2. Update CSS
let css = fs.readFileSync('src/admin-theme.css', 'utf8');

const responsiveCSS = `
/* V2 Composer Responsive Styles */
.v2-composer-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--bg-admin);
  z-index: 9000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.v2-composer-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-admin);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-admin);
  flex-shrink: 0;
}

.v2-composer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  flex-direction: row;
}

.v2-composer-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 40px;
  align-items: center;
}

.v2-composer-sidebar {
  width: 350px;
  flex-shrink: 0;
  background: var(--surface-admin);
  border-left: 1px solid var(--border-admin);
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Mobile & Laptop Responsive Rules */
@media (max-width: 1024px) {
  .v2-composer-main {
    padding: 24px;
  }
  .v2-composer-sidebar {
    width: 300px;
  }
  #blog-editor-section .ql-toolbar.ql-snow {
    padding: 12px 24px !important;
  }
}

@media (max-width: 768px) {
  .v2-composer-header {
    padding: 12px 16px;
  }
  .v2-composer-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .v2-composer-main {
    flex: none;
    overflow-y: visible;
    padding: 16px;
  }
  .v2-composer-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-admin);
    overflow-y: visible;
  }
  .v2-quill .ql-editor {
    min-height: 300px; /* shorter on mobile */
  }
  #blog-editor-section .ql-toolbar.ql-snow {
    padding: 8px 16px !important;
    position: static; /* sticky doesn't play well when wrapper scrolls */
  }
}
`;

if (!css.includes('.v2-composer-wrapper')) {
  css += '\n' + responsiveCSS;
  fs.writeFileSync('src/admin-theme.css', css, 'utf8');
}
