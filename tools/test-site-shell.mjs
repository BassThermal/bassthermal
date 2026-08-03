import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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

const builder = fs.readFileSync(new URL('./build-public-brand-shell.mjs', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/bt-site-shell.css', import.meta.url), 'utf8');
for (const value of [
  'bt-site-header', 'aria-label', 'Breadcrumb', 'aria-current', 'bassthermal',
  'Microsoft Store', 'Google Play', '/assets/brand/bassthermal-mark-v1.webp?v=2',
  'stripLegacyIdentity', 'injectHead', 'data-bt-site-shell="${SHELL_VERSION}"'
]) assert(builder.includes(value), `missing static shell builder contract: ${value}`);
assert(builder.includes('class="product-breadcrumb"'));
assert(builder.includes('class="guide-breadcrumb"'));
assert(builder.includes('/bt-site-shell.css?v=4'));
assert(builder.includes('/bassthermal-brand-lab-loader.v3.js?v=5'));
assert(css.includes('position:sticky'));
assert(css.includes('top:0'));
assert(css.includes('min-height:52px'));
assert(css.includes('background:rgba(0,0,0,.985)'));
assert(css.includes('scroll-padding-top:68px'));
assert(css.includes('@media(max-width:1100px)'));
assert(css.includes('@media(max-width:520px)'));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
assert(css.includes('#btBrandBackground[data-active="1"]'));
assert(!css.includes('overflow-wrap:anywhere'));
assert(!css.includes('word-break:break-all'));
assert(!css.includes('.site-shell,main,footer,.terminal-overlay,.asset-panel'));
assert(!builder.includes('window.BT_SITE_SHELL'));

const homepage = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const terminalCss = homepage.match(/\.terminal-overlay\s*\{([^}]*)\}/)?.[1] || '';
assert.match(terminalCss, /position:\s*fixed/);
const terminalZ = Number(terminalCss.match(/z-index:\s*(\d+)/)?.[1]);
const headerCss = css.match(/\.bt-site-header\s*\{([^}]*)\}/)?.[1] || '';
const headerZ = Number(headerCss.match(/z-index:\s*(\d+)/)?.[1]);
assert(terminalZ > headerZ, `terminal z-index ${terminalZ} must exceed header z-index ${headerZ}`);
assert(homepage.includes('if (!terminalOverlay.classList.contains("open")) return;'));
assert(homepage.includes('if (!rect.width || !rect.height) return;'));
for (const match of homepage.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const type = match[1].match(/\btype=["']([^"']+)["']/i)?.[1];
  if (type && !/^(?:module|text\/javascript|application\/javascript)$/i.test(type)) continue;
  new vm.Script(match[2], { filename: 'public/index.html:inline-script' });
}
console.log('site shell source-contract tests passed');
