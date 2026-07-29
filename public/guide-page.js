(() => {
  'use strict';

  function appForSlug(slug) {
    return slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
  }

  function ensureMediaStyles() {
    if (document.querySelector('link[data-guide-media-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/product-page-media.css?v=4';
    link.dataset.guideMediaStyle = '1';
    document.head.append(link);
  }

  function ensureExplorerRuntime() {
    if (window.BTScreenshotExplorer) return Promise.resolve(window.BTScreenshotExplorer);
    return new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-bt-screenshot-explorer]');
      if (!script) {
        script = document.createElement('script');
        script.src = '/screenshot-explorer.js?v=1';
        script.defer = true;
        script.dataset.btScreenshotExplorer = '1';
        document.head.append(script);
      }
      script.addEventListener('load', () => window.BTScreenshotExplorer ? resolve(window.BTScreenshotExplorer) : reject(new Error('Screenshot explorer unavailable')), { once: true });
      script.addEventListener('error', reject, { once: true });
    });
  }

  function hydratePageIcon(app) {
    const image = document.querySelector('.guide-page [data-guide-icon]');
    const header = document.querySelector('.guide-page .guide-header');
    const src = app?.icon?.fallback;
    if (!image || !header || !src) return;
    image.addEventListener('load', () => header.classList.add('has-guide-icon'), { once: true });
    image.addEventListener('error', () => image.removeAttribute('src'), { once: true });
    image.src = src;
  }

  function hydrateIndexIcons() {
    document.querySelectorAll('.guide-card[data-app-slug]').forEach((card) => {
      const image = card.querySelector('[data-guide-icon]');
      const src = appForSlug(card.dataset.appSlug || '')?.icon?.fallback;
      if (!image || !src) {
        image?.remove();
        return;
      }
      image.addEventListener('error', () => image.remove(), { once: true });
      image.src = src;
    });
  }

  function renderGallery(app, runtime) {
    const gallery = document.querySelector('[data-guide-gallery]');
    if (!gallery || gallery.dataset.rendered === '1') return false;
    gallery.dataset.rendered = '1';
    document.querySelectorAll('[data-guide-shot]').forEach((image) => image.closest('.guide-media')?.remove());

    const groups = runtime.groupsFor(app);
    if (!groups.length) {
      gallery.remove();
      return false;
    }

    const productName = document.querySelector('.guide-kicker')?.textContent?.replace(/\s+guide$/i, '') || 'App';
    const caption = document.createElement('p');
    caption.className = 'guide-media-caption';
    const explorer = runtime.build({
      groups,
      productName,
      className: 'guide-screenshot-explorer',
      onEmpty: () => gallery.remove(),
      onChange: ({ platformLabel, index, total }) => {
        caption.textContent = `${productName} on ${platformLabel} · screenshot ${index + 1} of ${total}.`;
      }
    });
    gallery.replaceChildren(explorer, caption);
    return true;
  }

  async function init() {
    hydrateIndexIcons();
    const app = appForSlug(document.body?.dataset?.appSlug || '');
    if (!app) return;
    hydratePageIcon(app);
    const gallery = document.querySelector('[data-guide-gallery]');
    if (!gallery) return;
    ensureMediaStyles();
    try {
      const runtime = await ensureExplorerRuntime();
      renderGallery(app, runtime);
    } catch {
      gallery.remove();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
