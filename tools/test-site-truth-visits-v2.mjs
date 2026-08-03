import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planAdditiveMigrations } from '../src/worker-v2.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const wrangler = read('wrangler.toml');
const workerEntry = read('src/worker-entry.js');
assert.match(wrangler, /main = "src\/worker-entry\.js"/);
assert.match(workerEntry, /import worker from '\.\/worker-v2\.js'/);
for (const route of ['"/"', '"/apps/*"', '"/guides/*"', '"/about/*"', '"/support/*"', '"/privacy/*"', '"/security/*"', '"/api/*"']) {
  assert.ok(wrangler.includes(route), `Worker-first redirect/API route missing: ${route}`);
}
assert.equal(exists('public/site-visits.js'), true);
assert.equal(exists('public/visits-terminal.js'), true);
assert.equal(exists('public/visits-terminal.css'), true);
assert.equal(exists('public/visits-terminal-v2.js'), false);
assert.equal(exists('migrations/0002_visits_reporting.sql'), true);
assert.equal(exists('public/terms/index.html'), false);
assert.equal(exists('public/releases/index.html'), false);

const migration = read('migrations/0002_visits_reporting.sql');
assert.doesNotMatch(migration, /\b(DROP|DELETE|TRUNCATE|RENAME)\b/i);
for (const column of ['last_heartbeat_ms', 'visible_ms', 'action', 'source_path']) assert.match(migration, new RegExp(column));

const legacySessions = ['session_id','visitor_hash','first_seen_ms','last_seen_ms','first_seen_iso','last_seen_iso','day_et','path','app_slug','country','region','city','timezone','colo','device','referrer_host','is_bot','page_views','heartbeats','clicks'];
const adds = planAdditiveMigrations('visit_sessions', legacySessions);
assert.deepEqual(adds.map((sql) => sql.match(/ADD COLUMN (\w+)/)?.[1]), ['last_heartbeat_ms','visible_ms']);

const publicRoot = path.join(root, 'public');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const htmlFiles = walk(publicRoot).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(html, /href=["']\/terms\//);
  assert.doesNotMatch(html, /href=["']\/releases\//);
  if (!html.includes('terminal home')) assert.match(html, /\/site-visits\.js\?v=2/);
}

const homepage = read('public/index.html');
assert.match(homepage, /\/visits-terminal\.js\?v=3/);
assert.match(homepage, /\/visits-terminal\.css\?v=3/);
assert.doesNotMatch(homepage, /visits-terminal-v2/);

const about = read('public/about/index.html');
assert.doesNotMatch(about, /View releases|public releases|\/releases\//i);
const sitemap = read('public/sitemap.xml');
assert.doesNotMatch(sitemap, /\/terms\/|\/releases\//);
const privacy = read('public/privacy/index.html');
assert.match(privacy, /Website visits/);
assert.match(privacy, /Raw IP addresses.*not stored/);

const tracker = read('public/site-visits.js');
for (const action of ['install_windows','install_android','open_web_app','guide_open','product_open']) assert.match(tracker, new RegExp(action));
assert.match(tracker, /document\.visibilityState/);
assert.match(tracker, /30000/);

const worker = read('src/worker-v2.js');
assert.match(worker, /ACTIVE_WINDOW_MS = 90 \* 1000/);
assert.match(worker, /visible_ms/);
assert.match(worker, /COUNT\(DISTINCT visitor_hash\)/);
assert.match(worker, /activePeople/);
assert.match(worker, /visibleTodayLabel/);

console.log(`site truth and Visits v2 tests passed for ${htmlFiles.length} HTML files`);
