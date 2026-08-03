import assert from 'node:assert/strict';
import { injectBrandShell, injectStaticSiteHeader, routeModel, stripRetiredHomepageReadout, transformPublicHtml } from '../src/worker-entry.js';

const homeFixture = '<!doctype html><html><head><script src="/bassthermal-logo-lab.v2.js?v=2" defer></script></head><body><main><header class="topline"><div class="brand"><strong>BASSTHERMAL</strong></div><div class="right" id="readout">10 apps · Windows · Android · Web</div></header><script>const readout = document.getElementById("readout");\nfunction updateReadout() {\n readout.textContent = "x";\n}\nupdateReadout();</script></main></body></html>';
const home = transformPublicHtml(homeFixture, '/');
assert(home.includes('class="bt-site-header"'));
assert(home.includes('class="bt-site-wordmark">bassthermal</a>'));
assert(!home.includes('class="topline"'));
assert(!home.includes('bassthermal-logo-lab.v2.js'));
assert(!home.includes('id="readout"'));
assert(home.includes('/bt-site-shell.css?v=1'));
assert(home.includes('/bt-site-shell.js?v=1'));
assert(home.includes('/bassthermal-brand-lab-loader.v3.js?v=3'));
assert.equal((injectBrandShell(home, '/').match(/bt-site-shell\.js/g) || []).length, 1);
assert.equal((injectBrandShell(home, '/').match(/brand-lab-loader\.v3\.js/g) || []).length, 1);

const productFixture = '<html><head></head><body><main class="product-page"><header class="product-header"><div class="product-breadcrumb"><strong>BASSTHERMAL</strong> / DualTicker</div><h1 class="product-title">DualTicker</h1></header></main></body></html>';
const product = transformPublicHtml(productFixture, '/apps/dualticker/');
assert(product.includes('<span aria-current="page">DualTicker</span>'));
assert(!product.includes('product-breadcrumb'));
assert(product.indexOf('bt-site-header') < product.indexOf('product-header'));
assert.deepEqual(routeModel(productFixture, '/apps/dualticker/').map((item) => item.label), ['bassthermal', 'DualTicker']);

const guideFixture = '<html><head></head><body><main><header class="guide-header"><div class="guide-breadcrumb">BASSTHERMAL / Guides / DualTicker</div><div class="guide-kicker">DualTicker guide</div><h1>Compare sources</h1></header></main></body></html>';
const guide = injectStaticSiteHeader(guideFixture, '/guides/dualticker/compare-live-headline-sources/');
assert(guide.includes('href="/guides/">Guides</a>'));
assert(guide.includes('<span aria-current="page">DualTicker</span>'));
assert(!guide.includes('guide-breadcrumb'));

const privacyFixture = '<html><head></head><body><main><header class="bt-page-head"><div class="dim"><a>BASSTHERMAL</a> / privacy / ISBN Manager</div><h1>ISBN Manager privacy</h1></header></main></body></html>';
const privacy = injectStaticSiteHeader(privacyFixture, '/privacy/isbn-manager/');
assert(privacy.includes('<span aria-current="page">ISBN Manager</span>'));
assert(!privacy.includes('class="dim"'));
assert.equal(stripRetiredHomepageReadout('plain'), 'plain');
console.log('brand shell worker tests passed');
