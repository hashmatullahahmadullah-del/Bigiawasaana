const fs = require('fs');
let code = fs.readFileSync('src/admin/shared.js', 'utf8');

const regex = /\/\/ Login\r?\nloginForm\.addEventListener\('submit', async \(e\) => \{[\s\S]*?\}\);/;

const replacement = `// Login with progressive rate limiting
let failedAdminAttempts = 0;
let lockoutTimer = null;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (lockoutTimer) return;

  const email = (document.getElementById('admin-email').value || '').trim();
  const password = document.getElementById('admin-password').value || '';
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  if (failedAdminAttempts >= 5) {
    let remainingSeconds = 60;
    if (submitBtn) submitBtn.disabled = true;
    errorEl.textContent = \`Too many failed attempts. Please wait \${remainingSeconds}s.\`;
    lockoutTimer = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
        failedAdminAttempts = 0;
        if (submitBtn) submitBtn.disabled = false;
        errorEl.textContent = '';
      } else {
        errorEl.textContent = \`Too many failed attempts. Please wait \${remainingSeconds}s.\`;
      }
    }, 1000);
    return;
  }
  
  try {
    errorEl.textContent = 'Logging in...';
    if (submitBtn) submitBtn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
    errorEl.textContent = '';
    failedAdminAttempts = 0;
  } catch (error) {
    failedAdminAttempts++;
    if (failedAdminAttempts >= 5) {
      errorEl.textContent = 'Too many failed attempts. Locked for 60 seconds.';
    } else {
      errorEl.textContent = 'Invalid credentials. Please try again.';
    }
  } finally {
    if (!lockoutTimer && submitBtn) submitBtn.disabled = false;
  }
});`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/admin/shared.js', code, 'utf8');
  console.log('src/admin/shared.js updated successfully');
} else {
  console.log('Regex did not match in src/admin/shared.js');
}
