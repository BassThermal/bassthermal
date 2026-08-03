import worker from './worker-v2.js';

const HOMEPAGE_PATHS = new Set(['/', '/index.html']);
const RETIRED_READOUT = '10 apps · Windows · Android · Web';
const SHELL_STYLE_PATH = '/bt-site-shell.css';
const SHELL_RUNTIME_PATH = '/bt-site-shell.js';
const BRAND_LOADER_PATH = '/bassthermal-brand-lab-loader.v3.js';
const SHELL_STYLE = `<link rel="stylesheet" href="${SHELL_STYLE_PATH}?v=1" data-bt-site-shell-style="1">`;
const SHELL_RUNTIME = `<script src="${SHELL_RUNTIME_PATH}?v=1" defer data-bt-site-shell-runtime="1"></script>`;
const BRAND_LOADER = `<script src="${BRAND_LOADER_PATH}?v=3" defer data-bt-brand-lab-loader="1"></script>`;

export function stripRetiredHomepageReadout(html) {
  return String(html)
    .replace(/\s*<div class="right" id="readout">10 apps · Windows · Android · Web<\/div>/, '')
    .replace(/\n?\s*const readout = document\.getElementById\("readout"\);\n?/, '\n')
    .replace(/\n?\s*function updateReadout\(\) \{[\s\S]*?\n\s*\}\n/, '\n')
    .replace(/\n?\s*updateReadout\(\);\n?/, '\n');
}

export function injectBrandShell(html) {
  let output = String(html)
    .replace(/<strong>BASSTHERMAL<\/strong>/g, '<strong>bassthermal</strong>')
    .replace(/\s*<script src="\/bassthermal-logo-lab\.v2\.js\?v=2" defer><\/script>/g, '');
  if (!output.includes(SHELL_STYLE_PATH)) output = output.replace('</head>', `  ${SHELL_STYLE}\n</head>`);
  if (!output.includes(SHELL_RUNTIME_PATH)) output = output.replace('</head>', `  ${SHELL_RUNTIME}\n</head>`);
  if (!output.includes(BRAND_LOADER_PATH)) output = output.replace('</head>', `  ${BRAND_LOADER}\n</head>`);
  return output;
}

export function transformPublicHtml(html, pathname = '/') {
  const source = HOMEPAGE_PATHS.has(pathname) ? stripRetiredHomepageReadout(html) : String(html);
  return injectBrandShell(source);
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
    headers.set('x-bassthermal-site-shell', transformed.includes(SHELL_RUNTIME_PATH) ? 'ready-v1' : 'failed');
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
