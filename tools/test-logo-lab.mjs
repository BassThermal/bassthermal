import assert from 'node:assert/strict';
import fs from 'node:fs';
import { injectHomepageLogoLab, transformHomepage } from '../src/worker-entry.js';

const fixture = `<!doctype html><html><head><title>x</title></head><body><header><div class="brand"><strong>BASSTHERMAL</strong></div><div class="right" id="readout">10 apps · Windows · Android · Web</div></header><script>const readout = document.getElementById("readout");\nfunction updateReadout() {\n  readout.textContent = "10 apps · Windows · Android · Web";\n}\nupdateReadout();</script></body></html>`;

const injected = injectHomepageLogoLab(fixture);
assert(injected.includes('<strong>bassthermal</strong>'));
assert(injected.includes('<script src="/bassthermal-logo-lab.v1.js?v=1" defer></script>'));
assert.equal((injectHomepageLogoLab(injected).match(/bassthermal-logo-lab\.v1\.js/g) || []).length, 1);

const transformed = transformHomepage(fixture);
assert(!transformed.includes('id="readout"'));
assert(!transformed.includes('function updateReadout()'));
assert(!transformed.includes('updateReadout();'));
assert(transformed.includes('<strong>bassthermal</strong>'));
assert.equal((transformed.match(/bassthermal-logo-lab\.v1\.js/g) || []).length, 1);

const runtime = fs.readFileSync(new URL('../public/bassthermal-logo-lab.v1.js', import.meta.url), 'utf8');
for (const command of [
  '/logo source',
  '/logo header on|off',
  '/logo word lower|upper|hide|show',
  '/logo bg on|off',
  '/logo position left|center|right',
  '/logo preset clean|ambient|bold|minimal',
  '/logo reset'
]) assert(runtime.includes(command), `missing command contract: ${command}`);

assert(runtime.includes('this browser only · no upload'));
assert(runtime.includes('indexedDB.open'));
assert(runtime.includes('backgroundEnabled: false'));
assert(!runtime.includes('fetch('));
assert(!/https?:\/\//.test(runtime));
assert(!runtime.includes('data:image/'));

console.log('logo lab tests passed');
