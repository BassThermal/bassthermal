(() => {
  'use strict';

  function ensureAccentSystem() {
    if (!document.querySelector('link[data-bt-accent-style]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/bt-accent-system.css?v=2';
      style.dataset.btAccentStyle = '1';
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-bt-accent-runtime]')) {
      const script = document.createElement('script');
      script.src = '/bt-accent-system.js?v=1';
      script.defer = true;
      script.dataset.btAccentRuntime = '1';
      document.head.appendChild(script);
    }
  }

  ensureAccentSystem();

  const data = window.BT_PUBLISHER_DATA;
  if (!data || document.documentElement.dataset.btPublisherContext === '1') return;
  document.documentElement.dataset.btPublisherContext = '1';

  const path = location.pathname.replace(/\/{2,}/g, '/');
  const main = document.querySelector('main');
  if (!main) return;
  main.id ||= 'main-content';

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const link = (href, text, className = '') => {
    const node = el('a', className, text);
    node.href = href;
    return node;
  };

  function addBuildIdentity() {
    let meta = document.querySelector('meta[name="bt-site-build"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'bt-site-build';
      document.head.append(meta);
    }
    meta.content = data.build;
  }

  function addSkipLink() {
    if (document.querySelector('.bt-skip')) return;
    document.body.prepend(link('#main-content', 'Skip to content', 'bt-skip'));
  }

  function addBreadcrumbSchema() {
    if (path === '/' || document.querySelector('script[data-bt-breadcrumbs]')) return;
    const crumbs = [{ name: 'BassThermal', item: 'https://bassthermal.com/' }];
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'apps') crumbs.push({ name: 'Apps', item: 'https://bassthermal.com/' });
    if (parts[0] === 'guides') crumbs.push({ name: 'Guides', item: 'https://bassthermal.com/guides/' });
    const heading = document.querySelector('h1')?.textContent?.trim();
    if (heading) crumbs.push({ name: heading, item: `https://bassthermal.com${path}` });
    if (crumbs.length < 2) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.btBreadcrumbs = '1';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.item
      }))
    });
    document.head.append(script);
  }

  function addPublisherPageFooter() {
    if (!main.classList.contains('bt-publisher-page') || document.querySelector('.bt-context-footer')) return;
    const footer = el('footer', 'foot bt-context-footer');
    footer.append(link('/', 'all apps'));
    if (path !== '/about/') footer.append(document.createTextNode(' · '), link('/about/', 'about'));
    if (path !== '/support/') footer.append(document.createTextNode(' · '), link('/support/', 'support'));
    if (path !== '/privacy/') footer.append(document.createTextNode(' · '), link('/privacy/', 'privacy'));
    if (path !== '/terms/') footer.append(document.createTextNode(' · '), link('/terms/', 'terms'));
    if (path !== '/security/') footer.append(document.createTextNode(' · '), link('/security/', 'security'));
    main.append(footer);
  }

  function addSocialMetadata() {
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.content || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const ensure = (property, content) => {
      if (!content || document.querySelector(`meta[property="${property}"]`)) return;
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.content = content;
      document.head.append(meta);
    };
    ensure('og:title', title);
    ensure('og:description', description);
    ensure('og:type', document.querySelector('.guide-page') ? 'article' : 'website');
    ensure('og:url', canonical);
    if (!document.querySelector('meta[name="twitter:card"]')) {
      const card = document.createElement('meta');
      card.name = 'twitter:card';
      card.content = 'summary';
      document.head.append(card);
    }
  }

  addBuildIdentity();
  addSkipLink();
  addBreadcrumbSchema();
  addPublisherPageFooter();
  addSocialMetadata();
})();
