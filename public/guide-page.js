(() => {
  function appForSlug(slug) {
    return slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
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
      const app = appForSlug(card.dataset.appSlug || '');
      const src = app?.icon?.fallback;
      if (!image || !src) {
        image?.remove();
        return;
      }
      image.addEventListener('error', () => image.remove(), { once: true });
      image.src = src;
    });
  }

  function hydrateScreenshots(app) {
    document.querySelectorAll('[data-guide-shot]').forEach((image) => {
      const platform = image.dataset.platform || 'windows';
      const index = Number(image.dataset.guideShot || 0);
      const shots = app?.screenshots?.[platform];
      const src = Array.isArray(shots) ? shots[index] : null;
      const figure = image.closest('.guide-media');
      if (!src) {
        figure?.remove();
        return;
      }
      image.src = src;
      image.loading = image.dataset.eager === 'true' ? 'eager' : 'lazy';
      image.decoding = 'async';
    });
  }

  function init() {
    hydrateIndexIcons();
    const app = appForSlug(document.body?.dataset?.appSlug || '');
    if (!app) return;
    hydratePageIcon(app);
    hydrateScreenshots(app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();