(() => {
  'use strict';

  const MICROSOFT_COMPONENT_SRC = 'https://get.microsoft.com/badge/ms-store-badge.bundled.js';
  const GOOGLE_BADGE_SRC = 'https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png';

  function microsoftDetails(anchor) {
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

  function ensureMicrosoftComponent() {
    if (document.querySelector(`script[src="${MICROSOFT_COMPONENT_SRC}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MICROSOFT_COMPONENT_SRC;
    script.dataset.msStoreBadgeComponent = '1';
    document.head.append(script);
  }

  function concealFallback(anchor) {
    if (anchor) anchor.classList.add('store-link-badged');
  }

  function makeMicrosoftBadge(details, surface, fallbackAnchor) {
    const wrapper = document.createElement('span');
    wrapper.className = 'store-badge-item microsoft-store-badge';
    const badge = document.createElement('ms-store-badge');
    badge.setAttribute('productid', details.productId);
    badge.setAttribute('cid', `bassthermal-${surface}`);
    badge.setAttribute('productname', productName());
    badge.setAttribute('window-mode', 'direct');
    badge.setAttribute('theme', 'auto');
    badge.setAttribute('size', 'large');
    badge.setAttribute('language', 'en-ca');
    badge.setAttribute('animation', 'off');
    wrapper.append(badge);
    customElements.whenDefined('ms-store-badge').then(() => concealFallback(fallbackAnchor));
    return wrapper;
  }

  function makeGoogleBadge(anchor, surface) {
    const link = document.createElement('a');
    link.className = 'store-badge-item google-play-badge';
    link.href = anchor.href;
    link.dataset.storeSurface = surface;
    link.setAttribute('aria-label', `Get ${productName()} on Google Play`);
    const image = document.createElement('img');
    image.src = GOOGLE_BADGE_SRC;
    image.alt = 'Get it on Google Play';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => concealFallback(anchor), { once: true });
    link.append(image);
    return link;
  }

  function mountBadges(surface, root, microsoftAnchor, googleAnchor) {
    if (!root || root.querySelector('[data-store-badges]')) return false;
    if (!microsoftAnchor && !googleAnchor) return false;
    const row = document.createElement('div');
    row.className = `store-badge-row store-badge-${surface}`;
    row.dataset.storeBadges = surface;
    if (microsoftAnchor) {
      const details = microsoftDetails(microsoftAnchor);
      if (details) {
        row.append(makeMicrosoftBadge(details, surface, microsoftAnchor));
        ensureMicrosoftComponent();
      }
    }
    if (googleAnchor) row.append(makeGoogleBadge(googleAnchor, surface));
    if (!row.childNodes.length) return false;
    root.append(row);
    return true;
  }

  function mountProductBadges() {
    const heading = document.querySelector('.product-heading');
    if (!heading) return false;
    return mountBadges(
      'product',
      heading,
      heading.querySelector('a.windows[href*="apps.microsoft.com/detail/"]'),
      heading.querySelector('a.android[href*="play.google.com/store/apps/details"]')
    );
  }

  function mountGuideBadges() {
    const cta = document.querySelector('.guide-cta');
    if (!cta) return false;
    return mountBadges(
      'guide',
      cta,
      cta.querySelector('a.windows[href*="apps.microsoft.com/detail/"]'),
      cta.querySelector('a.android[href*="play.google.com/store/apps/details"]')
    );
  }

  function ensureStyles() {
    if (document.querySelector('link[data-store-badge-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/microsoft-store-badge.css?v=4';
    link.dataset.storeBadgeStyle = '1';
    document.head.append(link);
  }

  function init() {
    ensureStyles();
    mountProductBadges() || mountGuideBadges();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
