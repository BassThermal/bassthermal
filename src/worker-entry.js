import worker from './worker-v2.js';

const HOMEPAGE_PATHS = new Set(['/', '/index.html']);
const RETIRED_READOUT = '10 apps · Windows · Android · Web';

export function stripRetiredHomepageReadout(html) {
  return String(html)
    .replace(/\s*<div class="right" id="readout">10 apps · Windows · Android · Web<\/div>/, '')
    .replace(/\n?\s*const readout = document\.getElementById\("readout"\);\n?/, '\n')
    .replace(/\n?\s*function updateReadout\(\) \{[\s\S]*?\n\s*\}\n/, '\n')
    .replace(/\n?\s*updateReadout\(\);\n?/, '\n');
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
    const cleaned = stripRetiredHomepageReadout(original);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    headers.set('x-bassthermal-homepage-cleanup', cleaned.includes(RETIRED_READOUT) ? 'failed' : 'readout-removed');

    return new Response(cleaned, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
