import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const validateOnly = process.argv.includes('--validate-only');
const content = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bt-site-content.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bt-catalog.json'), 'utf8'));
const errors = [];
const ensure = (condition, message) => { if (!condition) errors.push(message); };
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const json = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const write = (relative, value) => {
  const target = path.join(publicRoot, relative);
  if (!validateOnly) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value, 'utf8');
  }
};
const appBySlug = new Map(catalog.apps.map((app) => [app.slug, app]));
const platformNames = { web: 'Web', windows: 'Windows', android: 'Android' };

ensure(content.schema === 'BT-SITE-CONTENT-1', 'site content schema is invalid');
ensure(Object.keys(content.products || {}).length === catalog.apps.length, 'site content and catalog product counts differ');

function metaHead({ title, description, canonical, type = 'website' }) {
  return `  <title>${escapeHtml(title)}</title>\n  <meta name="description" content="${escapeHtml(description)}">\n  <link rel="canonical" href="${escapeHtml(canonical)}">\n  <meta property="og:title" content="${escapeHtml(title)}">\n  <meta property="og:description" content="${escapeHtml(description)}">\n  <meta property="og:type" content="${type}">\n  <meta property="og:url" content="${escapeHtml(canonical)}">\n  <meta name="twitter:card" content="summary">`;
}

function platformLinks(app) {
  return [['web', app.links?.web], ['windows', app.links?.windows], ['android', app.links?.android]]
    .filter(([, href]) => href)
    .map(([key, href]) => `<a class="tag ${key}" href="${escapeHtml(href)}">${platformNames[key]}</a>`)
    .join(' ');
}

function downloadUrls(app) {
  return [app.links?.web, app.links?.windows, app.links?.android].filter(Boolean);
}

function productPage(app, source) {
  const canonical = `https://bassthermal.com/apps/${app.slug}/`;
  const downloads = downloadUrls(app);
  const schema = {
    '@context': 'https://schema.org',
    '@type': app.seo.schemaType || 'SoftwareApplication',
    name: app.name,
    applicationCategory: app.seo.applicationCategory,
    operatingSystem: app.seo.operatingSystem,
    description: source.short,
    publisher: { '@type': 'Organization', name: 'BassThermal', url: 'https://bassthermal.com/' },
    downloadUrl: downloads.length === 1 ? downloads[0] : downloads
  };
  const faq = source.faq?.length ? `\n      <section class="product-section faq"><h2 class="product-section-title">questions</h2>${source.faq.map((item) => `<div><div class="q">${escapeHtml(item.question)}</div><div>${escapeHtml(item.answer)}</div></div>`).join('')}</section>` : '';
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n${metaHead({ title: source.seo.title, description: source.seo.description, canonical })}\n  <link rel="stylesheet" href="/style.css">\n  <script type="application/ld+json">${json(schema)}</script>\n  <script src="/store-assets.generated.js"></script>\n  <script src="/product-page.js" defer></script>\n  <script src="/site-visits.js?v=2" defer></script>\n</head>\n<body data-app-slug="${escapeHtml(app.slug)}">\n  <main class="terminal page product-page">\n    <header class="product-header">\n      <div class="product-breadcrumb"><strong><a class="crumb-link" href="/">BASSTHERMAL</a></strong> <span class="dead">/</span> ${escapeHtml(app.name)}</div>\n      <img class="product-icon" alt="" aria-hidden="true" loading="eager" decoding="async">\n      <div class="product-heading">\n        <h1 class="product-title">${escapeHtml(app.name)}</h1>\n        <p class="product-subtitle">${escapeHtml(source.subtitle)}</p>\n        <div class="product-platforms cta-row">${platformLinks(app)}</div>\n      </div>\n    </header>\n    <section class="page-main product-content">\n      <section class="product-section"><h2 class="product-section-title">what it does</h2><div>${escapeHtml(source.whatItDoes)}</div></section>\n      <section class="product-section"><h2 class="product-section-title">how it works</h2><ol class="workflow-list">${source.howItWorks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section>\n      <section class="product-section"><h2 class="product-section-title">useful for</h2><ul class="workflow-list">${source.usefulFor.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>\n      <section class="product-section"><h2 class="product-section-title">requirements + limits</h2><ul class="workflow-list">${source.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>\n      <section class="product-section"><h2 class="product-section-title">guide</h2><div><a href="${escapeHtml(source.guide.href)}">${escapeHtml(source.guide.label)}</a></div></section>${faq}\n      <section class="product-section"><h2 class="product-section-title">privacy + support</h2><div><a href="${escapeHtml(app.links.privacy)}">privacy policy</a> · <a href="/support/">support</a></div></section>\n    </section>\n  </main>\n</body>\n</html>\n`;
}

function publisherPage({ title, description, route, heading, intro = '', sections }) {
  const canonical = `https://bassthermal.com${route}`;
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n${metaHead({ title, description, canonical })}\n  <link rel="stylesheet" href="/style.css">\n  <link rel="stylesheet" href="/publisher-shell.css?v=2">\n  <script src="/publisher-data.generated.js?v=2" defer></script>\n  <script src="/publisher-shell.js?v=4" defer></script>\n  <script src="/site-visits.js?v=2" defer></script>\n</head>\n<body>\n  <main class="terminal page bt-publisher-page">\n    <header class="bt-page-head">\n      <div class="dim">BASSTHERMAL / ${escapeHtml(route.split('/').filter(Boolean).at(-1) || '')}</div>\n      <h1>${escapeHtml(heading)}</h1>${intro ? `\n      <p>${escapeHtml(intro)}</p>` : ''}\n    </header>\n${sections.join('\n')}\n  </main>\n</body>\n</html>\n`;
}

function aboutPage() {
  return publisherPage({
    title: content.about.title,
    description: content.about.description,
    route: '/about/',
    heading: 'About',
    sections: [
      `    <section class="bt-section">${content.about.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`,
      '    <section class="bt-section"><h2>Explore</h2><div class="bt-utility-links"><a href="/">Browse apps</a><a href="/guides/">Read guides</a></div></section>',
      '    <section class="bt-section"><h2>Contact</h2><p><a href="mailto:info@bassthermal.com">info@bassthermal.com</a></p></section>'
    ]
  });
}

function supportPage() {
  return publisherPage({
    title: content.support.title,
    description: content.support.description,
    route: '/support/',
    heading: 'Support',
    intro: content.support.intro,
    sections: [
      '    <section class="bt-section"><h2>Email support</h2><p><a href="mailto:info@bassthermal.com?subject=Support%20request">Email BassThermal</a></p><p class="soft">Suggested subject: Support request — app name</p></section>',
      '    <section class="bt-section"><h2>Include</h2><p>Send the application name and version, Windows or Android version, what happened, what you expected, and the steps that reproduce the issue. Add a screenshot or short recording when it makes the problem clearer.</p></section>',
      '    <section class="bt-section"><h2>Windows diagnostics</h2><p>When an application provides a diagnostics command, generate its sanitized diagnostics ZIP and review the archive before sending it. Diagnostics should not contain your working documents, passwords, access tokens, payment information, or private account credentials.</p></section>',
      '    <section class="bt-section"><h2>Purchases and refunds</h2><p>Purchases, billing, licence delivery, and refund requests are handled by the Microsoft Store or Google Play account used for the transaction.</p><div class="bt-utility-links"><a href="https://apps.microsoft.com/search/publisher?name=BassThermal&amp;hl=en-US&amp;gl=CA">Microsoft Store</a><a href="https://play.google.com/store/apps/developer?id=BassThermal">Google Play</a></div></section>',
      '    <section class="bt-section"><h2>Privacy or security</h2><div class="bt-utility-links"><a href="/privacy/">Privacy policies</a><a href="/security/">Report a security issue</a></div></section>'
    ]
  });
}

function privacyDirectoryPage() {
  const rows = catalog.apps.map((app) => `<a class="bt-release-item" href="${escapeHtml(app.links.privacy)}"><span class="bt-release-name">${escapeHtml(app.name)}</span><span class="bt-release-summary">${escapeHtml(app.platforms.map((key) => platformNames[key]).join(' · '))}</span><span>View policy →</span></a>`).join('\n      ');
  return publisherPage({
    title: content.privacyDirectory.title,
    description: content.privacyDirectory.description,
    route: '/privacy/',
    heading: 'Privacy policies',
    intro: content.privacyDirectory.intro,
    sections: [
      `    <section class="bt-section"><h2>Website visits</h2><p>${escapeHtml(content.privacyDirectory.website)}</p><p class="soft">${escapeHtml(content.privacyDirectory.websiteTechnical)}</p></section>`,
      `    <section class="bt-release-list" aria-label="Application privacy policies">\n      ${rows}\n    </section>`
    ]
  });
}

function privacyPage(app, source) {
  const route = app.links.privacy;
  const canonical = `https://bassthermal.com${route}`;
  const title = `${app.name} Privacy | BassThermal`;
  const description = `Privacy information for ${app.name}, including local processing and any online requests used by the application.`;
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n${metaHead({ title, description, canonical })}\n  <link rel="stylesheet" href="/style.css">\n  <link rel="stylesheet" href="/publisher-shell.css?v=2">\n  <script src="/publisher-data.generated.js?v=2" defer></script>\n  <script src="/publisher-shell.js?v=4" defer></script>\n  <script src="/site-visits.js?v=2" defer></script>\n</head>\n<body data-app-slug="${escapeHtml(app.slug)}">\n  <main class="terminal page bt-publisher-page">\n    <header class="bt-page-head">\n      <div class="dim"><a href="/">BASSTHERMAL</a> / <a href="/privacy/">privacy</a> / ${escapeHtml(app.name)}</div>\n      <h1>${escapeHtml(app.name)} privacy</h1>\n      <p>${escapeHtml(source.privacy.summary)}</p>\n    </header>\n    <section class="bt-section"><h2>What stays on the device</h2><p>${escapeHtml(source.privacy.local)}</p></section>\n    <section class="bt-section"><h2>What may be requested online</h2><p>${escapeHtml(source.privacy.online)}</p></section>\n    <section class="bt-section"><h2>What BassThermal receives</h2><p>${escapeHtml(source.privacy.received)}</p></section>\n    <section class="bt-section"><h2>Store and platform services</h2><p>Microsoft, Google, the operating system, and external services used by a requested feature may process purchase, installation, crash, update, network, or service-request information under their own policies.</p></section>\n    <section class="bt-section"><h2>Removing local data</h2><p>${escapeHtml(source.privacy.deletion)}</p></section>\n    <section class="bt-section"><h2>Contact</h2><p><a href="mailto:info@bassthermal.com">info@bassthermal.com</a></p><p class="soft">Last updated July 31, 2026.</p></section>\n  </main>\n</body>\n</html>\n`;
}

function updateHomepage() {
  const file = path.join(publicRoot, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(content.homepage.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>(?:\s*)/i, `<meta name="description" content="${escapeHtml(content.homepage.description)}">\n  `)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>(?:\s*)/i, `<meta property="og:title" content="${escapeHtml(content.homepage.title)}">\n  `)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>(?:\s*)/i, `<meta property="og:description" content="${escapeHtml(content.homepage.description)}">\n  `)
    .replace(/<nav class="topnav" aria-label="Primary">[\s\S]*?<\/nav>/, '<nav class="topnav" aria-label="Primary"><a href="/guides/">Guides</a> · <a href="/support/">Support</a></nav>')
    .replace(/<footer class="footer">[\s\S]*?<\/footer>/, '<footer class="footer"><a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · <a href="/security/">Security</a></footer>')
    .replace(/\s*<div class="right" id="readout">[\s\S]*?<\/div>/, '')
    .replace(/\s*<div class="line soft(?: home-intro)?">[\s\S]*?<\/div>/, '');
  const intro = `\n    <div class="line soft home-intro">${escapeHtml(content.homepage.intro)}</div>\n    <div class="line dim home-section-label">${escapeHtml(content.homepage.sectionLabel)}</div>\n`;
  html = html.replace(/(\s*<\/header>)(\s*<section class="index")/, `$1${intro}$2`);
  for (const app of catalog.apps) {
    const source = content.products[app.slug];
    const rowPattern = new RegExp(`(<div class="row app-row"[^>]*>[\\s\\S]*?<a class="app-name(?: app-title-link)?" href="/apps/${app.slug}/">[\\s\\S]*?<\\/a>[\\s\\S]*?<span class="links">)([\\s\\S]*?)(<\\/span>[\\s\\S]*?<span class="app-meta">)([\\s\\S]*?)(<\\/span><\\/div>)`);
    const links = platformLinks(app);
    if (rowPattern.test(html)) html = html.replace(rowPattern, `$1${links}$3${escapeHtml(source.line)}$5`);
  }
  if (!validateOnly) fs.writeFileSync(file, html, 'utf8');
}

function cleanGuideNumbering() {
  const targets = [
    'guides/dualticker/compare-live-headline-sources/index.html',
    'guides/icon-pack-builder/create-windows-app-icons-from-one-png/index.html',
    'guides/favicon-harvester/collect-favicons-from-a-list-of-websites/index.html'
  ];
  for (const relative of targets) {
    const file = path.join(publicRoot, relative);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<h2>\s*\d+\.\s*/g, '<h2>');
    if (!validateOnly) fs.writeFileSync(file, html, 'utf8');
  }
  const indexFile = path.join(publicRoot, 'guides', 'index.html');
  let index = fs.readFileSync(indexFile, 'utf8');
  index = index
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Practical Software Guides | BassThermal</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/?>(?:\s*)/i, '<meta name="description" content="Practical explanations and workflows for BassThermal apps, from ISBN cataloguing and RSS discovery to image processing and beam diagrams.">\n  ')
    .replace('Useful explanations and workflows for BassThermal apps.', 'Practical explanations and workflows for BassThermal apps.');
  if (!validateOnly) fs.writeFileSync(indexFile, index, 'utf8');
}

function updateSitemap() {
  const file = path.join(publicRoot, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  const changed = ['/', '/about/', '/support/', '/privacy/', '/guides/', ...catalog.apps.flatMap((app) => [`/apps/${app.slug}/`, app.links.privacy])];
  for (const route of changed) {
    const escaped = `https://bassthermal.com${route}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    xml = xml.replace(new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`), '$12026-07-31$2');
  }
  for (const route of [
    '/guides/dualticker/compare-live-headline-sources/',
    '/guides/icon-pack-builder/create-windows-app-icons-from-one-png/',
    '/guides/favicon-harvester/collect-favicons-from-a-list-of-websites/'
  ]) {
    const escaped = `https://bassthermal.com${route}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    xml = xml.replace(new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`), '$12026-07-31$2');
  }
  if (!validateOnly) fs.writeFileSync(file, xml, 'utf8');
}

updateHomepage();
for (const app of catalog.apps) {
  const source = content.products[app.slug];
  ensure(Boolean(source), `missing content for ${app.slug}`);
  if (!source) continue;
  write(`apps/${app.slug}/index.html`, productPage(app, source));
  write(`${app.links.privacy.replace(/^\//, '')}index.html`, privacyPage(app, source));
}
write('about/index.html', aboutPage());
write('support/index.html', supportPage());
write('privacy/index.html', privacyDirectoryPage());
cleanGuideNumbering();
updateSitemap();

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  console.log(`PASS  Built human-facing content for homepage, ${catalog.apps.length} products, privacy, About, Support, and Guides`);
}
