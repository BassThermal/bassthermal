import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

const canonicalHtml = fs.readdirSync(path.join(root, 'public'), { recursive: true })
  .filter((relative) => relative.endsWith('index.html'))
  .map((relative) => path.join(root, 'public', relative));
const htmlDigest = () => crypto.createHash('sha256')
  .update(canonicalHtml.map((file) => fs.readFileSync(file)).join('\0'))
  .digest('hex');
execFileSync(process.execPath, ['tools/build-public-brand-shell.mjs'], { cwd: root, stdio: 'pipe' });
const firstBuild = htmlDigest();
execFileSync(process.execPath, ['tools/build-public-brand-shell.mjs'], { cwd: root, stdio: 'pipe' });
assert.equal(htmlDigest(), firstBuild, 'shell builder must be idempotent on a second run');

for (const [relative, labels] of routes) {
  const html = read(relative);
  assert.equal((html.match(/class="bt-site-header"/g) || []).length, 1, `${relative}: one static header`);
  assert.equal((html.match(/id="btBrandBackground"/g) || []).length, 1, `${relative}: one static background`);
  assert.equal((html.match(/data-bt-brand-favicon="1"/g) || []).length, 1, `${relative}: one favicon`);
  assert.equal((html.match(/data-bt-site-shell-style="1"/g) || []).length, 1, `${relative}: one shell stylesheet`);
  assert.equal((html.match(/data-bt-brand-lab-loader="1"/g) || []).length, 1, `${relative}: one experimental loader`);
  assert(html.includes('data-bt-site-shell="1.2.0"'), `${relative}: shell 1.2.0`);
  assert(html.includes('class="bt-site-mark" src="/assets/brand/bassthermal-header-mark-v1.png?v=1" data-default-src="/assets/brand/bassthermal-header-mark-v1.png?v=1"'), `${relative}: permanent header mark`);
  assert(html.includes('class="bt-brand-background-asset" src="/assets/brand/bassthermal-mark-v1.webp?v=2"'), `${relative}: selected background`);
  assert(html.includes('/bt-site-shell.css?v=5'), `${relative}: cache-busted shell CSS`);
  assert(html.includes('/bassthermal-brand-lab-loader.v3.js?v=5'), `${relative}: experimental loader`);
  assert(!html.includes('class="topline"'), `${relative}: no legacy top-line header`);
  assert(!html.includes('class="product-breadcrumb"'), `${relative}: no product breadcrumb`);
  assert(!html.includes('class="guide-breadcrumb"'), `${relative}: no Guide breadcrumb`);
  assert(!html.includes('/bt-site-shell.js?'), `${relative}: no runtime-created public shell`);
  for (const label of labels) assert(html.includes(`>${label}<`), `${relative}: path label ${label}`);
}

const css = read('public/bt-site-shell.css');
for (const contract of ['position:sticky', 'top:0', 'min-height:52px', '--bt-brand-mark-size:36px', '@media(max-width:1100px)', '@media(max-width:520px)']) {
  assert(css.includes(contract), `shell CSS missing ${contract}`);
}

const loader = read('public/bassthermal-brand-lab-loader.v3.js');
assert(loader.includes('localStorage.removeItem(ACTIVE_KEY)'), 'old experiment flag must be cleared');
assert(!loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"), 'experiment must not auto-restore');
assert(loader.includes("get('brandlab') === '1'"), 'explicit URL activation must remain');

const workerEntry = read('src/worker-entry.js');
assert(!workerEntry.includes('transformPublicHtml'), 'Worker must not build public HTML');
assert(workerEntry.includes('export default worker;'), 'Worker must delegate server behavior');
const wrangler = read('wrangler.toml');
for (const route of ['"/"', '"/apps/*"', '"/guides/*"', '"/about/*"', '"/support/*"', '"/privacy/*"', '"/security/*"', '"/api/*"']) {
  assert(wrangler.includes(route), `Worker-first route missing: ${route}`);
}

const brand = fs.readFileSync(path.join(root, 'public/assets/brand/bassthermal-mark-v1.webp'));
const headerMark = fs.readFileSync(path.join(root, 'public/assets/brand/bassthermal-header-mark-v1.png'));
assert.equal(headerMark.readUInt32BE(16), 256, 'header mark width');
assert.equal(headerMark.readUInt32BE(20), 256, 'header mark height');
assert(headerMark.length > 1000, 'header mark must contain real image bytes');
assert.equal(brand.length, 18112, 'selected mark byte count');
assert.equal(crypto.createHash('sha256').update(brand).digest('hex'), '5c2eed9b056ac6c65886cfa08d26012196df62b1b3dfcfbd8607f93a1e95c87b', 'selected mark SHA-256');
const favicon = fs.readFileSync(path.join(root, 'public/favicon-32x32.png'));
assert.equal(favicon.length, 1976, 'favicon byte count');

console.log(`static public brand shell tests passed for ${routes.length} representative routes`);
