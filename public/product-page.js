(() => {
  'use strict';

  let initialized = false;
  let activeViewer = null;
  const platformOrder = ['windows', 'android', 'web'];
  const platformNames = { windows: 'Windows', android: 'Android', web: 'Web' };
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  function ensureStyles() {
    for (const [href, key] of [['/product-page-v2.css?v=3', 'product-page-v2'], ['/product-page-media.css?v=3', 'product-page-media']]) {
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
    let touchX = 0;
    let touchY = 0;

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
      image.src = items[index];
      image.alt = `${productName} ${platform} screenshot ${index + 1} of ${items.length}`;
      status.textContent = `${index + 1} / ${items.length}`;
      previous.hidden = next.hidden = items.length < 2;
    }
    function move(direction) {
      if (items.length < 2) return;
      index = (index + direction + items.length) % items.length;
      render();
    }
    const onKeydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeViewer(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    };

    close.addEventListener('click', closeViewer);
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    root.addEventListener('click', (event) => { if (event.target === root) closeViewer(); });
    root.addEventListener('touchstart', (event) => {
      touchX = event.changedTouches[0].clientX;
      touchY = event.changedTouches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchX;
      const dy = touch.clientY - touchY;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
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
    const image = document.querySelector('.product-icon');
    const src = app?.icon?.fallback;
    if (!image || typeof src !== 'string' || !src) return;
    image.addEventListener('load', () => header.classList.add('has-product-icon'), { once: true });
    image.addEventListener('error', () => {
      image.removeAttribute('src');
      header.classList.remove('has-product-icon');
    }, { once: true });
    image.src = src;
  }

  function normalizeSections() {
    const content = document.querySelector('.product-content');
    if (!content) return null;
    for (const label of content.querySelectorAll('.product-section-title')) {
      if (label.tagName === 'H2') continue;
      const heading = document.createElement('h2');
      heading.className = label.className;
      heading.textContent = label.textContent;
      label.replaceWith(heading);
    }
    for (const section of content.querySelectorAll('.product-section')) {
      const title = section.querySelector(':scope > .product-section-title')?.textContent?.trim().toLowerCase();
      if (title === 'who for') section.classList.add('is-secondary');
      if (title !== 'privacy + support') continue;
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
    return content;
  }

  function sectionByTitle(content, expected) {
    return [...content.querySelectorAll(':scope > .product-section')].find((section) =>
      section.querySelector(':scope > .product-section-title')?.textContent?.trim().toLowerCase() === expected
    ) || null;
  }

  function groupsFor(app) {
    const screenshots = app?.screenshots || {};
    return platformOrder.map((key) => ({
      key,
      label: platformNames[key] || key,
      items: Array.isArray(screenshots[key]) ? screenshots[key].filter((src) => typeof src === 'string' && src) : [],
      activeIndex: 0
    })).filter((group) => group.items.length);
  }

  function buildExplorer(initialGroups, productName, onEmpty) {
    let groups = initialGroups;
    let activeGroupIndex = 0;
    let selectionToken = 0;
    let touchX = 0;
    let touchY = 0;
    let thumbnailButtons = [];

    const explorer = document.createElement('section');
    explorer.className = 'product-stage-media';
    explorer.dataset.productScreenshots = '1';
    explorer.setAttribute('aria-label', `${productName} screenshots`);
    const head = document.createElement('div');
    head.className = 'product-media-head';
    const heading = document.createElement('h2');
    heading.className = 'product-section-title';
    heading.textContent = 'screenshots';
    const platforms = document.createElement('div');
    platforms.className = 'product-media-platforms';
    platforms.setAttribute('aria-label', 'Screenshot platform');
    const canvas = document.createElement('div');
    canvas.className = 'product-shot-canvas';
    const stage = document.createElement('div');
    stage.className = 'product-shot-stage';
    stage.dataset.orientation = 'landscape';
    const stageButton = document.createElement('button');
    stageButton.type = 'button';
    stageButton.className = 'product-shot-stage-button';
    const image = document.createElement('img');
    image.decoding = 'async';
    image.loading = 'eager';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'product-shot-canvas-nav product-shot-canvas-prev';
    previous.textContent = '‹';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'product-shot-canvas-nav product-shot-canvas-next';
    next.textContent = '›';
    const utility = document.createElement('div');
    utility.className = 'product-shot-utility';
    const status = document.createElement('span');
    status.className = 'product-shot-canvas-status';
    status.setAttribute('aria-live', 'polite');
    const fullSize = document.createElement('button');
    fullSize.type = 'button';
    fullSize.className = 'product-shot-fullsize';
    fullSize.textContent = 'open full size ↗';
    const thumbs = document.createElement('div');
    thumbs.className = 'product-shot-thumbs';

    const activeGroup = () => groups[activeGroupIndex] || null;
    function activeIndex(group = activeGroup()) {
      if (!group?.items.length) return 0;
      group.activeIndex = Math.max(0, Math.min(group.activeIndex, group.items.length - 1));
      return group.activeIndex;
    }
    function preloadAdjacent(group) {
      if (!group || group.items.length < 2) return;
      const index = activeIndex(group);
      for (const candidate of [group.items[(index - 1 + group.items.length) % group.items.length], group.items[(index + 1) % group.items.length]]) {
        const probe = new Image();
        probe.decoding = 'async';
        probe.src = candidate;
      }
    }
    function updateControls() {
      const group = activeGroup();
      if (!group) return;
      explorer.dataset.platform = group.key;
      platforms.querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-pressed', index === activeGroupIndex ? 'true' : 'false'));
      previous.setAttribute('aria-label', `Previous ${group.label} screenshot`);
      next.setAttribute('aria-label', `Next ${group.label} screenshot`);
      fullSize.setAttribute('aria-label', `Open ${productName} ${group.label} screenshot full size`);
      const multiple = group.items.length > 1;
      previous.hidden = next.hidden = status.hidden = !multiple;
      thumbs.hidden = !multiple;
      status.textContent = `${activeIndex(group) + 1} / ${group.items.length}`;
    }
    function rebuildThumbnails() {
      const group = activeGroup();
      thumbs.replaceChildren();
      thumbnailButtons = [];
      if (!group || group.items.length < 2) return;
      thumbs.setAttribute('aria-label', `${productName} ${group.label} screenshot thumbnails`);
      group.items.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-shot-thumb';
        button.setAttribute('aria-label', `Show ${productName} ${group.label} screenshot ${index + 1}`);
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        thumb.addEventListener('load', () => {
          button.dataset.orientation = thumb.naturalWidth / thumb.naturalHeight < .89 ? 'portrait' : 'landscape';
        }, { once: true });
        thumb.addEventListener('error', () => removeItem(group, index), { once: true });
        button.append(thumb);
        button.addEventListener('click', () => select(index, true));
        thumbs.append(button);
        thumbnailButtons.push(button);
      });
    }
    function removeItem(group, index) {
      if (!groups.includes(group) || index < 0 || index >= group.items.length) return;
      group.items.splice(index, 1);
      if (group.activeIndex >= group.items.length) group.activeIndex = Math.max(0, group.items.length - 1);
      if (!group.items.length) {
        const groupIndex = groups.indexOf(group);
        groups.splice(groupIndex, 1);
        activeGroupIndex = Math.max(0, Math.min(activeGroupIndex, groups.length - 1));
        if (!groups.length) { explorer.remove(); onEmpty?.(); return; }
        rebuildPlatformButtons();
        rebuildThumbnails();
        select(activeIndex(), false);
        return;
      }
      rebuildThumbnails();
      select(activeIndex(group), false);
    }
    async function select(nextIndex, userInitiated = false) {
      const group = activeGroup();
      if (!group?.items.length) return;
      group.activeIndex = (nextIndex + group.items.length) % group.items.length;
      const index = group.activeIndex;
      const src = group.items[index];
      const token = ++selectionToken;
      if (!reducedMotion()) image.classList.add('is-changing');
      const probe = new Image();
      probe.decoding = 'async';
      probe.src = src;
      try {
        if (probe.decode) await probe.decode();
        else await new Promise((resolve, reject) => { probe.onload = resolve; probe.onerror = reject; });
      } catch {
        if (token === selectionToken) removeItem(group, index);
        return;
      }
      if (token !== selectionToken || activeGroup() !== group) return;
      const orientation = probe.naturalWidth / probe.naturalHeight < .89 ? 'portrait' : 'landscape';
      stage.dataset.orientation = orientation;
      stage.style.setProperty('--shot-ratio', String(probe.naturalWidth / probe.naturalHeight || 1.6));
      image.src = src;
      image.alt = `${productName} ${group.label} screenshot ${index + 1} of ${group.items.length}`;
      stageButton.setAttribute('aria-label', `Open ${image.alt}`);
      thumbnailButtons.forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false'));
      updateControls();
      requestAnimationFrame(() => image.classList.remove('is-changing'));
      if (userInitiated) thumbnailButtons[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      preloadAdjacent(group);
    }
    function move(direction) {
      const group = activeGroup();
      if (group?.items.length > 1) select(activeIndex(group) + direction, true);
    }
    function setPlatform(index, userInitiated = false) {
      if (!groups[index]) return;
      activeGroupIndex = index;
      rebuildThumbnails();
      updateControls();
      select(activeIndex(), userInitiated);
    }
    function rebuildPlatformButtons() {
      platforms.replaceChildren();
      groups.forEach((group, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `product-media-platform is-${group.key}`;
        button.textContent = group.label;
        button.setAttribute('aria-pressed', index === activeGroupIndex ? 'true' : 'false');
        button.addEventListener('click', () => setPlatform(index, true));
        platforms.append(button);
      });
      platforms.hidden = groups.length < 2;
    }

    stageButton.addEventListener('click', () => {
      const group = activeGroup();
      if (group) openViewer(group.items, activeIndex(group), productName, group.label, stageButton);
    });
    fullSize.addEventListener('click', () => {
      const group = activeGroup();
      if (group) openViewer(group.items, activeIndex(group), productName, group.label, fullSize);
    });
    stageButton.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    stage.addEventListener('touchstart', (event) => {
      touchX = event.changedTouches[0].clientX;
      touchY = event.changedTouches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchX;
      const dy = touch.clientY - touchY;
      if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
    }, { passive: true });

    head.append(heading, platforms);
    stageButton.append(image);
    stage.append(stageButton, previous, next);
    utility.append(status, fullSize);
    canvas.append(stage, utility, thumbs);
    explorer.append(head, canvas);
    rebuildPlatformButtons();
    rebuildThumbnails();
    updateControls();
    select(0, false);
    return explorer;
  }

  function composeProduct(content, header, app) {
    const stage = document.createElement('section');
    stage.className = 'product-stage';
    const identity = document.createElement('div');
    identity.className = 'product-stage-identity';
    header.replaceWith(stage);
    identity.append(header);
    stage.append(identity);

    const summary = document.createElement('div');
    summary.className = 'product-stage-summary';
    for (const title of ['overview', 'workflow']) {
      const section = sectionByTitle(content, title);
      if (section) summary.append(section);
    }
    if (summary.childElementCount) stage.append(summary);
    else stage.classList.add('has-no-summary');

    const productName = document.querySelector('.product-title')?.textContent?.trim() || 'Product';
    const groups = groupsFor(app);
    if (groups.length) {
      const explorer = buildExplorer(groups, productName, () => stage.classList.add('is-text-only'));
      stage.insertBefore(explorer, summary.isConnected ? summary : null);
    } else {
      stage.classList.add('is-text-only');
    }
    content.classList.add('product-content-secondary');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    const content = normalizeSections();
    const slug = document.body?.dataset?.appSlug || '';
    const header = document.querySelector('.product-header');
    const app = slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
    if (!content || !header || !app) return;
    renderIcon(app, header);
    composeProduct(content, header, app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
