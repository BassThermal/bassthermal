import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const guides = [
  ['dualticker', 'public/guides/dualticker/compare-live-headline-sources/index.html', '/apps/dualticker/'],
  ['retrofy', 'public/guides/retrofy/give-a-photo-a-retro-pixel-art-look/index.html', '/apps/retrofy/'],
  ['coptic-dictionary', 'public/guides/coptic-dictionary/look-up-and-save-coptic-words/index.html', '/apps/coptic-dictionary/'],
  ['icon-pack-builder', 'public/guides/icon-pack-builder/create-windows-app-icons-from-one-png/index.html', '/apps/icon-pack-builder/'],
  ['favicon-harvester', 'public/guides/favicon-harvester/collect-favicons-from-a-list-of-websites/index.html', '/apps/favicon-harvester/'],
  ['isbn-manager', 'public/guides/isbn-manager/build-a-book-catalog-from-isbns/index.html', '/apps/isbn-manager/'],
  ['rss-crawler', 'public/guides/rss-crawler/find-and-export-rss-feeds/index.html', '/apps/rss-crawler/'],
  ['docbatch-pdf-converter', 'public/guides/docbatch-pdf-converter/convert-a-folder-of-documents-to-pdf/index.html', '/apps/docbatch-pdf-converter/'],
  ['website-image-inventory', 'public/guides/website-image-inventory/audit-images-used-on-a-website/index.html', '/apps/website-image-inventory/'],
  ['courselab-beam', 'public/guides/courselab-beam/build-and-review-a-beam-case/index.html', '/apps/courselab-beam/']
];

for (const [slug, file, productPath] of guides) {
  const html = read(file);
  assert.match(html, /<title>[^<]+<\/title>/, `${slug}: missing title`);
  assert.match(html, /<meta name="description" content="[^"]+"\s*\/?>(?:\s*)/, `${slug}: missing description`);
  assert.match(html, /<link rel="canonical" href="https:\/\/bassthermal\.com\/guides\/[^"]+"\s*\/?>(?:\s*)/, `${slug}: missing canonical`);
  assert.ok(html.includes('"@type":"Article"'), `${slug}: missing Article schema`);
  assert.match(html, /"dateModified":"2026-07-(?:28|29|31)"/, `${slug}: missing verified dateModified`);
  assert.ok(html.includes(`href="${productPath}"`), `${slug}: missing product CTA`);
  assert.ok(html.includes('data-guide-gallery'), `${slug}: missing screenshot explorer mount`);
  assert.ok(!/links? above/i.test(html), `${slug}: positional install copy remains`);
  assert.ok(!/<h2>\s*\d+\.\s*/.test(html), `${slug}: hardcoded heading number duplicates visual numbering`);
}

const dualticker = read(guides[0][1]);
assert.ok(dualticker.includes('how are different outlets covering the same moment'), 'DualTicker comparison purpose missing');
assert.ok(dualticker.includes('Watch movement, not only individual headlines'), 'DualTicker movement guidance missing');

const retrofy = read(guides[1][1]);
assert.ok(retrofy.includes('Older screens and graphics hardware'), 'RetroFy hardware context missing');
assert.ok(retrofy.includes('Dithering creates colours that are not really there'), 'RetroFy dithering explanation missing');
assert.ok(!/exact (hardware|console) emulation/i.test(retrofy), 'RetroFy overclaims exact emulation');

const coptic = read(guides[2][1]);
assert.ok(coptic.includes('searchable reference built around dictionary entries'), 'Coptic lexicon framing missing');
assert.ok(coptic.includes('dialect, word type, study-ready status, or Greek origin'), 'Coptic filters missing');
assert.ok(!/shorter root|root search/i.test(coptic), 'unsupported Coptic root-search claim remains');

const iconPack = read(guides[3][1]);
assert.ok(iconPack.includes('one high-quality master PNG'), 'Icon Pack Builder source-of-truth guidance missing');
assert.ok(iconPack.includes('Review the smallest outputs'), 'Icon Pack Builder review guidance missing');

const favicon = read(guides[4][1]);
assert.ok(favicon.includes('Favicons are not always stored in the same location or format'), 'Favicon discovery limitation missing');
assert.ok(favicon.includes('Review quality and identity'), 'Favicon review guidance missing');

const isbn = read(guides[5][1]);
assert.ok(isbn.includes('USB or keyboard-style barcode scanner'), 'ISBN scanner type is not explicit');
assert.ok(!/built-in (phone|camera)|camera scanner/i.test(isbn), 'ISBN guide implies camera scanning');

const rss = read(guides[6][1]);
for (const term of ['Quick', 'Standard', 'Deep', 'Reader', 'OPML', 'CSV', 'JSON']) {
  assert.ok(rss.includes(term), `RSS guide missing verified term: ${term}`);
}

const websiteImages = read(guides[8][1]);
assert.ok(!/tracking pixels|compliance analysis/i.test(websiteImages), 'unsupported website-image claim remains');
assert.ok(websiteImages.includes('repeated-reference count'), 'website-image repeat-count guidance missing');

const courseLab = read(guides[9][1]);
assert.ok(!/Duplicate or revise|duplicate the case/i.test(courseLab), 'unverified CourseLab duplicate command remains');
assert.ok(courseLab.includes('not a substitute for professional engineering judgement'), 'CourseLab scope warning missing');

const guideIndex = read('public/guides/index.html');
for (const [, file] of guides) {
  const canonicalPath = new URL(read(file).match(/<link rel="canonical" href="([^"]+)"\s*\/?>(?:\s*)/)[1]).pathname;
  assert.ok(guideIndex.includes(`href="${canonicalPath}"`), `Guide index missing ${canonicalPath}`);
}

const customerFacingRssFiles = [
  'public/index.html',
  'public/apps/rss-crawler/index.html',
  'public/guides/index.html',
  'public/guides/rss-crawler/find-and-export-rss-feeds/index.html',
  'public/tools-overlay-demo/index.html',
  'data/bt-catalog.json'
];
for (const file of customerFacingRssFiles) {
  const source = read(file);
  assert.ok(!source.includes('RSS Finder'), `legacy customer name remains in ${file}`);
  assert.ok(source.includes('RSS Crawler') || file === 'public/tools-overlay-demo/index.html', `RSS Crawler missing from ${file}`);
}

const redirects = read('src/redirects.mjs');
const redirectTests = read('tools/test-redirects.mjs');
assert.ok(redirects.includes('/apps/rss-finder'), 'legacy RSS app redirect was removed');
assert.ok(redirectTests.includes('/apps/rss-finder'), 'legacy RSS redirect test was removed');

console.log(`${guides.length} Guides passed content, navigation, and customer truth checks.`);
