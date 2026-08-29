const fs = require('fs');
let css = fs.readFileSync('src/admin-theme.css', 'utf8');

css += `
/* V2 Blog Editor (Quill Overrides) */
.v2-quill.ql-container.ql-snow {
  border: none !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 18px !important;
  color: var(--text-main) !important;
}

.v2-quill .ql-editor {
  padding: 0 !important;
  min-height: 500px;
}

.v2-quill .ql-editor.ql-blank::before {
  color: var(--text-muted) !important;
  font-style: normal !important;
  left: 0 !important;
}

#blog-editor-section .ql-toolbar.ql-snow {
  border: none !important;
  border-bottom: 1px solid var(--border-admin) !important;
  background: var(--surface-admin);
  padding: 12px 40px !important;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Fix Quill Dropdowns in Dark Mode */
.ql-snow .ql-picker {
  color: var(--text-main) !important;
}
.ql-snow .ql-stroke {
  stroke: var(--text-main) !important;
}
.ql-snow .ql-fill {
  fill: var(--text-main) !important;
}
.ql-snow .ql-picker-options {
  background: var(--surface-admin) !important;
  border-color: var(--border-admin) !important;
  box-shadow: var(--shadow-md) !important;
}

/* Remove default blue outline on focus for title */
#post-title::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}
`;

fs.writeFileSync('src/admin-theme.css', css, 'utf8');
