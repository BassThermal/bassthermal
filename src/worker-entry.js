import worker from './worker-v2.js';

const HOMEPAGE_PATHS = new Set(['/', '/index.html']);
const RETIRED_READOUT = '10 apps · Windows · Android · Web';
const BRAND_ASSET_PATH = '/assets/brand/bassthermal-mark-v1.webp';
const BRAND_FAVICON_PATH = '/favicon-32x32.png';
const SHELL_STYLE_PATH = '/bt-site-shell.css';
const SHELL_RUNTIME_PATH = '/bt-site-shell.js';
const BRAND_LOADER_PATH = '/bassthermal-brand-lab-loader.v3.js';
const SHELL_STYLE = `<link rel="stylesheet" href="${SHELL_STYLE_PATH}?v=2" data-bt-site-shell-style="1">`;
const SHELL_RUNTIME = `<script src="${SHELL_RUNTIME_PATH}?v=2" defer data-bt-site-shell-runtime="1"></script>`;
const BRAND_LOADER = `<script src="${BRAND_LOADER_PATH}?v=4" defer data-bt-brand-lab-loader="1"></script>`;
const BRAND_FAVICON = `<link rel="icon" type="image/png" sizes="32x32" href="${BRAND_FAVICON_PATH}?v=1" data-bt-brand-favicon="1">\n  <link rel="shortcut icon" type="image/png" href="${BRAND_FAVICON_PATH}?v=1">\n  <meta name="theme-color" content="#000000">`;
const STORE_WINDOWS = 'https://apps.microsoft.com/search/publisher?name=BassThermal&amp;hl=en-US&amp;gl=CA';
const STORE_ANDROID = 'https://play.google.com/store/apps/developer?id=BassThermal';

const titleCase = (value) => String(value || '').split(/[-\s]+/).filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

function normalizedPath(pathname = '/') {
  const value = String(pathname || '/').replace(/\/{2,}/g, '/');
  if (value === '/index.html') return '/';
  return value.endsWith('/') ? value : `${value}/`;
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (match && match[1]) return match[1].replace(/<[^>]+>/g, '').trim();
  }
  return '';
}

export function routeModel(html, pathname = '/') {
  const path = normalizedPath(pathname);
  const parts = path.split('/').filter(Boolean);
  const root = { label: 'bassthermal', href: '/' };
  if (path === '/') return [root];
  if (parts[0] === 'apps') {
    const label = firstMatch(html, [/<h1 class="product-title">([\s\S]*?)<\/h1>/i]) || titleCase(parts[1]);
    return [root, { label, current: true }];
  }
  if (parts[0] === 'guides') {
    if (parts.length === 1) return [root, { label: 'Guides', current: true }];
    const label = firstMatch(html, [/<div class="guide-kicker">([\s\S]*?)\s+guide<\/div>/i]) || titleCase(parts[1]);
    return [root, { label: 'Guides', href: '/guides/' }, { label, current: true }];
  }
  if (parts[0] === 'privacy') {
    if (parts.length === 1) return [root, { label: 'Privacy', current: true }];
    const label = firstMatch(html, [/<h1>([\s\S]*?)\s+privacy<\/h1>/i]) || titleCase(parts[1]);
    return [root, { label: 'Privacy', href: '/privacy/' }, { label, current: true }];
  }
  const label = firstMatch(html, [/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i]) || titleCase(parts[0]);
  return [root, { label, current: true }];
}

function pathMarkup(model) {
  const items = model.map((item, index) => {
    const mark = index === 0
      ? `<span class="bt-site-mark-slot" data-ready="1" aria-hidden="true"><img class="bt-site-mark" src="${BRAND_ASSET_PATH}" alt="" decoding="async" fetchpriority="high"></span>`
      : '';
    const content = item.href
      ? `<a href="${item.href}"${index === 0 ? ' class="bt-site-wordmark"' : ''}>${item.label}</a>`
      : `<span${item.current ? ' aria-current="page"' : ''}>${item.label}</span>`;
    return `<li class="${index === 0 ? 'bt-site-root' : 'bt-site-segment'}">${mark}${content}</li>`;
  }).join('');
  return `<nav class="bt-site-path" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

export function siteHeaderMarkup(html, pathname = '/') {
  return `<header class="bt-site-header" data-bt-site-shell="1.1.0">${pathMarkup(routeModel(html, pathname))}<nav class="bt-site-primary" aria-label="Primary"><a href="/guides/">Guides</a><a href="/support/">Support</a><a href="${STORE_WINDOWS}">Microsoft Store</a><a href="${STORE_ANDROID}">Google Play</a></nav></header>`;
}

export function brandBackgroundMarkup() {
  return `<div id="btBrandBackground" data-active="1" data-default="1" aria-hidden="true"><div class="bt-brand-media"><img class="bt-brand-background-asset" src="${BRAND_ASSET_PATH}" alt="" decoding="async"></div><div class="bt-brand-mask"></div></div>`;
}

export function stripRetiredHomepageReadout(html) {
  return String(html)
    .replace(/\s*<div class="right" id="readout">10 apps · Windows · Android · Web<\/div>/, '')
    .replace(/\n?\s*const readout = document\.getElementById\("readout"\);\n?/, '\n')
    .replace(/\n?\s*function updateReadout\(\) \{[\s\S]*?\n\s*\}\n/, '\n')
    .replace(/\n?\s*updateReadout\(\);\n?/, '\n');
}

export function injectStaticSiteHeader(html, pathname = '/') {
  let output = String(html);
  const header = siteHeaderMarkup(output, pathname);
  if (/<header class="bt-site-header"\b/i.test(output)) return output;
  if (HOMEPAGE_PATHS.has(pathname)) {
    return output.replace(/<header class="topline">[\s\S]*?<\/header>/i, header);
  }
  output = output
    .replace(/\s*<div class="product-breadcrumb">[\s\S]*?<\/div>/i, '')
    .replace(/\s*<div class="guide-breadcrumb">[\s\S]*?<\/div>/i, '')
    .replace(/(<header class="bt-page-head">)\s*<div class="dim">([\s\S]*?)<\/div>/i, function (match, start, text) {
      return /BASSTHERMAL/i.test(text) ? start : match;
    });
  return output.replace(/(<main\b[^>]*>)/i, `$1\n    ${header}`);
}

export function injectStaticBrandBackground(html) {
  const output = String(html);
  if (output.includes('id="btBrandBackground"')) return output;
  return output.replace(/(<body\b[^>]*>)/i, `$1\n  ${brandBackgroundMarkup()}`);
}

export function injectBrandFavicon(html) {
  const output = String(html);
  if (output.includes('data-bt-brand-favicon="1"')) return output;
  return output.replace('</head>', `  ${BRAND_FAVICON}\n</head>`);
}

export function injectBrandShell(html, pathname = '/') {
  let output = String(html)
    .replace(/<strong>BASSTHERMAL<\/strong>/g, '<strong>bassthermal</strong>')
    .replace(/\s*<script src="\/bassthermal-logo-lab\.v2\.js\?v=2" defer><\/script>/g, '');
  output = injectBrandFavicon(injectStaticBrandBackground(injectStaticSiteHeader(output, pathname)));
  if (!output.includes(SHELL_STYLE_PATH)) output = output.replace('</head>', `  ${SHELL_STYLE}\n</head>`);
  if (!output.includes(SHELL_RUNTIME_PATH)) output = output.replace('</head>', `  ${SHELL_RUNTIME}\n</head>`);
  if (!output.includes(BRAND_LOADER_PATH)) output = output.replace('</head>', `  ${BRAND_LOADER}\n</head>`);
  return output;
}

export function transformPublicHtml(html, pathname = '/') {
  const source = HOMEPAGE_PATHS.has(pathname) ? stripRetiredHomepageReadout(html) : String(html);
  return injectBrandShell(source, pathname);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await worker.fetch(request, env, ctx);
    if (request.method !== 'GET' || !String(response.headers.get('content-type') || '').includes('text/html')) return response;

    const original = await response.text();
    const transformed = transformPublicHtml(original, url.pathname);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    headers.set('x-bassthermal-site-shell', transformed.includes('class="bt-site-header"') ? 'ready-v2' : 'failed');
    if (HOMEPAGE_PATHS.has(url.pathname)) {
      headers.set('x-bassthermal-homepage-cleanup', transformed.includes(RETIRED_READOUT) ? 'failed' : 'readout-removed');
    }

    return new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
