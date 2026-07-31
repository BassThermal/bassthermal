import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('public/bt-accent-system.css', 'utf8');
const runtime = fs.readFileSync('public/bt-accent-system.js', 'utf8');
const assets = fs.readFileSync('public/store-assets.generated.js', 'utf8');
const builder = fs.readFileSync('tools/append-app-icon-runtime.mjs', 'utf8');
const injector = fs.readFileSync('tools/inject-accent-runtime.mjs', 'utf8');
const publisher = fs.readFileSync('public/publisher-shell.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const slugs = [
  'dualticker',
  'retrofy',
  'coptic-dictionary',
  'icon-pack-builder',
  'favicon-harvester',
  'isbn-manager',
  'rss-crawler',
  'docbatch-pdf-converter',
  'website-image-inventory',
  'courselab-beam'
];

for (const slug of slugs) {
  assert.match(css, new RegExp(`\\[data-app-slug=["']${slug}["']\\]`), `missing accent token for ${slug}`);
  assert.match(runtime, new RegExp(`['"]${slug}['"]`), `runtime does not recognize ${slug}`);
}

for (const selector of [
  '.terminal.home .app-row[data-app-slug]',
  '.product-shot-canvas::before',
  '.product-install-section::after',
  '.guide-index .guide-card[data-app-slug]',
  '.bt-reading-progress',
  '.terminal-overlay.open',
  '.bt-publisher-page .bt-page-head::before'
]) {
  assert.ok(css.includes(selector), `missing visual contract: ${selector}`);
}

assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /animation:none!important/);
assert.doesNotMatch(css, /transition:[^;}]*(?:width|height|left|right|top|bottom)/i, 'layout properties must not animate');
assert.doesNotMatch(css, /backdrop-filter|filter:\s*blur|perspective|rotate[XYZ]?\(/i, 'accent system must avoid expensive or theatrical effects');
assert.equal((css.match(/\binfinite\b/g) || []).length, 1, 'only one continuous animation is permitted');
assert.match(css, /\.bt-visits-live\{[^}]*animation:bt-live-breathe[^}]*infinite/);

assert.match(runtime, /requestAnimationFrame\(update\)/);
assert.match(runtime, /addEventListener\('scroll', schedule, \{ passive: true \}\)/);
assert.match(runtime, /MutationObserver/);
assert.match(runtime, /data-app-slug/);
assert.doesNotMatch(runtime, /mousemove|pointermove|WebGL|canvas|getContext\(|setInterval\(/i);

for (const source of [assets, builder, injector, publisher]) {
  assert.match(source, /\/bt-accent-system\.css\?v=1/);
  assert.match(source, /\/bt-accent-system\.js\?v=1/);
}
assert.match(injector, /--validate-only/);
assert.match(injector, /replace\(\/<\\\/head>\/i/);
assert.match(assets, /\/home-visual\.css\?v=4/);
assert.match(assets, /\/app-icon-hydrator\.js\?v=6/);
assert.match(builder, /\/app-icon-hydrator\.js\?v=6/);
assert.equal(pkg.scripts['accents:build'], 'node tools/inject-accent-runtime.mjs');
assert.equal(pkg.scripts['accents:validate'], 'node tools/inject-accent-runtime.mjs --validate-only');
assert.match(pkg.scripts['build:site'], /accents:build/);
assert.match(pkg.scripts['test:publisher'], /accents:build[\s\S]*accents:validate/);

console.log('BassThermal visual accent system contract passed');
