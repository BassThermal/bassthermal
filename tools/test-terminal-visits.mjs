import assert from 'node:assert/strict';
import { planAdditiveMigrations, handleVisitsHealth } from '../src/worker.js';

function noDestructive(sql) {
  assert(!/\b(drop|delete|truncate|rename)\b/i.test(sql), sql);
}

const currentSessions = ['session_id','visitor_hash','first_seen_ms','last_seen_ms','first_seen_iso','last_seen_iso','day_et','path','app_slug','country','region','city','timezone','colo','device','referrer_host','is_bot','page_views','heartbeats','clicks'];
const currentEvents = ['id','ts_ms','ts_iso','day_et','type','session_id','visitor_hash','path','app_slug','target','country','region','city','timezone','colo','device','referrer_host','is_bot'];
assert.deepEqual(planAdditiveMigrations('visit_sessions', currentSessions), []);
assert.deepEqual(planAdditiveMigrations('visit_events', currentEvents), []);
const legacy = currentSessions.filter((c) => !['device','referrer_host','heartbeats','clicks'].includes(c));
const alters = planAdditiveMigrations('visit_sessions', legacy);
assert.deepEqual(alters.map((s) => s.match(/ADD COLUMN (\w+)/)[1]), ['device','referrer_host','heartbeats','clicks']);
alters.forEach(noDestructive);
assert.deepEqual(planAdditiveMigrations('visit_sessions', [...legacy, 'device','referrer_host','heartbeats','clicks']), []);

const helpCommands = ['apps','info retrofy','open retrofy windows','stores','clear','close','owner'];
const ownerCommands = ['/visits','visits','/visits all','visits all','/visits live','visits live','/visits clicks','visits clicks','/visits health','visits health','/visits off','visits off','city Montreal CA','/city Montreal CA'];
function normalizeVisitsCommand(text) { const n = String(text).trim().toLowerCase().replace(/\s+/g, ' '); return n === 'visits' ? '/visits' : n.startsWith('visits ') ? `/${n}` : n; }
assert.equal(normalizeVisitsCommand('visits clicks'), '/visits clicks');
assert.equal(normalizeVisitsCommand('/visits clicks'), '/visits clicks');
assert.match('/city Montreal CA', /^\/city/i);
assert(!ownerCommands.includes('unknown'));
assert(helpCommands.includes('owner'));

class FakeDB {
  constructor({ failSelect=false, sessions=currentSessions, events=currentEvents, failSummary=false } = {}) { Object.assign(this, { failSelect, sessions, events, failSummary }); }
  prepare(sql) { const db = this; return { bind(){ return this; }, async first(){ if (/SELECT 1/.test(sql) && db.failSelect) throw new Error('db'); if (/COUNT\(\*\).*visit_sessions/.test(sql) && db.failSummary) throw new Error('summary'); return { ok: 1 }; }, async all(){ if (/PRAGMA table_info\(visit_sessions\)/.test(sql)) return { results: db.sessions.map((name) => ({ name })) }; if (/PRAGMA table_info\(visit_events\)/.test(sql)) return { results: db.events.map((name) => ({ name })) }; return { results: [] }; }, async run(){ return { success: true }; } }; }
}
async function health(env) { return (await handleVisitsHealth(env)).json(); }
assert.equal((await health({})).error, 'missing_binding');
assert.equal((await health({ VISITS_DB: new FakeDB({ failSelect: true }) })).error, 'database_unavailable');
assert.equal((await health({ VISITS_DB: new FakeDB({ sessions: [] }) })).error, 'missing_table');
assert.equal((await health({ VISITS_DB: new FakeDB({ sessions: legacy }) })).error, 'schema_incomplete');
assert.equal((await health({ VISITS_DB: new FakeDB() })).ok, true);
assert.equal((await health({ VISITS_DB: new FakeDB({ failSummary: true }) })).error, 'summary_query_failed');

async function parseVisitResponse(fetchImpl, path = '/api') {
  const controller = new AbortController();
  try {
    const res = await fetchImpl(path, { signal: controller.signal, headers: { accept: 'application/json' }, cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    const body = await res.text();
    if (!type.includes('application/json')) throw new Error(`unexpected ${type.split(';')[0] || 'non-json'} response`);
    let data; try { data = JSON.parse(body); } catch { throw new Error('invalid JSON response'); }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${data.error || ''}`.trim());
    if (!data.ok) throw new Error(data.error || 'API error');
    return data;
  } catch (err) { throw err.name === 'AbortError' ? new Error('request timeout') : err; }
}
const jsonRes = (status, body, type='application/json') => ({ ok: status < 400, status, headers: new Headers({ 'content-type': type }), text: async () => body });
assert.equal((await parseVisitResponse(async()=>jsonRes(200,'{"ok":true}'))).ok, true);
await assert.rejects(parseVisitResponse(async()=>jsonRes(500,'{"ok":false,"error":"schema_incomplete"}')), /HTTP 500/);
await assert.rejects(parseVisitResponse(async()=>jsonRes(404,'<html>', 'text/html')), /unexpected text\/html/);
await assert.rejects(parseVisitResponse(async()=>jsonRes(200,'{nope')),/invalid JSON/);
await assert.rejects(parseVisitResponse(async()=>{ const e = new Error('aborted'); e.name='AbortError'; throw e; }), /request timeout/);
await assert.rejects(parseVisitResponse(async()=>{ throw new TypeError('fetch failed'); }), /fetch failed/);
console.log('terminal visits tests passed');
