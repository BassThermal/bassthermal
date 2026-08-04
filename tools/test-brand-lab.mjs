import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../public/bassthermal-brand-lab.v3.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../public/bassthermal-brand-lab-loader.v3.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/bassthermal-brand-lab.v3.css', import.meta.url), 'utf8');

for (const contract of [
  'Brand Lab', 'bassthermal.brand-project.v1', 'image/gif', 'video/mp4', 'video/webm',
  'visibilitychange', 'capturePoster', 'makeZip', 'parseZip', 'replaceProjectAssets(next)'
]) assert(runtime.includes(contract), `missing Brand Lab contract: ${contract}`);

for (const contract of [
  "['/brand', 'brand', '/logo', 'logo']", '/bassthermal-brand-lab.v3.js?v=3',
  'localStorage.removeItem(ACTIVE_KEY)', "get('brandlab') === '1'",
  "form.addEventListener('submit'", 'data-bt-brand-lab-runtime', 'data-default="1"'
]) assert(loader.includes(contract), `missing explicit loader contract: ${contract}`);

assert(!loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"));
assert(!loader.includes('indexedDB.open'));
assert(!loader.includes('fetch(BRAND_ASSET'));
assert(!runtime.includes('fetch('));
assert(runtime.includes('image.dataset.defaultSrc'));
assert(runtime.includes("slot.dataset.custom = '1'"));
assert(runtime.includes("slot.dataset.custom = '0'"));
assert(!runtime.includes('image.removeAttribute(\'src\')'));
assert(!runtime.includes('root.dataset.btBrandHeader'));
assert(runtime.includes('Use custom logo'));
assert(runtime.includes('state.settings.headerEnabled = false'));
assert(runtime.includes('Controls reset; committed logo restored'));
assert(css.includes('#btBrandBackground'));
assert(css.includes('[data-reposition="1"]'));
console.log('brand lab tests passed');
