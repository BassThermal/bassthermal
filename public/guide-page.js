(() => {
  const platformOrder = ['windows', 'android', 'web'];
  const platformNames = { windows: 'Windows', android: 'Android', web: 'Web' };

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
      const src = appForSlug(card.dataset.appSlug || '')?.icon?.fallback;
      if (!image || !src) {
        image?.remove();
        return;
      }
      image.addEventListener('error', () => image.remove(), { once: true });
      image.src = src;
    });
  }

  function renderGallery(app) {
    const gallery = document.querySelector('[data-guide-gallery]');
    if (!gallery || gallery.dataset.rendered === '1') return;
    gallery.dataset.rendered = '1';

    const productName = document.querySelector('.guide-kicker')?.textContent?.replace(/\s+guide$/i, '') || 'App';
    let count = 0;

    for (const platform of platformOrder) {
      const shots = app?.screenshots?.[platform];
      if (!Array.isArray(shots) || !shots.length) continue;
      for (const [index, src] of shots.entries()) {
        if (typeof src !== 'string' || !src) continue;
        const figure = document.createElement('figure');
        figure.className = 'guide-media';
        const image = document.createElement('img');
        image.src = src;
        image.alt = `${productName} ${platformNames[platform]} interface screenshot ${index + 1}`;
        image.loading = count === 0 ? 'eager' : 'lazy';
        image.decoding = 'async';
        const caption = document.createElement('figcaption');
        caption.textContent = `${productName} on ${platformNames[platform]}.`;
        figure.append(image, caption);
        gallery.append(figure);
        count += 1;
      }
    }

    if (!count) gallery.remove();
  }

  function hydrateLegacyShots(app) {
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
    renderGallery(app);
    hydrateLegacyShots(app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
