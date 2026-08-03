(() => {
  'use strict';

  const VERSION = '1.1.0';
  const BRAND_ASSET = '/assets/brand/bassthermal-mark-v1.webp';
  const STORE_WINDOWS = 'https://apps.microsoft.com/search/publisher?name=BassThermal&hl=en-US&gl=CA';
  const STORE_ANDROID = 'https://play.google.com/store/apps/developer?id=BassThermal';
  const BRAND_DEFAULTS = Object.freeze({
    schema: 'bassthermal.brand-defaults.v1',
    asset: Object.freeze({
      url: BRAND_ASSET,
      name: 'bassthermal-mark-v1.webp',
      type: 'image/webp',
      kind: 'image',
      bytes: 19612,
      width: 512,
      height: 512,
      sha256: '0d6f0043cc69126935ca71d04e85420872c1a1963486633df690fc3da124c61f'
    }),
    settings: Object.freeze({
      headerEnabled: true,
      markSize: 38,
      markGap: 8,
      markX: 0,
      markY: -1,
      markOpacity: 1,
      markGlow: 10,
      backgroundEnabled: true,
      backgroundOpacity: 0.23,
      backgroundScale: 1.1,
      backgroundX: 24,
      backgroundY: 48,
      backgroundBlur: 7,
      backgroundFit: 'contain',
      backgroundSpeed: 1,
      backgroundLoop: false,
      maskStrength: 0.26,
      reducedMotion: 'hide',
      mobilePolicy: 'allow'
    })
  });

  const titleCase = (value) => String(value || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  function cleanPath(pathname = location.pathname) {
    const value = String(pathname || '/').replace(/\/{2,}/g, '/');
    if (value === '/index.html') return '/';
    return value.endsWith('/') ? value : `${value}/`;
  }

  function pageHeading() {
    return document.querySelector('h1')?.textContent?.trim() || '';
  }

  function appLabel() {
    const title = document.querySelector('.product-title')?.textContent?.trim();
    if (title) return title;
    const kicker = document.querySelector('.guide-kicker')?.textContent?.trim();
    if (kicker) return kicker.replace(/\s+guide$/i, '').trim();
    const heading = pageHeading();
    return heading.replace(/\s+privacy$/i, '').trim();
  }

  function routeModel(pathname = location.pathname) {
    const path = cleanPath(pathname);
    const parts = path.split('/').filter(Boolean);
    if (path === '/') return [{ label: 'bassthermal', href: '/' }];

    const root = { label: 'bassthermal', href: '/' };
    if (parts[0] === 'apps') {
      return [root, { label: appLabel() || titleCase(parts[1]), current: true }];
    }
    if (parts[0] === 'guides') {
      if (parts.length === 1) return [root, { label: 'Guides', current: true }];
      return [
        root,
        { label: 'Guides', href: '/guides/' },
        { label: appLabel() || titleCase(parts[1]), current: true }
      ];
    }
    if (parts[0] === 'privacy') {
      if (parts.length === 1) return [root, { label: 'Privacy', current: true }];
      return [
        root,
        { label: 'Privacy', href: '/privacy/' },
        { label: appLabel() || titleCase(parts[1]), current: true }
      ];
    }
    return [root, { label: pageHeading() || titleCase(parts[0]), current: true }];
  }

  function link(href, label, className = '') {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = label;
    if (className) anchor.className = className;
    return anchor;
  }

  function createMark() {
    const mark = document.createElement('span');
    mark.className = 'bt-site-mark-slot';
    mark.dataset.ready = '1';
    mark.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.className = 'bt-site-mark';
    image.src = BRAND_ASSET;
    image.alt = '';
    image.decoding = 'async';
    image.fetchPriority = 'high';
    mark.append(image);
    return mark;
  }

  function createPath(model) {
    const nav = document.createElement('nav');
    nav.className = 'bt-site-path';
    nav.setAttribute('aria-label', 'Breadcrumb');
    const list = document.createElement('ol');

    model.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = index === 0 ? 'bt-site-root' : 'bt-site-segment';
      if (index === 0) row.append(createMark());
      if (item.href) row.append(link(item.href, item.label, index === 0 ? 'bt-site-wordmark' : ''));
      else {
        const span = document.createElement('span');
        span.textContent = item.label;
        if (item.current) span.setAttribute('aria-current', 'page');
        row.append(span);
      }
      list.append(row);
    });
    nav.append(list);
    return nav;
  }

  function createPrimaryNavigation() {
    const nav = document.createElement('nav');
    nav.className = 'bt-site-primary';
    nav.setAttribute('aria-label', 'Primary');
    const links = [
      ['/guides/', 'Guides'],
      ['/support/', 'Support'],
      [STORE_WINDOWS, 'Microsoft Store'],
      [STORE_ANDROID, 'Google Play']
    ];
    links.forEach(([href, label]) => nav.append(link(href, label)));
    return nav;
  }

  function removeLegacyIdentity() {
    document.querySelectorAll('.product-breadcrumb, .guide-breadcrumb').forEach((node) => node.remove());
    const publisherPath = document.querySelector('.bt-page-head > .dim:first-child');
    if (publisherPath && /bassthermal\s*\//i.test(publisherPath.textContent || '')) publisherPath.remove();
  }

  function ensureMark(header) {
    const slot = header.querySelector('.bt-site-mark-slot');
    const image = slot?.querySelector('.bt-site-mark');
    if (!slot || !image) return;
    if (!image.getAttribute('src')) image.src = BRAND_ASSET;
    slot.dataset.ready = '1';
  }

  function ensureDefaultBackground() {
    if (document.getElementById('btBrandBackground')) return;
    const root = document.createElement('div');
    root.id = 'btBrandBackground';
    root.dataset.active = '1';
    root.dataset.default = '1';
    root.setAttribute('aria-hidden', 'true');
    const media = document.createElement('div');
    media.className = 'bt-brand-media';
    const image = document.createElement('img');
    image.className = 'bt-brand-background-asset';
    image.src = BRAND_ASSET;
    image.alt = '';
    image.decoding = 'async';
    const mask = document.createElement('div');
    mask.className = 'bt-brand-mask';
    media.append(image);
    root.append(media, mask);
    document.body.prepend(root);
  }

  function announceReady() {
    document.documentElement.dataset.btSiteShell = VERSION;
    if (!document.documentElement.dataset.btBrandFit) document.documentElement.dataset.btBrandFit = 'contain';
    document.dispatchEvent(new CustomEvent('bt:site-shell-ready', { detail: { version: VERSION } }));
  }

  function install() {
    const main = document.querySelector('main');
    if (!main) return false;
    ensureDefaultBackground();
    let header = document.querySelector('.bt-site-header');
    if (header) {
      ensureMark(header);
      announceReady();
      return true;
    }

    const legacyHome = document.querySelector('header.topline');
    header = document.createElement('header');
    header.className = 'bt-site-header';
    header.dataset.btSiteShell = VERSION;
    header.append(createPath(routeModel()), createPrimaryNavigation());

    if (legacyHome && main.contains(legacyHome)) legacyHome.replaceWith(header);
    else main.prepend(header);
    removeLegacyIdentity();
    announceReady();
    return true;
  }

  window.BT_BRAND_DEFAULTS = BRAND_DEFAULTS;
  window.BT_SITE_SHELL = Object.freeze({ version: VERSION, install, routeModel });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
