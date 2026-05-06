const ET_TIMEZONE = "America/Toronto";
const ACTIVE_WINDOW_MINUTES = 5;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

let schemaReady = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function ensureSchema(env) {
  if (schemaReady) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS visit_sessions (
      session_id TEXT PRIMARY KEY,
      visitor_hash TEXT NOT NULL,
      first_seen_ms INTEGER NOT NULL,
      last_seen_ms INTEGER NOT NULL,
      first_seen_iso TEXT NOT NULL,
      last_seen_iso TEXT NOT NULL,
      day_et TEXT NOT NULL,
      path TEXT,
      app_slug TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      timezone TEXT,
      colo TEXT,
      device TEXT,
      referrer_host TEXT,
      is_bot INTEGER NOT NULL DEFAULT 0,
      page_views INTEGER NOT NULL DEFAULT 0,
      heartbeats INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS visit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts_ms INTEGER NOT NULL,
      ts_iso TEXT NOT NULL,
      day_et TEXT NOT NULL,
      type TEXT NOT NULL,
      session_id TEXT,
      visitor_hash TEXT,
      path TEXT,
      app_slug TEXT,
      target TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      timezone TEXT,
      colo TEXT,
      device TEXT,
      referrer_host TEXT,
      is_bot INTEGER NOT NULL DEFAULT 0
    )`,
    "CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON visit_sessions(last_seen_ms)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_day_et ON visit_sessions(day_et)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_bot_last_seen ON visit_sessions(is_bot, last_seen_ms)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_city_day ON visit_sessions(day_et, city, country)",
    "CREATE INDEX IF NOT EXISTS idx_events_day_type ON visit_events(day_et, type)",
    "CREATE INDEX IF NOT EXISTS idx_events_ts ON visit_events(ts_ms)",
    "CREATE INDEX IF NOT EXISTS idx_events_bot_day ON visit_events(is_bot, day_et)"
  ];

  for (const sql of statements) {
    await env.VISITS_DB.prepare(sql).run();
  }

  schemaReady = true;
}

function dayInET(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function timeInET(ms) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ET_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(ms));
}

function ageLabel(deltaMs) {
  const s = Math.max(0, Math.floor(deltaMs / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m+`;
}

function durationLabel(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

function parseHost(input) {
  try {
    return input ? new URL(input).host : "";
  } catch {
    return "";
  }
}

function isBotUa(ua) {
  const tokens = ["bot", "crawler", "spider", "preview", "facebookexternalhit", "slackbot", "discordbot", "twitterbot", "linkedinbot", "googlebot", "bingbot"];
  const lower = String(ua || "").toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

function detectDevice(ua, bot) {
  if (bot) return "bot";
  const lower = String(ua || "").toLowerCase();
  if (!lower) return "unknown";
  if (/(ipad|tablet|kindle|silk|playbook)/.test(lower)) return "tablet";
  if (/(mobi|iphone|android)/.test(lower)) return "mobile";
  if (/(windows|macintosh|linux|x11|cros)/.test(lower)) return "desktop";
  return "unknown";
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleVisit(request, env) {
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!body || !["pageview", "heartbeat", "click"].includes(body.type) || !body.sessionId) {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const dayEt = dayInET(new Date(nowMs));
  const ua = request.headers.get("user-agent") || "";
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const visitorHash = await sha256Hex(`bt-visits-v1${ip}${ua}${dayEt}`);
  const cf = request.cf || {};
  const isBot = isBotUa(ua);
  const device = detectDevice(ua, isBot);

  const row = {
    sessionId: String(body.sessionId).slice(0, 128),
    visitorHash,
    firstSeenMs: nowMs,
    lastSeenMs: nowMs,
    firstSeenIso: nowIso,
    lastSeenIso: nowIso,
    dayEt,
    path: body.path || "",
    appSlug: body.appSlug || "",
    country: cf.country || "Unknown",
    region: cf.region || "Unknown",
    city: cf.city || "Unknown",
    timezone: cf.timezone || "Unknown",
    colo: cf.colo || "Unknown",
    device,
    referrerHost: parseHost(body.referrer),
    isBot: isBot ? 1 : 0,
    pageInc: body.type === "pageview" ? 1 : 0,
    hbInc: body.type === "heartbeat" ? 1 : 0,
    clickInc: body.type === "click" ? 1 : 0
  };

  await env.VISITS_DB.prepare(
    `INSERT INTO visit_sessions (
      session_id, visitor_hash, first_seen_ms, last_seen_ms, first_seen_iso, last_seen_iso,
      day_et, path, app_slug, country, region, city, timezone, colo, device, referrer_host,
      is_bot, page_views, heartbeats, clicks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      visitor_hash = excluded.visitor_hash,
      last_seen_ms = excluded.last_seen_ms,
      last_seen_iso = excluded.last_seen_iso,
      day_et = excluded.day_et,
      path = excluded.path,
      app_slug = excluded.app_slug,
      country = excluded.country,
      region = excluded.region,
      city = excluded.city,
      timezone = excluded.timezone,
      colo = excluded.colo,
      device = excluded.device,
      referrer_host = excluded.referrer_host,
      is_bot = excluded.is_bot,
      page_views = visit_sessions.page_views + excluded.page_views,
      heartbeats = visit_sessions.heartbeats + excluded.heartbeats,
      clicks = visit_sessions.clicks + excluded.clicks`
  ).bind(
    row.sessionId, row.visitorHash, row.firstSeenMs, row.lastSeenMs, row.firstSeenIso, row.lastSeenIso,
    row.dayEt, row.path, row.appSlug, row.country, row.region, row.city, row.timezone, row.colo,
    row.device, row.referrerHost, row.isBot, row.pageInc, row.hbInc, row.clickInc
  ).run();

  if (body.type === "pageview" || body.type === "click") {
    await env.VISITS_DB.prepare(
      `INSERT INTO visit_events (
        ts_ms, ts_iso, day_et, type, session_id, visitor_hash, path, app_slug, target,
        country, region, city, timezone, colo, device, referrer_host, is_bot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nowMs, nowIso, dayEt, body.type, row.sessionId, row.visitorHash, row.path, row.appSlug,
      body.target || "", row.country, row.region, row.city, row.timezone, row.colo,
      row.device, row.referrerHost, row.isBot
    ).run();
  }

  return json({ ok: true });
}

async function handleSummary(env) {
  await ensureSchema(env);
  const nowMs = Date.now();
  const minMs = nowMs - ACTIVE_WINDOW_MINUTES * 60 * 1000;
  const dayEt = dayInET(new Date(nowMs));

  const activeRows = (await env.VISITS_DB.prepare(
    `SELECT session_id, country, city, last_seen_ms
     FROM visit_sessions WHERE is_bot = 0 AND last_seen_ms >= ?`
  ).bind(minMs).all()).results;

  const todayRows = (await env.VISITS_DB.prepare(
    `SELECT session_id, visitor_hash, country, city, first_seen_ms, last_seen_ms, page_views
     FROM visit_sessions WHERE is_bot = 0 AND day_et = ?`
  ).bind(dayEt).all()).results;

  const countriesMap = new Map();
  const citiesMap = new Map();
  for (const r of activeRows) {
    const c = r.country || "Unknown";
    const city = r.city || "Unknown";
    const cEntry = countriesMap.get(c) || { country: c, sessions: 0, lastSeenMs: 0 };
    cEntry.sessions += 1;
    cEntry.lastSeenMs = Math.max(cEntry.lastSeenMs, r.last_seen_ms || 0);
    countriesMap.set(c, cEntry);

    const key = `${city}__${c}`;
    const cityEntry = citiesMap.get(key) || { city, country: c, sessions: 0, lastSeenMs: 0 };
    cityEntry.sessions += 1;
    cityEntry.lastSeenMs = Math.max(cityEntry.lastSeenMs, r.last_seen_ms || 0);
    citiesMap.set(key, cityEntry);
  }

  const todayCityMap = new Map();
  let visitorsToday = new Set();
  let pageViewsToday = 0;
  let tabTimeTodayMs = 0;

  for (const r of todayRows) {
    visitorsToday.add(r.visitor_hash);
    pageViewsToday += r.page_views || 0;
    const country = r.country || "Unknown";
    const city = r.city || "Unknown";
    const key = `${city}__${country}`;
    const dur = Math.max(0, Math.min(MAX_SESSION_MS, (r.last_seen_ms || 0) - (r.first_seen_ms || 0)));
    tabTimeTodayMs += dur;

    const entry = todayCityMap.get(key) || {
      city,
      country,
      sessions: 0,
      visitors: new Set(),
      pageViews: 0,
      tabTimeMs: 0,
      lastSeenMs: 0
    };

    entry.sessions += 1;
    entry.visitors.add(r.visitor_hash);
    entry.pageViews += r.page_views || 0;
    entry.tabTimeMs += dur;
    entry.lastSeenMs = Math.max(entry.lastSeenMs, r.last_seen_ms || 0);
    todayCityMap.set(key, entry);
  }

  const countriesActive = [...countriesMap.values()]
    .sort((a, b) => b.sessions - a.sessions || b.lastSeenMs - a.lastSeenMs)
    .map((x) => ({ ...x, ageLabel: ageLabel(nowMs - x.lastSeenMs) }));

  const citiesActive = [...citiesMap.values()]
    .sort((a, b) => b.sessions - a.sessions || b.lastSeenMs - a.lastSeenMs)
    .map((x) => ({ ...x, ageLabel: ageLabel(nowMs - x.lastSeenMs) }));

  const citiesToday = [...todayCityMap.values()]
    .sort((a, b) => b.sessions - a.sessions || b.lastSeenMs - a.lastSeenMs)
    .map((x) => ({
      city: x.city,
      country: x.country,
      sessions: x.sessions,
      visitors: x.visitors.size,
      pageViews: x.pageViews,
      tabTimeMs: x.tabTimeMs,
      tabTimeLabel: durationLabel(x.tabTimeMs),
      lastSeenMs: x.lastSeenMs,
      lastSeenTime: timeInET(x.lastSeenMs)
    }));

  return json({
    ok: true,
    generatedAt: new Date(nowMs).toISOString(),
    timezone: ET_TIMEZONE,
    activeWindowMinutes: ACTIVE_WINDOW_MINUTES,
    countriesActive,
    citiesActive,
    citiesToday,
    totals: {
      activeSessions: activeRows.length,
      activeCountries: countriesActive.length,
      activeCities: citiesActive.length,
      visitorsToday: visitorsToday.size,
      sessionsToday: todayRows.length,
      pageViewsToday,
      tabTimeTodayMs,
      tabTimeTodayLabel: durationLabel(tabTimeTodayMs)
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/visit") {
      return handleVisit(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/visits/summary") {
      return handleSummary(env);
    }

    return env.ASSETS.fetch(request);
  }
};
