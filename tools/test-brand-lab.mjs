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
  'seedDefaults', 'fetchVerifiedBrandAsset', 'writeMissingAssets', 'waitForRestoredProject',
  '/assets/brand/bassthermal-mark-v1.webp', 'const BRAND_BYTES = 14568',
  'a059081c7b34f0e1d768801e86ed82fd6d93c9c4e2bf474c22c09285e54d5ed2',
  "localStorage.removeItem(ACTIVE_KEY)", "get('brandlab') === '1'",
  "database.transaction(STORE_NAME, 'readwrite')"
]) assert(loader.includes(contract), `missing loader contract: ${contract}`);

assert(!loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"));
assert(!runtime.includes('fetch('));
assert(css.includes('#btBrandBackground'));
assert(css.includes('[data-reposition="1"]'));
console.log('brand lab tests passed');
