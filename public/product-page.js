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

  function openViewer(items, startIndex, productName, platform, trigger) {
    closeViewer();
    if (!Array.isArray(items) || !items.length) return;

    let index = Math.max(0, Math.min(startIndex, items.length - 1));
    let touchStartX = 0;
    let touchStartY = 0;

    const root = document.createElement('div');
    root.className = 'product-shot-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${productName} ${platform} screenshots`);

    const frame = document.createElement('div');
    frame.className = 'product-shot-viewer-frame';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'product-shot-viewer-close';
    close.setAttribute('aria-label', 'Close screenshot viewer');
    close.textContent = '×';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'product-shot-viewer-nav product-shot-viewer-prev';
    previous.setAttribute('aria-label', 'Previous screenshot');
    previous.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'product-shot-viewer-nav product-shot-viewer-next';
    next.setAttribute('aria-label', 'Next screenshot');
    next.textContent = '›';

    const image = document.createElement('img');
    image.decoding = 'async';

    const status = document.createElement('div');
    status.className = 'product-shot-viewer-status';
    status.setAttribute('aria-live', 'polite');

    function render() {
      const src = items[index];
      image.src = src;
      image.alt = `${productName} ${platform} screenshot ${index + 1} of ${items.length}`;
      status.textContent = `${index + 1} / ${items.length}`;
      const hasMultiple = items.length > 1;
      previous.hidden = !hasMultiple;
      next.hidden = !hasMultiple;
    }

    function move(direction) {
      if (items.length < 2) return;
      index = (index + direction + items.length) % items.length;
      render();
    }

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeViewer();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    };

    close.addEventListener('click', closeViewer);
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    root.addEventListener('click', (event) => { if (event.target === root) closeViewer(); });
    root.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    root.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      move(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    frame.append(close, previous, image, next, status);
    root.append(frame);
    document.body.append(root);
    document.addEventListener('keydown', onKeydown);
    activeViewer = { root, trigger, onKeydown };
    render();
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

  function orientationFor(image) {
    return image.naturalHeight > image.naturalWidth * 1.12 ? 'portrait' : 'landscape';
  }

  function buildCanvas(items, productName, platform) {
    let index = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const canvas = document.createElement('div');
    canvas.className = 'product-shot-canvas';

    const stage = document.createElement('div');
    stage.className = 'product-shot-stage';

    const stageButton = document.createElement('button');
    stageButton.type = 'button';
    stageButton.className = 'product-shot-stage-button';

    const image = document.createElement('img');
    image.decoding = 'async';
    image.loading = 'eager';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'product-shot-canvas-nav product-shot-canvas-prev';
    previous.setAttribute('aria-label', `Previous ${platform} screenshot`);
    previous.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'product-shot-canvas-nav product-shot-canvas-next';
    next.setAttribute('aria-label', `Next ${platform} screenshot`);
    next.textContent = '›';

    const status = document.createElement('div');
    status.className = 'product-shot-canvas-status';
    status.setAttribute('aria-live', 'polite');

    const thumbs = document.createElement('div');
    thumbs.className = 'product-shot-thumbs';
    thumbs.setAttribute('aria-label', `${productName} ${platform} screenshot thumbnails`);

    const thumbButtons = items.map((src, thumbIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-shot-thumb';
      button.setAttribute('aria-label', `Show ${productName} ${platform} screenshot ${thumbIndex + 1}`);
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.addEventListener('load', () => { button.dataset.orientation = orientationFor(thumb); }, { once: true });
      button.append(thumb);
      button.addEventListener('click', () => select(thumbIndex, true));
      thumbs.append(button);
      return button;
    });

    function select(nextIndex, focusThumb = false) {
      index = (nextIndex + items.length) % items.length;
      image.src = items[index];
      image.alt = `${productName} ${platform} screenshot ${index + 1} of ${items.length}`;
      stageButton.setAttribute('aria-label', `Open ${image.alt}`);
      status.textContent = `${index + 1} / ${items.length}`;
      thumbButtons.forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false'));
      thumbButtons[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      if (focusThumb) stageButton.focus();
    }

    function move(direction) {
      if (items.length < 2) return;
      select(index + direction);
    }

    image.addEventListener('load', () => { stage.dataset.orientation = orientationFor(image); });
    stageButton.addEventListener('click', () => openViewer(items, index, productName, platform, stageButton));
    stageButton.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    });
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    stage.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      move(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    const hasMultiple = items.length > 1;
    previous.hidden = !hasMultiple;
    next.hidden = !hasMultiple;
    status.hidden = !hasMultiple;
    if (!hasMultiple) thumbs.hidden = true;

    stageButton.append(image);
    stage.append(stageButton, previous, next, status);
    canvas.append(stage, thumbs);
    select(0);
    return canvas;
  }

  function renderScreenshots(app) {
    const screenshots = app?.screenshots || {};
    const groups = platformOrder
      .map((platform) => ({ platform, items: Array.isArray(screenshots[platform]) ? screenshots[platform].filter((src) => typeof src === 'string' && src) : [] }))
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
      wrapper.append(groupTitle, buildCanvas(group.items, productName, platformNames[group.platform] || group.platform));
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
