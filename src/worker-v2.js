import { resolveRedirectUrl } from './redirects.mjs';

const ET_TIMEZONE = 'America/Toronto';
const ACTIVE_WINDOW_MS = 90 * 1000;
const HEARTBEAT_CAP_MS = 35 * 1000;
const MAX_TEXT = 512;
let schemaReady = false;

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
const clean = (value, max = MAX_TEXT) => String(value || '').trim().slice(0, max);

const REQUIRED = {
  visit_sessions: {
    session_id: 'TEXT PRIMARY KEY', visitor_hash: "TEXT NOT NULL DEFAULT ''", first_seen_ms: 'INTEGER NOT NULL DEFAULT 0', last_seen_ms: 'INTEGER NOT NULL DEFAULT 0', first_seen_iso: "TEXT NOT NULL DEFAULT ''", last_seen_iso: "TEXT NOT NULL DEFAULT ''", day_et: "TEXT NOT NULL DEFAULT ''", path: 'TEXT', app_slug: 'TEXT', country: 'TEXT', region: 'TEXT', city: 'TEXT', timezone: 'TEXT', colo: 'TEXT', device: 'TEXT', referrer_host: 'TEXT', is_bot: 'INTEGER NOT NULL DEFAULT 0', page_views: 'INTEGER NOT NULL DEFAULT 0', heartbeats: 'INTEGER NOT NULL DEFAULT 0', clicks: 'INTEGER NOT NULL DEFAULT 0', last_heartbeat_ms: 'INTEGER NOT NULL DEFAULT 0', visible_ms: 'INTEGER NOT NULL DEFAULT 0'
  },
  visit_events: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT', ts_ms: 'INTEGER NOT NULL DEFAULT 0', ts_iso: "TEXT NOT NULL DEFAULT ''", day_et: "TEXT NOT NULL DEFAULT ''", type: "TEXT NOT NULL DEFAULT ''", session_id: 'TEXT', visitor_hash: 'TEXT', path: 'TEXT', app_slug: 'TEXT', target: 'TEXT', country: 'TEXT', region: 'TEXT', city: 'TEXT', timezone: 'TEXT', colo: 'TEXT', device: 'TEXT', referrer_host: 'TEXT', is_bot: 'INTEGER NOT NULL DEFAULT 0', action: "TEXT NOT NULL DEFAULT ''", source_path: "TEXT NOT NULL DEFAULT ''"
  }
};

export function planAdditiveMigrations(table, existingColumns) {
  const existing = new Set(existingColumns);
  return Object.entries(REQUIRED[table] || {}).filter(([name]) => !existing.has(name) && name !== 'id' && name !== 'session_id').map(([name, ddl]) => `ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}
async function columns(db, table) { return ((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map((x) => x.name); }
async function ensureSchema(env) {
  if (schemaReady) return;
  if (!env.VISITS_DB) throw Object.assign(new Error('missing_binding'), { code: 'missing_binding', stage: 'binding' });
  const db = env.VISITS_DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS visit_sessions (session_id TEXT PRIMARY KEY, visitor_hash TEXT NOT NULL, first_seen_ms INTEGER NOT NULL, last_seen_ms INTEGER NOT NULL, first_seen_iso TEXT NOT NULL, last_seen_iso TEXT NOT NULL, day_et TEXT NOT NULL, path TEXT, app_slug TEXT, country TEXT, region TEXT, city TEXT, timezone TEXT, colo TEXT, device TEXT, referrer_host TEXT, is_bot INTEGER NOT NULL DEFAULT 0, page_views INTEGER NOT NULL DEFAULT 0, heartbeats INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, last_heartbeat_ms INTEGER NOT NULL DEFAULT 0, visible_ms INTEGER NOT NULL DEFAULT 0)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS visit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts_ms INTEGER NOT NULL, ts_iso TEXT NOT NULL, day_et TEXT NOT NULL, type TEXT NOT NULL, session_id TEXT, visitor_hash TEXT, path TEXT, app_slug TEXT, target TEXT, country TEXT, region TEXT, city TEXT, timezone TEXT, colo TEXT, device TEXT, referrer_host TEXT, is_bot INTEGER NOT NULL DEFAULT 0, action TEXT NOT NULL DEFAULT '', source_path TEXT NOT NULL DEFAULT '')`).run();
  for (const table of Object.keys(REQUIRED)) for (const sql of planAdditiveMigrations(table, await columns(db, table))) await db.prepare(sql).run();
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON visit_sessions(last_seen_ms)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_day_visitor ON visit_sessions(day_et, visitor_hash)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_city_day ON visit_sessions(day_et, city, country)',
    'CREATE INDEX IF NOT EXISTS idx_events_day_type ON visit_events(day_et, type)',
    'CREATE INDEX IF NOT EXISTS idx_events_action_day ON visit_events(day_et, action)',
    'CREATE INDEX IF NOT EXISTS idx_events_path_day ON visit_events(day_et, path)'
  ]) await db.prepare(sql).run();
  schemaReady = true;
}

function dayET(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: ET_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
function timeET(ms) { return new Intl.DateTimeFormat('en-GB', { timeZone: ET_TIMEZONE, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(ms)); }
function age(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`; }
function duration(ms) { const s = Math.max(0, Math.floor(ms / 1000)); if (s < 60) return `${s}s`; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }
function host(value) { try { return value ? new URL(value).host : ''; } catch { return ''; } }
function botUA(ua) { return ['bot','crawler','spider','preview','facebookexternalhit','slackbot','discordbot','twitterbot','linkedinbot','googlebot','bingbot','headless'].some((x) => String(ua).toLowerCase().includes(x)); }
function device(ua, bot) { if (bot) return 'bot'; const v = String(ua).toLowerCase(); if (/(ipad|tablet|kindle|silk)/.test(v)) return 'tablet'; if (/(mobi|iphone|android)/.test(v)) return 'mobile'; if (/(windows|macintosh|linux|x11|cros)/.test(v)) return 'desktop'; return 'unknown'; }
async function hash(value) { const bytes = new TextEncoder().encode(value); const out = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(out)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function appFromPath(path) { const m = String(path).match(/^\/apps\/([^/]+)/); return m ? m[1] : ''; }
function normalizeAction(body) {
  const given = clean(body.action, 48);
  if (['install_windows','install_android','open_web_app','product_open','guide_open','store_hub_windows','store_hub_android'].includes(given)) return given;
  const target = clean(body.target, 512); const h = host(target);
  if (h === 'apps.microsoft.com') return body.appSlug ? 'install_windows' : 'store_hub_windows';
  if (h === 'play.google.com') return body.appSlug ? 'install_android' : 'store_hub_android';
  if (h === 'www.dualticker.com' || h === 'dualticker.com') return 'open_web_app';
  if (target.includes('/guides/')) return 'guide_open';
  if (target.includes('/apps/')) return 'product_open';
  return given || 'external_open';
}

async function handleVisit(request, env) {
  await ensureSchema(env);
  if ((request.headers.get('content-length') || '0') > 8192) return json({ ok: false, error: 'payload_too_large' }, 413);
  const body = await request.json().catch(() => null);
  if (!body || !['pageview','heartbeat','click'].includes(body.type) || !body.sessionId) return json({ ok: false, error: 'bad_request' }, 400);
  const now = Date.now(), iso = new Date(now).toISOString(), day = dayET();
  const ua = request.headers.get('user-agent') || '', ip = request.headers.get('CF-Connecting-IP') || '';
  const visitor = await hash(`bt-visits-v2|${day}|${ip}|${ua}`), isBot = botUA(ua) ? 1 : 0, cf = request.cf || {};
  const path = clean(body.path || '/', 300), appSlug = clean(body.appSlug || appFromPath(path), 100), referrer = host(body.referrer), sessionId = clean(body.sessionId, 128);
  const prior = await env.VISITS_DB.prepare('SELECT last_heartbeat_ms FROM visit_sessions WHERE session_id = ?').bind(sessionId).first();
  let visibleInc = 0, nextHeartbeat = prior?.last_heartbeat_ms || 0;
  if (body.type === 'heartbeat' && body.visible !== false) {
    const gap = prior?.last_heartbeat_ms ? now - prior.last_heartbeat_ms : 0;
    visibleInc = gap > 0 && gap <= 60_000 ? Math.min(gap, HEARTBEAT_CAP_MS) : 0;
    nextHeartbeat = now;
  }
  const pageInc = body.type === 'pageview' ? 1 : 0, hbInc = body.type === 'heartbeat' ? 1 : 0, clickInc = body.type === 'click' ? 1 : 0;
  await env.VISITS_DB.prepare(`INSERT INTO visit_sessions (session_id,visitor_hash,first_seen_ms,last_seen_ms,first_seen_iso,last_seen_iso,day_et,path,app_slug,country,region,city,timezone,colo,device,referrer_host,is_bot,page_views,heartbeats,clicks,last_heartbeat_ms,visible_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET visitor_hash=excluded.visitor_hash,last_seen_ms=excluded.last_seen_ms,last_seen_iso=excluded.last_seen_iso,day_et=excluded.day_et,path=excluded.path,app_slug=excluded.app_slug,country=excluded.country,region=excluded.region,city=excluded.city,timezone=excluded.timezone,colo=excluded.colo,device=excluded.device,referrer_host=excluded.referrer_host,is_bot=excluded.is_bot,page_views=visit_sessions.page_views+excluded.page_views,heartbeats=visit_sessions.heartbeats+excluded.heartbeats,clicks=visit_sessions.clicks+excluded.clicks,last_heartbeat_ms=CASE WHEN excluded.last_heartbeat_ms>0 THEN excluded.last_heartbeat_ms ELSE visit_sessions.last_heartbeat_ms END,visible_ms=visit_sessions.visible_ms+excluded.visible_ms`).bind(sessionId,visitor,now,now,iso,iso,day,path,appSlug,cf.country||'Unknown',cf.region||'Unknown',cf.city||'Unknown',cf.timezone||'Unknown',cf.colo||'Unknown',device(ua,isBot),referrer,isBot,pageInc,hbInc,clickInc,nextHeartbeat,visibleInc).run();
  if (body.type !== 'heartbeat') {
    const action = body.type === 'click' ? normalizeAction({ ...body, appSlug }) : '';
    await env.VISITS_DB.prepare(`INSERT INTO visit_events (ts_ms,ts_iso,day_et,type,session_id,visitor_hash,path,app_slug,target,country,region,city,timezone,colo,device,referrer_host,is_bot,action,source_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(now,iso,day,body.type,sessionId,visitor,path,appSlug,clean(body.target,512),cf.country||'Unknown',cf.region||'Unknown',cf.city||'Unknown',cf.timezone||'Unknown',cf.colo||'Unknown',device(ua,isBot),referrer,isBot,action,clean(body.sourcePath||path,300)).run();
  }
  return json({ ok: true });
}

async function handleSummary(env) {
  await ensureSchema(env); const db = env.VISITS_DB, now = Date.now(), min = now - ACTIVE_WINDOW_MS, day = dayET();
  const active = (await db.prepare(`SELECT session_id,visitor_hash,country,city,device,path,app_slug,last_seen_ms FROM visit_sessions WHERE is_bot=0 AND last_seen_ms>=? ORDER BY last_seen_ms DESC`).bind(min).all()).results || [];
  const today = (await db.prepare(`SELECT session_id,visitor_hash,country,city,device,path,app_slug,last_seen_ms,page_views,clicks,visible_ms FROM visit_sessions WHERE is_bot=0 AND day_et=?`).bind(day).all()).results || [];
  const peopleNow = new Set(active.map((x) => x.visitor_hash)).size, visitorsToday = new Set(today.map((x) => x.visitor_hash)).size;
  const pageViewsToday = today.reduce((s,x)=>s+(x.page_views||0),0), clicksTotal = today.reduce((s,x)=>s+(x.clicks||0),0), visibleMs = today.reduce((s,x)=>s+(x.visible_ms||0),0);
  const cityMap = new Map();
  for (const r of today) { const key=`${r.city||'Unknown'}__${r.country||'Unknown'}`; const e=cityMap.get(key)||{city:r.city||'Unknown',country:r.country||'Unknown',visitors:new Set(),sessions:0,pageViews:0,visibleMs:0,lastSeenMs:0}; e.visitors.add(r.visitor_hash); e.sessions++; e.pageViews+=r.page_views||0; e.visibleMs+=r.visible_ms||0; e.lastSeenMs=Math.max(e.lastSeenMs,r.last_seen_ms||0); cityMap.set(key,e); }
  const citiesToday=[...cityMap.values()].sort((a,b)=>b.visitors.size-a.visitors.size||b.lastSeenMs-a.lastSeenMs).map((x)=>({city:x.city,country:x.country,visitors:x.visitors.size,sessions:x.sessions,pageViews:x.pageViews,visibleMs:x.visibleMs,visibleLabel:duration(x.visibleMs),tabTimeMs:x.visibleMs,tabTimeLabel:duration(x.visibleMs),lastSeenMs:x.lastSeenMs,lastSeenTime:timeET(x.lastSeenMs)}));
  const activeVisitors = new Map();
  for (const r of active) { const key=`${r.city||'Unknown'}__${r.country||'Unknown'}`; const e=activeVisitors.get(key)||{city:r.city||'Unknown',country:r.country||'Unknown',people:new Set(),sessions:0,lastSeenMs:0}; e.people.add(r.visitor_hash); e.sessions++; e.lastSeenMs=Math.max(e.lastSeenMs,r.last_seen_ms||0); activeVisitors.set(key,e); }
  const citiesActive=[...activeVisitors.values()].map((x)=>({city:x.city,country:x.country,people:x.people.size,sessions:x.sessions,lastSeenMs:x.lastSeenMs,lastSeenTime:timeET(x.lastSeenMs),ageLabel:age(now-x.lastSeenMs)}));
  const pagesToday=((await db.prepare(`SELECT path,COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors,MAX(ts_ms) lastSeenMs FROM visit_events WHERE is_bot=0 AND day_et=? AND type='pageview' AND path!='' GROUP BY path ORDER BY views DESC,lastSeenMs DESC LIMIT 12`).bind(day).all()).results||[]).map((x)=>({...x,lastSeenTime:timeET(x.lastSeenMs)}));
  const clicksToday=((await db.prepare(`SELECT action,app_slug appSlug,COUNT(*) clicks,MAX(ts_ms) lastSeenMs FROM visit_events WHERE is_bot=0 AND day_et=? AND type='click' GROUP BY action,app_slug ORDER BY clicks DESC,lastSeenMs DESC LIMIT 12`).bind(day).all()).results||[]).map((x)=>({...x,lastSeenTime:timeET(x.lastSeenMs)}));
  const appsToday=((await db.prepare(`SELECT app_slug appSlug,SUM(CASE WHEN type='pageview' THEN 1 ELSE 0 END) views,SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) clicks,MAX(ts_ms) lastSeenMs FROM visit_events WHERE is_bot=0 AND day_et=? AND app_slug!='' GROUP BY app_slug ORDER BY (views+clicks) DESC,lastSeenMs DESC LIMIT 12`).bind(day).all()).results||[]).map((x)=>({...x,lastSeenTime:timeET(x.lastSeenMs)}));
  return json({ ok:true,generatedAt:new Date(now).toISOString(),timezone:ET_TIMEZONE,activeWindowSeconds:90,activeWindowMinutes:1.5,activeSessions:active.map((x)=>({sessionId:x.session_id,visitorHash:x.visitor_hash,country:x.country,city:x.city,device:x.device,path:x.path,appSlug:x.app_slug,ageLabel:age(now-x.last_seen_ms),lastSeenTime:timeET(x.last_seen_ms)})),citiesActive,countriesActive:[],citiesToday,pagesToday,clicksToday,appsToday,totals:{activePeople:peopleNow,activeSessions:active.length,visitorsToday,sessionsToday:today.length,pageViewsToday,clicksToday:clicksTotal,visibleTodayMs:visibleMs,visibleTodayLabel:duration(visibleMs),tabTimeTodayMs:visibleMs,tabTimeTodayLabel:duration(visibleMs)} });
}

async function handleCity(url, env) {
  const data = await handleSummary(env).then((r)=>r.json()); const city=clean(url.searchParams.get('city'),120), country=clean(url.searchParams.get('country'),8); if(!city||!country)return json({ok:false,error:'city_country_required'},400);
  const row=(data.citiesToday||[]).find((x)=>x.city.toLowerCase()===city.toLowerCase()&&x.country.toLowerCase()===country.toLowerCase());
  return json({ok:true,generatedAt:data.generatedAt,timezone:ET_TIMEZONE,city,country,totals:row?{sessions:row.sessions,visitors:row.visitors,pageViews:row.pageViews,clicks:0,visibleMs:row.visibleMs,visibleLabel:row.visibleLabel,tabTimeMs:row.visibleMs,tabTimeLabel:row.visibleLabel,lastSeenTime:row.lastSeenTime}:{sessions:0,visitors:0,pageViews:0,clicks:0,visibleMs:0,visibleLabel:'0s',tabTimeMs:0,tabTimeLabel:'0s',lastSeenTime:'--:--:--'},signal:{label:'normal',reasons:[]},paths:(data.pagesToday||[]),clicks:(data.clicksToday||[]),devices:[],referrers:[],timeline:[]});
}

export async function handleVisitsHealth(env) {
  if(!env.VISITS_DB)return json({ok:false,error:'missing_binding',stage:'binding'},503);
  try { await ensureSchema(env); const latest=await env.VISITS_DB.prepare('SELECT MAX(last_seen_ms) latest FROM visit_sessions').first(); return json({ok:true,worker:true,binding:true,database:true,schema:true,summaryQuery:true,latestEventMs:latest?.latest||0,checks:[{name:'worker',ok:true},{name:'binding',ok:true},{name:'database',ok:true},{name:'schema',ok:true},{name:'summaryQuery',ok:true}]}); } catch(err){ return json({ok:false,error:err.code||'health_failed',stage:err.stage||'health'},500); }
}

function publicAsset(pathname){return ['/catalog-lite.json','/catalog.json','/related-apps.v1.js','/bt-tools-feed.v1.json','/bt-tools-overlay.v1.js'].includes(pathname);}
function cors(headers){const h=new Headers(headers);h.set('Access-Control-Allow-Origin','*');h.set('Access-Control-Allow-Methods','GET, OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type');return h;}

export default { async fetch(request, env) { const url=new URL(request.url); const redirect=resolveRedirectUrl(url,request.method); if(redirect)return Response.redirect(redirect,308); if(publicAsset(url.pathname)&&(request.method==='GET'||request.method==='OPTIONS')){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors({})});const r=await env.ASSETS.fetch(request);return new Response(r.body,{status:r.status,statusText:r.statusText,headers:cors(r.headers)});} try { if(request.method==='POST'&&url.pathname==='/api/visit')return handleVisit(request,env); if(request.method==='GET'&&url.pathname==='/api/visits/summary')return handleSummary(env); if(request.method==='GET'&&url.pathname==='/api/visits/health')return handleVisitsHealth(env); if(request.method==='GET'&&url.pathname==='/api/visits/city')return handleCity(url,env); } catch(err){return json({ok:false,error:err.code||'worker_error',stage:err.stage||'request'},500);} return env.ASSETS.fetch(request); } };
export { REQUIRED };
