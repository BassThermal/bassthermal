(() => {
  'use strict';

  const VERSION = '1.0.0';
  const STORE_WINDOWS = 'https://apps.microsoft.com/search/publisher?name=BassThermal&hl=en-US&gl=CA';
  const STORE_ANDROID = 'https://play.google.com/store/apps/developer?id=BassThermal';

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

  function createPath(model) {
    const nav = document.createElement('nav');
    nav.className = 'bt-site-path';
    nav.setAttribute('aria-label', 'Breadcrumb');
    const list = document.createElement('ol');

    model.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = index === 0 ? 'bt-site-root' : 'bt-site-segment';
      if (index === 0) {
        const mark = document.createElement('span');
        mark.className = 'bt-site-mark-slot';
        mark.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img');
        image.className = 'bt-site-mark';
        image.alt = '';
        image.decoding = 'async';
        mark.append(image);
        row.append(mark);
      }
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

  function install() {
    const main = document.querySelector('main');
    if (!main) return false;
    let header = document.querySelector('.bt-site-header');
    if (header) return true;

    const legacyHome = document.querySelector('header.topline');
    header = document.createElement('header');
    header.className = 'bt-site-header';
    header.dataset.btSiteShell = VERSION;
    header.append(createPath(routeModel()), createPrimaryNavigation());

    if (legacyHome && main.contains(legacyHome)) legacyHome.replaceWith(header);
    else main.prepend(header);
    removeLegacyIdentity();
    document.documentElement.dataset.btSiteShell = VERSION;
    document.dispatchEvent(new CustomEvent('bt:site-shell-ready', { detail: { version: VERSION } }));
    return true;
  }

  window.BT_SITE_SHELL = Object.freeze({ version: VERSION, install, routeModel });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
