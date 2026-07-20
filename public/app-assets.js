(() => {
  'use strict';
  const order = ['windows', 'android', 'web'];
  function app(slug) { return window.BT_STORE_ASSETS?.apps?.[slug] || null; }
  function icon(slug) { return app(slug)?.icon || ''; }
  function screenshots(slug) {
    const shots = app(slug)?.screenshots || {};
    return order.flatMap((platform) => (shots[platform] || []).map((src) => ({ src, platform })));
  }
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-app-icon-slug]').forEach((img) => {
      const src = icon(img.dataset.appIconSlug);
      if (!src) { img.hidden = true; img.removeAttribute('src'); return; }
      img.src = src; img.hidden = false; img.onerror = () => { img.hidden = true; img.removeAttribute('src'); };
    });
  }
  window.BT_APP_ASSETS = { icon, screenshots, hydrateIcons };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrateIcons()); else hydrateIcons();
})();
