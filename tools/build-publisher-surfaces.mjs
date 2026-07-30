import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const errors = [];
const ensure = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));
const exists = (relative) => fs.existsSync(path.join(root, relative));

const catalog = readJson('data/bt-catalog.json');
const publisher = readJson('data/bt-publisher.json');
const guideRoutes = {
  dualticker: '/guides/dualticker/compare-live-headline-sources/',
  retrofy: '/guides/retrofy/give-a-photo-a-retro-pixel-art-look/',
  'coptic-dictionary': '/guides/coptic-dictionary/look-up-and-save-coptic-words/',
  'icon-pack-builder': '/guides/icon-pack-builder/create-windows-app-icons-from-one-png/',
  'favicon-harvester': '/guides/favicon-harvester/collect-favicons-from-a-list-of-websites/',
  'isbn-manager': '/guides/isbn-manager/build-a-book-catalog-from-isbns/',
  'rss-crawler': '/guides/rss-crawler/find-and-export-rss-feeds/',
  'docbatch-pdf-converter': '/guides/docbatch-pdf-converter/convert-a-folder-of-documents-to-pdf/',
  'website-image-inventory': '/guides/website-image-inventory/audit-images-used-on-a-website/',
  'courselab-beam': '/guides/courselab-beam/build-and-review-a-beam-case/'
};

ensure(publisher.schema === 'BT-PUBLISHER-1', 'publisher schema must be BT-PUBLISHER-1');
ensure(publisher.publisher?.name === 'BassThermal', 'publisher name must be BassThermal');
ensure(Boolean(publisher.publisher?.contact), 'publisher contact is required');
ensure(Boolean(publisher.publisher?.securityContact), 'security contact is required');

const publicApps = catalog.apps.filter((app) => app.visibility?.showOnWebsite !== false);
const catalogIds = new Set(publicApps.map((app) => app.id));
const publisherIds = new Set(Object.keys(publisher.products || {}));
ensure(catalogIds.size === publisherIds.size, 'publisher product count must match public catalog');
for (const app of publicApps) {
  const facts = publisher.products?.[app.id];
  ensure(Boolean(facts), `publisher facts missing for ${app.id}`);
  ensure(Boolean(facts?.processing), `processing truth missing for ${app.id}`);
  ensure(Boolean(guideRoutes[app.id]), `guide route missing for ${app.id}`);
  ensure(exists(`public${guideRoutes[app.id]}index.html`), `guide page missing for ${app.id}`);
  if (facts?.currentRelease) {
    ensure(Boolean(facts.currentRelease.version), `release version missing for ${app.id}`);
    ensure(/^\d{4}-\d{2}-\d{2}$/.test(facts.currentRelease.date || ''), `release date invalid for ${app.id}`);
    ensure(Boolean(facts.currentRelease.summary), `release summary missing for ${app.id}`);
    for (const platform of facts.currentRelease.platforms || []) ensure(app.platforms.includes(platform), `release platform ${platform} is not catalogued for ${app.id}`);
  }
}
for (const id of publisherIds) ensure(catalogIds.has(id), `publisher facts contain non-public product ${id}`);

const buildToken = process.env.CF_PAGES_COMMIT_SHA
  ? `2026.07.30+${process.env.CF_PAGES_COMMIT_SHA.slice(0, 12)}`
  : '2026.07.30.publisher-surface-upgrade';
const generated = {
  build: buildToken,
  publisher: publisher.publisher,
  products: Object.fromEntries(publicApps.map((app) => {
    const facts = publisher.products[app.id];
    return [app.id, {
      name: app.name,
      platforms: app.platforms,
      processing: facts.processing,
      product: app.links.website,
      guide: guideRoutes[app.id],
      ...(facts.currentRelease ? { currentRelease: facts.currentRelease } : {})
    }];
  }))
};
const generatedJs = `window.BT_PUBLISHER_DATA = Object.freeze(${JSON.stringify(generated, null, 2)});\n`;
if (!validateOnly) fs.writeFileSync(path.join(root, 'public/publisher-data.generated.js'), generatedJs);

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

function injectPublisherRuntime(html) {
  const meta = `<meta name="bt-site-build" content="${buildToken}">`;
  const css = '<link rel="stylesheet" href="/publisher-shell.css?v=1" data-bt-visual-style="publisher-shell">';
  const dataScript = '<script src="/publisher-data.generated.js?v=1" defer data-bt-runtime="publisher-data"></script>';
  const shellScript = '<script src="/publisher-shell.js?v=1" defer data-bt-runtime="publisher-shell"></script>';
  let next = html;
  if (/meta name=["']bt-site-build["']/.test(next)) next = next.replace(/<meta name=["']bt-site-build["'][^>]*>/, meta);
  else next = next.replace(/<\/head>/i, `  ${meta}\n</head>`);
  if (!next.includes('/publisher-shell.css')) next = next.replace(/<\/head>/i, `  ${css}\n</head>`);
  if (!next.includes('/publisher-data.generated.js')) next = next.replace(/<\/head>/i, `  ${dataScript}\n</head>`);
  if (!next.includes('/publisher-shell.js')) next = next.replace(/<\/head>/i, `  ${shellScript}\n</head>`);
  return next;
}

for (const absolute of walkHtml(path.join(root, 'public'))) {
  const current = fs.readFileSync(absolute, 'utf8');
  const next = injectPublisherRuntime(current);
  if (!validateOnly && next !== current) fs.writeFileSync(absolute, next);
}

for (const route of ['/about/', '/releases/', '/support/', '/security/', '/terms/', '/privacy/']) {
  ensure(exists(`public${route}index.html`), `publisher route missing: ${route}`);
}
ensure(exists('public/releases/feed.xml'), 'release RSS feed missing');
ensure(exists('public/.well-known/security.txt'), 'security.txt missing');

const privacy = read('public/privacy/index.html');
for (const app of publicApps) ensure(privacy.includes(app.name.replace('&', '&amp;')) || privacy.includes(app.name), `privacy directory missing ${app.name}`);
ensure(!privacy.includes('Ring Snap'), 'retired Ring Snap remains in privacy directory');
ensure(!privacy.includes('RSS Finder'), 'legacy RSS Finder name remains in privacy directory');

const releasesPage = read('public/releases/index.html');
for (const app of publicApps) {
  const release = publisher.products[app.id].currentRelease;
  if (!release) continue;
  ensure(releasesPage.includes(`${app.name} ${release.version}`), `releases page missing ${app.id} ${release.version}`);
}

const sitemap = read('public/sitemap.xml');
for (const route of ['/about/', '/releases/', '/support/', '/security/', '/terms/', '/privacy/']) {
  ensure(sitemap.includes(`https://bassthermal.com${route}`), `sitemap missing ${route}`);
}

const shell = read('public/publisher-shell.js');
ensure(shell.includes('Skip to content'), 'publisher shell missing skip link');
ensure(shell.includes("'/releases/'"), 'publisher shell missing releases navigation');
ensure(shell.includes('bt-product-facts'), 'publisher shell missing product facts');
const shellCss = read('public/publisher-shell.css');
ensure(shellCss.includes('.bt-site-header'), 'publisher shell header styles missing');
ensure(shellCss.includes('@media(max-width:860px)'), 'publisher shell mobile styles missing');

const forbidden = ['10 apps · Windows · Android · Web', 'RSS Finder / RSS Crawler'];
for (const value of forbidden) {
  for (const file of ['public/index.html', 'public/privacy/index.html', 'public/releases/index.html']) ensure(!read(file).includes(value), `forbidden public text remains in ${file}: ${value}`);
}

if (errors.length) {
  console.error(`publisher surface validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`publisher surfaces ${validateOnly ? 'validated' : 'generated'} for ${publicApps.length} products`);
