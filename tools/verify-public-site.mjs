const base = (process.env.BT_PUBLIC_BASE_URL || process.argv[2] || 'https://bassthermal.com').replace(/\/$/, '');
const expectedBuild = process.env.BT_EXPECTED_SITE_BUILD || '';
const errors = [];
const ensure = (condition, message) => { if (!condition) errors.push(message); };

async function fetchText(route, options = {}) {
  const response = await fetch(`${base}${route}`, { redirect: options.redirect || 'follow' });
  ensure(response.ok, `${route} returned ${response.status}`);
  return { response, text: await response.text() };
}

const canonicalRoutes = [
  '/', '/about/', '/releases/', '/support/', '/security/', '/terms/', '/privacy/', '/guides/',
  '/apps/dualticker/', '/apps/retrofy/', '/apps/coptic-dictionary/', '/apps/icon-pack-builder/',
  '/apps/favicon-harvester/', '/apps/isbn-manager/', '/apps/rss-crawler/', '/apps/docbatch-pdf-converter/',
  '/apps/website-image-inventory/', '/apps/courselab-beam/'
];

for (const route of canonicalRoutes) {
  const { text } = await fetchText(route);
  ensure(text.includes('name="bt-site-build"'), `${route} missing static build identity`);
  ensure(text.includes('/publisher-shell.css'), `${route} missing publisher shell CSS`);
  ensure(text.includes('/publisher-shell.js'), `${route} missing publisher shell runtime`);
  ensure(!text.includes('10 apps · Windows · Android · Web'), `${route} contains stale app-count readout`);
  ensure(!text.includes('RSS Finder / RSS Crawler'), `${route} contains legacy RSS combined name`);
  if (expectedBuild) ensure(text.includes(`content="${expectedBuild}"`), `${route} does not expose expected build ${expectedBuild}`);
}

const homepage = (await fetchText('/')).text;
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) {
  ensure(homepage.includes(name), `homepage missing ${name}`);
}

const privacy = (await fetchText('/privacy/')).text;
ensure(!privacy.includes('Ring Snap'), 'privacy directory contains retired Ring Snap');
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) {
  ensure(privacy.includes(name), `privacy directory missing ${name}`);
}

const sitemap = (await fetchText('/sitemap.xml')).text;
for (const route of canonicalRoutes) ensure(sitemap.includes(`${base}${route}`), `sitemap missing ${route}`);

const security = await fetchText('/.well-known/security.txt');
ensure(security.text.includes('mailto:security@bassthermal.com'), 'security.txt missing security contact');
ensure(security.text.includes(`${base}/security/`), 'security.txt missing policy URL');

const feed = await fetchText('/releases/feed.xml');
ensure(feed.text.includes('<rss version="2.0">'), 'release feed is not RSS 2.0');
ensure(feed.text.includes('DualTicker 1.3.15'), 'release feed missing DualTicker release');
ensure(feed.text.includes('CourseLab Beam 0.3.5'), 'release feed missing CourseLab release');

for (const route of ['/apps/rss-finder/', '/privacy/rss-finder/']) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  ensure([301, 302, 307, 308].includes(response.status), `${route} did not redirect`);
}

if (errors.length) {
  console.error(`public deployment verification failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`public deployment verified at ${base}${expectedBuild ? ` for ${expectedBuild}` : ''}`);
