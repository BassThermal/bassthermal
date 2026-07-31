(() => {
  'use strict';

  if (document.documentElement.dataset.btAccentSystem === '1') return;
  document.documentElement.dataset.btAccentSystem = '1';

  const appSlugs = new Set([
    'dualticker',
    'retrofy',
    'coptic-dictionary',
    'icon-pack-builder',
    'favicon-harvester',
    'isbn-manager',
    'rss-crawler',
    'docbatch-pdf-converter',
    'website-image-inventory',
    'courselab-beam'
  ]);

  const utilityAccents = {
    '/about/': ['#79c0ff', '121,192,255'],
    '/support/': ['#58a6ff', '88,166,255'],
    '/privacy/': ['#d2a8ff', '210,168,255'],
    '/security/': ['#d29922', '210,153,34']
  };

  function slugFromHref(href) {
    try {
      const path = new URL(href, location.href).pathname;
      const match = path.match(/^\/apps\/([^/]+)\/?/);
      return match && appSlugs.has(match[1]) ? match[1] : '';
    } catch {
      return '';
    }
  }

  function annotateHomepageRows(root = document) {
    root.querySelectorAll?.('.terminal.home .app-row:not([data-app-slug])').forEach((row) => {
      const slug = slugFromHref(row.querySelector('.app-name')?.getAttribute('href') || '');
      if (slug) row.dataset.appSlug = slug;
    });
  }

  function applyUtilityAccent() {
    if (document.body?.dataset?.appSlug) return;
    const path = location.pathname.replace(/\/{2,}/g, '/');
    const direct = utilityAccents[path];
    const privacy = path.startsWith('/privacy/') ? utilityAccents['/privacy/'] : null;
    const accent = direct || privacy;
    if (!accent) return;
    document.documentElement.style.setProperty('--bt-accent', accent[0]);
    document.documentElement.style.setProperty('--bt-accent-rgb', accent[1]);
  }

  function installReadingProgress() {
    const page = document.querySelector('.guide-page:not(.guide-index)');
    if (!page || document.querySelector('.bt-reading-progress')) return;

    const bar = document.createElement('div');
    bar.className = 'bt-reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);

    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const max = Math.max(1, root.scrollHeight - innerHeight);
      const progress = Math.min(1, Math.max(0, scrollY / max));
      root.style.setProperty('--bt-reading-progress', progress.toFixed(4));
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    update();
  }

  function watchHomepageRows() {
    const table = document.getElementById('appTable');
    if (!table) return;
    annotateHomepageRows(table);
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.app-row')) annotateHomepageRows(node.parentElement || table);
          else annotateHomepageRows(node);
        }
      }
    }).observe(table, { childList: true, subtree: true });
  }

  function boot() {
    applyUtilityAccent();
    annotateHomepageRows();
    watchHomepageRows();
    installReadingProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
