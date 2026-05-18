import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const ORIGIN = 'https://www.bassthermal.com';
const FALLBACK = { label: 'View all apps', href: `${ORIGIN}/apps/` };
const MIN_STRONG = 30;

const GENERIC_AUDIENCES = new Set(['general_user', 'user', 'creator', 'researcher', 'publisher', 'operator', 'student', 'designer', 'developer']);
const GENERIC_WORKFLOW = new Set(['inspect', 'export', 'validate', 'lookup', 'study', 'generate', 'convert', 'create', 'collect', 'monitor', 'compare', 'publish']);
const GENERIC_TAGS = new Set(['windows', 'android', 'web', 'offline', 'batch', 'csv', 'url']);
const GENERIC_OUTPUTS = new Set(['csv_export', 'metadata_report', 'reference_card']);

const asArray = (value) => Array.isArray(value) ? value : [];
const statusRank = (status) => status === 'live' ? 0 : (status === 'shipping' ? 1 : 2);
const sharedValues = (a, b) => {
  if (!a.length || !b.length) return [];
  const set = new Set(a);
  return b.filter((v) => set.has(v));
};
const sharedSpecificValues = (a, b, genericSet) => sharedValues(a, b).filter((v) => !genericSet.has(v));
const absUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/')) return `${ORIGIN}${url}`;
  return `${ORIGIN}/${url.replace(/^\/+/, '')}`;
};

function loadStoreAssets() {
  const source = fs.readFileSync(path.join(root, 'public/store-assets.generated.js'), 'utf8');
  const ctx = { window: {}, document: { querySelector: () => ({}), createElement: () => ({ dataset: {} }), head: { appendChild: () => {} } } };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return ctx.window.BT_STORE_ASSETS || { apps: {} };
}

function chooseIcon(storeApp) {
  const icon = storeApp?.icon || {};
  const picked = icon.fallback || icon.android || icon.windows || icon.web || null;
  return picked ? absUrl(picked) : null;
}

function monogram(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'BT';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function evaluateCandidate(current, candidate) {
  const inRel = asArray(current.relatedTools).find((r) => r.id === candidate.id);
  const revRel = asArray(candidate.relatedTools).find((r) => r.id === current.id);

  const sharedModes = sharedValues(asArray(current.modes), asArray(candidate.modes)).length;
  const sharedSpecificOutputs = sharedSpecificValues(asArray(current.outputs), asArray(candidate.outputs), GENERIC_OUTPUTS);
  const sharedSpecificTags = sharedSpecificValues(asArray(current.tags), asArray(candidate.tags), GENERIC_TAGS);
  const sharedSpecificAudiences = sharedValues(asArray(current.audiences), asArray(candidate.audiences)).filter((v) => !GENERIC_AUDIENCES.has(v));
  const sharedSpecificWorkflow = sharedValues(asArray(current.workflowStages), asArray(candidate.workflowStages)).filter((v) => !GENERIC_WORKFLOW.has(v));

  const samePrimaryFamily = candidate.primaryFamily && candidate.primaryFamily === current.primaryFamily;
  const bridgedFamily = asArray(current.secondaryFamilies).includes(candidate.primaryFamily) || asArray(candidate.secondaryFamilies).includes(current.primaryFamily);
  const sameDiscipline = current.discipline && candidate.discipline === current.discipline && candidate.discipline !== 'NONE';

  let strong = 0;
  if (inRel) strong += 100;
  if (revRel) strong += 100;
  if (samePrimaryFamily) strong += 45;
  if (asArray(current.secondaryFamilies).includes(candidate.primaryFamily)) strong += 25;
  if (asArray(candidate.secondaryFamilies).includes(current.primaryFamily)) strong += 25;
  if (sameDiscipline) strong += 22;
  strong += Math.min(42, sharedSpecificOutputs.length * 14);
  strong += Math.min(40, sharedSpecificTags.length * 8);

  let weak = 0;
  weak += Math.min(24, sharedModes * 12);
  weak += Math.min(12, sharedSpecificAudiences.length * 6);
  weak += Math.min(12, sharedSpecificWorkflow.length * 4);

  const qualified = Boolean(inRel || revRel || strong >= MIN_STRONG);
  if (!qualified) return null;

  let statusBoost = 0;
  if (candidate.status === 'live') statusBoost = 8;
  if (candidate.status === 'shipping') statusBoost = 4;

  let reason = 'Related BassThermal tool.';
  if (inRel?.reason) reason = inRel.reason;
  else if (revRel?.reason) reason = revRel.reason;
  else if (samePrimaryFamily || bridgedFamily) reason = 'Same tool family.';
  else if (sameDiscipline && (sharedSpecificOutputs.length || sharedSpecificTags.length)) reason = 'Related workflow domain.';
  else if (sharedSpecificOutputs.length) reason = 'Related output.';
  else if (sharedSpecificTags.length) reason = 'Related utility.';

  const tier = inRel || revRel ? 'explicit' : (samePrimaryFamily || bridgedFamily ? 'family' : 'domain');
  return { app: candidate, score: strong + weak + statusBoost, reason, tier };
}

const catalogLite = JSON.parse(fs.readFileSync(path.join(root, 'public/catalog-lite.json'), 'utf8'));
const storeAssets = loadStoreAssets();

const outApps = {};

for (const app of catalogLite.apps) {
  const appAsset = storeAssets.apps?.[app.id];
  const candidates = catalogLite.apps
    .filter((candidate) => candidate.id !== app.id && candidate.status !== 'hidden' && candidate.visibility?.showInAppOverlay === true)
    .map((candidate) => evaluateCandidate(app, candidate))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || statusRank(a.app.status) - statusRank(b.app.status) || String(a.app.name).localeCompare(String(b.app.name)));

  outApps[app.id] = {
    id: app.id,
    name: app.name,
    status: app.status,
    short: app.short,
    icon: chooseIcon(appAsset),
    monogram: monogram(app.name),
    links: Object.fromEntries(Object.entries(app.links || {}).filter(([, v]) => v).map(([k, v]) => [k, absUrl(v)])),
    recommendations: candidates.map((entry) => {
      const recAsset = storeAssets.apps?.[entry.app.id];
      return {
        id: entry.app.id,
        name: entry.app.name,
        status: entry.app.status,
        short: entry.app.short,
        reason: entry.reason,
        icon: chooseIcon(recAsset),
        monogram: monogram(entry.app.name),
        links: Object.fromEntries(Object.entries(entry.app.links || {}).filter(([, v]) => v).map(([k, v]) => [k, absUrl(v)])),
        score: entry.score,
        tier: entry.tier
      };
    }),
    fallback: FALLBACK
  };
}

const payload = {
  schema: 'BT-TOOLS-FEED-1',
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  apps: outApps
};

const jsonText = JSON.stringify(payload, null, 2) + '\n';
const jsText = `window.BT_TOOLS_FEED_V1 = ${jsonText};\n` +
  `window.dispatchEvent(new CustomEvent('bt-tools-feed:v1-ready', { detail: window.BT_TOOLS_FEED_V1 }));\n`;

fs.writeFileSync(path.join(root, 'public/bt-tools-feed.v1.json'), jsonText);
fs.writeFileSync(path.join(root, 'public/bt-tools-feed.v1.js'), jsText);
console.log(`bt-tools-feed: public/bt-tools-feed.v1.json + public/bt-tools-feed.v1.js (${Object.keys(outApps).length} apps)`);
