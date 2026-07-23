import fs from 'node:fs';
import path from 'node:path';
const pages = [
  ['dualticker','DualTicker','public/apps/dualticker/index.html'],
  ['retrofy','RetroFy','public/apps/retrofy/index.html'],
  ['coptic-dictionary','Coptic Dictionary','public/apps/coptic-dictionary/index.html'],
  ['icon-pack-builder','Icon Pack Builder','public/apps/icon-pack-builder/index.html'],
  ['favicon-harvester','Favicon Harvester','public/apps/favicon-harvester/index.html'],
  ['isbn-manager','ISBN Manager','public/apps/isbn-manager/index.html'],
  ['rss-crawler','RSS Crawler','public/apps/rss-crawler/index.html'],
  ['docbatch-pdf-converter','DocBatch PDF Converter','public/apps/docbatch-pdf-converter/index.html'],
  ['website-image-inventory','Website Image Inventory','public/apps/website-image-inventory/index.html'],
  ['courselab-beam','CourseLab Beam: Shear & Moment','public/apps/courselab-beam/index.html'],
];
const catalog = JSON.parse(fs.readFileSync('data/bt-catalog.json', 'utf8'));
const catalogBySlug = new Map(catalog.apps.map((app) => [app.slug, app]));
const requiredClasses = ['product-header','product-icon','product-heading','product-title','product-subtitle','product-platforms','product-section','product-section-title'];
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
let failed = false;
function fail(file, msg){ failed = true; console.error(`${file}: ${msg}`); }
function textOnly(s){ return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(); }
function validateTags(file, html){
  const stack=[];
  for (const m of html.matchAll(/<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g)){
    const raw=m[0], tag=m[1].toLowerCase();
    if (raw.startsWith('<!') || raw.startsWith('<?') || voidTags.has(tag) || raw.endsWith('/>')) continue;
    if (raw.startsWith('</')) { const open=stack.pop(); if(open!==tag) fail(file, `mismatched tag: expected </${open}> but found </${tag}>`); }
    else stack.push(tag);
  }
  if (stack.length) fail(file, `unclosed tags: ${stack.join(', ')}`);
}
for (const [slug,title,file] of pages){
  const html = fs.readFileSync(file,'utf8');
  validateTags(file, html);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length !== 1) fail(file, `expected exactly one h1, found ${h1s.length}`);
  if (h1s[0] && textOnly(h1s[0][1]) !== title) fail(file, `h1 text must be ${title}`);
  if (/<h1\b[^>]*>[^<]*(?:<(?!\/h1>)[^<]*)*<\/div>/i.test(html)) fail(file, 'h1 appears to close with </div>');
  if (!new RegExp(`<body[^>]*data-app-slug=["']${slug}["']`).test(html)) fail(file, `missing body data-app-slug ${slug}`);
  for (const cls of requiredClasses) if (!new RegExp(`class=["'][^"']*\\b${cls}\\b`).test(html)) fail(file, `missing shared class ${cls}`);
  const expectedCanonical = `https://bassthermal.com/apps/${slug}/`;
  if (!new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(html)) fail(file, `canonical must be ${expectedCanonical}`);
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const parsedJsonLd = [];
  for (const m of jsonLdBlocks) {
    try { parsedJsonLd.push(JSON.parse(m[1])); }
    catch(e) { fail(file, `JSON-LD does not parse: ${e.message}`); }
  }
  const app = catalogBySlug.get(slug);
  if (!app) fail(file, `catalog entry missing for ${slug}`);
  if (app) {
    const softwareLd = parsedJsonLd.find((item) => item?.['@type'] === 'SoftwareApplication');
    if (!softwareLd) fail(file, 'SoftwareApplication JSON-LD missing');
    else {
      if (softwareLd.operatingSystem !== app.seo.operatingSystem) fail(file, 'JSON-LD operatingSystem does not match catalog');
      const downloads = Array.isArray(softwareLd.downloadUrl) ? softwareLd.downloadUrl : [softwareLd.downloadUrl].filter(Boolean);
      for (const platform of app.platforms || []) {
        const url = app.links?.[platform];
        if (!url) fail(file, `catalog platform ${platform} has no link`);
        else {
          if (!html.includes(`href="${url}"`)) fail(file, `missing ${platform} Store link from catalog`);
          if (!downloads.includes(url)) fail(file, `JSON-LD downloadUrl missing ${platform} link`);
        }
      }
    }
  }
  if (html.includes('Screenshots are not attached')) fail(file, 'screenshot placeholder remains');
  if (html.includes('CourseLab Beam: Shear & Moment: shear')) fail(file, 'duplicate CourseLab breadcrumb text remains');
  if (!html.includes('<script src="/store-assets.generated.js"></script>') || !html.includes('<script src="/product-page.js"></script>')) fail(file, 'missing shared product scripts');
  if (/\/(assets\/apps|og)\/[^"'\s<>]+\.(png|webp|jpg|jpeg|svg|ico)/i.test(html)) fail(file, 'hard-coded product icon URL appears in HTML');
}
if (!fs.existsSync('public/product-page.js')) fail('public/product-page.js','missing shared product-page script');
if (failed) process.exit(1);
console.log(`validated ${pages.length} product pages`);
