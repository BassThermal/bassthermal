import assert from 'node:assert/strict';
import fs from 'node:fs';
import { routeModel } from './site-shell-model.mjs';

assert.deepEqual(routeModel('/'), [{ label: 'bassthermal', href: '/' }]);
assert.deepEqual(routeModel('/apps/dualticker/', 'DualTicker'), [
  { label: 'bassthermal', href: '/' }, { label: 'DualTicker', current: true }
]);
assert.deepEqual(routeModel('/guides/dualticker/compare-live-headline-sources/', 'DualTicker'), [
  { label: 'bassthermal', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'DualTicker', current: true }
]);
assert.deepEqual(routeModel('/privacy/isbn-manager/', 'ISBN Manager'), [
  { label: 'bassthermal', href: '/' }, { label: 'Privacy', href: '/privacy/' }, { label: 'ISBN Manager', current: true }
]);

const runtime = fs.readFileSync(new URL('../public/bt-site-shell.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/bt-site-shell.css', import.meta.url), 'utf8');
for (const value of ['bt-site-header', 'aria-label', 'Breadcrumb', 'aria-current', 'bassthermal', 'Microsoft Store', 'Google Play', 'removeLegacyIdentity', 'bt:site-shell-ready']) {
  assert(runtime.includes(value), `missing site shell contract: ${value}`);
}
assert(runtime.includes("document.querySelectorAll('.product-breadcrumb, .guide-breadcrumb')"));
assert(css.includes('@media(max-width:820px)'));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
assert(!runtime.includes('innerHTML ='));
assert(!runtime.includes('fetch('));
console.log('site shell tests passed');
