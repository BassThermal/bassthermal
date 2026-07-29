(() => {
  'use strict';

  const hydrated = new WeakSet();
  const guideLinks = {
    dualticker: ['/guides/dualticker/compare-live-headline-sources/', 'Compare live headline sources with DualTicker'],
    retrofy: ['/guides/retrofy/give-a-photo-a-retro-pixel-art-look/', 'Give a photo a retro pixel-art look'],
    'coptic-dictionary': ['/guides/coptic-dictionary/look-up-and-save-coptic-words/', 'Look up and save Coptic words'],
    'icon-pack-builder': ['/guides/icon-pack-builder/create-windows-app-icons-from-one-png/', 'Create Windows app icons from one PNG'],
    'favicon-harvester': ['/guides/favicon-harvester/collect-favicons-from-a-list-of-websites/', 'Collect favicons from a list of websites'],
    'isbn-manager': ['/guides/isbn-manager/build-a-book-catalog-from-isbns/', 'Build a book catalog from ISBNs'],
    'rss-crawler': ['/guides/rss-crawler/find-and-export-rss-feeds/', 'Find and export RSS feeds from websites'],
    'docbatch-pdf-converter': ['/guides/docbatch-pdf-converter/convert-a-folder-of-documents-to-pdf/', 'Convert a folder of documents to PDF'],
    'website-image-inventory': ['/guides/website-image-inventory/audit-images-used-on-a-website/', 'Audit images used on a website'],
    'courselab-beam': ['/guides/courselab-beam/build-and-review-a-beam-case/', 'Build and review a beam case']
  };

  function ensureVisualStyles() {
    const styles = [['/app-icons.css?v=2', 'icons'], ['/home-visual.css?v=4', 'home']];
    if (document.querySelector('.product-page')) {
      styles.push(['/product-page-v2.css?v=5', 'product']);
      styles.push(['/product-page-media.css?v=4', 'product-media']);
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

  function ensureStoreBadgeRuntime() {
    if (!document.querySelector('.product-page, .guide-page')) return;
    if (document.querySelector('script[data-bt-ms-store-badges]')) return;
    const script = document.createElement('script');
    script.src = '/microsoft-store-badge.js?v=5';
    script.defer = true;
    script.dataset.btMsStoreBadges = '1';
    document.head.appendChild(script);
  }

  function ensureGuideNavigation() {
    document.getElementById('readout')?.remove();
    const topnav = document.querySelector('.topnav');
    if (topnav && !topnav.querySelector('a[href="/guides/"]')) {
      const support = topnav.querySelector('a[href="/support/"]');
      const guide = document.createElement('a');
      guide.href = '/guides/';
      guide.textContent = 'Guides';
      if (support) {
        topnav.insertBefore(guide, support);
        topnav.insertBefore(document.createTextNode(' · '), support);
      } else {
        if (topnav.childNodes.length) topnav.append(document.createTextNode(' · '));
        topnav.append(guide);
      }
    }
    const footer = document.querySelector('body > .footer');
    if (footer && !footer.querySelector('a[href="/guides/"]')) {
      const guide = document.createElement('a');
      guide.href = '/guides/';
      guide.textContent = 'Guides';
      footer.prepend(document.createTextNode(' · '));
      footer.prepend(guide);
    }
  }

  function ensureProductGuideLink() {
    const slug = document.body?.dataset?.appSlug || '';
    const target = guideLinks[slug];
    if (!target) return;
    const sections = [...document.querySelectorAll('.product-section')];
    const section = sections.find((item) => {
      const title = item.querySelector('.product-section-title')?.textContent?.trim().toLowerCase();
      return title === 'guides' || title === 'guide';
    });
    const anchor = section?.querySelector('a');
    if (!anchor) return;
    anchor.href = target[0];
    anchor.textContent = target[1];
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
    probe.onload = () => { image.src = src; image.classList.remove('is-missing'); };
    probe.onerror = () => { image.removeAttribute('src'); image.classList.add('is-missing'); };
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
    const observer = new MutationObserver(releaseHiddenTerminalFocus);
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    releaseHiddenTerminalFocus();
  }

  function boot() {
    ensureVisualStyles();
    ensureStoreBadgeRuntime();
    ensureGuideNavigation();
    ensureProductGuideLink();
    hydrateAll();
    bindTerminalFocusGuard();
    const table = document.getElementById('appTable');
    if (!table) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.app-icon[data-app-icon-slug]')) hydrateIcon(node);
        hydrateAll(node);
      }
    });
    observer.observe(table, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
