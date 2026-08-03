const base = String(process.env.BT_VERIFY_BASE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('BT_VERIFY_BASE_URL is required');
  process.exit(2);
}

const routes = [
  '/',
  '/apps/dualticker/',
  '/guides/',
  '/guides/dualticker/compare-live-headline-sources/',
  '/support/',
  '/privacy/',
  '/privacy/isbn-manager/'
];
const errors = [];
for (const route of routes) {
  const response = await fetch(base + route, { redirect: 'follow' });
  const html = await response.text();
  if (!response.ok) errors.push(`${route} returned ${response.status}`);
  if (response.headers.get('x-bassthermal-site-shell') !== 'ready-v1') errors.push(`${route} missing site-shell response identity`);
  for (const asset of ['/bt-site-shell.css?v=1', '/bt-site-shell.js?v=1', '/bassthermal-brand-lab-loader.v3.js?v=3']) {
    if (!html.includes(asset)) errors.push(`${route} missing ${asset}`);
  }
  if (html.includes('/bassthermal-logo-lab.v2.js')) errors.push(`${route} still loads Logo Lab v2`);
}
for (const asset of ['/bt-site-shell.css?v=1', '/bt-site-shell.js?v=1', '/bassthermal-brand-lab-loader.v3.js?v=3', '/bassthermal-brand-lab.v3.js?v=3', '/bassthermal-brand-lab.v3.css?v=3']) {
  const response = await fetch(base + asset);
  if (!response.ok) errors.push(`${asset} returned ${response.status}`);
}
if (errors.length) {
  console.error(`brand shell public verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`brand shell public verification passed for ${routes.length} routes`);
