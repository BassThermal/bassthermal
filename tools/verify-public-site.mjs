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
  '/', '/about/', '/support/', '/security/', '/privacy/', '/guides/',
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
  ensure(!text.includes('href="/terms/"'), `${route} exposes unfinished Terms`);
  if (route !== '/') ensure(text.includes('/site-visits.js?v=2'), `${route} missing site-wide visits runtime`);
  if (expectedBuild) ensure(text.includes(`content="${expectedBuild}"`), `${route} does not expose expected build ${expectedBuild}`);
}

const homepage = (await fetchText('/')).text;
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) ensure(homepage.includes(name), `homepage missing ${name}`);
ensure(homepage.includes('href="/guides/">Guides</a>'), 'homepage missing Guides navigation');
ensure(homepage.includes('href="/support/">Support</a>'), 'homepage missing Support navigation');
ensure(homepage.includes('href="/about/">About</a>'), 'homepage footer missing About');
ensure(homepage.includes('/visits-terminal-v2.js?v=2'), 'homepage missing Visits v2 adapter');
ensure(!homepage.includes('Independent software for practical work, study, and specialist workflows.'), 'homepage slogan remains');

const about = (await fetchText('/about/')).text;
ensure(!about.includes('/releases/'), 'About still links to Releases');
ensure(!about.includes('View releases'), 'About still contains stale release action');

const privacy = (await fetchText('/privacy/')).text;
ensure(privacy.includes('Website visits'), 'privacy directory missing website visit disclosure');
ensure(privacy.includes('Raw IP addresses'), 'privacy directory missing raw-IP statement');
ensure(!privacy.includes('Ring Snap'), 'privacy directory contains retired Ring Snap');
for (const name of ['DualTicker', 'RetroFy', 'Coptic Dictionary', 'Icon Pack Builder', 'Favicon Harvester', 'ISBN Manager', 'RSS Crawler', 'DocBatch PDF Converter', 'Website Image Inventory', 'CourseLab Beam']) ensure(privacy.includes(name), `privacy directory missing ${name}`);

const sitemap = (await fetchText('/sitemap.xml')).text;
for (const route of canonicalRoutes) ensure(sitemap.includes(`${base}${route}`), `sitemap missing ${route}`);
for (const retired of ['/releases/', '/terms/']) ensure(!sitemap.includes(`${base}${retired}`), `sitemap still exposes ${retired}`);

const security = await fetchText('/.well-known/security.txt');
ensure(security.text.includes('mailto:info@bassthermal.com'), 'security.txt missing verified security contact');
ensure(security.text.includes(`${base}/security/`), 'security.txt missing policy URL');

for (const route of ['/apps/rss-finder/', '/privacy/rss-finder/']) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  ensure([301, 302, 307, 308].includes(response.status), `${route} did not redirect`);
}
for (const route of ['/releases/', '/terms/']) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  ensure(response.status === 404 || [301, 302, 307, 308].includes(response.status), `${route} remains a public 200 page`);
}

const health = await fetch(`${base}/api/visits/health`, { headers: { accept: 'application/json' }, cache: 'no-store' });
const healthData = await health.json().catch(() => null);
ensure(health.ok && healthData?.ok, 'Visits v2 health check failed');
ensure(healthData?.schema === true, 'Visits v2 schema is not current');

if (errors.length) {
  console.error(`public deployment verification failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`public deployment and Visits v2 verified at ${base}${expectedBuild ? ` for ${expectedBuild}` : ''}`);
