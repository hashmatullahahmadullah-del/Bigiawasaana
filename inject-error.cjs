const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const errorReporter = `
<div id="global-error" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; background: red; color: white; z-index: 999999; padding: 20px; font-family: monospace; white-space: pre-wrap; font-size: 16px;"></div>
<script>
  window.onerror = function(msg, url, line, col, error) {
    const el = document.getElementById('global-error');
    if (el) {
      el.style.display = 'block';
      el.textContent += 'Error: ' + msg + '\\nLine: ' + line + ':' + col + '\\n' + (error && error.stack ? error.stack : '') + '\\n\\n';
    }
  };
  window.addEventListener('unhandledrejection', function(event) {
    const el = document.getElementById('global-error');
    if (el) {
      el.style.display = 'block';
      el.textContent += 'Unhandled Promise Rejection: ' + (event.reason && event.reason.stack ? event.reason.stack : event.reason) + '\\n\\n';
    }
  });
</script>
<body
`;

html = html.replace('<body', errorReporter);
fs.writeFileSync('admin.html', html, 'utf8');
console.log('Injected error reporter');
