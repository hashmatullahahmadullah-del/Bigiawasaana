/**
 * BIGI AWASAANA — Unified Button System Utilities
 * Provides accessible asynchronous loading states, tactile feedback, and button state management.
 */

/**
 * Sets a button into or out of an accessible loading state.
 * Prevents double-clicks, preserves button dimensions (no layout shift), and provides an animated SVG spinner.
 *
 * @param {HTMLButtonElement|HTMLElement|string} button - The button element or its DOM ID
 * @param {boolean} isLoading - Whether the button should show loading state
 * @param {string} [loadingText] - Optional replacement text (e.g. "Saving...", "Processing...")
 */
export function setButtonLoading(button, isLoading, loadingText) {
  const el = typeof button === 'string' ? document.getElementById(button) : button;
  if (!el) return;

  if (isLoading) {
    // 1. Lock dimensions so surrounding layout never shifts
    if (!el.dataset.originalHtml) {
      el.dataset.originalHtml = el.innerHTML;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        el.style.minWidth = `${Math.ceil(rect.width)}px`;
      }
    }

    // 2. Set accessibility and disabled states
    el.setAttribute('aria-busy', 'true');
    el.setAttribute('disabled', 'true');
    el.classList.add('btn-loading', 'is-loading');

    // 3. Render spinner and optional text
    const text = loadingText || el.dataset.loadingText || 'Processing...';
    const spinnerSvg = `
      <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="animation: btn-spin 0.8s linear infinite; flex-shrink: 0;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
      </svg>
    `;

    el.innerHTML = `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">${spinnerSvg}<span>${text}</span></span>`;
  } else {
    // Restore original content
    if (el.dataset.originalHtml) {
      el.innerHTML = el.dataset.originalHtml;
      delete el.dataset.originalHtml;
    }
    el.style.minWidth = '';
    el.removeAttribute('aria-busy');
    el.removeAttribute('disabled');
    el.classList.remove('btn-loading', 'is-loading');
  }
}

// Bind to window for universal vanilla JS and inline handlers access
if (typeof window !== 'undefined') {
  window.setButtonLoading = setButtonLoading;
}
