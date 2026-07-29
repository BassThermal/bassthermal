import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const expect = (condition, label) => checks.push({ condition: Boolean(condition), label });

const explorerJs = read('public/screenshot-explorer.js');
const productJs = read('public/product-page.js');
const guideJs = read('public/guide-page.js');
const badgeJs = read('public/microsoft-store-badge.js');
const productCss = read('public/product-page-v2.css');
const mediaCss = read('public/product-page-media.css');
const homeCss = read('public/home-visual.css');
const guideCss = read('public/guide-page.css');
const badgeCss = read('public/microsoft-store-badge.css');
const homeBuilder = read('tools/build-homepage-chrome.mjs');
const packageJson = JSON.parse(read('package.json'));

expect(productJs.includes("stage.className = 'product-stage'"), 'product stage composition exists');
expect(productJs.includes('window.BTScreenshotExplorer'), 'product page loads shared screenshot explorer');
expect(guideJs.includes('window.BTScreenshotExplorer'), 'guide page loads shared screenshot explorer');
expect(guideJs.includes("className: 'guide-screenshot-explorer'"), 'guide gallery uses shared screenshot instrument');
expect(explorerJs.includes("window.BTScreenshotExplorer = { build, groupsFor, closeViewer }"), 'shared screenshot runtime exports one API');
expect(explorerJs.includes("setAttribute('aria-pressed'"), 'platform controls expose aria-pressed');
expect(explorerJs.includes('selectionToken'), 'screenshot selection race guard exists');
expect(explorerJs.includes('thumbGeneration'), 'obsolete thumbnail callbacks are invalidated');
expect(explorerJs.includes('removeItem(group, item)'), 'failed screenshots are removed by stable identity');
expect(!explorerJs.includes('removeItem(group, index)'), 'stale numeric failure removal is absent');
expect(explorerJs.includes('probe.decode'), 'active screenshot decode path exists');
expect(explorerJs.includes('preloadAdjacent'), 'adjacent screenshot preload exists');
expect(productCss.includes('grid-template-areas:'), 'product stage uses named grid areas');
expect(productCss.includes('product-guide-link'), 'product guide action styling exists');
expect(productJs.includes("section.className = 'product-section product-install-section'"), 'dedicated product install section is created');
expect(productJs.includes('actions.append(platforms)'), 'existing platform anchors move without URL duplication');
expect(productJs.includes('removeGenericInstallFaq'), 'generic install FAQ is removed during enhancement');
expect(productJs.includes("question === 'where do i install it?'"), 'install FAQ removal is narrowly targeted');
expect(productCss.includes('.product-install-section'), 'product install section styling exists');
expect(badgeJs.includes("document.querySelector('.product-install-actions')"), 'product badges target the install section');
expect(!badgeJs.includes("document.querySelector('.product-heading')"), 'product badges cannot mount under the title');
expect(badgeJs.includes("'bt:product-install-ready'"), 'badge runtime handles install-section readiness deterministically');
expect(mediaCss.includes('height:clamp(420px,34vw,560px)'), 'desktop screenshot viewport has stable responsive height');
expect(mediaCss.includes('height:clamp(300px,88vw,420px)'), 'mobile screenshot viewport has stable responsive height');
expect(!mediaCss.includes('aspect-ratio:var(--shot-ratio)'), 'active image ratio cannot resize the outer screenshot viewport');
expect(mediaCss.includes('scroll-snap-type:x proximity'), 'thumbnail rail uses native scroll snapping');
expect(mediaCss.includes('prefers-reduced-motion'), 'media reduced-motion contract exists');
expect(homeCss.includes('grid-template-columns:38px'), 'desktop homepage strong-list grid exists');
expect(!homeCss.includes('.right{display:block'), 'homepage status readout styling is absent');
expect(homeBuilder.includes('readoutPattern'), 'homepage builder removes legacy status readout');
expect(homeBuilder.includes('homepage status readout must not exist'), 'homepage readout absence is validated');
expect(guideCss.includes('guide-screenshot-explorer'), 'guide media receives shared explorer layout');
expect(guideCss.includes('guide-media-caption'), 'guide screenshot caption styling exists');
expect(badgeCss.includes('--store-visible-h'), 'Store badges use one visible-height token');
expect(badgeCss.includes('--play-asset-h'), 'Google badge transparent padding is optically compensated');
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
