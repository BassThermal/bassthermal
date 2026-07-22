import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function read(file) { return fs.readFile(p(file), 'utf8'); }
async function write(file, content) {
  await fs.mkdir(path.dirname(p(file)), { recursive: true });
  await fs.writeFile(p(file), content, 'utf8');
}

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing expected text for ${label}`);
  return source.replace(from, to);
}

async function moveDir(fromRel, toRel) {
  const from = p(fromRel);
  const to = p(toRel);
  if (!(await exists(from))) throw new Error(`missing directory: ${fromRel}`);
  await fs.rm(to, { recursive: true, force: true });
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
  await fs.rm(from, { recursive: true, force: true });
}

// 1. Make the asset scanner accept the two names already used in this repo.
{
  const file = 'tools/build-asset-manifest.mjs';
  let source = await read(file);
  source = replaceRequired(
    source,
    "const iconPriority = ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico'];",
    "const iconPriority = ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico'];\nconst iconBasenames = ['icon', 'app'];",
    'icon basenames declaration'
  );
  source = replaceRequired(
    source,
`async function pickIcon(dir) {
  for (const ext of iconPriority) {
    const candidate = path.join(dir, \`icon\${ext}\`);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {}
  }
  return null;
}`,
`async function pickIcon(dir) {
  for (const basename of iconBasenames) {
    for (const ext of iconPriority) {
      const candidate = path.join(dir, \`\${basename}\${ext}\`);
      if (await isBrowserSafeIcon(candidate)) return candidate;
    }
  }
  return null;
}`,
    'pickIcon implementation'
  );
  source = replaceRequired(
    source,
`function isIconName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).toLowerCase();
  return base === 'icon' || base.startsWith('icon.');
}`,
`function isIconName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).toLowerCase();
  return base === 'icon' || base === 'app' || base.startsWith('icon.') || base.startsWith('app.');
}`,
    'screenshot icon exclusion'
  );
  await write(file, source);
}

// Root app assets are now sufficient; remove alternate OG/banner mappings.
await write('data/bt-asset-sources.json', `${JSON.stringify({ schema: 'BT-ASSET-SOURCES-1', apps: {} }, null, 2)}\n`);

// 2. Canonicalize RSS Crawler across catalog identity and public routes.
{
  const file = 'data/bt-catalog.json';
  const catalog = JSON.parse(await read(file));
  const rss = catalog.apps.find((app) => app.id === 'rss-finder' || app.slug === 'rss-finder' || app.id === 'rss-crawler');
  if (!rss) throw new Error('RSS app missing from catalog');
  rss.id = 'rss-crawler';
  rss.slug = 'rss-crawler';
  rss.name = 'RSS Crawler';
  rss.shortName = 'RSS Crawler';
  rss.links.website = '/apps/rss-crawler/';
  rss.links.privacy = '/privacy/rss-crawler/';
  rss.seo.canonical = 'https://bassthermal.com/apps/rss-crawler/';
  for (const app of catalog.apps) {
    for (const related of app.relatedTools || []) {
      if (related.id === 'rss-finder') related.id = 'rss-crawler';
    }
  }
  catalog.version = '2026.07.22.2';
  await write(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

await moveDir('public/assets/apps/rss-finder', 'public/assets/apps/rss-crawler');
await moveDir('public/apps/rss-finder', 'public/apps/rss-crawler');

{
  const file = 'public/apps/rss-crawler/index.html';
  let html = await read(file);
  html = html
    .replaceAll('https://bassthermal.com/apps/rss-finder/', 'https://bassthermal.com/apps/rss-crawler/')
    .replaceAll('data-app-slug="rss-finder"', 'data-app-slug="rss-crawler"')
    .replaceAll('/privacy/rss-finder/', '/privacy/rss-crawler/');
  await write(file, html);
}

await fs.rm(p('public/privacy/rss-crawler'), { recursive: true, force: true });
await fs.mkdir(p('public/privacy/rss-crawler'), { recursive: true });
await write('public/privacy/rss-crawler/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RSS Crawler Privacy | BassThermal</title><link rel="canonical" href="https://bassthermal.com/privacy/rss-crawler/"><link rel="stylesheet" href="/style.css"></head><body><main class="terminal page"><header class="topline"><div class="brand"><strong><a href="/">BASSTHERMAL</a></strong> / privacy / RSS Crawler</div></header><section class="page-main"><div>BassThermal does not sell personal data. RSS Crawler accesses website URLs and feed endpoints only as part of the discovery and inspection actions requested by the user. Store platforms may provide purchase and install analytics. Contact: <a href="mailto:info@bassthermal.com">info@bassthermal.com</a>.</div></section></main></body></html>\n`);
await fs.rm(p('public/privacy/rss-finder'), { recursive: true, force: true });

{
  const file = 'public/privacy/index.html';
  let html = await read(file);
  html = replaceRequired(html, '/privacy/rss-finder/', '/privacy/rss-crawler/', 'privacy directory RSS link');
  await write(file, html);
}

// 3. Redirect all historical RSS URLs to the one canonical destination.
{
  const file = 'src/redirects.mjs';
  let source = await read(file);
  source = source.replaceAll('"/apps/rss-finder/"', '"/apps/rss-crawler/"');
  source = replaceRequired(
    source,
    '  "/tools/": "/",\n',
    '  "/tools/": "/",\n  "/apps/rss-finder": "/apps/rss-crawler/",\n  "/apps/rss-finder/": "/apps/rss-crawler/",\n  "/privacy/rss-finder": "/privacy/rss-crawler/",\n  "/privacy/rss-finder/": "/privacy/rss-crawler/",\n',
    'legacy RSS redirects'
  );
  await write(file, source);
}

{
  const file = 'tools/test-redirects.mjs';
  let source = await read(file);
  source = source
    .replace("'rss-finder'", "'rss-crawler'")
    .replaceAll('/apps/rss-finder/', '/apps/rss-crawler/');
  source = replaceRequired(
    source,
    "expectRedirect('/tools/', '/');\n",
    "expectRedirect('/tools/', '/');\nexpectRedirect('/apps/rss-finder', '/apps/rss-crawler/');\nexpectRedirect('/apps/rss-finder/', '/apps/rss-crawler/');\nexpectRedirect('/privacy/rss-finder', '/privacy/rss-crawler/');\nexpectRedirect('/privacy/rss-finder/', '/privacy/rss-crawler/');\n",
    'redirect compatibility assertions'
  );
  await write(file, source);
}

{
  const file = 'tools/build-catalog.mjs';
  let source = await read(file);
  source = replaceRequired(
    source,
    "const aliases = (app) => app.slug === 'rss-finder' ? ['rss','feed','feeds','crawler'] : (app.slug === 'dualticker' ? ['dt','dual'] : app.slug.split('-'));",
    "const aliases = (app) => app.slug === 'rss-crawler' ? ['rss','feed','feeds','crawler','rss-finder'] : (app.slug === 'dualticker' ? ['dt','dual'] : app.slug.split('-'));",
    'RSS terminal aliases'
  );
  source = source.replaceAll("'/apps/rss-finder/'", "'/apps/rss-crawler/'");
  source = replaceRequired(
    source,
    "  '/apps','/apps/','/tools','/tools/',\n",
    "  '/apps','/apps/','/tools','/tools/','/apps/rss-finder','/apps/rss-finder/','/privacy/rss-finder','/privacy/rss-finder/',\n",
    'legacy sitemap validation paths'
  );
  await write(file, source);
}

{
  const file = 'tools/validate-product-pages.mjs';
  let source = await read(file);
  source = replaceRequired(
    source,
    "  ['rss-finder','RSS Crawler','public/apps/rss-finder/index.html'],",
    "  ['rss-crawler','RSS Crawler','public/apps/rss-crawler/index.html'],",
    'product validator RSS page'
  );
  await write(file, source);
}

{
  const file = 'tools/test-app-icons.mjs';
  let source = await read(file);
  source = source.replace("['rss-finder', '/assets/apps/rss-finder/icon.png']", "['rss-crawler', '/assets/apps/rss-crawler/icon.png']");
  source = replaceRequired(
    source,
    "  ['courselab-beam', '/assets/apps/courselab-beam/app.png']\n",
    "  ['courselab-beam', '/assets/apps/courselab-beam/app.png'],\n  ['docbatch-pdf-converter', '/assets/apps/docbatch-pdf-converter/app.png']\n",
    'DocBatch icon test'
  );
  source = source.replace(
    "assert.ok(!manifest.includes('\\\"rss-crawler\\\"'), 'duplicate rss-crawler manifest entry remains');",
    "assert.ok(!manifest.includes('\\\"rss-finder\\\"'), 'legacy rss-finder manifest entry remains');"
  );
  await write(file, source);
}

// 4. Keep the visible homepage human; retain useful search context in metadata.
{
  const file = 'public/index.html';
  let html = await read(file);
  const oldMeta = 'BassThermal publishes compact Windows, Android, and web utilities for document conversion, website asset inspection, engineering study, app asset prep, feed discovery, book inventory, image conversion, language reference, and headline monitoring.';
  const newMeta = 'BassThermal publishes focused Windows, Android, and web apps for document conversion, web research, engineering study, media tools, book inventory, and other practical workflows.';
  html = html.replaceAll(oldMeta, newMeta);
  html = replaceRequired(
    html,
    'Small Windows, Android, and web utilities for document conversion, website asset inspection, engineering study, app asset prep, feed discovery, book inventory, image conversion, language reference, and live news monitoring.',
    'Independent software for practical work, study, and specialist workflows.',
    'homepage intro'
  );
  await write(file, html);
}

{
  const file = 'public/sitemap.xml';
  let xml = await read(file);
  xml = replaceRequired(xml, '/apps/rss-finder/', '/apps/rss-crawler/', 'RSS sitemap URL');
  await write(file, xml);
}

{
  const file = 'public/assets/apps/README.md';
  let md = await read(file);
  md = md
    .replace('Supported browser icon names include `icon.png`, `icon.webp`, `icon.jpg`, `icon.jpeg`, and safe `icon.svg` files.', 'Supported browser icon names include `icon.png`, `icon.webp`, `icon.jpg`, `icon.jpeg`, safe `icon.svg` files, and the equivalent `app.*` names.')
    .replace('- Files named `icon.*` are icons, not screenshots.', '- Files named `icon.*` or `app.*` are icons, not screenshots.')
    .replace('public/assets/apps/rss-finder/windows/shot-01.png', 'public/assets/apps/rss-crawler/windows/shot-01.png')
    .replace('- Canonical slug: `rss-finder`\n- Product route: `/apps/rss-finder/`\n- Asset root: `public/assets/apps/rss-finder/`', '- Canonical slug: `rss-crawler`\n- Product route: `/apps/rss-crawler/`\n- Asset root: `public/assets/apps/rss-crawler/`');
  await write(file, md);
}

console.log('Canonical RSS, DocBatch icon, and homepage cleanup applied.');
