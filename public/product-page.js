(() => {
  'use strict';

  let initialized = false;

  function ensureStyles() {
    for (const [href, key] of [['/product-page-v2.css?v=5', 'product-page-v2'], ['/product-page-media.css?v=4', 'product-page-media']]) {
      if (document.querySelector(`link[data-product-style="${key}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.productStyle = key;
      document.head.appendChild(link);
    }
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
        document.head.appendChild(script);
      }
      script.addEventListener('load', () => window.BTScreenshotExplorer ? resolve(window.BTScreenshotExplorer) : reject(new Error('Screenshot explorer unavailable')), { once: true });
      script.addEventListener('error', reject, { once: true });
    });
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

  function removeGenericInstallFaq(content) {
    const faq = [...content.querySelectorAll(':scope > .product-section.faq')][0];
    if (!faq) return;
    for (const item of faq.querySelectorAll(':scope > div:not(.product-section-title)')) {
      const question = item.querySelector(':scope > .q')?.textContent?.trim().toLowerCase() || '';
      if (question === 'where do i install it?' || question === 'where can i install it?' || question === 'where is it installed?') item.remove();
    }
    if (!faq.querySelector(':scope > div:not(.product-section-title)')) faq.remove();
  }

  function createInstallSection(content, header) {
    const platforms = header.querySelector('.product-platforms');
    if (!platforms?.querySelector('a[href]')) return null;

    const productName = document.querySelector('.product-title')?.textContent?.trim() || 'this app';
    const section = document.createElement('section');
    section.className = 'product-section product-install-section';
    section.dataset.productInstall = '1';

    const heading = document.createElement('h2');
    heading.className = 'product-section-title';
    heading.textContent = 'install';

    const body = document.createElement('div');
    body.className = 'product-install-body';
    const title = document.createElement('div');
    title.className = 'product-install-title';
    title.textContent = `Get ${productName}`;
    const actions = document.createElement('div');
    actions.className = 'product-install-actions';
    actions.append(platforms);
    body.append(title, actions);
    section.append(heading, body);

    const faq = [...content.querySelectorAll(':scope > .product-section.faq')][0];
    const footer = content.querySelector(':scope > .product-footer');
    content.insertBefore(section, faq || footer || null);
    return section;
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
      if (title === 'guide' || title === 'guides') {
        section.classList.add('is-guide-action');
        const anchor = section.querySelector('a[href]');
        if (anchor) anchor.classList.add('product-guide-link');
      }
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
    removeGenericInstallFaq(content);
    return content;
  }

  function sectionByTitles(content, expected) {
    const titles = new Set(expected.map((value) => value.toLowerCase()));
    return [...content.querySelectorAll(':scope > .product-section')].find((section) =>
      titles.has(section.querySelector(':scope > .product-section-title')?.textContent?.trim().toLowerCase())
    ) || null;
  }

  function composeProduct(content, header, app, runtime) {
    const stage = document.createElement('section');
    stage.className = 'product-stage';
    const identity = document.createElement('div');
    identity.className = 'product-stage-identity';
    header.replaceWith(stage);
    identity.append(header);
    stage.append(identity);

    const summary = document.createElement('div');
    summary.className = 'product-stage-summary';
    for (const aliases of [['what it does', 'overview'], ['how it works', 'workflow']]) {
      const section = sectionByTitles(content, aliases);
      if (section) summary.append(section);
    }
    if (summary.childElementCount) stage.append(summary);
    else stage.classList.add('has-no-summary');

    const productName = document.querySelector('.product-title')?.textContent?.trim() || 'Product';
    const groups = runtime.groupsFor(app);
    if (groups.length) {
      const explorer = runtime.build({
        groups,
        productName,
        onEmpty: () => stage.classList.add('is-text-only')
      });
      stage.insertBefore(explorer, summary.isConnected ? summary : null);
    } else {
      stage.classList.add('is-text-only');
    }
    content.classList.add('product-content-secondary');
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    const content = normalizeSections();
    const slug = document.body?.dataset?.appSlug || '';
    const header = document.querySelector('.product-header');
    const app = slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
    if (!content || !header || !app) return;

    createInstallSection(content, header);
    renderIcon(app, header);
    document.dispatchEvent(new CustomEvent('bt:product-install-ready'));

    try {
      const runtime = await ensureExplorerRuntime();
      composeProduct(content, header, app, runtime);
    } catch {
      content.classList.add('product-content-secondary');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
