import assert from 'node:assert/strict';
import { injectBrandShell, stripRetiredHomepageReadout, transformPublicHtml } from '../src/worker-entry.js';

const fixture = '<!doctype html><html><head><script src="/bassthermal-logo-lab.v2.js?v=2" defer></script></head><body><header><strong>BASSTHERMAL</strong><div class="right" id="readout">10 apps · Windows · Android · Web</div></header><script>const readout = document.getElementById("readout");\nfunction updateReadout() {\n readout.textContent = "x";\n}\nupdateReadout();</script></body></html>';
const home = transformPublicHtml(fixture, '/');
assert(home.includes('<strong>bassthermal</strong>'));
assert(!home.includes('bassthermal-logo-lab.v2.js'));
assert(!home.includes('id="readout"'));
assert(home.includes('/bt-site-shell.css?v=1'));
assert(home.includes('/bt-site-shell.js?v=1'));
assert(home.includes('/bassthermal-brand-lab-loader.v3.js?v=3'));
assert.equal((injectBrandShell(home).match(/bt-site-shell\.js/g) || []).length, 1);
assert.equal((injectBrandShell(home).match(/brand-lab-loader\.v3\.js/g) || []).length, 1);
const product = transformPublicHtml('<html><head></head><body><main></main></body></html>', '/apps/dualticker/');
assert(product.includes('/bt-site-shell.js?v=1'));
assert.equal(stripRetiredHomepageReadout('plain'), 'plain');
console.log('brand shell worker tests passed');
