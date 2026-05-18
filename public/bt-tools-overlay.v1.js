(function () {
  "use strict";

  var FEED_PATH = "/bt-tools-feed.v1.json";
  var DEFAULT_ORIGIN = "https://www.bassthermal.com";
  var FEED_CACHE_KEY = "bt.tools.feed.v1";
  var FEED_CACHE_TS_KEY = "bt.tools.feed.v1.ts";
  var LS_TTL_MS = 6 * 60 * 60 * 1000;

  var state = {
    root: null,
    backdrop: null,
    panel: null,
    title: null,
    subtitle: null,
    body: null,
    footer: null,
    diagnosticsWrap: null,
    diagnosticsText: null,
    diagnosticsBtn: null,
    closeBtn: null,
    initialized: false,
    isOpen: false,
    memoryFeed: null,
    cacheSource: "failed",
    lastError: "",
    activeTrigger: null,
    lastDebug: false,
    lastDiagnostics: null
  };

  function detectScriptOrigin() {
    var current = document.currentScript;
    if (current && current.src) {
      try { return new URL(current.src).origin; } catch (e) {}
    }
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (src.indexOf("/bt-tools-overlay.v1.js") !== -1) {
        try { return new URL(src).origin; } catch (e) {}
      }
    }
    return DEFAULT_ORIGIN;
  }

  function getFeedOrigin() {
    var origin = detectScriptOrigin();
    if (origin === "https://www.bassthermal.com" || origin === "https://bassthermal.com") return origin;
    return DEFAULT_ORIGIN;
  }

  function getCurrentApp(options) {
    options = options || {};
    if (options.currentApp) return String(options.currentApp).trim();
    var trigger = options.triggerEl;
    if (trigger && trigger.getAttribute) {
      var trigApp = trigger.getAttribute("data-current-app");
      if (trigApp) return trigApp.trim();
    }
    if (window.BT_CURRENT_APP) return String(window.BT_CURRENT_APP).trim();
    var meta = document.querySelector('meta[name="bt-app-id"]');
    if (meta && meta.content) return meta.content.trim();
    var docApp = document.documentElement && document.documentElement.getAttribute("data-bt-current-app");
    if (docApp) return docApp.trim();
    var bodyApp = document.body && document.body.getAttribute("data-bt-current-app");
    if (bodyApp) return bodyApp.trim();
    var m = (window.location.pathname || "").match(/^\/apps\/([^\/]+)\/?$/);
    if (m && m[1]) return m[1];
    return "";
  }

  function isDebugEnabled(options) {
    options = options || {};
    if (options.debug === true) return true;
    var params = new URLSearchParams(window.location.search || "");
    if (params.get("bttoolsdebug") === "1") return true;
    var trigger = options.triggerEl;
    return !!(trigger && trigger.getAttribute && trigger.getAttribute("data-bt-tools-debug") === "1");
  }

  function escapeHtml(v) {
    return String(v == null ? "" : v).replace(/[&<>'\"]/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c];
    });
  }

  function monogram(name) {
    var clean = String(name || "Tool").trim();
    var parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) return "BT";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function loadLocalCache() {
    try {
      var raw = localStorage.getItem(FEED_CACHE_KEY);
      var ts = Number(localStorage.getItem(FEED_CACHE_TS_KEY) || "0");
      if (!raw || !ts) return null;
      if (Date.now() - ts > LS_TTL_MS) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveLocalCache(feed) {
    try {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(feed));
      localStorage.setItem(FEED_CACHE_TS_KEY, String(Date.now()));
    } catch (e) {}
  }

  async function fetchFeed(options) {
    options = options || {};
    if (!options.force && state.memoryFeed) {
      state.cacheSource = "memory";
      return state.memoryFeed;
    }
    var origin = getFeedOrigin();
    var url = origin + FEED_PATH;
    try {
      var res = await fetch(url, { credentials: "omit", cache: "default" });
      if (!res.ok) throw new Error("feed http " + res.status);
      var feed = await res.json();
      state.memoryFeed = feed;
      state.cacheSource = "network";
      state.lastError = "";
      saveLocalCache(feed);
      return feed;
    } catch (err) {
      state.lastError = String(err && err.message ? err.message : err);
      if (state.memoryFeed) {
        state.cacheSource = "memory";
        return state.memoryFeed;
      }
      var ls = loadLocalCache();
      if (ls) {
        state.memoryFeed = ls;
        state.cacheSource = "localStorage";
        return ls;
      }
      state.cacheSource = "failed";
      throw err;
    }
  }

  function ensureDom() {
    if (state.initialized) return;
    var css = document.createElement("style");
    css.textContent = "#bt-tools-overlay{position:fixed;inset:0;z-index:999999;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:none}#bt-tools-overlay[data-open='1']{display:block}.btto-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.65)}.btto-panel{position:absolute;right:12px;top:12px;bottom:12px;width:min(460px,calc(100vw - 24px));background:#101114;color:#e8e8ea;border:1px solid #343840;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.45);transform:translateX(14px);opacity:0;transition:transform .18s ease,opacity .18s ease}.btto-open .btto-panel{transform:translateX(0);opacity:1}.btto-head{padding:12px;border-bottom:1px solid #2e3238}.btto-title{font-size:14px;font-weight:700;margin:0 0 4px}.btto-sub{font-size:12px;color:#a9afb8;margin:0}.btto-close{position:absolute;right:10px;top:10px;background:#161a20;color:#d8dde5;border:1px solid #414754;padding:5px 8px;cursor:pointer}.btto-body{flex:1;overflow:auto;padding:10px}.btto-card{display:grid;grid-template-columns:42px 1fr;gap:10px;border:1px solid #313641;background:#12151a;padding:8px;margin:0 0 8px}.btto-icon{width:40px;height:40px;border:1px solid #3a404b;background:#1a1f27;display:flex;align-items:center;justify-content:center;color:#cfd5df;font-size:12px;font-weight:700}.btto-icon img{width:100%;height:100%;object-fit:cover;display:block}.btto-name{font-size:13px;font-weight:700}.btto-status{font-size:11px;color:#9ea5b1}.btto-short{font-size:12px;margin:4px 0;color:#d8dde5}.btto-reason{font-size:11px;color:#aeb5bf}.btto-links{margin-top:7px;display:flex;flex-wrap:wrap;gap:6px}.btto-link,.btto-foot-link,.btto-btn{display:inline-block;border:1px solid #424956;background:#181c23;color:#e6eaf0;padding:4px 7px;text-decoration:none;font-size:11px}.btto-foot{padding:10px;border-top:1px solid #2e3238;display:flex;justify-content:space-between;gap:8px}.btto-msg{border:1px solid #313641;background:#12151a;padding:10px;font-size:12px;color:#c8ced7}.btto-diag{margin-top:10px;border:1px solid #313641;background:#0f1217;padding:8px;font-size:11px;color:#b7bec8;white-space:pre-wrap}.btto-diag-wrap{display:none}.btto-diag-wrap[data-show='1']{display:block}@media (max-width:760px){.btto-panel{left:10px;right:10px;top:auto;bottom:10px;max-height:84vh;width:auto;transform:translateY(14px)}.btto-open .btto-panel{transform:translateY(0)}}";
    document.head.appendChild(css);

    var root = document.createElement("div");
    root.id = "bt-tools-overlay";
    root.innerHTML = '<div class="btto-backdrop"></div><section class="btto-panel" role="dialog" aria-modal="true" aria-label="More BassThermal tools"><button class="btto-close" type="button" aria-label="Close">X</button><header class="btto-head"><h2 class="btto-title">More BassThermal tools</h2><p class="btto-sub"></p></header><div class="btto-body"></div><footer class="btto-foot"><a class="btto-foot-link" href="https://www.bassthermal.com/apps/" target="_blank" rel="noopener noreferrer">View all apps</a><button class="btto-btn btto-diag-btn" type="button" style="display:none">Diagnostics</button></footer></section>';
    document.body.appendChild(root);

    var diagWrap = document.createElement("div");
    diagWrap.className = "btto-diag-wrap";
    diagWrap.innerHTML = '<div class="btto-diag"></div><button class="btto-btn" type="button">Copy diagnostics</button>';

    state.root = root;
    state.backdrop = root.querySelector(".btto-backdrop");
    state.panel = root.querySelector(".btto-panel");
    state.title = root.querySelector(".btto-title");
    state.subtitle = root.querySelector(".btto-sub");
    state.body = root.querySelector(".btto-body");
    state.footer = root.querySelector(".btto-foot");
    state.closeBtn = root.querySelector(".btto-close");
    state.diagnosticsBtn = root.querySelector(".btto-diag-btn");
    state.diagnosticsWrap = diagWrap;
    state.diagnosticsText = diagWrap.querySelector(".btto-diag");

    state.closeBtn.addEventListener("click", close);
    state.backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.isOpen) close(); });
    state.diagnosticsBtn.addEventListener("click", function () {
      var show = state.diagnosticsWrap.getAttribute("data-show") === "1";
      state.diagnosticsWrap.setAttribute("data-show", show ? "0" : "1");
    });
    diagWrap.querySelector("button").addEventListener("click", function () {
      var text = state.lastDiagnostics || "";
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(function () {});
    });

    state.initialized = true;
  }

  function renderCards(app, feed, diagnostics) {
    var recs = Array.isArray(app.recommendations) ? app.recommendations : [];
    if (!recs.length) {
      var msg = '<div class="btto-msg">No close related tool for this app.<br>Weak/random matches are hidden.</div>';
      if (app.fallback && app.fallback.message) msg += '<div class="btto-msg" style="margin-top:8px">' + escapeHtml(app.fallback.message) + "</div>";
      state.body.innerHTML = msg;
      diagnostics.recommendationCount = 0;
      diagnostics.recommendationIds = [];
      diagnostics.icons = [];
      return;
    }
    diagnostics.recommendationCount = recs.length;
    diagnostics.recommendationIds = recs.map(function (r) { return r.id; });
    diagnostics.icons = [];
    state.body.innerHTML = recs.map(function (r) {
      var iconHtml = '<div class="btto-icon" data-mono="1">' + escapeHtml(monogram(r.name)) + "</div>";
      var iconNote = "monogram";
      if (r.icon) {
        iconHtml = '<div class="btto-icon"><img src="' + escapeHtml(r.icon) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>';
        iconNote = r.icon;
      }
      diagnostics.icons.push({ id: r.id, icon: iconNote });
      var links = [];
      if (r.links && r.links.appPage) links.push('<a class="btto-link" href="' + escapeHtml(r.links.appPage) + '" target="_blank" rel="noopener noreferrer">App page</a>');
      if (r.links && r.links.web) links.push('<a class="btto-link" href="' + escapeHtml(r.links.web) + '" target="_blank" rel="noopener noreferrer">Web</a>');
      if (r.links && r.links.windows) links.push('<a class="btto-link" href="' + escapeHtml(r.links.windows) + '" target="_blank" rel="noopener noreferrer">Windows</a>');
      if (r.links && r.links.android) links.push('<a class="btto-link" href="' + escapeHtml(r.links.android) + '" target="_blank" rel="noopener noreferrer">Android</a>');
      return '<article class="btto-card"><div>' + iconHtml + '</div><div><div class="btto-name">' + escapeHtml(r.name) + '</div><div class="btto-status">related</div><div class="btto-short">' + escapeHtml(r.short || "") + '</div><div class="btto-reason">' + escapeHtml(r.reason || "") + '</div><div class="btto-links">' + links.join("") + "</div></div></article>";
    }).join("");

    var imgs = state.body.querySelectorAll("img");
    imgs.forEach(function (img) {
      img.addEventListener("error", function () {
        var parent = img.parentElement;
        if (!parent) return;
        var card = parent.closest(".btto-card");
        var nameEl = card ? card.querySelector(".btto-name") : null;
        parent.textContent = monogram(nameEl ? nameEl.textContent : "BT");
      }, { once: true });
    });
  }

  function renderDiagnostics(d) {
    state.lastDiagnostics = JSON.stringify(d, null, 2);
    state.diagnosticsText.textContent = state.lastDiagnostics;
    if (!state.body.contains(state.diagnosticsWrap)) state.body.appendChild(state.diagnosticsWrap);
    state.diagnosticsWrap.setAttribute("data-show", "0");
  }

  async function render(options) {
    options = options || {};
    ensureDom();
    var currentApp = getCurrentApp(options);
    var debug = isDebugEnabled(options);
    state.lastDebug = debug;
    state.diagnosticsBtn.style.display = debug ? "inline-block" : "none";
    state.subtitle.textContent = currentApp ? "Related tools for " + currentApp : "";

    var diagnostics = {
      currentApp: currentApp || "",
      feedOrigin: getFeedOrigin(),
      schema: "",
      generatedAt: "",
      appCount: 0,
      selectedAppName: "",
      recommendationCount: 0,
      recommendationIds: [],
      icons: [],
      cacheSource: "",
      lastError: ""
    };

    if (!currentApp) {
      state.body.innerHTML = '<div class="btto-msg">Unable to identify current app.</div>';
      if (debug) renderDiagnostics(diagnostics);
      return;
    }

    var feed;
    try {
      feed = await fetchFeed();
    } catch (e) {
      diagnostics.cacheSource = state.cacheSource;
      diagnostics.lastError = state.lastError;
      state.body.innerHTML = '<div class="btto-msg">Unable to load BassThermal tools right now.</div>';
      if (debug) renderDiagnostics(diagnostics);
      return;
    }

    diagnostics.cacheSource = state.cacheSource;
    diagnostics.lastError = state.lastError;
    diagnostics.schema = feed && feed.schema || "";
    diagnostics.generatedAt = feed && feed.generatedAt || "";
    diagnostics.appCount = feed && feed.apps ? Object.keys(feed.apps).length : 0;

    var app = feed && feed.apps && feed.apps[currentApp];
    if (!app) {
      state.body.innerHTML = '<div class="btto-msg">This app is not in the BassThermal tools feed yet.</div>';
      if (debug) renderDiagnostics(diagnostics);
      return;
    }

    diagnostics.selectedAppName = app.name || currentApp;
    state.subtitle.textContent = "Related tools for " + (app.name || currentApp);
    renderCards(app, feed, diagnostics);
    if (debug) renderDiagnostics(diagnostics);
  }

  function open(options) {
    options = options || {};
    state.activeTrigger = options.triggerEl || state.activeTrigger;
    ensureDom();
    state.root.setAttribute("data-open", "1");
    state.root.classList.add("btto-open");
    state.isOpen = true;
    render(options);
  }

  function close() {
    if (!state.initialized) return;
    state.root.setAttribute("data-open", "0");
    state.root.classList.remove("btto-open");
    state.isOpen = false;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-bt-tools-open], [data-open-bt-tools]");
    if (!btn) return;
    e.preventDefault();
    open({ triggerEl: btn });
  });

  window.BTToolsOverlay = { open: open, close: close, render: render, fetchFeed: fetchFeed, getFeedOrigin: getFeedOrigin, getCurrentApp: getCurrentApp };
})();
