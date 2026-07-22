(() => {
  'use strict';

  const hydrated = new WeakSet();

  function ensureVisualStyles() {
    const styles = [
      ['/app-icons.css?v=2', 'icons'],
      ['/home-visual.css?v=2', 'home']
    ];
    if (document.querySelector('.product-page')) {
      styles.push(['/product-page-v2.css?v=2', 'product']);
      styles.push(['/product-page-media.css?v=2', 'product-media']);
    }
    for (const [href, key] of styles) {
      if (document.querySelector(`link[data-bt-visual-style="${key}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.btVisualStyle = key;
      document.head.appendChild(link);
    }
  }

  function manifestIcon(slug) {
    const value = window.BT_STORE_ASSETS?.apps?.[slug]?.icon?.fallback;
    return typeof value === 'string' && value ? value : null;
  }

  function hydrateIcon(img) {
    if (!img || hydrated.has(img)) return;
    hydrated.add(img);

    const slug = img.dataset.appIconSlug || '';
    const src = manifestIcon(slug);
    img.classList.add('is-missing');
    img.removeAttribute('src');

    if (!src) return;

    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      img.src = src;
      img.classList.remove('is-missing');
    };
    probe.onerror = () => {
      img.removeAttribute('src');
      img.classList.add('is-missing');
    };
    probe.src = src;
  }

  function hydrateAll(root = document) {
    root.querySelectorAll?.('.app-icon[data-app-icon-slug]').forEach(hydrateIcon);
  }

  function boot() {
    ensureVisualStyles();
    hydrateAll();
    const table = document.getElementById('appTable');
    if (!table) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.app-icon[data-app-icon-slug]')) hydrateIcon(node);
          hydrateAll(node);
        }
      }
    });
    observer.observe(table, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
