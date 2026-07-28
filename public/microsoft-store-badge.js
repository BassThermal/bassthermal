(() => {
  'use strict';

  const COMPONENT_SRC = 'https://get.microsoft.com/badge/ms-store-badge.bundled.js';

  function storeDetails(anchor) {
    if (!anchor) return null;
    const match = anchor.href.match(/apps\.microsoft\.com\/detail\/([^/?#]+)/i);
    if (!match) return null;
    return { productId: match[1], href: anchor.href };
  }

  function productName() {
    return document.querySelector('.product-title')?.textContent?.trim()
      || document.querySelector('.guide-kicker')?.textContent?.replace(/\s+(guide|workflow)$/i, '').trim()
      || document.querySelector('h1')?.textContent?.trim()
      || 'BassThermal app';
  }

  function ensureComponent() {
    if (document.querySelector(`script[src="${COMPONENT_SRC}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = COMPONENT_SRC;
    script.dataset.msStoreBadgeComponent = '1';
    document.head.append(script);
  }

  function makeBadge(details, surface) {
    const badge = document.createElement('ms-store-badge');
    badge.setAttribute('productid', details.productId);
    badge.setAttribute('cid', `bassthermal-${surface}`);
    badge.setAttribute('productname', productName());
    badge.setAttribute('window-mode', 'direct');
    badge.setAttribute('theme', 'auto');
    badge.setAttribute('size', 'large');
    badge.setAttribute('language', 'en-ca');
    badge.setAttribute('animation', 'on');
    return badge;
  }

  function mountProductBadge() {
    const heading = document.querySelector('.product-heading');
    if (!heading || heading.querySelector('[data-ms-store-badge]')) return false;
    const anchor = heading.querySelector('a.windows[href*="apps.microsoft.com/detail/"]');
    const details = storeDetails(anchor);
    if (!details) return false;
    const slot = document.createElement('div');
    slot.className = 'ms-store-badge-slot ms-store-badge-product';
    slot.dataset.msStoreBadge = 'product';
    slot.append(makeBadge(details, 'product'));
    heading.append(slot);
    return true;
  }

  function mountGuideBadge() {
    const cta = document.querySelector('.guide-cta');
    if (!cta || cta.querySelector('[data-ms-store-badge]')) return false;
    const anchor = cta.querySelector('a.windows[href*="apps.microsoft.com/detail/"]');
    const details = storeDetails(anchor);
    if (!details) return false;
    const slot = document.createElement('div');
    slot.className = 'ms-store-badge-slot ms-store-badge-guide';
    slot.dataset.msStoreBadge = 'guide';
    slot.append(makeBadge(details, 'guide'));
    cta.append(slot);
    return true;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-ms-store-badge-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/microsoft-store-badge.css';
    link.dataset.msStoreBadgeStyle = '1';
    document.head.append(link);
  }

  function init() {
    ensureStyles();
    const mounted = mountProductBadge() || mountGuideBadge();
    if (mounted) ensureComponent();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
