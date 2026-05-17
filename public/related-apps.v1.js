(function () {
  'use strict';

  var CATALOG_KEY = 'bt.catalog-lite.v1';
  var CATALOG_TS_KEY = 'bt.catalog-lite.v1.ts';
  var CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
  var MAX_LIMIT = 6;
  var DEFAULT_LIMIT = 3;
  var STYLE_ID = 'bt-related-style-v1';
  var MIN_RELATIONSHIP_SCORE = 30;
  var FALLBACK_ORIGIN = 'https://bassthermal.com';

  var SCRIPT_ORIGIN = resolveScriptOrigin();

  var EMERGENCY_SNAPSHOT = {
    apps: [
      { id: 'retrofy', slug: 'retrofy', name: 'RetroFy', status: 'live', visibility: { showInAppOverlay: true }, primaryFamily: 'ASSET_TRANSFORM', secondaryFamilies: ['WEB_DEV'], discipline: 'CREATIVE_DEV', modes: ['CREATE'], audiences: ['creator'], workflowStages: ['transform'], outputs: ['image_asset'], tags: ['icons'], line: 'Retro icon tool', short: 'Retro icon conversion utility.', links: { website: '/apps/retrofy/' }, relatedTools: [{ id: 'icon-pack-builder', reason: 'Package generated artwork into install-ready icon packs.' }] },
      { id: 'icon-pack-builder', slug: 'icon-pack-builder', name: 'Icon Pack Builder', status: 'live', visibility: { showInAppOverlay: true }, primaryFamily: 'ASSET_PACKAGING', secondaryFamilies: ['ASSET_TRANSFORM'], discipline: 'CREATIVE_DEV', modes: ['CREATE'], audiences: ['creator'], workflowStages: ['package'], outputs: ['icon_pack'], tags: ['icons'], line: 'Build icon packs', short: 'Generate icon sizes and packaging assets.', links: { website: '/apps/icon-pack-builder/' }, relatedTools: [{ id: 'favicon-harvester', reason: 'Collect site favicon sources before packaging icon sets.' }] },
      { id: 'favicon-harvester', slug: 'favicon-harvester', name: 'Favicon Harvester', status: 'shipping', visibility: { showInAppOverlay: true }, primaryFamily: 'WEB_DEV', secondaryFamilies: ['ASSET_PACKAGING'], discipline: 'WEB_DEV', modes: ['COLLECT'], audiences: ['developer'], workflowStages: ['collect'], outputs: ['image_asset'], tags: ['favicon'], line: 'Extract site icons', short: 'Find and download website icons.', links: { website: '/apps/favicon-harvester/' }, relatedTools: [] }
    ]
  };

  function asArray(value) { return Array.isArray(value) ? value : []; }
  function sharedCount(a, b) {
    if (!a.length || !b.length) return 0;
    var set = new Set(a);
    var n = 0;
    for (var i = 0; i < b.length; i += 1) if (set.has(b[i])) n += 1;
    return n;
  }
  function statusRank(status) { return status === 'live' ? 0 : (status === 'shipping' ? 1 : 2); }
  function normalizeLimit(input) {
    var parsed = parseInt(input, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, parsed);
  }

  function resolveScriptOrigin() {
    var script = document.currentScript;
    if (script && script.src && script.src.indexOf('related-apps.v1.js') >= 0) {
      try { return new URL(script.src, window.location.href).origin; } catch (_e) {}
    }

    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var src = scripts[i] && scripts[i].src;
      if (!src || src.indexOf('related-apps.v1.js') < 0) continue;
      try { return new URL(src, window.location.href).origin; } catch (_e2) {}
    }

    return FALLBACK_ORIGIN;
  }

  function getOrigin() {
    return SCRIPT_ORIGIN;
  }

  function inferCurrentAppFromPath() {
    var m = window.location.pathname.match(/^\/apps\/([^/]+)\/?/);
    return m ? m[1] : '';
  }

  function getCurrentAppId(container, options) {
    if (options && options.currentApp) return String(options.currentApp);
    var dataCurrent = container && container.getAttribute('data-current-app');
    if (dataCurrent) return dataCurrent;
    if (window.BT_CURRENT_APP) return String(window.BT_CURRENT_APP);
    var meta = document.querySelector('meta[name="bt-app-id"]');
    if (meta && meta.content) return meta.content;
    return inferCurrentAppFromPath();
  }

  function getCachedCatalog() {
    try {
      var raw = localStorage.getItem(CATALOG_KEY);
      var ts = parseInt(localStorage.getItem(CATALOG_TS_KEY) || '0', 10);
      if (!raw || !ts) return null;
      return { data: JSON.parse(raw), ts: ts };
    } catch (_e) { return null; }
  }

  function setCachedCatalog(catalog) {
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
      localStorage.setItem(CATALOG_TS_KEY, String(Date.now()));
    } catch (_e) {}
  }

  async function fetchCatalog() {
    var now = Date.now();
    var cached = getCachedCatalog();
    if (cached && now - cached.ts < CATALOG_TTL_MS) return cached.data;

    var url = SCRIPT_ORIGIN.replace(/\/$/, '') + '/catalog-lite.json';
    try {
      var res = await fetch(url, { method: 'GET', credentials: 'omit' });
      if (!res.ok) throw new Error('catalog fetch failed');
      var catalog = await res.json();
      if (catalog && asArray(catalog.apps).length) {
        setCachedCatalog(catalog);
        return catalog;
      }
    } catch (_err) {}

    if (cached && cached.data) return cached.data;
    return EMERGENCY_SNAPSHOT;
  }

  function pickReason(current, candidate, qualification, metrics) {
    var rel = asArray(current.relatedTools).find(function (r) { return r.id === candidate.id && r.reason; });
    if (rel) return rel.reason;
    var reverse = asArray(candidate.relatedTools).find(function (r) { return r.id === current.id && r.reason; });
    if (reverse) return reverse.reason;
    if (qualification !== 'threshold') return '';
    if (candidate.primaryFamily && candidate.primaryFamily === current.primaryFamily) return 'Same tool family.';
    if (metrics.sharedWorkflow > 0) return 'Shared workflow.';
    if (metrics.sharedOutputs > 0) return 'Related output.';
    if (metrics.sharedTags > 0) return 'Related utility.';
    return 'Related BassThermal tool.';
  }

  function evaluateCandidate(current, candidate) {
    var inRel = asArray(current.relatedTools).find(function (r) { return r.id === candidate.id; });
    var revRel = asArray(candidate.relatedTools).find(function (r) { return r.id === current.id; });
    var metrics = {
      sharedModes: sharedCount(asArray(current.modes), asArray(candidate.modes)),
      sharedAudiences: sharedCount(asArray(current.audiences), asArray(candidate.audiences)),
      sharedWorkflow: sharedCount(asArray(current.workflowStages), asArray(candidate.workflowStages)),
      sharedOutputs: sharedCount(asArray(current.outputs), asArray(candidate.outputs)),
      sharedTags: sharedCount(asArray(current.tags), asArray(candidate.tags))
    };

    var relationshipScore = 0;
    if (inRel) relationshipScore += 100;
    if (revRel) relationshipScore += 100;
    if (candidate.primaryFamily === current.primaryFamily) relationshipScore += 45;
    if (asArray(current.secondaryFamilies).indexOf(candidate.primaryFamily) >= 0) relationshipScore += 25;
    if (asArray(candidate.secondaryFamilies).indexOf(current.primaryFamily) >= 0) relationshipScore += 25;
    if (current.discipline && candidate.discipline === current.discipline && candidate.discipline !== 'NONE') relationshipScore += 22;
    relationshipScore += Math.min(36, metrics.sharedModes * 12);
    relationshipScore += Math.min(24, metrics.sharedAudiences * 8);
    relationshipScore += Math.min(32, metrics.sharedWorkflow * 8);
    relationshipScore += Math.min(30, metrics.sharedOutputs * 10);
    relationshipScore += Math.min(32, metrics.sharedTags * 4);

    var statusBoost = 0;
    if (candidate.status === 'live') statusBoost += 8;
    if (candidate.status === 'shipping') statusBoost += 4;

    var qualifiedByRelated = !!(inRel || revRel);
    var qualifiedByThreshold = relationshipScore >= MIN_RELATIONSHIP_SCORE;
    var qualified = qualifiedByRelated || qualifiedByThreshold;
    var qualification = qualifiedByRelated ? 'relatedTools' : (qualifiedByThreshold ? 'threshold' : '');

    return {
      app: candidate,
      score: relationshipScore + statusBoost,
      relationshipScore: relationshipScore,
      statusBoost: statusBoost,
      reason: qualified ? pickReason(current, candidate, qualification, metrics) : '',
      qualification: qualification,
      qualified: qualified,
      rejectedReason: qualified ? '' : 'below-threshold',
      debug: { current: current.id }
    };
  }

  function buildRanking(currentAppId, catalog) {
    var apps = asArray(catalog && catalog.apps);
    var current = apps.find(function (a) { return a.id === currentAppId || a.slug === currentAppId; });
    if (!current) return { current: null, recommendations: [], rejected: [] };

    var evaluated = apps
      .filter(function (candidate) {
        if (!candidate || !candidate.id) return false;
        if (candidate.id === current.id) return false;
        if ((candidate.visibility || {}).showInAppOverlay !== true) return false;
        if (candidate.status === 'hidden') return false;
        return true;
      })
      .map(function (candidate) { return evaluateCandidate(current, candidate); });

    var ranked = evaluated
      .filter(function (entry) { return entry.qualified; })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        var sr = statusRank(a.app.status) - statusRank(b.app.status);
        if (sr !== 0) return sr;
        return String(a.app.name || '').localeCompare(String(b.app.name || ''));
      });

    var rejected = evaluated.filter(function (entry) { return !entry.qualified; });
    return { current: current, recommendations: ranked, rejected: rejected };
  }

  function rank(currentAppId, catalog, options) {
    var detail = buildRanking(currentAppId, catalog);
    return detail.recommendations.slice(0, normalizeLimit(options && options.limit));
  }

  function explain(currentAppId, catalog, options) {
    var detail = buildRanking(currentAppId, catalog);
    return {
      current: detail.current,
      recommendations: detail.recommendations.slice(0, normalizeLimit(options && options.limit)),
      rejected: detail.rejected
    };
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '.bt-related{background:#101215;border:1px solid #2a2f35;padding:10px;color:#d9dde2;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace}.bt-related-head{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#96a2ad;margin-bottom:8px}.bt-related-list{display:grid;gap:8px}.bt-related-item{border:1px solid #252a30;background:#0b0d10;padding:8px}.bt-related-name{display:inline-block;color:#d8f3ff;text-decoration:none;font-weight:600;margin-bottom:3px}.bt-related-name:hover{text-decoration:underline}.bt-related-line{color:#b1bac4;margin-bottom:4px}.bt-related-reason,.bt-related-debug{color:#8a949e;font-size:11px;margin-bottom:4px}.bt-related-actions{display:flex;flex-wrap:wrap;gap:8px}.bt-related-actions a{color:#9fd7ff;text-decoration:none;border:1px solid #2d3945;padding:2px 6px}.bt-related-actions a:hover{background:#1c2631}.bt-related-fallback{color:#9fd7ff;text-decoration:none;border:1px solid #2d3945;padding:4px 8px;display:inline-block}';
    document.head.appendChild(style);
  }

  function cleanLink(href, origin) {
    if (!href) return '';
    if (/^https?:\/\//.test(href)) return href;
    if (href.charAt(0) === '/') return origin.replace(/\/$/, '') + href;
    return '';
  }

  function render(container, options) {
    if (!container) return;
    var opts = options || {};
    var limit = normalizeLimit(container.getAttribute('data-limit') || opts.limit);
    var debug = container.getAttribute('data-debug') === '1' || opts.debug === true;
    var title = container.getAttribute('data-title') || 'More BassThermal tools';
    ensureStyle();

    fetchCatalog().then(function (catalog) {
      var currentAppId = getCurrentAppId(container, opts);
      var ranked = rank(currentAppId, catalog, { limit: limit });
      var origin = SCRIPT_ORIGIN;

      if (!ranked.length) {
        container.innerHTML = '<section class="bt-related"><div class="bt-related-head">' + title + '</div><a class="bt-related-fallback" href="' + cleanLink('/apps/', origin) + '">View all apps</a></section>';
        return;
      }

      var html = '<section class="bt-related"><div class="bt-related-head">' + title + '</div><div class="bt-related-list">';
      ranked.forEach(function (entry) {
        var app = entry.app;
        var appPage = cleanLink((app.links || {}).website, origin);
        var web = cleanLink((app.links || {}).web, origin);
        var windows = cleanLink((app.links || {}).windows, origin);
        var android = cleanLink((app.links || {}).android, origin);
        html += '<article class="bt-related-item">';
        html += '<a class="bt-related-name" href="' + appPage + '">' + app.name + '</a>';
        html += '<div class="bt-related-line">' + (app.short || app.line || '') + '</div>';
        if (entry.reason) html += '<div class="bt-related-reason">' + entry.reason + '</div>';
        if (debug) html += '<div class="bt-related-debug">score: ' + entry.score + ' · relationship: ' + entry.relationshipScore + ' · status: ' + (app.status || '') + (entry.qualification ? ' · qualified: ' + entry.qualification : '') + ' · origin: ' + SCRIPT_ORIGIN + '</div>';
        html += '<div class="bt-related-actions">';
        if (appPage) html += '<a href="' + appPage + '">App page</a>';
        if (web) html += '<a href="' + web + '">Web</a>';
        if (windows) html += '<a href="' + windows + '">Windows</a>';
        if (android) html += '<a href="' + android + '">Android</a>';
        html += '</div></article>';
      });
      html += '</div></section>';
      container.innerHTML = html;
    }).catch(function () { /* silent */ });
  }

  function renderAll() {
    var nodes = document.querySelectorAll('[data-bt-related]');
    for (var i = 0; i < nodes.length; i += 1) render(nodes[i]);
  }

  window.BTRelated = { renderAll: renderAll, render: render, fetchCatalog: fetchCatalog, rank: rank, explain: explain, getOrigin: getOrigin };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
