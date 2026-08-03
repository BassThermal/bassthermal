const base = String(process.env.BT_VERIFY_BASE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('BT_VERIFY_BASE_URL is required');
  process.exit(2);
}

const BRAND_ASSET = '/assets/brand/bassthermal-mark-v1.webp';
const BRAND_FAVICON = '/favicon-32x32.png';
const routes = [
  ['/', ['bassthermal']],
  ['/apps/dualticker/', ['bassthermal', 'DualTicker']],
  ['/guides/', ['bassthermal', 'Guides']],
  ['/guides/dualticker/compare-live-headline-sources/', ['bassthermal', 'Guides', 'DualTicker']],
  ['/support/', ['bassthermal', 'Support']],
  ['/privacy/', ['bassthermal', 'Privacy']],
  ['/privacy/isbn-manager/', ['bassthermal', 'Privacy', 'ISBN Manager']]
];
const errors = [];
for (const [route, labels] of routes) {
  const response = await fetch(base + route, { redirect: 'follow' });
  const html = await response.text();
  if (!response.ok) errors.push(`${route} returned ${response.status}`);
  if (response.headers.get('x-bassthermal-site-shell') !== 'ready-v2') errors.push(`${route} missing site-shell response identity`);
  if ((html.match(/class="bt-site-header"/g) || []).length !== 1) errors.push(`${route} does not contain exactly one static site header`);
  if ((html.match(/id="btBrandBackground"/g) || []).length !== 1) errors.push(`${route} does not contain exactly one default brand background`);
  if ((html.match(/data-bt-brand-favicon="1"/g) || []).length !== 1) errors.push(`${route} does not contain exactly one selected favicon contract`);
  if (!html.includes(`href="${BRAND_FAVICON}?v=1"`)) errors.push(`${route} missing selected Chrome favicon`);
  if (!html.includes('data-bt-site-shell="1.1.0"')) errors.push(`${route} missing sticky shell version`);
  if (!html.includes('class="bt-site-path" aria-label="Breadcrumb"')) errors.push(`${route} missing static breadcrumb navigation`);
  if (!html.includes('class="bt-site-primary" aria-label="Primary"')) errors.push(`${route} missing static primary navigation`);
  if (!html.includes(`class="bt-site-mark" src="${BRAND_ASSET}"`)) errors.push(`${route} missing selected header mark`);
  if (!html.includes(`class="bt-brand-background-asset" src="${BRAND_ASSET}"`)) errors.push(`${route} missing selected background asset`);
  for (const label of labels) {
    if (!html.includes(`>${label}<`)) errors.push(`${route} missing path label ${label}`);
  }
  for (const asset of ['/bt-site-shell.css?v=2', '/bt-site-shell.js?v=2', '/bassthermal-brand-lab-loader.v3.js?v=4']) {
    if (!html.includes(asset)) errors.push(`${route} missing ${asset}`);
  }
  if (html.includes('/bassthermal-logo-lab.v2.js')) errors.push(`${route} still loads Logo Lab v2`);
  if (html.includes('class="product-breadcrumb"') || html.includes('class="guide-breadcrumb"')) errors.push(`${route} still contains a legacy visible breadcrumb`);
}
for (const asset of [
  '/bt-site-shell.css?v=2',
  '/bt-site-shell.js?v=2',
  '/bassthermal-brand-lab-loader.v3.js?v=4',
  '/bassthermal-brand-lab.v3.js?v=3',
  '/bassthermal-brand-lab.v3.css?v=3',
  BRAND_ASSET,
  BRAND_FAVICON
]) {
  const response = await fetch(base + asset);
  if (!response.ok) errors.push(`${asset} returned ${response.status}`);
  if (asset === BRAND_ASSET && Number(response.headers.get('content-length') || 0) !== 19612) {
    errors.push(`${BRAND_ASSET} byte count is not 19612`);
  }
  if (asset === BRAND_FAVICON && Number(response.headers.get('content-length') || 0) !== 1976) {
    errors.push(`${BRAND_FAVICON} byte count is not 1976`);
  }
}
if (errors.length) {
  console.error(`brand shell public verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`brand shell public verification passed for ${routes.length} routes`);
