import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const routes = [
  ['public/index.html', ['bassthermal']],
  ['public/apps/dualticker/index.html', ['bassthermal', 'DualTicker']],
  ['public/guides/index.html', ['bassthermal', 'Guides']],
  ['public/guides/dualticker/compare-live-headline-sources/index.html', ['bassthermal', 'Guides', 'DualTicker']],
  ['public/support/index.html', ['bassthermal', 'Support']],
  ['public/privacy/index.html', ['bassthermal', 'Privacy']],
  ['public/privacy/isbn-manager/index.html', ['bassthermal', 'Privacy', 'ISBN Manager']]
];

for (const [relative, labels] of routes) {
  const html = read(relative);
  assert.equal((html.match(/class="bt-site-header"/g) || []).length, 1, `${relative}: one static header`);
  assert.equal((html.match(/id="btBrandBackground"/g) || []).length, 1, `${relative}: one static background`);
  assert.equal((html.match(/data-bt-brand-favicon="1"/g) || []).length, 1, `${relative}: one favicon`);
  assert.equal((html.match(/data-bt-site-shell-style="1"/g) || []).length, 1, `${relative}: one shell stylesheet`);
  assert.equal((html.match(/data-bt-brand-lab-loader="1"/g) || []).length, 1, `${relative}: one experimental loader`);
  assert(html.includes('data-bt-site-shell="1.2.0"'), `${relative}: shell 1.2.0`);
  assert(html.includes('class="bt-site-mark" src="/assets/brand/bassthermal-mark-v1.webp"'), `${relative}: selected mark`);
  assert(html.includes('class="bt-brand-background-asset" src="/assets/brand/bassthermal-mark-v1.webp"'), `${relative}: selected background`);
  assert(html.includes('/bt-site-shell.css?v=3'), `${relative}: cache-busted shell CSS`);
  assert(html.includes('/bassthermal-brand-lab-loader.v3.js?v=5'), `${relative}: explicit Brand Lab loader`);
  assert(!html.includes('class="topline"'), `${relative}: no homepage legacy header`);
  assert(!html.includes('class="product-breadcrumb"'), `${relative}: no product legacy breadcrumb`);
  assert(!html.includes('class="guide-breadcrumb"'), `${relative}: no Guide legacy breadcrumb`);
  assert(!html.includes('/bt-site-shell.js?'), `${relative}: no runtime-created public shell`);
  for (const label of labels) assert(html.includes(`>${label}<`), `${relative}: path label ${label}`);
}

const css = read('public/bt-site-shell.css');
for (const contract of ['position:sticky', 'top:0', 'min-height:52px', '--bt-brand-mark-size:32px', '@media(max-width:900px)', '@media(max-width:520px)']) {
  assert(css.includes(contract), `shell CSS missing ${contract}`);
}

const loader = read('public/bassthermal-brand-lab-loader.v3.js');
assert(loader.includes("localStorage.removeItem(ACTIVE_KEY)"), 'legacy active experiment flag must be cleared');
assert(!loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"), 'Brand Lab must not auto-apply a local experiment');
assert(loader.includes("get('brandlab') === '1'"), 'explicit URL activation must remain available');

const workerEntry = read('src/worker-entry.js');
assert.equal(workerEntry.trim(), "import worker from './worker-v2.js';\n\n// Public HTML is generated with its permanent brand shell before deployment.\n// The Worker now owns only redirects, Visits APIs, and server-side behavior.\nexport default worker;", 'Worker entry must not transform public HTML');
const wrangler = read('wrangler.toml');
assert(wrangler.includes('run_worker_first = ["/api/*"]'), 'only APIs should run Worker-first');
assert(!wrangler.includes('"/apps/*"'), 'HTML routes must be served directly from built assets');

const brand = fs.readFileSync(path.join(root, 'public/assets/brand/bassthermal-mark-v1.webp'));
assert.equal(brand.length, 19612, 'selected brand asset byte count');
assert.equal(crypto.createHash('sha256').update(brand).digest('hex'), '0d6f0043cc69126935ca71d04e85420872c1a1963486633df690fc3da124c61f', 'selected brand asset SHA-256');
const favicon = fs.readFileSync(path.join(root, 'public/favicon-32x32.png'));
assert.equal(favicon.length, 1976, 'selected favicon byte count');

console.log(`static public brand shell tests passed for ${routes.length} representative routes`);
