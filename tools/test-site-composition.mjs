import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const expect = (condition, label) => checks.push({ condition: Boolean(condition), label });

const productJs = read('public/product-page.js');
const productCss = read('public/product-page-v2.css');
const mediaCss = read('public/product-page-media.css');
const homeCss = read('public/home-visual.css');
const guideCss = read('public/guide-page.css');
const badgeCss = read('public/microsoft-store-badge.css');
const packageJson = JSON.parse(read('package.json'));

expect(productJs.includes("stage.className = 'product-stage'"), 'product stage composition exists');
expect(productJs.includes("explorer.className = 'product-stage-media'"), 'single product media explorer exists');
expect(productJs.includes("setAttribute('aria-pressed'"), 'platform controls expose aria-pressed');
expect(productJs.includes('selectionToken'), 'screenshot selection race guard exists');
expect(productJs.includes('probe.decode'), 'active screenshot decode path exists');
expect(productJs.includes('preloadAdjacent'), 'adjacent screenshot preload exists');
expect(productJs.includes('removeItem(group, index)'), 'media failure removal exists');
expect(!productJs.includes('product-shot-group'), 'stacked platform canvases removed');
expect(productCss.includes('grid-template-areas:'), 'product stage uses named grid areas');
expect(productCss.includes('"identity media"'), 'desktop identity/media composition exists');
expect(mediaCss.includes('[data-orientation="portrait"]'), 'portrait media fitting exists');
expect(mediaCss.includes('height:clamp(420px,34vw,560px)'), 'desktop screenshot viewport has stable responsive height');
expect(mediaCss.includes('height:clamp(300px,88vw,420px)'), 'mobile screenshot viewport has stable responsive height');
expect(!mediaCss.includes('aspect-ratio:var(--shot-ratio)'), 'active image ratio cannot resize the outer screenshot viewport');
expect(!mediaCss.includes('.product-shot-stage[data-orientation="portrait"]{\n  justify-self:center;'), 'portrait mode does not resize the outer screenshot stage');
expect(mediaCss.includes('.product-shot-stage[data-orientation="portrait"] .product-shot-stage-button'), 'portrait media fits inside the stable viewport');
expect(mediaCss.includes('scroll-snap-type:x proximity'), 'thumbnail rail uses native scroll snapping');
expect(mediaCss.includes('prefers-reduced-motion'), 'media reduced-motion contract exists');
expect(homeCss.includes('font-size:13.75px!important'), 'mobile homepage retains readable type');
expect(homeCss.includes('grid-template-columns:38px'), 'desktop homepage strong-list grid exists');
expect(guideCss.includes('grid-template-columns:repeat(2'), 'Guides desktop two-column library remains');
expect(guideCss.includes('focus-within'), 'Guides keyboard focus response exists');
expect(badgeCss.includes('translateY(-1px)'), 'Store badge motion stays restrained');
expect(packageJson.scripts?.['home:build'] === 'node tools/build-homepage-chrome.mjs', 'homepage build command registered');
expect(packageJson.scripts?.['build:site']?.includes('home:build'), 'site build includes homepage chrome generation');

let failed = 0;
for (const check of checks) {
  if (check.condition) console.log(`PASS  ${check.label}`);
  else { console.error(`FAIL  ${check.label}`); failed += 1; }
}
console.log(`\n${checks.length - failed} PASS · ${failed} FAIL`);
if (failed) process.exitCode = 1;
