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
  '/', '/about/', '/support/', '/security/', '/terms/', '/privacy/', '/guides/',
  '/apps/dualticker/', '/apps/retrofy/', '/apps/coptic-dictionary/', '/apps/icon-pack-builder/',
  '/apps/favicon-harvester/', '/apps/isbn-manager/', '/apps/rss-crawler/', '/apps/docbatch-pdf-converter/',
  '/apps/website-image-inventory/', '/apps/courselab-beam/'
];

for (const route of canonicalRoutes) {
  const { text } = await fetchText(route);
  ensure(text.includes('name="bt-site-build"'), `${route} missing static build identity`);
  ensure(text.includes('/publisher-shell.css'), `${route} missing contextual publisher CSS`);
  ensure(text.includes('/publisher-shell.js'), `${route} missing contextual publisher runtime`);
  ensure(!text.includes('10 apps · Windows · Android · Web'), `${route} contains stale app-count readout`);
  ensure(!text.includes('RSS Finder / RSS Crawler'), `${route} contains legacy RSS combined name`);
  ensure(!text.includes('class="bt-site-header"'), `${route} contains duplicate global header`);
  ensure(!text.includes('>Releases<'), `${route} exposes removed Releases navigation`);
  if (expectedBuild) ensure(text.includes(`content="${expectedBuild}"`), `${route} does not expose expected build ${expectedBuild}`);
}

const homepage = (await fetchText('/')).text;
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) ensure(homepage.includes(name), `homepage missing ${name}`);
ensure(homepage.includes('href="/guides/">Guides</a>'), 'homepage missing Guides navigation');
ensure(homepage.includes('href="/support/">Support</a>'), 'homepage missing Support navigation');
ensure(homepage.includes('href="/about/">About</a>'), 'homepage footer missing About');
ensure(!homepage.includes('Independent software for practical work, study, and specialist workflows.'), 'homepage slogan remains');

const guides = (await fetchText('/guides/')).text;
ensure(!guides.includes('practical workflows'), 'Guides kicker remains');
ensure((guides.match(/BASSTHERMAL/g) || []).length === 1, 'Guides contains duplicate BassThermal identity');

const privacy = (await fetchText('/privacy/')).text;
ensure(!privacy.includes('Ring Snap'), 'privacy directory contains retired Ring Snap');
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) ensure(privacy.includes(name), `privacy directory missing ${name}`);

const sitemap = (await fetchText('/sitemap.xml')).text;
for (const route of canonicalRoutes) ensure(sitemap.includes(`${base}${route}`), `sitemap missing ${route}`);
ensure(!sitemap.includes(`${base}/releases/`), 'sitemap still exposes Releases');

const security = await fetchText('/.well-known/security.txt');
ensure(security.text.includes('mailto:info@bassthermal.com'), 'security.txt missing verified security contact');
ensure(security.text.includes(`${base}/security/`), 'security.txt missing policy URL');

for (const route of ['/apps/rss-finder/', '/privacy/rss-finder/']) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  ensure([301, 302, 307, 308].includes(response.status), `${route} did not redirect`);
}

const releases = await fetch(`${base}/releases/`, { redirect: 'manual' });
ensure(releases.status === 404 || [301, 302, 307, 308].includes(releases.status), '/releases/ remains a public 200 page');

if (errors.length) {
  console.error(`public deployment verification failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`public deployment verified at ${base}${expectedBuild ? ` for ${expectedBuild}` : ''}`);
