import en from './en.js';
import fa from './fa.js';

const dictionaries = { en, fa };

export function getLang() {
  const saved = localStorage.getItem('site_lang');
  if (saved && (saved === 'en' || saved === 'fa')) {
    return saved;
  }
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang && browserLang.toLowerCase().startsWith('fa')) {
    return 'fa';
  }
  return 'en';
}

export function setLang(lang) {
  if (lang !== 'en' && lang !== 'fa') return;
  localStorage.setItem('site_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  if (lang === 'fa') {
    document.body.classList.add('lang-fa');
  } else {
    document.body.classList.remove('lang-fa');
  }
}

export function toggleLang() {
  const current = getLang();
  setLang(current === 'en' ? 'fa' : 'en');
}

export function t(key) {
  const current = getLang();
  const dict = dictionaries[current] || dictionaries['en'];
  return dict[key] || key;
}

export function applyTranslations(container = document) {
  const elements = container.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });
}
