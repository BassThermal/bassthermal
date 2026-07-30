(() => {
  'use strict';

  const data = window.BT_PUBLISHER_DATA;
  if (!data || document.documentElement.dataset.btPublisherShell === '1') return;
  document.documentElement.dataset.btPublisherShell = '1';

  const path = location.pathname.replace(/\/{2,}/g, '/');
  const main = document.querySelector('main');
  if (!main) return;
  main.id ||= 'main-content';

  const platformName = (value) => ({ web: 'Web', windows: 'Windows', android: 'Android' }[value] || value);
  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
  };
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

  function activeSection() {
    if (path.startsWith('/guides')) return '/guides/';
    if (path.startsWith('/releases')) return '/releases/';
    if (path.startsWith('/support')) return '/support/';
    if (path.startsWith('/about')) return '/about/';
    return '/';
  }

  function addShell() {
    const skip = link('#main-content', 'Skip to content', 'bt-skip');
    document.body.prepend(skip);

    const header = el('header', 'bt-site-header');
    header.setAttribute('aria-label', 'BassThermal site header');
    header.append(link('/', 'BASSTHERMAL', 'bt-wordmark'));

    const nav = el('nav', 'bt-nav');
    nav.setAttribute('aria-label', 'Primary');
    const current = activeSection();
    for (const [href, label] of [['/', 'Apps'], ['/guides/', 'Guides'], ['/releases/', 'Releases'], ['/support/', 'Support'], ['/about/', 'About']]) {
      const item = link(href, label);
      if (href === current) item.setAttribute('aria-current', 'page');
      nav.append(item);
    }
    header.append(nav);

    const stores = el('nav', 'bt-store-nav');
    stores.setAttribute('aria-label', 'Stores');
    stores.append(link('https://apps.microsoft.com/search/publisher?name=BassThermal&hl=en-US&gl=CA', 'Microsoft Store'));
    stores.append(link('https://play.google.com/store/apps/developer?id=BassThermal', 'Google Play'));
    header.append(stores);
    document.body.insertBefore(header, main);

    const footer = el('footer', 'bt-site-footer');
    const primary = el('nav');
    primary.setAttribute('aria-label', 'Footer');
    for (const [href, label] of [['/', 'Apps'], ['/guides/', 'Guides'], ['/releases/', 'Releases'], ['/support/', 'Support'], ['/about/', 'About']]) primary.append(link(href, label));
    footer.append(primary);
    const policy = el('nav');
    policy.setAttribute('aria-label', 'Policies');
    for (const [href, label] of [['/privacy/', 'Privacy'], ['/terms/', 'Terms'], ['/security/', 'Security']]) policy.append(link(href, label));
    footer.append(policy);
    footer.append(el('div', 'bt-footer-meta', `© ${new Date().getUTCFullYear()} BassThermal · Canada`));
    document.body.append(footer);
    document.body.classList.add('bt-shell-ready');
  }

  function addBreadcrumbSchema() {
    const crumbs = [];
    if (path === '/') return;
    crumbs.push({ name: 'BassThermal', item: 'https://bassthermal.com/' });
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'apps') crumbs.push({ name: 'Apps', item: 'https://bassthermal.com/' });
    if (parts[0] === 'guides') crumbs.push({ name: 'Guides', item: 'https://bassthermal.com/guides/' });
    if (parts[0] === 'releases') crumbs.push({ name: 'Releases', item: 'https://bassthermal.com/releases/' });
    const heading = document.querySelector('h1')?.textContent?.trim();
    if (heading) crumbs.push({ name: heading, item: `https://bassthermal.com${path}` });
    if (crumbs.length < 2) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.btBreadcrumbs = '1';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.item })) });
    document.head.append(script);
  }

  function productSlug() {
    return document.body.dataset.appSlug || '';
  }

  function productContent() {
    return document.querySelector('.product-content');
  }

  function productSection(title, className) {
    const section = el('section', `product-section bt-section ${className}`);
    section.append(el('div', 'product-section-title', title));
    return section;
  }

  function addProductFacts() {
    const slug = productSlug();
    const product = data.products[slug];
    const content = productContent();
    if (!product || !content || content.querySelector('.bt-product-facts')) return;

    const section = productSection('product facts', 'bt-product-facts');
    const facts = el('dl', 'bt-facts');
    const add = (label, value) => {
      if (!value) return;
      facts.append(el('dt', '', label), el('dd', '', value));
    };
    add('Platforms', product.platforms.map(platformName).join(' · '));
    add('Processing', product.processing);
    if (product.currentRelease) {
      add('Current release', product.currentRelease.version);
      add('Updated', formatDate(product.currentRelease.date));
    }
    add('Distribution', product.platforms.map((p) => p === 'web' ? 'Web' : p === 'windows' ? 'Microsoft Store' : 'Google Play').join(' · '));
    section.append(facts);

    const install = content.querySelector('.product-install-section');
    const privacy = [...content.querySelectorAll('.product-section')].find((node) => node.querySelector('.product-section-title')?.textContent?.trim().toLowerCase() === 'privacy + support');
    content.insertBefore(section, install || privacy || null);

    if (product.currentRelease) {
      const latest = productSection('latest release', 'bt-latest-release');
      latest.append(el('div', 'bt-release-name', `${product.name} ${product.currentRelease.version}`));
      latest.append(el('div', 'bt-release-meta', `${product.currentRelease.platforms.map(platformName).join(' · ')} · ${formatDate(product.currentRelease.date)}`));
      latest.append(el('div', 'bt-release-summary', product.currentRelease.summary));
      latest.append(link(`/releases/#${slug}`, 'View release history →'));
      content.insertBefore(latest, install || privacy || null);
    }

    if (privacy) {
      const body = privacy.querySelector(':scope > div:not(.product-section-title)');
      if (body && !body.querySelector('a[href="/releases/"]')) {
        body.append(document.createTextNode(' · '), link(`/releases/#${slug}`, 'release notes'));
      }
    }
  }

  function addHomeSupplement() {
    if (!main.classList.contains('home') || document.querySelector('.bt-home-supplement')) return;
    const wrap = el('section', 'bt-home-supplement');
    wrap.setAttribute('aria-label', 'Recent releases and guides');

    const releasePanel = el('section', 'bt-home-panel');
    releasePanel.append(el('h2', '', 'Recent releases'));
    const releaseList = el('div', 'bt-home-list');
    const releases = Object.entries(data.products).filter(([, product]) => product.currentRelease).sort((a, b) => b[1].currentRelease.date.localeCompare(a[1].currentRelease.date)).slice(0, 3);
    for (const [slug, product] of releases) {
      const item = link(`/releases/#${slug}`, '', 'bt-home-link');
      item.append(el('strong', '', `${product.name} ${product.currentRelease.version}`));
      item.append(el('span', '', formatDate(product.currentRelease.date)));
      releaseList.append(item);
    }
    releasePanel.append(releaseList, link('/releases/', 'All releases →'));

    const guidePanel = el('section', 'bt-home-panel');
    guidePanel.append(el('h2', '', 'Guides'));
    const guideList = el('div', 'bt-home-list');
    for (const [slug, title] of [['retrofy', 'Why limited palettes and dithering create a retro look'], ['coptic-dictionary', 'Search Coptic words, transliteration and English meanings'], ['rss-crawler', 'Find hidden RSS and Atom feeds on websites']]) {
      const product = data.products[slug];
      const item = link(product.guide, '', 'bt-home-link');
      item.append(el('strong', '', title));
      item.append(el('span', '', product.name));
      guideList.append(item);
    }
    guidePanel.append(guideList, link('/guides/', 'All guides →'));
    wrap.append(releasePanel, guidePanel);
    main.after(wrap);
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
  addShell();
  addBreadcrumbSchema();
  addProductFacts();
  addHomeSupplement();
  addSocialMetadata();
})();
