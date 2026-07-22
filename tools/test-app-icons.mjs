import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const manifest = await fs.readFile('public/store-assets.generated.js', 'utf8');
const runtime = await fs.readFile('public/app-icon-hydrator.js', 'utf8');

for (const [slug, expected] of [
  ['rss-crawler', '/assets/apps/rss-crawler/icon.png'],
  ['favicon-harvester', '/assets/apps/favicon-harvester/app.png'],
  ['website-image-inventory', '/assets/apps/website-image-inventory/app.png'],
  ['courselab-beam', '/assets/apps/courselab-beam/app.png'],
  ['docbatch-pdf-converter', '/assets/apps/docbatch-pdf-converter/app.png']
]) {
  const block = manifest.match(new RegExp(`"${slug}": \\{[\\s\\S]*?"fallback": "([^"]+)"`));
  assert.ok(block, `missing manifest entry for ${slug}`);
  assert.equal(block[1], expected, `wrong fallback for ${slug}`);
}

assert.ok(!manifest.includes('"rss-finder"'), 'legacy rss-finder manifest entry remains');
assert.ok(manifest.includes('data-bt-app-icon-runtime'), 'app icon runtime was not appended');
assert.ok(runtime.includes("img.classList.add('is-missing')"), 'icons are not hidden before verification');
assert.ok(runtime.includes('probe.onload'), 'icon load is not verified');
assert.ok(runtime.includes('probe.onerror'), 'icon failure is not handled');

console.log('app icon tests passed');
