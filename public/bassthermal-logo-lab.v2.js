(function () {
  "use strict";

  var VERSION = "2.0.0";
  var SETTINGS_KEY = "bt.logo.lab.settings.v2";
  var DB_NAME = "bt-logo-lab";
  var STORE_NAME = "assets";
  var SOURCE_KEY = "selected-mark";
  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ["image/png", "image/webp", "image/jpeg"];

  var DEFAULTS = Object.freeze({
    headerEnabled: true,
    backgroundEnabled: false,
    wordMode: "lower",
    markSize: 26,
    gap: 8,
    backgroundOpacity: 0.06,
    backgroundScale: 1.2,
    backgroundX: 78,
    backgroundY: 52,
    backgroundBlur: 0
  });

  var PRESETS = Object.freeze({
    "Header only": Object.assign({}, DEFAULTS),
    "Ambient right": Object.assign({}, DEFAULTS, {
      backgroundEnabled: true,
      backgroundOpacity: 0.065,
      backgroundScale: 1.32,
      backgroundX: 79,
      backgroundY: 52
    }),
    "Centered glow": Object.assign({}, DEFAULTS, {
      backgroundEnabled: true,
      backgroundOpacity: 0.09,
      backgroundScale: 1.08,
      backgroundX: 50,
      backgroundY: 52
    }),
    Minimal: Object.assign({}, DEFAULTS, {
      headerEnabled: false,
      backgroundEnabled: false,
      markSize: 22,
      gap: 6
    })
  });

  var state = {
    settings: loadSettings(),
    source: "",
    sourceMeta: null,
    panel: null,
    status: null,
    thumb: null,
    fileInput: null,
    controls: Object.create(null),
    brand: null,
    wordmark: null,
    headerImage: null,
    background: null,
    backgroundImage: null,
    open: false
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numberOrNull(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
    });
  }

  function sanitize(input) {
    input = input || {};
    return {
      headerEnabled: input.headerEnabled !== false,
      backgroundEnabled: input.backgroundEnabled === true,
      wordMode: ["lower", "upper", "hidden"].indexOf(input.wordMode) >= 0 ? input.wordMode : "lower",
      markSize: clamp(numberOrNull(input.markSize) == null ? DEFAULTS.markSize : Number(input.markSize), 16, 64),
      gap: clamp(numberOrNull(input.gap) == null ? DEFAULTS.gap : Number(input.gap), 0, 32),
      backgroundOpacity: clamp(numberOrNull(input.backgroundOpacity) == null ? DEFAULTS.backgroundOpacity : Number(input.backgroundOpacity), 0, 0.25),
      backgroundScale: clamp(numberOrNull(input.backgroundScale) == null ? DEFAULTS.backgroundScale : Number(input.backgroundScale), 0.5, 2.5),
      backgroundX: clamp(numberOrNull(input.backgroundX) == null ? DEFAULTS.backgroundX : Number(input.backgroundX), 0, 100),
      backgroundY: clamp(numberOrNull(input.backgroundY) == null ? DEFAULTS.backgroundY : Number(input.backgroundY), 0, 100),
      backgroundBlur: clamp(numberOrNull(input.backgroundBlur) == null ? DEFAULTS.backgroundBlur : Number(input.backgroundBlur), 0, 16)
    };
  }

  function loadSettings() {
    try {
      return sanitize(Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}));
    } catch (error) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (error) {}
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("Local image storage is unavailable"));
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Unable to open local image storage")); };
    });
  }

  async function databaseAction(mode, action) {
    var database = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = database.transaction(STORE_NAME, mode);
      var request = action(transaction.objectStore(STORE_NAME));
      var settled = false;
      function done(value) {
        if (settled) return;
        settled = true;
        database.close();
        resolve(value == null ? null : value);
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        database.close();
        reject(error || new Error("Local image storage failed"));
      }
      if (request) {
        request.onsuccess = function () { done(request.result); };
        request.onerror = function () { fail(request.error); };
      } else {
        transaction.oncomplete = function () { done(null); };
      }
      transaction.onerror = function () { fail(transaction.error); };
      transaction.onabort = function () { fail(transaction.error); };
    });
  }

  function readSource() {
    return databaseAction("readonly", function (store) { return store.get(SOURCE_KEY); });
  }

  function writeSource(record) {
    return databaseAction("readwrite", function (store) { store.put(record, SOURCE_KEY); return null; });
  }

  function deleteSource() {
    return databaseAction("readwrite", function (store) { store.delete(SOURCE_KEY); return null; });
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("Unable to read image")); };
      reader.readAsDataURL(file);
    });
  }

  async function sha256(file) {
    if (!window.crypto || !window.crypto.subtle) return "";
    try {
      var digest = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      return Array.prototype.map.call(new Uint8Array(digest), function (byte) {
        return byte.toString(16).padStart(2, "0");
      }).join("");
    } catch (error) {
      return "";
    }
  }

  function inspectImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var width = image.naturalWidth || 0;
        var height = image.naturalHeight || 0;
        var transparent = null;
        try {
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.min(160, width));
          canvas.height = Math.max(1, Math.min(160, height));
          var context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          transparent = false;
          for (var index = 3; index < pixels.length; index += 4) {
            if (pixels[index] < 250) { transparent = true; break; }
          }
        } catch (error) {}
        resolve({ width: width, height: height, hasTransparency: transparent });
      };
      image.onerror = function () { reject(new Error("Unreadable image")); };
      image.src = dataUrl;
    });
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function setImageSource(image, source) {
    if (source) image.setAttribute("src", source);
    else image.removeAttribute("src");
  }

  function injectStyles() {
    if (document.getElementById("btLogoLabStyles")) return;
    var style = document.createElement("style");
    style.id = "btLogoLabStyles";
    style.textContent = [
      ".bt-logo-brand{display:inline-flex;align-items:center;gap:var(--bt-logo-gap,8px);min-width:0;position:relative;z-index:2}",
      ".bt-logo-wordmark{display:inline-block;white-space:nowrap}",
      ".bt-logo-header-mark{display:none;width:var(--bt-logo-mark-size,26px);height:var(--bt-logo-mark-size,26px);max-width:none;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(121,192,255,.16))}",
      "html[data-bt-logo-source='ready'][data-bt-logo-header='on'] .bt-logo-header-mark{display:block}",
      "html[data-bt-logo-word='hidden'] .bt-logo-wordmark{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}",
      "#btLogoBackground{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;display:none}",
      "html[data-bt-logo-source='ready'][data-bt-logo-background='on'] #btLogoBackground{display:block}",
      "#btLogoBackground img{position:absolute;left:calc(var(--bt-logo-bg-x,78) * 1%);top:calc(var(--bt-logo-bg-y,52) * 1%);display:block;width:min(74vw,1080px);height:auto;max-height:92vh;object-fit:contain;opacity:var(--bt-logo-bg-opacity,.06);filter:blur(var(--bt-logo-bg-blur,0px));transform:translate(-50%,-50%) scale(var(--bt-logo-bg-scale,1.2));transform-origin:center;user-select:none}",
      ".site-shell{position:relative;z-index:1}",
      "#btLogoLab{position:fixed;right:16px;top:16px;z-index:1000000;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:none;grid-template-rows:auto minmax(0,1fr) auto;background:rgba(5,6,8,.96);color:#c9d1d9;border:1px solid rgba(139,148,158,.45);box-shadow:0 18px 55px rgba(0,0,0,.7);backdrop-filter:blur(12px);font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      "#btLogoLab[data-open='1']{display:grid}",
      ".btll-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;padding:10px 11px;border-bottom:1px solid rgba(48,54,61,.8)}",
      ".btll-title{font-weight:700;color:#f0f6fc;font-size:13px}",
      ".btll-sub{color:#8b949e;margin-top:2px}",
      ".btll-close,.btll-btn,.btll-segment button{font:inherit;color:inherit;background:#0d1117;border:1px solid #30363d;padding:5px 8px;cursor:pointer}",
      ".btll-close:hover,.btll-btn:hover,.btll-segment button:hover,.btll-close:focus-visible,.btll-btn:focus-visible,.btll-segment button:focus-visible{border-color:#8b949e;color:#f0f6fc;outline:0}",
      ".btll-body{overflow:auto;padding:10px 11px;scrollbar-width:thin}",
      ".btll-source{display:grid;grid-template-columns:54px minmax(0,1fr);gap:9px;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(48,54,61,.62)}",
      ".btll-thumb{width:54px;height:54px;display:grid;place-items:center;border:1px solid #30363d;background:#000;overflow:hidden;color:#484f58}",
      ".btll-thumb img{display:none;width:100%;height:100%;object-fit:contain}",
      "html[data-bt-logo-source='ready'] .btll-thumb img{display:block}",
      "html[data-bt-logo-source='ready'] .btll-thumb span{display:none}",
      ".btll-source-name{color:#f0f6fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".btll-source-meta{color:#8b949e;margin-top:2px}",
      ".btll-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}",
      ".btll-section{padding:10px 0;border-bottom:1px solid rgba(48,54,61,.62)}",
      ".btll-section:last-child{border-bottom:0;padding-bottom:0}",
      ".btll-section-title{color:#f0f6fc;font-weight:700;margin-bottom:7px}",
      ".btll-toggle-row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:8px}",
      ".btll-check{display:inline-flex;align-items:center;gap:6px;color:#c9d1d9;cursor:pointer}",
      ".btll-check input{accent-color:#7ee787}",
      ".btll-control{display:grid;grid-template-columns:92px minmax(0,1fr) 44px;gap:8px;align-items:center;margin:7px 0}",
      ".btll-control label{color:#8b949e}",
      ".btll-control output{text-align:right;color:#f0f6fc;font-variant-numeric:tabular-nums}",
      ".btll-control input[type='range']{width:100%;accent-color:#79c0ff}",
      ".btll-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}",
      ".btll-segment button[aria-pressed='true']{border-color:#79c0ff;color:#f0f6fc;background:#111820}",
      ".btll-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
      ".btll-foot{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;align-items:center;padding:9px 11px;border-top:1px solid rgba(48,54,61,.8)}",
      ".btll-status{color:#8b949e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".btll-status[data-tone='ok']{color:#7ee787}",
      ".btll-status[data-tone='warn']{color:#d29922}",
      "@media(max-width:600px){#btLogoLab{left:10px;right:10px;top:10px;width:auto;max-height:calc(100vh - 20px)}.btll-control{grid-template-columns:82px minmax(0,1fr) 40px}}",
      "@media(prefers-reduced-motion:reduce){.bt-logo-header-mark,#btLogoBackground img{transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function createPanel() {
    var panel = document.createElement("section");
    panel.id = "btLogoLab";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "BassThermal Logo Lab");
    panel.setAttribute("data-open", "0");
    panel.innerHTML = [
      '<header class="btll-head"><div><div class="btll-title">Logo Lab</div><div class="btll-sub">Live browser-local preview</div></div><button class="btll-close" type="button" data-action="close">close</button></header>',
      '<div class="btll-body">',
        '<section class="btll-source">',
          '<div class="btll-thumb"><span>mark</span><img alt=""></div>',
          '<div><div class="btll-source-name">No image selected</div><div class="btll-source-meta">PNG, WebP or JPEG · max 5 MB</div><div class="btll-actions"><button class="btll-btn" type="button" data-action="choose">Choose image</button><button class="btll-btn" type="button" data-action="clear">Clear image</button></div></div>',
        '</section>',
        '<section class="btll-section">',
          '<div class="btll-section-title">Visible parts</div>',
          '<div class="btll-toggle-row"><label class="btll-check"><input type="checkbox" data-setting="headerEnabled"> Header mark</label><label class="btll-check"><input type="checkbox" data-setting="backgroundEnabled"> Background mark</label></div>',
          '<div class="btll-segment" data-segment="wordMode"><button type="button" data-value="lower">lowercase</button><button type="button" data-value="upper">UPPERCASE</button><button type="button" data-value="hidden">hide word</button></div>',
        '</section>',
        '<section class="btll-section">',
          '<div class="btll-section-title">Header</div>',
          controlHtml("Header size", "markSize", 16, 64, 1, "px"),
          controlHtml("Mark gap", "gap", 0, 32, 1, "px"),
        '</section>',
        '<section class="btll-section">',
          '<div class="btll-section-title">Background</div>',
          controlHtml("Opacity", "backgroundOpacity", 0, 0.25, 0.005, ""),
          controlHtml("Size", "backgroundScale", 0.5, 2.5, 0.01, "×"),
          controlHtml("Horizontal", "backgroundX", 0, 100, 1, "%"),
          controlHtml("Vertical", "backgroundY", 0, 100, 1, "%"),
          controlHtml("Blur", "backgroundBlur", 0, 16, 1, "px"),
        '</section>',
        '<section class="btll-section"><div class="btll-section-title">Presets</div><div class="btll-presets">',
          Object.keys(PRESETS).map(function (name) { return '<button class="btll-btn" type="button" data-preset="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>'; }).join(""),
        '</div></section>',
      '</div>',
      '<footer class="btll-foot"><div class="btll-status">Autosaved locally</div><button class="btll-btn" type="button" data-action="reset">Reset</button><button class="btll-btn" type="button" data-action="export">Export recipe</button></footer>'
    ].join("");
    document.body.appendChild(panel);
    return panel;
  }

  function controlHtml(label, key, min, max, step, suffix) {
    return '<div class="btll-control"><label for="btll-' + key + '">' + escapeHtml(label) + '</label><input id="btll-' + key + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-setting="' + key + '"><output data-output="' + key + '" data-suffix="' + escapeHtml(suffix) + '"></output></div>';
  }

  function ensureDom() {
    var brand = document.querySelector(".topline .brand") || document.querySelector(".brand");
    var wordmark = brand && brand.querySelector("strong");
    if (!brand || !wordmark) return false;

    injectStyles();
    brand.classList.add("bt-logo-brand");
    wordmark.classList.add("bt-logo-wordmark");

    var headerImage = document.createElement("img");
    headerImage.className = "bt-logo-header-mark";
    headerImage.alt = "";
    headerImage.setAttribute("aria-hidden", "true");
    headerImage.decoding = "async";
    brand.insertBefore(headerImage, wordmark);

    var background = document.createElement("div");
    background.id = "btLogoBackground";
    background.setAttribute("aria-hidden", "true");
    var backgroundImage = document.createElement("img");
    backgroundImage.alt = "";
    backgroundImage.decoding = "async";
    background.appendChild(backgroundImage);
    document.body.insertBefore(background, document.body.firstChild);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/webp,image/jpeg";
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    var panel = createPanel();
    Object.assign(state, {
      brand: brand,
      wordmark: wordmark,
      headerImage: headerImage,
      background: background,
      backgroundImage: backgroundImage,
      fileInput: fileInput,
      panel: panel,
      status: panel.querySelector(".btll-status"),
      thumb: panel.querySelector(".btll-thumb img")
    });

    Array.prototype.forEach.call(panel.querySelectorAll("[data-setting]"), function (control) {
      state.controls[control.getAttribute("data-setting")] = control;
    });
    fileInput.addEventListener("change", handleFileSelection);
    panel.addEventListener("click", handlePanelClick);
    panel.addEventListener("input", handlePanelInput);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.open) closePanel();
    });
    return true;
  }

  function formatValue(key, value, suffix) {
    if (key === "backgroundOpacity") return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (key === "backgroundScale") return Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + suffix;
    return String(Math.round(Number(value))) + suffix;
  }

  function syncPanel() {
    if (!state.panel) return;
    Object.keys(state.controls).forEach(function (key) {
      var control = state.controls[key];
      var value = state.settings[key];
      if (control.type === "checkbox") control.checked = !!value;
      else control.value = value;
      var output = state.panel.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = formatValue(key, value, output.getAttribute("data-suffix") || "");
    });
    Array.prototype.forEach.call(state.panel.querySelectorAll('[data-segment="wordMode"] button'), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-value") === state.settings.wordMode ? "true" : "false");
    });
    var name = state.panel.querySelector(".btll-source-name");
    var meta = state.panel.querySelector(".btll-source-meta");
    if (state.sourceMeta) {
      name.textContent = state.sourceMeta.name || "Selected image";
      meta.textContent = [state.sourceMeta.width + "×" + state.sourceMeta.height, state.sourceMeta.hasTransparency === false ? "opaque" : "transparency detected"].join(" · ");
    } else {
      name.textContent = "No image selected";
      meta.textContent = "PNG, WebP or JPEG · max 5 MB";
    }
    setImageSource(state.thumb, state.source);
  }

  function setStatus(text, tone) {
    if (!state.status) return;
    state.status.textContent = text;
    state.status.setAttribute("data-tone", tone || "");
  }

  function apply() {
    state.settings = sanitize(state.settings);
    var settings = state.settings;
    var root = document.documentElement;
    root.style.setProperty("--bt-logo-mark-size", settings.markSize + "px");
    root.style.setProperty("--bt-logo-gap", settings.gap + "px");
    root.style.setProperty("--bt-logo-bg-opacity", String(settings.backgroundOpacity));
    root.style.setProperty("--bt-logo-bg-scale", String(settings.backgroundScale));
    root.style.setProperty("--bt-logo-bg-x", String(settings.backgroundX));
    root.style.setProperty("--bt-logo-bg-y", String(settings.backgroundY));
    root.style.setProperty("--bt-logo-bg-blur", settings.backgroundBlur + "px");
    root.setAttribute("data-bt-logo-source", state.source ? "ready" : "missing");
    root.setAttribute("data-bt-logo-header", settings.headerEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-background", settings.backgroundEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-word", settings.wordMode);
    state.wordmark.textContent = settings.wordMode === "upper" ? "BASSTHERMAL" : "bassthermal";
    setImageSource(state.headerImage, state.source);
    setImageSource(state.backgroundImage, state.source);
    saveSettings();
    syncPanel();
  }

  function updateSettings(partial, statusText) {
    state.settings = sanitize(Object.assign({}, state.settings, partial || {}));
    apply();
    setStatus(statusText || "Autosaved locally", "ok");
  }

  function handlePanelInput(event) {
    var control = event.target.closest("[data-setting]");
    if (!control || !state.panel.contains(control)) return;
    var key = control.getAttribute("data-setting");
    var value = control.type === "checkbox" ? control.checked : Number(control.value);
    var partial = {};
    partial[key] = value;
    updateSettings(partial, "Preview updated");
  }

  function handlePanelClick(event) {
    var actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      var action = actionButton.getAttribute("data-action");
      if (action === "close") closePanel();
      else if (action === "choose") state.fileInput.click();
      else if (action === "clear") clearImage();
      else if (action === "reset") resetSettings();
      else if (action === "export") exportRecipe();
      return;
    }

    var segmentButton = event.target.closest('[data-segment="wordMode"] button');
    if (segmentButton) {
      updateSettings({ wordMode: segmentButton.getAttribute("data-value") }, "Wordmark updated");
      return;
    }

    var presetButton = event.target.closest("[data-preset]");
    if (presetButton) {
      var name = presetButton.getAttribute("data-preset");
      if (PRESETS[name]) {
        state.settings = sanitize(Object.assign({}, PRESETS[name]));
        apply();
        setStatus(name + " preset applied", "ok");
      }
    }
  }

  async function handleFileSelection() {
    var file = state.fileInput.files && state.fileInput.files[0];
    state.fileInput.value = "";
    if (!file) return;
    if (ALLOWED_TYPES.indexOf(file.type) < 0) return setStatus("Use PNG, WebP or JPEG", "warn");
    if (file.size > MAX_BYTES) return setStatus("Image exceeds 5 MB", "warn");

    setStatus("Reading image…", "");
    try {
      var dataUrl = await fileToDataUrl(file);
      var inspection = await inspectImage(dataUrl);
      var hash = await sha256(file);
      var meta = {
        name: file.name || "selected image",
        type: file.type,
        size: file.size,
        width: inspection.width,
        height: inspection.height,
        hasTransparency: inspection.hasTransparency,
        sha256: hash,
        savedAt: new Date().toISOString()
      };
      await writeSource({ dataUrl: dataUrl, meta: meta });
      state.source = dataUrl;
      state.sourceMeta = meta;
      apply();
      setStatus(inspection.hasTransparency === false ? "Loaded — opaque background detected" : "Image loaded locally", inspection.hasTransparency === false ? "warn" : "ok");
    } catch (error) {
      setStatus(error && error.message ? error.message : "Unable to load image", "warn");
    }
  }

  async function clearImage() {
    try { await deleteSource(); } catch (error) {}
    state.source = "";
    state.sourceMeta = null;
    apply();
    setStatus("Local image cleared", "ok");
  }

  function resetSettings() {
    state.settings = Object.assign({}, DEFAULTS);
    apply();
    setStatus("Controls reset; image kept", "ok");
  }

  function recipe() {
    return {
      schema: "bassthermal.logo-lab.recipe.v1",
      generatedAt: new Date().toISOString(),
      source: state.sourceMeta ? {
        name: state.sourceMeta.name,
        type: state.sourceMeta.type,
        size: state.sourceMeta.size,
        width: state.sourceMeta.width,
        height: state.sourceMeta.height,
        hasTransparency: state.sourceMeta.hasTransparency,
        sha256: state.sourceMeta.sha256 || ""
      } : null,
      settings: Object.assign({}, state.settings)
    };
  }

  function exportRecipe() {
    var stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText("bassthermal-logo-recipe-" + stamp + ".json", JSON.stringify(recipe(), null, 2) + "\n");
    setStatus("Recipe exported", "ok");
  }

  function closeTerminalOverlay() {
    var close = document.getElementById("terminalClose");
    if (close) {
      close.click();
      return;
    }
    var overlay = document.getElementById("terminalOverlay");
    if (overlay) overlay.classList.remove("open");
  }

  function openPanel() {
    state.open = true;
    state.panel.setAttribute("data-open", "1");
    syncPanel();
    setStatus(state.source ? "Drag controls — changes are live" : "Choose an image to begin", state.source ? "ok" : "");
    setTimeout(closeTerminalOverlay, 0);
    setTimeout(function () {
      var first = state.panel.querySelector('[data-action="choose"]');
      if (first) first.focus();
    }, 20);
  }

  function closePanel() {
    state.open = false;
    state.panel.setAttribute("data-open", "0");
  }

  function parseCommand(raw) {
    var normalized = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized) return null;
    var parts = normalized.split(" ");
    return parts[0] === "/logo" || parts[0] === "logo" ? parts : null;
  }

  function appendTerminalLine(command, text, className) {
    var log = document.getElementById("log");
    if (!log) return;
    Array.prototype.forEach.call(log.querySelectorAll(".cmd-block"), function (block) { block.classList.add("past"); });
    var block = document.createElement("div");
    block.className = "cmd-block";
    block.innerHTML = '<div class="line"><span class="prompt">bt:~$</span> ' + escapeHtml(command) + '</div><div class="line ' + escapeHtml(className || "") + '">' + escapeHtml(text) + "</div>";
    log.appendChild(block);
  }

  function executeCommand(raw) {
    var parts = parseCommand(raw);
    if (!parts) return false;
    var action = parts[1] || "open";
    if (action === "close") {
      closePanel();
      appendTerminalLine(raw, "Logo Lab closed", "dim");
    } else if (action === "reset") {
      resetSettings();
      openPanel();
    } else if (action === "export") {
      exportRecipe();
      openPanel();
    } else if (action === "source" || action === "image") {
      openPanel();
      state.fileInput.click();
    } else {
      openPanel();
    }
    return true;
  }

  function attachCommandInterceptor() {
    var form = document.getElementById("form");
    var input = document.getElementById("cmd");
    if (!form || !input) return;
    form.addEventListener("submit", function (event) {
      var raw = String(input.value || "").trim();
      if (!parseCommand(raw)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      executeCommand(raw);
    }, true);
  }

  async function restoreSource() {
    try {
      var record = await readSource();
      if (!record || !record.dataUrl) return;
      state.source = String(record.dataUrl);
      state.sourceMeta = record.meta || null;
      apply();
    } catch (error) {}
  }

  function init() {
    if (!ensureDom()) return;
    apply();
    attachCommandInterceptor();
    restoreSource();
    window.BT_LOGO_LAB = Object.freeze({
      version: VERSION,
      open: openPanel,
      close: closePanel,
      reset: resetSettings,
      exportRecipe: exportRecipe,
      getRecipe: recipe
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
