import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../public/bassthermal-brand-lab.v3.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/bassthermal-brand-lab.v3.css', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../public/bassthermal-brand-lab-loader.v3.js', import.meta.url), 'utf8');
for (const value of [
  'Brand Lab', 'bassthermal.brand-project.v1', 'header', 'background', 'poster',
  'image/gif', 'video/mp4', 'video/webm', 'muted', 'playsInline', 'visibilitychange',
  'prefers-reduced-motion', 'mobilePolicy', 'capturePoster', 'makeZip', 'parseZip',
  'SHA-256', 'Project imported and verified', '/brand', '/logo', 'Disable media'
]) assert(runtime.includes(value), `missing Brand Lab contract: ${value}`);
assert(runtime.includes('indexedDB.open(DB_NAME, DB_VERSION)'));
assert(runtime.includes('URL.revokeObjectURL'));
assert(runtime.includes('document.hidden'));
assert(runtime.includes('state.backgroundSignature !== signature'));
assert(runtime.includes('state.backgroundNode = node'));
assert(runtime.includes('replaceProjectAssets(next)'));
assert(runtime.includes("database.transaction(STORE_NAME, 'readwrite')"));
assert(runtime.includes('state.assets = next'));
assert(!runtime.includes('fetch('));
assert(!/https?:\/\/(?!apps\.microsoft|play\.google)/.test(runtime));

for (const value of [
  'seedDefaults', 'fetchVerifiedBrandAsset', 'writeMissingAssets', 'waitForRestoredProject',
  '/assets/brand/bassthermal-mark-v1.webp',
  '0d6f0043cc69126935ca71d04e85420872c1a1963486633df690fc3da124c61f',
  "localStorage.removeItem(ACTIVE_KEY)", "get('brandlab') === '1'", '/bassthermal-brand-lab.v3.js?v=3',
  "form.addEventListener('submit'", "event.stopImmediatePropagation()", 'data-default="1"'
]) assert(loader.includes(value), `missing Brand Lab loader contract: ${value}`);
assert(!loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"));
assert(loader.includes("fetch(BRAND_ASSET, { cache: 'force-cache', credentials: 'same-origin' })"));
assert(loader.includes("crypto.subtle.digest('SHA-256'"));
assert(loader.includes("database.transaction(STORE_NAME, 'readwrite')"));
assert(!/https?:\/\//.test(loader));
assert(css.includes('#btBrandBackground'));
assert(css.includes('[data-reposition="1"]'));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
console.log('brand lab tests passed');
