(() => {
  'use strict';

  const hydrated = new WeakSet();

  function appendStyle(href, key) {
    if (document.querySelector(`link[data-bt-visual-style="${key}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.btVisualStyle = key;
    document.head.appendChild(link);
  }

  function appendScript(src, key, onload) {
    const existing = document.querySelector(`script[data-bt-runtime="${key}"]`);
    if (existing) {
      if (onload) existing.addEventListener('load', onload, { once: true });
      return existing;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.btRuntime = key;
    if (onload) script.addEventListener('load', onload, { once: true });
    document.head.appendChild(script);
    return script;
  }

  function ensureVisualStyles() {
    appendStyle('/app-icons.css?v=2', 'icons');
    appendStyle('/home-visual.css?v=4', 'home');
    appendStyle('/publisher-shell.css?v=2', 'publisher-context');
    if (document.querySelector('.product-page')) {
      appendStyle('/product-page-v2.css?v=5', 'product');
      appendStyle('/product-page-media.css?v=4', 'product-media');
    }
  }

  function ensureVisitsRuntime() {
    if (!document.querySelector('.terminal.home')) return;
    appendStyle('/visits-terminal.css?v=5', 'visits-terminal');
    appendScript('/visits-terminal.js?v=5', 'visits-terminal');
  }

  function ensurePublisherContext() {
    const loadContext = () => {
      if (document.documentElement.dataset.btPublisherContext === '1') return;
      appendScript('/publisher-shell.js?v=4', 'publisher-context');
    };
    if (window.BT_PUBLISHER_DATA) loadContext();
    else appendScript('/publisher-data.generated.js?v=2', 'publisher-data', loadContext);
  }

  function ensureStoreBadgeRuntime() {
    if (!document.querySelector('.product-page, .guide-page')) return;
    if (document.querySelector('script[data-bt-ms-store-badges]')) return;
    const script = document.createElement('script');
    script.src = '/microsoft-store-badge.js?v=5';
    script.defer = true;
    script.dataset.btMsStoreBadges = '1';
    document.head.appendChild(script);
  }

  function manifestIcon(slug) {
    const value = window.BT_STORE_ASSETS?.apps?.[slug]?.icon?.fallback;
    return typeof value === 'string' && value ? value : null;
  }

  function hydrateIcon(image) {
    if (!image || hydrated.has(image)) return;
    hydrated.add(image);
    const src = manifestIcon(image.dataset.appIconSlug || '');
    image.classList.add('is-missing');
    image.removeAttribute('src');
    if (!src) return;
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      image.src = src;
      image.classList.remove('is-missing');
    };
    probe.onerror = () => {
      image.removeAttribute('src');
      image.classList.add('is-missing');
    };
    probe.src = src;
  }

  function hydrateAll(root = document) {
    root.querySelectorAll?.('.app-icon[data-app-icon-slug]').forEach(hydrateIcon);
  }

  function releaseHiddenTerminalFocus() {
    const overlay = document.getElementById('terminalOverlay');
    const command = document.getElementById('cmd');
    if (!overlay || !command || overlay.classList.contains('open')) return;
    if (document.activeElement === command) command.blur();
  }

  function bindTerminalFocusGuard() {
    const overlay = document.getElementById('terminalOverlay');
    if (!overlay) return;
    const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
    document.addEventListener('keydown', (event) => {
      if (navigationKeys.has(event.key)) releaseHiddenTerminalFocus();
    }, true);
    new MutationObserver(releaseHiddenTerminalFocus)
      .observe(overlay, { attributes: true, attributeFilter: ['class'] });
    releaseHiddenTerminalFocus();
  }

  function boot() {
    ensureVisualStyles();
    ensureVisitsRuntime();
    ensurePublisherContext();
    ensureStoreBadgeRuntime();
    hydrateAll();
    bindTerminalFocusGuard();

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
