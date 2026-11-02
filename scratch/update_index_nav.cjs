const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldNavLinksSnippet = `<li><a href="/order-history.html" data-i18n="nav.orders">My Orders</a></li>`;
const newNavLinksSnippet = `<li><a href="/order-history.html" data-i18n="nav.orders">My Orders</a></li>
        <li id="nav-account-li">
          <button type="button" class="nav-account-pill" id="nav-account-btn" aria-label="Sign In or Account">
            <svg class="ui-icon ui-icon-no-margin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span class="nav-signin-text">Sign In</span>
          </button>
        </li>`;

const oldDrawerSnippet = `<div class="nav-mobile-drawer" id="nav-mobile-drawer">`;
const newDrawerSnippet = `<div class="nav-mobile-drawer" id="nav-mobile-drawer">
    <button type="button" class="mobile-nav-account-btn" id="mobile-nav-account-btn" aria-label="Sign In or Account">
      <span style="display: flex; align-items: center; color: var(--accent);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
      <span class="nav-signin-text">Sign In / Rewards</span>
    </button>`;

if (!html.includes('id="nav-account-btn"')) {
  html = html.replace(oldNavLinksSnippet, newNavLinksSnippet);
}

if (!html.includes('id="mobile-nav-account-btn"')) {
  html = html.replace(oldDrawerSnippet, newDrawerSnippet);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with desktop and mobile drawer signin buttons.');
