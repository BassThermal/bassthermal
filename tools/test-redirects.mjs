import assert from 'node:assert/strict';
import { LEGACY_REDIRECTS, resolveRedirectUrl } from '../src/redirects.mjs';

const status = 308;
const appSlugs = ['dualticker','retrofy','coptic-dictionary','icon-pack-builder','favicon-harvester','isbn-manager','rss-crawler','docbatch-pdf-converter','website-image-inventory','courselab-beam'];

function expectRedirect(path, target, method = 'GET', host = 'bassthermal.com') {
  const out = resolveRedirectUrl(`https://${host}${path}`, method);
  assert.equal(out, `https://bassthermal.com${target}`, `${method} ${host}${path}`);
  assert.equal(status, 308);
  assert.equal(resolveRedirectUrl(out, method), null, `redirect chain for ${path}`);
}
function expectUntouched(path, method = 'GET', host = 'bassthermal.com') {
  assert.equal(resolveRedirectUrl(`https://${host}${path}`, method), null, `${method} ${host}${path} should be untouched`);
}

expectRedirect('/apps', '/');
expectRedirect('/apps/', '/');
expectRedirect('/tools', '/');
expectRedirect('/tools/', '/');
expectRedirect('/apps/rss-finder', '/apps/rss-crawler/');
expectRedirect('/apps/rss-finder/', '/apps/rss-crawler/');
expectRedirect('/privacy/rss-finder', '/privacy/rss-crawler/');
expectRedirect('/privacy/rss-finder/', '/privacy/rss-crawler/');
expectRedirect('/apps', '/', 'HEAD');
expectRedirect('/tools/', '/', 'HEAD');

for (const [source, target] of Object.entries(LEGACY_REDIRECTS)) {
  expectRedirect(source, target);
  if (!source.endsWith('/')) expectRedirect(`${source}/`, target);
  expectRedirect(`${source}?source=test`, `${target}?source=test`);
  expectRedirect(source, target, 'HEAD');
  expectRedirect(`${source}?source=test`, `${target}?source=test`, 'GET', 'www.bassthermal.com');
}

assert.equal(resolveRedirectUrl('https://www.bassthermal.com/tools/find-hidden-rss-feeds/?source=test'), 'https://bassthermal.com/apps/rss-crawler/?source=test');
for (const slug of appSlugs) expectUntouched(`/apps/${slug}/`);
for (const path of ['/tools/unknown-page/','/tools-extra/','/bt-tools-feed.v1.json','/bt-tools-overlay.v1.js','/style.css']) expectUntouched(path);

for (const host of ['bassthermal.com', 'www.bassthermal.com']) {
  expectUntouched('/api/visit', 'POST', host);
  expectUntouched('/api/visits/summary', 'GET', host);
  expectUntouched('/api/visits/summary?ts=1', 'GET', host);
  expectUntouched('/api/visits/health', 'GET', host);
  expectUntouched('/api/visits/city?city=Montreal&country=CA', 'GET', host);
}

assert.equal(resolveRedirectUrl('https://bassthermal.com/tools/', 'POST'), null);
console.log('redirect tests passed');
