import worker from './worker-v2.js';

const HOMEPAGE_PATHS = new Set(['/', '/index.html']);
const RETIRED_READOUT = '10 apps · Windows · Android · Web';
const LOGO_LAB_PATH = '/bassthermal-logo-lab.v1.js';
const LOGO_LAB_SCRIPT = `<script src="${LOGO_LAB_PATH}?v=1" defer></script>`;

export function stripRetiredHomepageReadout(html) {
  return String(html)
    .replace(/\s*<div class="right" id="readout">10 apps · Windows · Android · Web<\/div>/, '')
    .replace(/\n?\s*const readout = document\.getElementById\("readout"\);\n?/, '\n')
    .replace(/\n?\s*function updateReadout\(\) \{[\s\S]*?\n\s*\}\n/, '\n')
    .replace(/\n?\s*updateReadout\(\);\n?/, '\n');
}

export function injectHomepageLogoLab(html) {
  let output = String(html).replace(/<strong>BASSTHERMAL<\/strong>/, '<strong>bassthermal</strong>');
  if (!output.includes(LOGO_LAB_PATH)) {
    output = output.replace('</head>', `  ${LOGO_LAB_SCRIPT}\n</head>`);
  }
  return output;
}

export function transformHomepage(html) {
  return injectHomepageLogoLab(stripRetiredHomepageReadout(html));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await worker.fetch(request, env, ctx);

    if (
      request.method !== 'GET' ||
      !HOMEPAGE_PATHS.has(url.pathname) ||
      !String(response.headers.get('content-type') || '').includes('text/html')
    ) {
      return response;
    }

    const original = await response.text();
    const transformed = transformHomepage(original);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    headers.set('x-bassthermal-homepage-cleanup', transformed.includes(RETIRED_READOUT) ? 'failed' : 'readout-removed');
    headers.set(
      'x-bassthermal-logo-lab',
      transformed.includes(LOGO_LAB_PATH) && transformed.includes('<strong>bassthermal</strong>') ? 'ready' : 'failed'
    );

    return new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
