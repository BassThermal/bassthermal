(function () {
  "use strict";

  var SETTINGS_KEY = "bt.logo.lab.settings.v1";
  var DB_NAME = "bt-logo-lab";
  var DB_VERSION = 1;
  var STORE_NAME = "assets";
  var SOURCE_KEY = "selected-mark";
  var MAX_SOURCE_BYTES = 5 * 1024 * 1024;

  var DEFAULTS = Object.freeze({
    headerEnabled: true,
    backgroundEnabled: false,
    wordCase: "lower",
    wordVisible: true,
    markSize: 26,
    gap: 8,
    backgroundOpacity: 0.06,
    backgroundScale: 1.25,
    backgroundPosition: "right",
    backgroundBlur: 0
  });

  var PRESETS = Object.freeze({
    clean: {
      headerEnabled: true,
      backgroundEnabled: false,
      wordCase: "lower",
      wordVisible: true,
      markSize: 26,
      gap: 8,
      backgroundOpacity: 0.06,
      backgroundScale: 1.25,
      backgroundPosition: "right",
      backgroundBlur: 0
    },
    ambient: {
      headerEnabled: true,
      backgroundEnabled: true,
      wordCase: "lower",
      wordVisible: true,
      markSize: 27,
      gap: 9,
      backgroundOpacity: 0.065,
      backgroundScale: 1.35,
      backgroundPosition: "right",
      backgroundBlur: 0
    },
    bold: {
      headerEnabled: true,
      backgroundEnabled: true,
      wordCase: "lower",
      wordVisible: true,
      markSize: 32,
      gap: 10,
      backgroundOpacity: 0.12,
      backgroundScale: 1.05,
      backgroundPosition: "center",
      backgroundBlur: 0
    },
    minimal: {
      headerEnabled: false,
      backgroundEnabled: false,
      wordCase: "lower",
      wordVisible: true,
      markSize: 24,
      gap: 7,
      backgroundOpacity: 0.05,
      backgroundScale: 1.2,
      backgroundPosition: "right",
      backgroundBlur: 0
    }
  });

  var state = {
    settings: loadSettings(),
    source: "",
    sourceMeta: null,
    brand: null,
    wordmark: null,
    headerImage: null,
    background: null,
    backgroundImage: null,
    fileInput: null,
    initialized: false
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function finiteNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  function loadSettings() {
    try {
      var parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return Object.assign({}, DEFAULTS);
      return sanitizeSettings(Object.assign({}, DEFAULTS, parsed));
    } catch (error) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function sanitizeSettings(settings) {
    return {
      headerEnabled: settings.headerEnabled !== false,
      backgroundEnabled: settings.backgroundEnabled === true,
      wordCase: settings.wordCase === "upper" ? "upper" : "lower",
      wordVisible: settings.wordVisible !== false,
      markSize: clamp(finiteNumber(settings.markSize) == null ? DEFAULTS.markSize : Number(settings.markSize), 16, 64),
      gap: clamp(finiteNumber(settings.gap) == null ? DEFAULTS.gap : Number(settings.gap), 0, 32),
      backgroundOpacity: clamp(finiteNumber(settings.backgroundOpacity) == null ? DEFAULTS.backgroundOpacity : Number(settings.backgroundOpacity), 0, 0.25),
      backgroundScale: clamp(finiteNumber(settings.backgroundScale) == null ? DEFAULTS.backgroundScale : Number(settings.backgroundScale), 0.5, 2.5),
      backgroundPosition: ["left", "center", "right"].indexOf(settings.backgroundPosition) >= 0 ? settings.backgroundPosition : "right",
      backgroundBlur: clamp(finiteNumber(settings.backgroundBlur) == null ? DEFAULTS.backgroundBlur : Number(settings.backgroundBlur), 0, 16)
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {}
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Unable to open logo storage")); };
    });
  }

  async function readStoredSource() {
    var db = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(STORE_NAME, "readonly");
      var request = transaction.objectStore(STORE_NAME).get(SOURCE_KEY);
      request.onsuccess = function () { resolve(request.result || null); };
      request.onerror = function () { reject(request.error || new Error("Unable to read logo source")); };
      transaction.oncomplete = function () { db.close(); };
    });
  }

  async function writeStoredSource(record) {
    var db = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record, SOURCE_KEY);
      transaction.oncomplete = function () { db.close(); resolve(); };
      transaction.onerror = function () { db.close(); reject(transaction.error || new Error("Unable to store logo source")); };
    });
  }

  async function clearStoredSource() {
    var db = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(SOURCE_KEY);
      transaction.oncomplete = function () { db.close(); resolve(); };
      transaction.onerror = function () { db.close(); reject(transaction.error || new Error("Unable to clear logo source")); };
    });
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("Unable to read image")); };
      reader.readAsDataURL(file);
    });
  }

  function inspectImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var width = image.naturalWidth || image.width || 0;
        var height = image.naturalHeight || image.height || 0;
        var hasTransparency = null;
        try {
          var sampleWidth = Math.max(1, Math.min(160, width));
          var sampleHeight = Math.max(1, Math.min(160, height));
          var canvas = document.createElement("canvas");
          canvas.width = sampleWidth;
          canvas.height = sampleHeight;
          var context = canvas.getContext("2d", { willReadFrequently: true });
          context.clearRect(0, 0, sampleWidth, sampleHeight);
          context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
          var pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
          hasTransparency = false;
          for (var index = 3; index < pixels.length; index += 4) {
            if (pixels[index] < 250) {
              hasTransparency = true;
              break;
            }
          }
        } catch (error) {
          hasTransparency = null;
        }
        resolve({ width: width, height: height, hasTransparency: hasTransparency });
      };
      image.onerror = function () { reject(new Error("The selected file is not a readable image")); };
      image.src = dataUrl;
    });
  }

  function injectStyles() {
    if (document.getElementById("btLogoLabStyles")) return;
    var style = document.createElement("style");
    style.id = "btLogoLabStyles";
    style.textContent = [
      ".bt-logo-brand{display:inline-flex;align-items:center;min-width:0;gap:var(--bt-logo-gap,8px);position:relative;z-index:2}",
      ".bt-logo-wordmark{display:inline-block;white-space:nowrap}",
      ".bt-logo-header-mark{display:none;width:var(--bt-logo-mark-size,26px);height:var(--bt-logo-mark-size,26px);max-width:none;object-fit:contain;object-position:center;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(121,192,255,.16))}",
      "html[data-bt-logo-source='ready'][data-bt-logo-header='on'] .bt-logo-header-mark{display:block}",
      "html[data-bt-logo-word='hidden'] .bt-logo-wordmark{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}",
      "#btLogoBackground{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;display:none}",
      "html[data-bt-logo-source='ready'][data-bt-logo-background='on'] #btLogoBackground{display:block}",
      "#btLogoBackground img{position:absolute;display:block;width:min(74vw,1080px);height:auto;max-height:92vh;object-fit:contain;opacity:var(--bt-logo-bg-opacity,.06);filter:blur(var(--bt-logo-bg-blur,0px));transform-origin:center;user-select:none}",
      "#btLogoBackground[data-position='right'] img{right:-8vw;top:50%;transform:translateY(-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      "#btLogoBackground[data-position='center'] img{left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      "#btLogoBackground[data-position='left'] img{left:-8vw;top:50%;transform:translateY(-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      ".site-shell{position:relative;z-index:1}",
      "@media(max-width:820px){.bt-logo-header-mark{filter:drop-shadow(0 0 7px rgba(121,192,255,.14))}#btLogoBackground img{width:94vw;max-height:76vh}#btLogoBackground[data-position='right'] img{right:-20vw}#btLogoBackground[data-position='left'] img{left:-20vw}}",
      "@media(prefers-reduced-motion:reduce){.bt-logo-header-mark,#btLogoBackground img{transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureDom() {
    if (state.initialized) return true;
    var brand = document.querySelector(".topline .brand") || document.querySelector(".brand");
    var wordmark = brand ? brand.querySelector("strong") : null;
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
    fileInput.accept = "image/png,image/webp,image/svg+xml,image/jpeg";
    fileInput.hidden = true;
    fileInput.setAttribute("aria-hidden", "true");
    document.body.appendChild(fileInput);

    state.brand = brand;
    state.wordmark = wordmark;
    state.headerImage = headerImage;
    state.background = background;
    state.backgroundImage = backgroundImage;
    state.fileInput = fileInput;
    state.initialized = true;

    fileInput.addEventListener("change", handleSourceSelection);
    apply();
    return true;
  }

  function apply() {
    if (!state.initialized) return;
    state.settings = sanitizeSettings(state.settings);
    var root = document.documentElement;
    var settings = state.settings;

    root.style.setProperty("--bt-logo-mark-size", settings.markSize + "px");
    root.style.setProperty("--bt-logo-gap", settings.gap + "px");
    root.style.setProperty("--bt-logo-bg-opacity", String(settings.backgroundOpacity));
    root.style.setProperty("--bt-logo-bg-scale", String(settings.backgroundScale));
    root.style.setProperty("--bt-logo-bg-blur", settings.backgroundBlur + "px");
    root.setAttribute("data-bt-logo-header", settings.headerEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-background", settings.backgroundEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-word", settings.wordVisible ? "visible" : "hidden");
    root.setAttribute("data-bt-logo-source", state.source ? "ready" : "missing");
    state.background.setAttribute("data-position", settings.backgroundPosition);

    state.wordmark.textContent = settings.wordCase === "upper" ? "BASSTHERMAL" : "bassthermal";
    state.headerImage.src = state.source || "";
    state.backgroundImage.src = state.source || "";
    saveSettings();
  }

  function setSettings(partial) {
    state.settings = sanitizeSettings(Object.assign({}, state.settings, partial || {}));
    apply();
  }

  async function restoreSource() {
    try {
      var record = await readStoredSource();
      if (!record || !record.dataUrl) return;
      state.source = String(record.dataUrl);
      state.sourceMeta = record.meta || null;
      apply();
    } catch (error) {}
  }

  async function handleSourceSelection() {
    var file = state.fileInput.files && state.fileInput.files[0];
    state.fileInput.value = "";
    if (!file) return;
    if (!/^image\/(png|webp|svg\+xml|jpeg)$/.test(file.type || "")) {
      appendTerminalOutput("/logo source", messageLine("bad", "unsupported image type"));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      appendTerminalOutput("/logo source", messageLine("bad", "image is larger than 5 MB"));
      return;
    }

    try {
      var dataUrl = await fileToDataUrl(file);
      var inspection = await inspectImage(dataUrl);
      var meta = {
        name: file.name || "selected image",
        type: file.type || "image",
        size: file.size || 0,
        width: inspection.width,
        height: inspection.height,
        hasTransparency: inspection.hasTransparency,
        savedAt: new Date().toISOString()
      };
      await writeStoredSource({ dataUrl: dataUrl, meta: meta });
      state.source = dataUrl;
      state.sourceMeta = meta;
      apply();
      var transparency = inspection.hasTransparency === false
        ? '<div class="line warn">warning: no transparent pixels were detected</div>'
        : "";
      appendTerminalOutput("/logo source", '<div class="line ok">source loaded locally</div><div class="line dim">' + escapeHtml(meta.name) + " · " + escapeHtml(meta.width + "x" + meta.height) + "</div>" + transparency);
    } catch (error) {
      appendTerminalOutput("/logo source", messageLine("bad", error && error.message ? error.message : "unable to load image"));
    }
  }

  function messageLine(className, message) {
    return '<div class="line ' + escapeHtml(className || "") + '">' + escapeHtml(message) + "</div>";
  }

  function statusOutput() {
    var settings = state.settings;
    var sourceLabel = state.sourceMeta && state.sourceMeta.name ? state.sourceMeta.name : (state.source ? "stored image" : "none");
    var transparency = state.sourceMeta && state.sourceMeta.hasTransparency === false ? " · opaque" : "";
    return [
      '<div class="line hot">LOGO LAB <span class="dim">LOCAL EXPERIMENT</span></div>',
      '<div class="dossier">',
      '<div class="label">source</div><div class="' + (state.source ? "ok" : "warn") + '">' + escapeHtml(sourceLabel + transparency) + "</div>",
      '<div class="label">header</div><div>' + (settings.headerEnabled ? "on" : "off") + " · " + escapeHtml(settings.markSize + "px") + " · gap " + escapeHtml(settings.gap + "px") + "</div>",
      '<div class="label">word</div><div>' + escapeHtml(settings.wordVisible ? settings.wordCase : "hidden") + "</div>",
      '<div class="label">background</div><div>' + (settings.backgroundEnabled ? "on" : "off") + " · opacity " + escapeHtml(settings.backgroundOpacity) + " · scale " + escapeHtml(settings.backgroundScale) + " · " + escapeHtml(settings.backgroundPosition) + "</div>",
      '<div class="label">storage</div><div>this browser only · no upload</div>',
      "</div>",
      helpOutput(false)
    ].join("");
  }

  function helpOutput(includeHeading) {
    return [
      includeHeading === false ? "" : '<div class="line hot">LOGO LAB COMMANDS</div>',
      '<div class="dossier">',
      '<div class="label">source</div><div>/logo source · choose the exact mark</div>',
      '<div class="label">header</div><div>/logo header on|off · size 16-64 · gap 0-32</div>',
      '<div class="label">word</div><div>/logo word lower|upper|hide|show</div>',
      '<div class="label">background</div><div>/logo bg on|off · opacity 0-0.25 · scale 0.5-2.5</div>',
      '<div class="label">position</div><div>/logo position left|center|right · blur 0-16</div>',
      '<div class="label">preset</div><div>/logo preset clean|ambient|bold|minimal</div>',
      '<div class="label">reset</div><div>/logo reset · keeps source · /logo source clear removes it</div>',
      "</div>"
    ].join("");
  }

  function parseOnOff(value) {
    if (value === "on") return true;
    if (value === "off") return false;
    return null;
  }

  function parseCommand(raw) {
    var normalized = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized) return null;
    var parts = normalized.split(" ");
    var command = parts[0];
    if (command !== "/logo" && command !== "logo") return null;
    return { normalized: normalized, parts: parts };
  }

  async function executeCommand(raw) {
    var parsed = parseCommand(raw);
    if (!parsed) return null;
    var parts = parsed.parts;
    var action = parts[1] || "status";
    var value = parts[2] || "";

    if (action === "status") return statusOutput();
    if (action === "help" || action === "?") return helpOutput(true);

    if (action === "source") {
      if (value === "clear" || value === "remove") {
        try { await clearStoredSource(); } catch (error) {}
        state.source = "";
        state.sourceMeta = null;
        apply();
        return messageLine("ok", "local logo source cleared");
      }
      state.fileInput.click();
      return '<div class="line">choose the exact image file</div><div class="line dim">stored only in this browser; nothing is uploaded</div>';
    }

    if (action === "header") {
      var headerValue = parseOnOff(value);
      if (headerValue == null) return messageLine("bad", "use /logo header on or /logo header off");
      setSettings({ headerEnabled: headerValue });
      return messageLine("ok", "header mark " + value);
    }

    if (action === "bg" || action === "background") {
      var backgroundValue = parseOnOff(value);
      if (backgroundValue == null) return messageLine("bad", "use /logo bg on or /logo bg off");
      setSettings({ backgroundEnabled: backgroundValue });
      return messageLine("ok", "background mark " + value);
    }

    if (action === "word") {
      if (["lower", "upper", "hide", "show"].indexOf(value) < 0) return messageLine("bad", "use lower, upper, hide, or show");
      if (value === "hide") setSettings({ wordVisible: false });
      else if (value === "show") setSettings({ wordVisible: true });
      else setSettings({ wordVisible: true, wordCase: value });
      return messageLine("ok", "wordmark " + value);
    }

    if (action === "size" || action === "mark") {
      var size = finiteNumber(value);
      if (size == null) return messageLine("bad", "use /logo size 16-64");
      size = clamp(size, 16, 64);
      setSettings({ markSize: size });
      return messageLine("ok", "header mark size " + size + "px");
    }

    if (action === "gap") {
      var gap = finiteNumber(value);
      if (gap == null) return messageLine("bad", "use /logo gap 0-32");
      gap = clamp(gap, 0, 32);
      setSettings({ gap: gap });
      return messageLine("ok", "header gap " + gap + "px");
    }

    if (action === "opacity") {
      var opacity = finiteNumber(value);
      if (opacity == null) return messageLine("bad", "use /logo opacity 0-0.25");
      opacity = clamp(opacity, 0, 0.25);
      setSettings({ backgroundOpacity: opacity });
      return messageLine("ok", "background opacity " + opacity);
    }

    if (action === "scale") {
      var scale = finiteNumber(value);
      if (scale == null) return messageLine("bad", "use /logo scale 0.5-2.5");
      scale = clamp(scale, 0.5, 2.5);
      setSettings({ backgroundScale: scale });
      return messageLine("ok", "background scale " + scale);
    }

    if (action === "position") {
      if (["left", "center", "right"].indexOf(value) < 0) return messageLine("bad", "use left, center, or right");
      setSettings({ backgroundPosition: value });
      return messageLine("ok", "background position " + value);
    }

    if (action === "blur") {
      var blur = finiteNumber(value);
      if (blur == null) return messageLine("bad", "use /logo blur 0-16");
      blur = clamp(blur, 0, 16);
      setSettings({ backgroundBlur: blur });
      return messageLine("ok", "background blur " + blur + "px");
    }

    if (action === "preset") {
      if (!PRESETS[value]) return messageLine("bad", "preset: clean, ambient, bold, or minimal");
      state.settings = sanitizeSettings(Object.assign({}, PRESETS[value]));
      apply();
      return messageLine("ok", "preset " + value);
    }

    if (action === "reset") {
      state.settings = Object.assign({}, DEFAULTS);
      apply();
      return messageLine("ok", "visual settings reset; source kept");
    }

    return messageLine("bad", "unknown logo command") + helpOutput(true);
  }

  function appendTerminalOutput(command, output) {
    var log = document.getElementById("log");
    if (!log) return;
    Array.prototype.forEach.call(log.querySelectorAll(".cmd-block"), function (block) {
      block.classList.add("past");
    });
    var block = document.createElement("div");
    block.className = "cmd-block";
    block.innerHTML = '<div class="line"><span class="prompt">bt:~$</span> ' + escapeHtml(command) + "</div>" + output;
    log.appendChild(block);
    requestAnimationFrame(function () {
      var logRect = log.getBoundingClientRect();
      var blockRect = block.getBoundingClientRect();
      log.scrollTop += blockRect.top - logRect.top;
    });
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
      form.classList.remove("has-text");
      Promise.resolve(executeCommand(raw)).then(function (output) {
        if (output) appendTerminalOutput(raw, output);
      }).catch(function (error) {
        appendTerminalOutput(raw, messageLine("bad", error && error.message ? error.message : "logo command failed"));
      });
    }, true);
  }

  function init() {
    if (!ensureDom()) return;
    attachCommandInterceptor();
    restoreSource();
    window.BT_LOGO_LAB = Object.freeze({
      version: "1.0.0",
      status: function () {
        return {
          settings: Object.assign({}, state.settings),
          sourceLoaded: !!state.source,
          sourceMeta: state.sourceMeta ? Object.assign({}, state.sourceMeta) : null
        };
      },
      applyPreset: function (name) {
        if (!PRESETS[name]) return false;
        state.settings = sanitizeSettings(Object.assign({}, PRESETS[name]));
        apply();
        return true;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
