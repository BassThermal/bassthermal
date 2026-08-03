import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const validateOnly = process.argv.includes('--validate-only');
const BRAND_ASSET = '/assets/brand/bassthermal-mark-v1.webp';
const FAVICON = '/favicon-32x32.png?v=2';
const SHELL_CSS = '/bt-site-shell.css?v=3';
const BRAND_LOADER = '/bassthermal-brand-lab-loader.v3.js?v=5';
const SHELL_VERSION = '1.2.0';
const STORE_WINDOWS = 'https://apps.microsoft.com/search/publisher?name=BassThermal&amp;hl=en-US&amp;gl=CA';
const STORE_ANDROID = 'https://play.google.com/store/apps/developer?id=BassThermal';
const errors = [];

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : (entry.isFile() && entry.name === 'index.html' ? [absolute] : []);
  });
}

function routeFor(relative) {
  const normalized = relative.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  return `/${normalized.replace(/index\.html$/, '')}`;
}

function isPublicShellRoute(route) {
  return route === '/'
    || /^\/apps\/[^/]+\/$/.test(route)
    || route === '/guides/'
    || /^\/guides\/.+\/$/.test(route)
    || ['/about/', '/support/', '/security/', '/privacy/'].includes(route)
    || /^\/privacy\/[^/]+\/$/.test(route);
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return '';
}

function titleCase(value) {
  return String(value || '').split(/[-\s]+/).filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function routeModel(route, html) {
  const rootItem = { label: 'bassthermal', href: '/' };
  if (route === '/') return [rootItem];
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'apps') {
    const label = firstText(html, [/<h1 class="product-title">([\s\S]*?)<\/h1>/i, /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i]) || titleCase(parts[1]);
    return [rootItem, { label, current: true }];
  }
  if (parts[0] === 'guides') {
    if (parts.length === 1) return [rootItem, { label: 'Guides', current: true }];
    const label = firstText(html, [/<div class="guide-kicker">([\s\S]*?)\s+guide<\/div>/i]) || titleCase(parts[1]);
    return [rootItem, { label: 'Guides', href: '/guides/' }, { label, current: true }];
  }
  if (parts[0] === 'privacy') {
    if (parts.length === 1) return [rootItem, { label: 'Privacy', current: true }];
    const label = firstText(html, [/<h1(?:\s[^>]*)?>([\s\S]*?)\s+privacy<\/h1>/i]) || titleCase(parts[1]);
    return [rootItem, { label: 'Privacy', href: '/privacy/' }, { label, current: true }];
  }
  const label = firstText(html, [/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i]) || titleCase(parts[0]);
  return [rootItem, { label, current: true }];
}

function headerMarkup(route, html) {
  const items = routeModel(route, html).map((item, index) => {
    const mark = index === 0
      ? `<span class="bt-site-mark-slot" data-ready="1" aria-hidden="true"><img class="bt-site-mark" src="${BRAND_ASSET}" alt="" width="32" height="32" decoding="async" fetchpriority="high"></span>`
      : '';
    const content = item.href
      ? `<a href="${item.href}"${index === 0 ? ' class="bt-site-wordmark"' : ''}>${escapeHtml(item.label)}</a>`
      : `<span${item.current ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</span>`;
    return `<li class="${index === 0 ? 'bt-site-root' : 'bt-site-segment'}">${mark}${content}</li>`;
  }).join('');
  return `<header class="bt-site-header" data-bt-site-shell="${SHELL_VERSION}"><nav class="bt-site-path" aria-label="Breadcrumb"><ol>${items}</ol></nav><nav class="bt-site-primary" aria-label="Primary"><a href="/guides/">Guides</a><a href="/support/">Support</a><a href="${STORE_WINDOWS}">Microsoft Store</a><a href="${STORE_ANDROID}">Google Play</a></nav></header>`;
}

function backgroundMarkup() {
  return `<div id="btBrandBackground" data-active="1" data-default="1" aria-hidden="true"><div class="bt-brand-media"><img class="bt-brand-background-asset" src="${BRAND_ASSET}" alt="" decoding="async"></div><div class="bt-brand-mask"></div></div>`;
}

function stripExistingShell(html) {
  return html
    .replace(/\s*<header class="bt-site-header"[\s\S]*?<\/header>/gi, '')
    .replace(/\s*<div id="btBrandBackground"[\s\S]*?<div class="bt-brand-mask"><\/div>\s*<\/div>/gi, '')
    .replace(/\s*<link[^>]+data-bt-site-shell-style="1"[^>]*>/gi, '')
    .replace(/\s*<script[^>]+data-bt-site-shell-runtime="1"[^>]*><\/script>/gi, '')
    .replace(/\s*<script[^>]+data-bt-brand-lab-loader="1"[^>]*><\/script>/gi, '')
    .replace(/\s*<link[^>]+data-bt-brand-favicon="1"[^>]*>/gi, '')
    .replace(/\s*<link[^>]+rel="shortcut icon"[^>]+favicon-32x32\.png[^>]*>/gi, '');
}

function stripLegacyIdentity(html, route) {
  let output = html
    .replace(/\s*<div class="product-breadcrumb">[\s\S]*?<\/div>/gi, '')
    .replace(/\s*<div class="guide-breadcrumb">[\s\S]*?<\/div>/gi, '');
  if (route === '/') output = output.replace(/\s*<header class="topline">[\s\S]*?<\/header>/i, '');
  output = output.replace(/(<header class="bt-page-head">)\s*<div class="dim">([\s\S]*?)<\/div>/i, (match, start, text) => /BASSTHERMAL/i.test(text) ? start : match);
  return output;
}

function injectHead(html) {
  const tags = [
    `<link rel="icon" type="image/png" sizes="32x32" href="${FAVICON}" data-bt-brand-favicon="1">`,
    `<link rel="shortcut icon" type="image/png" href="${FAVICON}">`,
    '<meta name="theme-color" content="#000000">',
    `<link rel="stylesheet" href="${SHELL_CSS}" data-bt-site-shell-style="1">`,
    `<script src="${BRAND_LOADER}" defer data-bt-brand-lab-loader="1"></script>`
  ].join('\n  ');
  const withoutDuplicateTheme = html.replace(/\s*<meta name="theme-color" content="[^"]*"\s*\/?>(?:\s*)/gi, '\n  ');
  if (!/<\/head>/i.test(withoutDuplicateTheme)) throw new Error('closing head tag missing');
  return withoutDuplicateTheme.replace(/<\/head>/i, `  ${tags}\n</head>`);
}

function transform(html, route) {
  let output = stripLegacyIdentity(stripExistingShell(html), route);
  output = injectHead(output);
  if (!/<body\b[^>]*>/i.test(output)) throw new Error('body tag missing');
  output = output.replace(/(<body\b[^>]*>)/i, `$1\n  ${backgroundMarkup()}`);
  if (!/<main\b[^>]*>/i.test(output)) throw new Error('main tag missing');
  output = output.replace(/(<main\b[^>]*>)/i, `$1\n    ${headerMarkup(route, output)}`);
  return output;
}

function validate(html, route, relative) {
  const checks = [
    [(html.match(/class="bt-site-header"/g) || []).length === 1, 'must contain exactly one public site header'],
    [(html.match(/id="btBrandBackground"/g) || []).length === 1, 'must contain exactly one permanent background'],
    [(html.match(/data-bt-brand-favicon="1"/g) || []).length === 1, 'must contain exactly one canonical favicon'],
    [(html.match(/data-bt-site-shell-style="1"/g) || []).length === 1, 'must contain exactly one shell stylesheet'],
    [(html.match(/data-bt-brand-lab-loader="1"/g) || []).length === 1, 'must contain exactly one experimental Brand Lab loader'],
    [html.includes(`data-bt-site-shell="${SHELL_VERSION}"`), 'must contain current shell version'],
    [html.includes(`class="bt-site-mark" src="${BRAND_ASSET}"`), 'must contain selected public header mark'],
    [html.includes(`class="bt-brand-background-asset" src="${BRAND_ASSET}"`), 'must contain selected permanent background'],
    [!html.includes('class="topline"'), 'must not retain homepage legacy header'],
    [!html.includes('class="product-breadcrumb"'), 'must not retain product breadcrumb'],
    [!html.includes('class="guide-breadcrumb"'), 'must not retain guide breadcrumb'],
    [!html.includes('/bt-site-shell.js?'), 'must not load runtime-generated public shell'],
    [html.indexOf('class="bt-site-header"') < html.indexOf('<h1') || !html.includes('<h1'), 'public header must precede page heading']
  ];
  for (const [ok, message] of checks) if (!ok) errors.push(`${relative}: ${message}`);
  const labels = routeModel(route, html).map((item) => item.label);
  for (const label of labels) if (!html.includes(`>${escapeHtml(label)}<`)) errors.push(`${relative}: path label missing: ${label}`);
}

const files = walk(publicRoot)
  .map((absolute) => ({ absolute, relative: path.relative(publicRoot, absolute).replaceAll('\\', '/') }))
  .map((entry) => ({ ...entry, route: routeFor(entry.relative) }))
  .filter((entry) => isPublicShellRoute(entry.route));

for (const file of files) {
  const current = fs.readFileSync(file.absolute, 'utf8');
  let next;
  try { next = transform(current, file.route); }
  catch (error) { errors.push(`${file.relative}: ${error.message}`); continue; }
  validate(next, file.route, file.relative);
  if (!validateOnly && next !== current) fs.writeFileSync(file.absolute, next, 'utf8');
}

if (!files.length) errors.push('no public shell routes were found');
if (errors.length) {
  console.error(`public brand shell ${validateOnly ? 'validation' : 'build'} failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS  Permanent public brand shell ${validateOnly ? 'validated' : 'built'} into ${files.length} HTML routes`);
