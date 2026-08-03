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
assert(loader.includes("localStorage.getItem(ACTIVE_KEY) === '1'"));
assert(loader.includes('/bassthermal-brand-lab.v3.js?v=3'));
assert(css.includes('#btBrandBackground'));
assert(css.includes('[data-reposition="1"]'));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
console.log('brand lab tests passed');
