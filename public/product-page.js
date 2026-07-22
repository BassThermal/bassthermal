(() => {
  let initialized = false;
  let activeViewer = null;

  function ensureMediaStyles() {
    if (document.querySelector('link[data-product-page-media]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/product-page-media.css';
    link.dataset.productPageMedia = '1';
    document.head.append(link);
  }

  function closeViewer() {
    if (!activeViewer) return;
    const { root, trigger, onKeydown } = activeViewer;
    document.removeEventListener('keydown', onKeydown);
    root.remove();
    activeViewer = null;
    if (trigger && typeof trigger.focus === 'function') trigger.focus();
  }

  function openViewer(src, alt, trigger) {
    closeViewer();
    const root = document.createElement('div');
    root.className = 'product-shot-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', alt);

    const frame = document.createElement('div');
    frame.className = 'product-shot-viewer-frame';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'product-shot-viewer-close';
    close.setAttribute('aria-label', 'Close screenshot');
    close.textContent = '×';

    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;

    frame.append(close, image);
    root.append(frame);
    document.body.append(root);

    const onKeydown = (event) => {
      if (event.key === 'Escape') closeViewer();
    };
    close.addEventListener('click', closeViewer);
    root.addEventListener('click', (event) => {
      if (event.target === root) closeViewer();
    });
    document.addEventListener('keydown', onKeydown);
    activeViewer = { root, trigger, onKeydown };
    close.focus();
  }

  function renderIcon(app, header) {
    const img = document.querySelector('.product-icon');
    const fallback = app?.icon?.fallback;
    if (!img || typeof fallback !== 'string' || !fallback) return;

    img.addEventListener('load', () => {
      header.classList.add('has-product-icon');
    }, { once: true });
    img.addEventListener('error', () => {
      img.removeAttribute('src');
      header.classList.remove('has-product-icon');
    }, { once: true });
    img.src = fallback;
  }

  function screenshotItems(app) {
    const screenshots = app?.screenshots || {};
    const order = ['windows', 'android', 'web'];
    return order.flatMap((platform) => {
      const list = Array.isArray(screenshots[platform]) ? screenshots[platform] : [];
      return list.map((src, index) => ({ platform, src, index: index + 1 }));
    });
  }

  function renderScreenshots(app) {
    const items = screenshotItems(app);
    if (!items.length) return;

    const content = document.querySelector('.product-content');
    if (!content || content.querySelector('[data-product-screenshots]')) return;
    const title = document.querySelector('.product-title')?.textContent?.trim() || 'Product';

    const section = document.createElement('section');
    section.className = 'product-section product-screenshots';
    section.dataset.productScreenshots = '1';

    const label = document.createElement('div');
    label.className = 'product-section-title';
    label.textContent = 'screenshots';

    const gallery = document.createElement('div');
    gallery.className = 'product-shot-grid';

    items.forEach((item, overallIndex) => {
      const alt = `${title} ${item.platform} screenshot ${item.index}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-shot';
      button.setAttribute('aria-label', `Open ${alt}`);

      const image = document.createElement('img');
      image.src = item.src;
      image.alt = alt;
      image.loading = overallIndex === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';

      const caption = document.createElement('span');
      caption.className = 'product-shot-caption';
      caption.textContent = `${item.platform} ${item.index}`;

      button.append(image, caption);
      button.addEventListener('click', () => openViewer(item.src, alt, button));
      gallery.append(button);
    });

    section.append(label, gallery);
    const faq = content.querySelector('.product-section.faq');
    if (faq) content.insertBefore(section, faq);
    else content.append(section);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureMediaStyles();
    const body = document.body;
    const slug = body?.dataset?.appSlug || '';
    const header = document.querySelector('.product-header');
    const apps = window.BT_STORE_ASSETS?.apps;
    const app = slug && apps ? apps[slug] : null;
    if (!header || !app) return;
    renderIcon(app, header);
    renderScreenshots(app);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
