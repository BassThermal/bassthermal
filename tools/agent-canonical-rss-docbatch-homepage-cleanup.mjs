import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);
const read = (file) => fs.readFile(p(file), 'utf8');
async function write(file, content) {
  await fs.mkdir(path.dirname(p(file)), { recursive: true });
  await fs.writeFile(p(file), content, 'utf8');
}
async function exists(file) {
  try { await fs.access(p(file)); return true; } catch { return false; }
}
function requireReplace(source, matcher, replacement, label) {
  const next = source.replace(matcher, replacement);
  if (next === source) throw new Error(`migration could not update ${label}`);
  return next;
}
async function moveDir(fromRel, toRel) {
  if (!(await exists(fromRel))) throw new Error(`missing source directory ${fromRel}`);
  await fs.rm(p(toRel), { recursive: true, force: true });
  await fs.mkdir(path.dirname(p(toRel)), { recursive: true });
  await fs.cp(p(fromRel), p(toRel), { recursive: true });
  await fs.rm(p(fromRel), { recursive: true, force: true });
}
async function restoreRssAssets() {
  const canonical = 'public/assets/apps/rss-crawler';
  await fs.rm(p(canonical), { recursive: true, force: true });
  await fs.mkdir(p(canonical), { recursive: true });

  if (await exists('public/assets/apps/rss-finder')) {
    await fs.cp(p('public/assets/apps/rss-finder'), p(canonical), { recursive: true });
    await fs.rm(p('public/assets/apps/rss-finder'), { recursive: true, force: true });
    return;
  }

  const historicalIcon = execFileSync(
    'git',
    ['show', '4fe062b7a251e80ed16213acea77a6f3005fea79:public/assets/apps/rss-crawler/icon.png'],
    { cwd: root, encoding: null }
  );
  await fs.writeFile(p(canonical, 'icon.png'), historicalIcon);
}

console.log('1/10 asset scanner');
{
  const file = 'tools/build-asset-manifest.mjs';
  let s = await read(file);
  s = requireReplace(s, /const iconPriority = \[[^\n]+\];/, "$&\nconst iconBasenames = ['icon', 'app'];", 'icon basenames');
  s = requireReplace(s, /async function pickIcon\(dir\) \{[\s\S]*?\n\}/, `async function pickIcon(dir) {
  for (const basename of iconBasenames) {
    for (const ext of iconPriority) {
      const candidate = path.join(dir, \`${'${basename}'}${'${ext}'}\`);
      if (await isBrowserSafeIcon(candidate)) return candidate;
    }
  }
  return null;
}`, 'pickIcon');
  s = requireReplace(s, /function isIconName\(name\) \{[\s\S]*?\n\}/, `function isIconName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).toLowerCase();
  return base === 'icon' || base === 'app' || base.startsWith('icon.') || base.startsWith('app.');
}`, 'icon screenshot exclusion');
  await write(file, s);
}
await write('data/bt-asset-sources.json', `${JSON.stringify({ schema: 'BT-ASSET-SOURCES-1', apps: {} }, null, 2)}\n`);

console.log('2/10 catalog identity');
{
  const file = 'data/bt-catalog.json';
  const catalog = JSON.parse(await read(file));
  const rss = catalog.apps.find((app) => ['rss-finder', 'rss-crawler'].includes(app.id) || ['rss-finder', 'rss-crawler'].includes(app.slug));
  if (!rss) throw new Error('RSS app missing from catalog');
  Object.assign(rss, { id: 'rss-crawler', slug: 'rss-crawler', name: 'RSS Crawler', shortName: 'RSS Crawler' });
  rss.links.website = '/apps/rss-crawler/';
  rss.links.privacy = '/privacy/rss-crawler/';
  rss.seo.canonical = 'https://bassthermal.com/apps/rss-crawler/';
  for (const app of catalog.apps) {
    for (const related of app.relatedTools || []) if (related.id === 'rss-finder') related.id = 'rss-crawler';
  }
  catalog.version = '2026.07.22.2';
  await write(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log('3/10 canonical files');
await restoreRssAssets();
if (await exists('public/apps/rss-finder')) {
  await moveDir('public/apps/rss-finder', 'public/apps/rss-crawler');
} else if (!(await exists('public/apps/rss-crawler'))) {
  throw new Error('RSS product page is missing under both known routes');
}
{
  const file = 'public/apps/rss-crawler/index.html';
  let s = await read(file);
  s = s.replaceAll('https://bassthermal.com/apps/rss-finder/', 'https://bassthermal.com/apps/rss-crawler/')
       .replaceAll('data-app-slug="rss-finder"', 'data-app-slug="rss-crawler"')
       .replaceAll('/privacy/rss-finder/', '/privacy/rss-crawler/');
  await write(file, s);
}
await fs.rm(p('public/privacy/rss-crawler'), { recursive: true, force: true });
await write('public/privacy/rss-crawler/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RSS Crawler Privacy | BassThermal</title><link rel="canonical" href="https://bassthermal.com/privacy/rss-crawler/"><link rel="stylesheet" href="/style.css"></head><body><main class="terminal page"><header class="topline"><div class="brand"><strong><a href="/">BASSTHERMAL</a></strong> / privacy / RSS Crawler</div></header><section class="page-main"><div>BassThermal does not sell personal data. RSS Crawler accesses website URLs and feed endpoints only as part of discovery and inspection actions requested by the user. Store platforms may provide purchase and install analytics. Contact: <a href="mailto:info@bassthermal.com">info@bassthermal.com</a>.</div></section></main></body></html>\n`);
await fs.rm(p('public/privacy/rss-finder'), { recursive: true, force: true });
{
  const file = 'public/privacy/index.html';
  await write(file, (await read(file)).replaceAll('/privacy/rss-finder/', '/privacy/rss-crawler/'));
}

console.log('4/10 redirects');
{
  const file = 'src/redirects.mjs';
  let s = await read(file);
  s = s.replaceAll('"/apps/rss-finder/"', '"/apps/rss-crawler/"');
  s = requireReplace(s, '  "/tools/": "/",\n', '  "/tools/": "/",\n  "/apps/rss-finder": "/apps/rss-crawler/",\n  "/apps/rss-finder/": "/apps/rss-crawler/",\n  "/privacy/rss-finder": "/privacy/rss-crawler/",\n  "/privacy/rss-finder/": "/privacy/rss-crawler/",\n', 'legacy RSS redirects');
  await write(file, s);
}

console.log('5/10 validators');
{
  const file = 'tools/test-redirects.mjs';
  let s = await read(file);
  s = s.replace("'rss-finder'", "'rss-crawler'").replaceAll('/apps/rss-finder/', '/apps/rss-crawler/');
  s = requireReplace(s, "expectRedirect('/tools/', '/');\n", "expectRedirect('/tools/', '/');\nexpectRedirect('/apps/rss-finder', '/apps/rss-crawler/');\nexpectRedirect('/apps/rss-finder/', '/apps/rss-crawler/');\nexpectRedirect('/privacy/rss-finder', '/privacy/rss-crawler/');\nexpectRedirect('/privacy/rss-finder/', '/privacy/rss-crawler/');\n", 'redirect tests');
  await write(file, s);
}
{
  const file = 'tools/build-catalog.mjs';
  let s = await read(file);
  s = requireReplace(s, /const aliases = \(app\) => app\.slug === 'rss-finder' \? \[[^\n]+/, "const aliases = (app) => app.slug === 'rss-crawler' ? ['rss','feed','feeds','crawler','rss-finder'] : (app.slug === 'dualticker' ? ['dt','dual'] : app.slug.split('-'));", 'RSS aliases');
  s = s.replaceAll("'/apps/rss-finder/'", "'/apps/rss-crawler/'");
  s = requireReplace(s, "  '/apps','/apps/','/tools','/tools/',\n", "  '/apps','/apps/','/tools','/tools/','/apps/rss-finder','/apps/rss-finder/','/privacy/rss-finder','/privacy/rss-finder/',\n", 'legacy catalog paths');
  await write(file, s);
}
{
  const file = 'tools/validate-product-pages.mjs';
  let s = await read(file);
  s = s.replace("['rss-finder','RSS Crawler','public/apps/rss-finder/index.html']", "['rss-crawler','RSS Crawler','public/apps/rss-crawler/index.html']");
  await write(file, s);
}
{
  const file = 'tools/test-app-icons.mjs';
  let s = await read(file);
  s = s.replaceAll("['rss-finder', '/assets/apps/rss-finder/icon.png']", "['rss-crawler', '/assets/apps/rss-crawler/icon.png']");
  s = s.replace("  ['courselab-beam', '/assets/apps/courselab-beam/app.png']\n", "  ['courselab-beam', '/assets/apps/courselab-beam/app.png'],\n  ['docbatch-pdf-converter', '/assets/apps/docbatch-pdf-converter/app.png']\n");
  s = s.replace("assert.ok(!manifest.includes('\\\"rss-crawler\\\"'), 'duplicate rss-crawler manifest entry remains');", "assert.ok(!manifest.includes('\\\"rss-finder\\\"'), 'legacy rss-finder manifest entry remains');");
  await write(file, s);
}

console.log('6/10 homepage copy');
{
  const file = 'public/index.html';
  let s = await read(file);
  s = s.replaceAll('BassThermal publishes compact Windows, Android, and web utilities for document conversion, website asset inspection, engineering study, app asset prep, feed discovery, book inventory, image conversion, language reference, and headline monitoring.', 'BassThermal publishes focused Windows, Android, and web apps for document conversion, web research, engineering study, media tools, book inventory, and other practical workflows.');
  s = requireReplace(s, 'Small Windows, Android, and web utilities for document conversion, website asset inspection, engineering study, app asset prep, feed discovery, book inventory, image conversion, language reference, and live news monitoring.', 'Independent software for practical work, study, and specialist workflows.', 'homepage intro');
  await write(file, s);
}

console.log('7/10 sitemap and docs');
{
  const file = 'public/sitemap.xml';
  await write(file, requireReplace(await read(file), '/apps/rss-finder/', '/apps/rss-crawler/', 'RSS sitemap'));
}
{
  const file = 'public/assets/apps/README.md';
  let s = await read(file);
  s = s.replace('Supported browser icon names include `icon.png`, `icon.webp`, `icon.jpg`, `icon.jpeg`, and safe `icon.svg` files.', 'Supported browser icon names include `icon.png`, `icon.webp`, `icon.jpg`, `icon.jpeg`, safe `icon.svg` files, and the equivalent `app.*` names.')
       .replace('- Files named `icon.*` are icons, not screenshots.', '- Files named `icon.*` or `app.*` are icons, not screenshots.')
       .replaceAll('rss-finder', 'rss-crawler');
  await write(file, s);
}

console.log('8/10 migration complete');
