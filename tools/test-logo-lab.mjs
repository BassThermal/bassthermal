import assert from 'node:assert/strict';
import fs from 'node:fs';
import { injectHomepageLogoLab, transformHomepage } from '../src/worker-entry.js';

const fixture = `<!doctype html><html><head><title>x</title></head><body><header><div class="brand"><strong>BASSTHERMAL</strong></div><div class="right" id="readout">10 apps · Windows · Android · Web</div></header><script>const readout = document.getElementById("readout");\nfunction updateReadout() {\n  readout.textContent = "10 apps · Windows · Android · Web";\n}\nupdateReadout();</script></body></html>`;

const injected = injectHomepageLogoLab(fixture);
assert(injected.includes('<strong>bassthermal</strong>'));
assert(injected.includes('<script src="/bassthermal-logo-lab.v2.js?v=2" defer></script>'));
assert.equal((injectHomepageLogoLab(injected).match(/bassthermal-logo-lab\.v2\.js/g) || []).length, 1);

const transformed = transformHomepage(fixture);
assert(!transformed.includes('id="readout"'));
assert(!transformed.includes('function updateReadout()'));
assert(!transformed.includes('updateReadout();'));
assert(transformed.includes('<strong>bassthermal</strong>'));
assert.equal((transformed.match(/bassthermal-logo-lab\.v2\.js/g) || []).length, 1);

const runtime = fs.readFileSync(new URL('../public/bassthermal-logo-lab.v2.js', import.meta.url), 'utf8');
for (const contract of [
  'Logo Lab',
  'Live browser-local preview',
  'Choose image',
  'Header mark',
  'Background mark',
  'Header size',
  'Mark gap',
  'Horizontal',
  'Vertical',
  'Export recipe',
  'bassthermal.logo-lab.recipe.v1',
  'action === "close"',
  'action === "reset"',
  'action === "export"',
  'action === "source" || action === "image"'
]) assert(runtime.includes(contract), `missing Logo Lab contract: ${contract}`);

assert(runtime.includes('setTimeout(closeTerminalOverlay, 0)'));
assert(runtime.includes('backgroundEnabled: false'));
assert(runtime.includes('indexedDB.open'));
assert(runtime.includes('window.crypto.subtle.digest'));
assert(!runtime.includes('fetch('));
assert(!/https?:\/\//.test(runtime));
assert(!runtime.includes('data:image/'));
assert(!runtime.includes('/logo opacity'));
assert(!runtime.includes('/logo scale'));
assert(!runtime.includes('/logo position'));

console.log('logo lab tests passed');
