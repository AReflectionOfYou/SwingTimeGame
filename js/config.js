// App-wide configuration. The working name lives here and only here (plus
// manifest.json, which is static JSON and cannot read this file), so a rename
// is a one-line change.
const APP_CONFIG = {
  name: 'Swing Time',

  // Base address that every QR code link is built from. Must end in '/'.
  //
  // WARNING: printed QR codes carry this address. If the repository is
  // renamed or moved, GitHub Pages does NOT redirect the old address, so
  // every printed code stops working. Update this value and reprint after
  // any move.
  //
  // Set to '' to use the folder the shared screen was loaded from instead —
  // useful when testing unpublished changes from a computer on the local
  // network, since phones would otherwise open the live site.
  baseUrl: 'https://areflectionofyou.github.io/SwingTimeGame/',

  // Prefix for per-device preferences in localStorage (hand, thresholds,
  // look-ahead). Kept separate from `name` so a rename doesn't reset them.
  storagePrefix: 'swingtime-',
};

function appBaseUrl() {
  if (APP_CONFIG.baseUrl) return APP_CONFIG.baseUrl;
  return new URL('./', window.location.href).href;
}

// Fill in the app name wherever a page asks for it, and prefix page titles.
(function applyAppName() {
  const apply = () => {
    document.querySelectorAll('[data-app-name]').forEach((el) => {
      el.textContent = APP_CONFIG.name;
    });
    const sub = document.documentElement.dataset.pageTitle;
    document.title = sub ? APP_CONFIG.name + ' — ' + sub : APP_CONFIG.name;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = APP_CONFIG.name;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storagePrefix + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(APP_CONFIG.storagePrefix + key, JSON.stringify(value));
  } catch (err) {
    // Private mode or blocked storage: preferences just won't persist.
  }
}
