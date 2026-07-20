import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const warnings = [];
const errors = [];

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const fileExists = (p) => fs.existsSync(path.join(root, p));
const isInternal = (value) => typeof value === 'string' && value.startsWith('/');
const isBaseCanonical = (u) => typeof u === 'string' && /^https:\/\/bassthermal\.com\/.+/.test(u);
const ensure = (condition, message) => { if (!condition) errors.push(message); };

const catalog = readJson('data/bt-catalog.json');
const { schema, version, publisher, enums, apps, intentPages } = catalog;

ensure(schema === 'BT-CATALOG-1', 'schema must be BT-CATALOG-1');
ensure(typeof version === 'string' && version.length > 0, 'version is required');
ensure(Array.isArray(apps), 'apps must be an array');
ensure(Array.isArray(intentPages), 'intentPages must be an array');

const enumKeys = ['families','disciplines','modes','audiences','workflowStages','outputs','tags','statuses'];
for (const key of enumKeys) ensure(Array.isArray(enums?.[key]), `enums.${key} must be an array`);


const publicApps = apps.filter((app) => app.visibility?.showOnWebsite && app.visibility?.showInDirectory);
const expectedPublicNames = ['DualTicker','RetroFy','Coptic Dictionary','Icon Pack Builder','Favicon Harvester','ISBN Manager','RSS Crawler','DocBatch PDF Converter','Website Image Inventory','CourseLab Beam: Shear & Moment'];
ensure(publicApps.length === expectedPublicNames.length, `public app count must be ${expectedPublicNames.length}, found ${publicApps.length}`);
for (const [i, name] of expectedPublicNames.entries()) ensure(publicApps[i]?.name === name, `public app ${i + 1} must be ${name}, found ${publicApps[i]?.name || '<missing>'}`);
ensure(!publicApps.some((app) => /ring snap|mockcaps/i.test(app.name)), 'Ring Snap or MockCaps must not appear in public directory');
const homeRanks = publicApps.filter((app) => app.homeRank !== undefined);
ensure(homeRanks.length <= 4, 'at most four homepage apps are allowed');
const seenHomeRanks = new Set();
for (const app of homeRanks) {
  ensure(Number.isInteger(app.homeRank), `app ${app.id} homeRank must be an integer`);
  ensure(!seenHomeRanks.has(app.homeRank), `duplicate homeRank: ${app.homeRank}`);
  seenHomeRanks.add(app.homeRank);
  ensure(app.visibility?.showOnWebsite && app.visibility?.showInDirectory, `featured app ${app.id} must be public`);
  ensure(fileExists(`public/apps/${app.slug}/index.html`), `featured app ${app.id} missing detail page`);
}
const sortedHomeRanks = [...seenHomeRanks].sort((a,b) => a-b);
for (let i = 0; i < sortedHomeRanks.length; i++) ensure(sortedHomeRanks[i] === i + 1, `homeRank values must be sequential from 1, found ${sortedHomeRanks.join(',')}`);
const rssCrawler = apps.find((app) => app.slug === 'rss-finder');
ensure(rssCrawler?.name === 'RSS Crawler', 'rss-finder public name must be RSS Crawler');
ensure(rssCrawler?.status === 'live', 'RSS Crawler status must be live');
ensure(rssCrawler?.platforms?.includes('windows'), 'RSS Crawler must include Windows platform');
ensure(rssCrawler?.links?.windows === 'https://apps.microsoft.com/detail/9mzqbtsnbv3d?hl=en-US&gl=CA', 'RSS Crawler must have the required Windows Store link');

const appIds = new Set();
const appSlugs = new Set();
for (const app of apps) {
  const required = ['id','slug','name','status','primaryFamily','discipline','platforms','line','short'];
  for (const f of required) ensure(Boolean(app?.[f]), `app ${app?.id || '<unknown>'} missing ${f}`);
  ensure(Array.isArray(app.modes) && app.modes.length > 0, `app ${app.id} must have at least one mode`);
  ensure(Array.isArray(app.audiences) && app.audiences.length > 0, `app ${app.id} must have at least one audience`);
  ensure(Array.isArray(app.workflowStages) && app.workflowStages.length > 0, `app ${app.id} must have at least one workflowStage`);
  ensure(Array.isArray(app.outputs) && app.outputs.length > 0, `app ${app.id} must have at least one output`);
  ensure(typeof app.links?.website === 'string' && app.links.website, `app ${app.id} missing links.website`);
  ensure(typeof app.links?.privacy === 'string' && app.links.privacy, `app ${app.id} missing links.privacy`);
  ensure(typeof app.links?.support === 'string' && app.links.support, `app ${app.id} missing links.support`);
  for (const f of ['title','description','canonical','schemaType','applicationCategory']) ensure(Boolean(app.seo?.[f]), `app ${app.id} missing seo.${f}`);

  ensure(!appIds.has(app.id), `duplicate app id: ${app.id}`); appIds.add(app.id);
  ensure(!appSlugs.has(app.slug), `duplicate app slug: ${app.slug}`); appSlugs.add(app.slug);
  ensure(enums.families.includes(app.primaryFamily), `app ${app.id} primaryFamily not in enum`);
  ensure(Array.isArray(app.secondaryFamilies), `app ${app.id} secondaryFamilies must be array`);
  ensure(app.secondaryFamilies.length <= 2, `app ${app.id} secondaryFamilies max 2`);
  for (const f of app.secondaryFamilies) {
    ensure(enums.families.includes(f), `app ${app.id} secondaryFamily ${f} not in enum`);
    ensure(f !== app.primaryFamily, `app ${app.id} secondaryFamilies duplicates primaryFamily`);
  }
  ensure(enums.disciplines.includes(app.discipline), `app ${app.id} discipline not in enum`);
  for (const v of app.modes) ensure(enums.modes.includes(v), `app ${app.id} mode ${v} not in enum`);
  for (const v of app.audiences) ensure(enums.audiences.includes(v), `app ${app.id} audience ${v} not in enum`);
  for (const v of app.workflowStages) ensure(enums.workflowStages.includes(v), `app ${app.id} workflowStage ${v} not in enum`);
  for (const v of app.outputs) ensure(enums.outputs.includes(v), `app ${app.id} output ${v} not in enum`);
  for (const v of app.tags || []) ensure(enums.tags.includes(v), `app ${app.id} tag ${v} not in enum`);
  ensure(enums.statuses.includes(app.status), `app ${app.id} status not in enum`);
  ensure(isBaseCanonical(app.seo.canonical), `app ${app.id} canonical must be https://bassthermal.com/...`);

  for (const [k,v] of Object.entries(app.links || {})) {
    if (!v) continue;
    if (v.startsWith('http')) continue;
    ensure(isInternal(v), `app ${app.id} links.${k} must start with / when internal`);
  }

  if (app.status === 'live') {
    const openable = [app.links.windows, app.links.android, app.links.web].filter(Boolean).length;
    if (openable < 1) errors.push(`app ${app.id} live requires at least one openable platform link`);
  }

  if (app.visibility?.includeInSitemap) ensure(fileExists(`public/apps/${app.slug}/index.html`), `missing app page public/apps/${app.slug}/index.html`);
  if (app.links?.privacy) ensure(fileExists(`public${app.links.privacy}index.html`), `missing privacy page for ${app.id}: public${app.links.privacy}index.html`);
  if (!app.relatedTools || app.relatedTools.length === 0) warnings.push(`app ${app.id} has no relatedTools`);
}
for (const app of apps) {
  for (const rel of app.relatedTools || []) ensure(appIds.has(rel.id), `app ${app.id} relatedTools id ${rel.id} does not exist`);
}

const intentSlugs = new Set();
for (const p of intentPages) {
  ensure(!intentSlugs.has(p.slug), `duplicate intent page slug: ${p.slug}`); intentSlugs.add(p.slug);
  ensure(appIds.has(p.primaryApp), `intent page ${p.slug} primaryApp missing: ${p.primaryApp}`);
  ensure(enums.families.includes(p.family), `intent page ${p.slug} family not in enum`);
  ensure(isBaseCanonical(p.canonical), `intent page ${p.slug} canonical must be https://bassthermal.com/...`);
  ensure(isInternal(p.path), `intent page ${p.slug} path must start with /`);
  if (p.includeInSitemap) ensure(fileExists(`public/tools/${p.slug}/index.html`), `missing tool page public/tools/${p.slug}/index.html`);
}

ensure(fileExists('public/tools/index.html'), 'public/tools/index.html missing');
ensure(fileExists('public/apps/index.html'), 'public/apps/index.html missing');

const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
ensure(!/https:\/\/www\.bassthermal\.com/i.test(sitemap), 'sitemap must not contain www canonicals');
const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
ensure(robots.includes('User-agent: *'), 'robots.txt missing User-agent');
ensure(robots.includes('Allow: /'), 'robots.txt missing Allow: /');
ensure(robots.includes('Sitemap: https://bassthermal.com/sitemap.xml'), 'robots.txt missing canonical sitemap');
function parseJsonLdFrom(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (e) { errors.push(`${file} has invalid JSON-LD: ${e.message}`); }
  }
  return html;
}
for (const file of ['public/index.html','public/apps/index.html', ...publicApps.map((app) => `public/apps/${app.slug}/index.html`)]) {
  const html = parseJsonLdFrom(file);
  ensure(!/rel=["']canonical["'][^>]+www\.bassthermal\.com/i.test(html), `${file} canonical must not use www`);
}
const appsHtml = fs.readFileSync(path.join(root, 'public/apps/index.html'), 'utf8');
const directoryEntries = [...appsHtml.matchAll(/data-app-entry/g)].length;
ensure(directoryEntries === expectedPublicNames.length, `/apps/ must contain ${expectedPublicNames.length} app entries, found ${directoryEntries}`);
ensure(!/Ring Snap|MockCaps/i.test(appsHtml), 'Ring Snap or MockCaps appear in public directory');
const appsJsonLdMatch = appsHtml.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
if (appsJsonLdMatch) {
  const parsed = JSON.parse(appsJsonLdMatch[1]);
  const positions = (parsed.itemListElement || []).map((item) => item.position);
  for (let i = 0; i < expectedPublicNames.length; i++) ensure(positions[i] === i + 1, `/apps/ ItemList position ${i + 1} is not sequential`);
} else errors.push('/apps/ missing JSON-LD');

const requiredPaths = ['/','/apps/','/tools/','/support/','/privacy/'];
for (const app of apps) { if (app.visibility?.includeInSitemap) requiredPaths.push(`/apps/${app.slug}/`); if (app.links?.privacy) requiredPaths.push(app.links.privacy); }
for (const p of intentPages) if (p.includeInSitemap) requiredPaths.push(p.path);
for (const route of new Set(requiredPaths)) {
  const abs = `https://bassthermal.com${route}`;
  if (!sitemap.includes(abs)) errors.push(`sitemap missing required URL: ${abs}`);
}

const generatedAt = new Date().toISOString();
const fullOut = { schema, version, generatedAt, publisher, enums, apps, intentPages };
const liteOut = {
  schema,
  version,
  generatedAt,
  apps: apps.map((a) => ({
    id:a.id, slug:a.slug, name:a.name, shortName:a.shortName || '', status:a.status, visibility:{ showInAppOverlay:Boolean(a.visibility?.showInAppOverlay) }, primaryFamily:a.primaryFamily, secondaryFamilies:a.secondaryFamilies,
    discipline:a.discipline, modes:a.modes, audiences:a.audiences, workflowStages:a.workflowStages, outputs:a.outputs, tags:a.tags,
    platforms:a.platforms, line:a.line, short:a.short,
    links:{ website:a.links.website, windows:a.links.windows || '', android:a.links.android || '', web:a.links.web || '', support:a.links.support },
    relatedTools:(a.relatedTools || []).map((r) => ({ id:r.id, reason:r.reason }))
  }))
};

if (!validateOnly && errors.length === 0) {
  fs.writeFileSync(path.join(root, 'public/catalog.json'), JSON.stringify(fullOut, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'public/catalog-lite.json'), JSON.stringify(liteOut, null, 2) + '\n');
}

console.log('BassThermal catalog build');
console.log(`schema: ${schema}`);
console.log(`version: ${version}`);
console.log(`apps: ${apps.length}`);
console.log(`intent pages: ${intentPages.length}`);
console.log('catalog: public/catalog.json');
console.log('catalog lite: public/catalog-lite.json');
console.log('sitemap: checked');
console.log(`warnings: ${warnings.length}`);
console.log(`errors: ${errors.length}`);
warnings.forEach((w) => console.log(`WARN: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`ERROR: ${e}`));
  process.exit(1);
}
