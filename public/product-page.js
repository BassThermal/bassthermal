(() => {
  let initialized = false;
  let activeViewer = null;
  const platformOrder = ['windows', 'android', 'web'];
  const platformNames = { windows: 'Windows', android: 'Android', web: 'Web' };

  function ensureStyles() {
    const styles = [
      ['/product-page-v2.css', 'product-page-v2'],
      ['/product-page-media.css', 'product-page-media']
    ];
    for (const [href, key] of styles) {
      if (document.querySelector(`link[data-product-style="${key}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.productStyle = key;
      document.head.append(link);
    }
  }

  function closeViewer() {
    if (!activeViewer) return;
    const { root, trigger, onKeydown } = activeViewer;
    document.removeEventListener('keydown', onKeydown);
    root.remove();
    activeViewer = null;
    trigger?.focus?.();
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
    const onKeydown = (event) => { if (event.key === 'Escape') closeViewer(); };
    close.addEventListener('click', closeViewer);
    root.addEventListener('click', (event) => { if (event.target === root) closeViewer(); });
    document.addEventListener('keydown', onKeydown);
    activeViewer = { root, trigger, onKeydown };
    close.focus();
  }

  function renderIcon(app, header) {
    const img = document.querySelector('.product-icon');
    const fallback = app?.icon?.fallback;
    if (!img || typeof fallback !== 'string' || !fallback) return;
    img.addEventListener('load', () => header.classList.add('has-product-icon'), { once: true });
    img.addEventListener('error', () => {
      img.removeAttribute('src');
      header.classList.remove('has-product-icon');
    }, { once: true });
    img.src = fallback;
  }

  function normalizeSections() {
    const content = document.querySelector('.product-content');
    if (!content) return;

    for (const label of content.querySelectorAll('.product-section-title')) {
      if (label.tagName !== 'H2') {
        const heading = document.createElement('h2');
        heading.className = label.className;
        heading.textContent = label.textContent;
        label.replaceWith(heading);
      }
    }

    for (const section of content.querySelectorAll('.product-section')) {
      const title = section.querySelector(':scope > .product-section-title')?.textContent?.trim().toLowerCase();
      if (title === 'who for') section.classList.add('is-secondary');
      if (title === 'privacy + support') {
        const footer = document.createElement('footer');
        footer.className = 'product-footer';
        const body = section.querySelector(':scope > div:not(.product-section-title)');
        if (body) footer.append(...body.childNodes);
        footer.append(document.createTextNode(' · '));
        const allApps = document.createElement('a');
        allApps.href = '/';
        allApps.textContent = 'all apps';
        footer.append(allApps);
        section.replaceWith(footer);
      }
    }
  }

  function renderScreenshots(app) {
    const screenshots = app?.screenshots || {};
    const groups = platformOrder
      .map((platform) => ({ platform, items: Array.isArray(screenshots[platform]) ? screenshots[platform] : [] }))
      .filter((group) => group.items.length);
    if (!groups.length) return;

    const content = document.querySelector('.product-content');
    if (!content || content.querySelector('[data-product-screenshots]')) return;
    const productName = document.querySelector('.product-title')?.textContent?.trim() || 'Product';
    const section = document.createElement('section');
    section.className = 'product-section product-screenshots';
    section.dataset.productScreenshots = '1';
    const heading = document.createElement('h2');
    heading.className = 'product-section-title';
    heading.textContent = 'screenshots';
    const platforms = document.createElement('div');
    platforms.className = 'product-shot-platforms';

    groups.forEach((group) => {
      const wrapper = document.createElement('section');
      wrapper.className = 'product-shot-group';
      const groupTitle = document.createElement('h3');
      groupTitle.className = 'product-shot-group-title';
      groupTitle.textContent = platformNames[group.platform] || group.platform;
      const gallery = document.createElement('div');
      gallery.className = 'product-shot-grid';

      group.items.forEach((src, index) => {
        const alt = `${productName} ${group.platform} screenshot ${index + 1}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-shot';
        button.setAttribute('aria-label', `Open ${alt}`);
        const image = document.createElement('img');
        image.src = src;
        image.alt = alt;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', () => {
          button.dataset.orientation = image.naturalHeight > image.naturalWidth * 1.12 ? 'portrait' : 'landscape';
        }, { once: true });
        button.append(image);
        button.addEventListener('click', () => openViewer(src, alt, button));
        gallery.append(button);
      });

      wrapper.append(groupTitle, gallery);
      platforms.append(wrapper);
    });

    section.append(heading, platforms);
    const faq = content.querySelector('.product-section.faq');
    if (faq) content.insertBefore(section, faq);
    else content.append(section);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    normalizeSections();
    const slug = document.body?.dataset?.appSlug || '';
    const header = document.querySelector('.product-header');
    const app = slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
    if (!header || !app) return;
    renderIcon(app, header);
    renderScreenshots(app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
