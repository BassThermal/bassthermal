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


function homepageApps() {
  return apps.filter((app) => app.visibility?.showOnWebsite !== false && app.visibility?.showInDirectory !== false);
}

function homepageRows() {
  return homepageApps().map((app, index) => {
    const links = [['web','web'], ['windows','win'], ['android','and']]
      .filter(([key]) => app.links?.[key])
      .map(([key, label]) => `<a class="tag ${key}" href="${app.links[key]}">${label}</a>`)
      .join(' ');
    return `        <div class="row app-row" role="listitem"><span class="dim">${String(index + 1).padStart(2, '0')}</span><span class="app-main"><a class="app-name" href="/apps/${app.slug}/">${app.name}</a><span class="links">${links}</span></span><span class="app-meta">${app.line}</span></div>`;
  }).join('\n');
}

function homepageItems() {
  return homepageApps().map((app, index) => `        { "@type": "ListItem", "position": ${index + 1}, "name": "${app.name}", "url": "https://bassthermal.com/apps/${app.slug}/" }`).join(',\n');
}

function homepageJsApps() {
  const aliases = (app) => app.slug === 'rss-finder' ? ['rss','feed','feeds','crawler'] : (app.slug === 'dualticker' ? ['dt','dual'] : app.slug.split('-'));
  return JSON.stringify(homepageApps().map((app, index) => ({
    id:String(index + 1).padStart(2, '0'), slug:app.slug, aliases:aliases(app), name:app.name,
    klass:String(app.primaryFamily || 'utility').toLowerCase().replaceAll('_','/'), status:app.status, statusClass:app.status === 'live' ? 'ok' : 'violet',
    platforms:app.platforms, category:app.seo.applicationCategory, line:app.line, capabilities:app.capabilities || [],
    links:[['web', app.links.web], ['windows', app.links.windows], ['android', app.links.android]].filter(([, url]) => url).map(([key, url]) => [key, url, true])
  })), null, 6);
}

function syncHomepage() {
  const indexPath = path.join(root, 'public/index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/("itemListElement": \[\n)(.*?)(\n      \])/s, `$1${homepageItems()}$3`);
  html = html.replace(/(      <div class="table" id="appTable" role="list">\n)(.*?)(\n      <\/div>)/s, `$1${homepageRows()}$3`);
  html = html.replace(/    const apps = \[\n.*?\n    \];/s, `    const apps = ${homepageJsApps()};`);
  if (!validateOnly) fs.writeFileSync(indexPath, html);
  const check = fs.readFileSync(indexPath, 'utf8');
  const tableMatch = check.match(/<div class="table" id="appTable" role="list">([\s\S]*?)\n      <\/div>/);
  ensure(Boolean(tableMatch), 'homepage app table missing');
  ensure(((tableMatch?.[1] || '').match(/class="row app-row"/g) || []).length === homepageApps().length, 'homepage app row count must match catalog');
  for (const app of homepageApps()) {
    ensure(check.includes(`href="/apps/${app.slug}/"`), `homepage missing app link: ${app.slug}`);
    ensure(check.includes(`"name": "${app.name}"`), `homepage JSON-LD missing app name: ${app.name}`);
    ensure(check.includes(`name": "${app.name}"`) || check.includes(`name: "${app.name}"`), `homepage JS missing app name: ${app.name}`);
  }
}

const catalog = readJson('data/bt-catalog.json');
const { schema, version, publisher, enums, apps, intentPages } = catalog;

ensure(schema === 'BT-CATALOG-1', 'schema must be BT-CATALOG-1');
ensure(typeof version === 'string' && version.length > 0, 'version is required');
ensure(Array.isArray(apps), 'apps must be an array');
ensure(Array.isArray(intentPages), 'intentPages must be an array');

const enumKeys = ['families','disciplines','modes','audiences','workflowStages','outputs','tags','statuses'];
for (const key of enumKeys) ensure(Array.isArray(enums?.[key]), `enums.${key} must be an array`);

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
syncHomepage();

const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const requiredPaths = ['/','/tools/','/support/','/privacy/'];
for (const app of apps) if (app.visibility?.includeInSitemap) requiredPaths.push(`/apps/${app.slug}/`);
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
