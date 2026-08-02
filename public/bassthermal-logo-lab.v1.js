(function () {
  "use strict";

  var SETTINGS_KEY = "bt.logo.lab.settings.v1";
  var DB_NAME = "bt-logo-lab";
  var STORE_NAME = "assets";
  var SOURCE_KEY = "selected-mark";
  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ["image/png", "image/webp", "image/jpeg"];

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
    clean: Object.assign({}, DEFAULTS),
    ambient: Object.assign({}, DEFAULTS, {
      backgroundEnabled: true,
      markSize: 27,
      gap: 9,
      backgroundOpacity: 0.065,
      backgroundScale: 1.35
    }),
    bold: Object.assign({}, DEFAULTS, {
      backgroundEnabled: true,
      markSize: 32,
      gap: 10,
      backgroundOpacity: 0.12,
      backgroundScale: 1.05,
      backgroundPosition: "center"
    }),
    minimal: Object.assign({}, DEFAULTS, {
      headerEnabled: false,
      markSize: 24,
      gap: 7,
      backgroundOpacity: 0.05,
      backgroundScale: 1.2
    })
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
    fileInput: null
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
      wordCase: input.wordCase === "upper" ? "upper" : "lower",
      wordVisible: input.wordVisible !== false,
      markSize: clamp(numberOrNull(input.markSize) == null ? DEFAULTS.markSize : Number(input.markSize), 16, 64),
      gap: clamp(numberOrNull(input.gap) == null ? DEFAULTS.gap : Number(input.gap), 0, 32),
      backgroundOpacity: clamp(numberOrNull(input.backgroundOpacity) == null ? DEFAULTS.backgroundOpacity : Number(input.backgroundOpacity), 0, 0.25),
      backgroundScale: clamp(numberOrNull(input.backgroundScale) == null ? DEFAULTS.backgroundScale : Number(input.backgroundScale), 0.5, 2.5),
      backgroundPosition: ["left", "center", "right"].indexOf(input.backgroundPosition) >= 0 ? input.backgroundPosition : "right",
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
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Unable to open local logo storage")); };
    });
  }

  async function databaseAction(mode, action) {
    var database = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = database.transaction(STORE_NAME, mode);
      var request = action(transaction.objectStore(STORE_NAME));
      if (request) {
        request.onsuccess = function () { resolve(request.result || null); };
        request.onerror = function () { reject(request.error || new Error("Local logo storage failed")); };
      } else {
        transaction.oncomplete = function () { resolve(null); };
      }
      transaction.onerror = function () { reject(transaction.error || new Error("Local logo storage failed")); };
      transaction.oncomplete = function () { database.close(); if (!request) resolve(null); };
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
      "#btLogoBackground img{position:absolute;display:block;width:min(74vw,1080px);height:auto;max-height:92vh;object-fit:contain;opacity:var(--bt-logo-bg-opacity,.06);filter:blur(var(--bt-logo-bg-blur,0px));transform-origin:center;user-select:none}",
      "#btLogoBackground[data-position='right'] img{right:-8vw;top:50%;transform:translateY(-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      "#btLogoBackground[data-position='center'] img{left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      "#btLogoBackground[data-position='left'] img{left:-8vw;top:50%;transform:translateY(-50%) scale(var(--bt-logo-bg-scale,1.25))}",
      ".site-shell{position:relative;z-index:1}",
      "@media(max-width:820px){#btLogoBackground img{width:94vw;max-height:76vh}#btLogoBackground[data-position='right'] img{right:-20vw}#btLogoBackground[data-position='left'] img{left:-20vw}}",
      "@media(prefers-reduced-motion:reduce){.bt-logo-header-mark,#btLogoBackground img{transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
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

    Object.assign(state, {
      brand: brand,
      wordmark: wordmark,
      headerImage: headerImage,
      background: background,
      backgroundImage: backgroundImage,
      fileInput: fileInput
    });
    fileInput.addEventListener("change", handleFileSelection);
    return true;
  }

  function apply() {
    state.settings = sanitize(state.settings);
    var settings = state.settings;
    var root = document.documentElement;
    root.style.setProperty("--bt-logo-mark-size", settings.markSize + "px");
    root.style.setProperty("--bt-logo-gap", settings.gap + "px");
    root.style.setProperty("--bt-logo-bg-opacity", String(settings.backgroundOpacity));
    root.style.setProperty("--bt-logo-bg-scale", String(settings.backgroundScale));
    root.style.setProperty("--bt-logo-bg-blur", settings.backgroundBlur + "px");
    root.setAttribute("data-bt-logo-source", state.source ? "ready" : "missing");
    root.setAttribute("data-bt-logo-header", settings.headerEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-background", settings.backgroundEnabled ? "on" : "off");
    root.setAttribute("data-bt-logo-word", settings.wordVisible ? "visible" : "hidden");
    state.background.setAttribute("data-position", settings.backgroundPosition);
    state.wordmark.textContent = settings.wordCase === "upper" ? "BASSTHERMAL" : "bassthermal";
    setImageSource(state.headerImage, state.source);
    setImageSource(state.backgroundImage, state.source);
    saveSettings();
  }

  function updateSettings(partial) {
    state.settings = sanitize(Object.assign({}, state.settings, partial || {}));
    apply();
  }

  function line(className, text) {
    return '<div class="line ' + escapeHtml(className || "") + '">' + escapeHtml(text) + "</div>";
  }

  function helpOutput(withHeading) {
    return [
      withHeading === false ? "" : '<div class="line hot">LOGO LAB COMMANDS</div>',
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

  function statusOutput() {
    var settings = state.settings;
    var source = state.sourceMeta && state.sourceMeta.name ? state.sourceMeta.name : (state.source ? "stored image" : "none");
    var opaque = state.sourceMeta && state.sourceMeta.hasTransparency === false ? " · opaque" : "";
    return [
      '<div class="line hot">LOGO LAB <span class="dim">LOCAL EXPERIMENT</span></div>',
      '<div class="dossier">',
      '<div class="label">source</div><div class="' + (state.source ? "ok" : "warn") + '">' + escapeHtml(source + opaque) + "</div>",
      '<div class="label">header</div><div>' + (settings.headerEnabled ? "on" : "off") + " · " + escapeHtml(settings.markSize + "px") + " · gap " + escapeHtml(settings.gap + "px") + "</div>",
      '<div class="label">word</div><div>' + escapeHtml(settings.wordVisible ? settings.wordCase : "hidden") + "</div>",
      '<div class="label">background</div><div>' + (settings.backgroundEnabled ? "on" : "off") + " · opacity " + escapeHtml(settings.backgroundOpacity) + " · scale " + escapeHtml(settings.backgroundScale) + " · " + escapeHtml(settings.backgroundPosition) + "</div>",
      '<div class="label">storage</div><div>this browser only · no upload</div>',
      "</div>",
      helpOutput(false)
    ].join("");
  }

  function appendOutput(command, output) {
    var log = document.getElementById("log");
    if (!log) return;
    Array.prototype.forEach.call(log.querySelectorAll(".cmd-block"), function (block) { block.classList.add("past"); });
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

  async function handleFileSelection() {
    var file = state.fileInput.files && state.fileInput.files[0];
    state.fileInput.value = "";
    if (!file) return;
    if (ALLOWED_TYPES.indexOf(file.type) < 0) return appendOutput("/logo source", line("bad", "use a PNG, WebP, or JPEG image"));
    if (file.size > MAX_BYTES) return appendOutput("/logo source", line("bad", "image is larger than 5 MB"));

    try {
      var dataUrl = await fileToDataUrl(file);
      var inspection = await inspectImage(dataUrl);
      var meta = {
        name: file.name || "selected image",
        type: file.type,
        size: file.size,
        width: inspection.width,
        height: inspection.height,
        hasTransparency: inspection.hasTransparency,
        savedAt: new Date().toISOString()
      };
      await writeSource({ dataUrl: dataUrl, meta: meta });
      state.source = dataUrl;
      state.sourceMeta = meta;
      apply();
      appendOutput("/logo source", line("ok", "source loaded locally") + line("dim", meta.name + " · " + meta.width + "x" + meta.height) + (inspection.hasTransparency === false ? line("warn", "no transparent pixels detected") : ""));
    } catch (error) {
      appendOutput("/logo source", line("bad", error && error.message ? error.message : "unable to load image"));
    }
  }

  function parseCommand(raw) {
    var normalized = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized) return null;
    var parts = normalized.split(" ");
    return parts[0] === "/logo" || parts[0] === "logo" ? parts : null;
  }

  function onOff(value) {
    if (value === "on") return true;
    if (value === "off") return false;
    return null;
  }

  async function execute(raw) {
    var parts = parseCommand(raw);
    if (!parts) return null;
    var action = parts[1] || "status";
    var value = parts[2] || "";
    var number = numberOrNull(value);

    if (action === "status") return statusOutput();
    if (action === "help" || action === "?") return helpOutput(true);
    if (action === "source") {
      if (value === "clear" || value === "remove") {
        try { await deleteSource(); } catch (error) {}
        state.source = "";
        state.sourceMeta = null;
        apply();
        return line("ok", "local logo source cleared");
      }
      state.fileInput.click();
      return line("", "choose the exact image file") + line("dim", "stored only in this browser; nothing is uploaded");
    }
    if (action === "header" || action === "bg" || action === "background") {
      var enabled = onOff(value);
      if (enabled == null) return line("bad", "use on or off");
      updateSettings(action === "header" ? { headerEnabled: enabled } : { backgroundEnabled: enabled });
      return line("ok", (action === "header" ? "header mark " : "background mark ") + value);
    }
    if (action === "word") {
      if (["lower", "upper", "hide", "show"].indexOf(value) < 0) return line("bad", "use lower, upper, hide, or show");
      if (value === "hide") updateSettings({ wordVisible: false });
      else if (value === "show") updateSettings({ wordVisible: true });
      else updateSettings({ wordVisible: true, wordCase: value });
      return line("ok", "wordmark " + value);
    }
    if (action === "size" || action === "mark") {
      if (number == null) return line("bad", "use /logo size 16-64");
      number = clamp(number, 16, 64); updateSettings({ markSize: number }); return line("ok", "header mark size " + number + "px");
    }
    if (action === "gap") {
      if (number == null) return line("bad", "use /logo gap 0-32");
      number = clamp(number, 0, 32); updateSettings({ gap: number }); return line("ok", "header gap " + number + "px");
    }
    if (action === "opacity") {
      if (number == null) return line("bad", "use /logo opacity 0-0.25");
      number = clamp(number, 0, 0.25); updateSettings({ backgroundOpacity: number }); return line("ok", "background opacity " + number);
    }
    if (action === "scale") {
      if (number == null) return line("bad", "use /logo scale 0.5-2.5");
      number = clamp(number, 0.5, 2.5); updateSettings({ backgroundScale: number }); return line("ok", "background scale " + number);
    }
    if (action === "blur") {
      if (number == null) return line("bad", "use /logo blur 0-16");
      number = clamp(number, 0, 16); updateSettings({ backgroundBlur: number }); return line("ok", "background blur " + number + "px");
    }
    if (action === "position") {
      if (["left", "center", "right"].indexOf(value) < 0) return line("bad", "use left, center, or right");
      updateSettings({ backgroundPosition: value }); return line("ok", "background position " + value);
    }
    if (action === "preset") {
      if (!PRESETS[value]) return line("bad", "preset: clean, ambient, bold, or minimal");
      state.settings = sanitize(Object.assign({}, PRESETS[value])); apply(); return line("ok", "preset " + value);
    }
    if (action === "reset") {
      state.settings = Object.assign({}, DEFAULTS); apply(); return line("ok", "visual settings reset; source kept");
    }
    return line("bad", "unknown logo command") + helpOutput(true);
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
      Promise.resolve(execute(raw)).then(function (output) {
        if (output) appendOutput(raw, output);
      }).catch(function (error) {
        appendOutput(raw, line("bad", error && error.message ? error.message : "logo command failed"));
      });
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
      version: "1.0.0",
      status: function () {
        return { settings: Object.assign({}, state.settings), sourceLoaded: !!state.source, sourceMeta: state.sourceMeta ? Object.assign({}, state.sourceMeta) : null };
      },
      applyPreset: function (name) {
        if (!PRESETS[name]) return false;
        state.settings = sanitize(Object.assign({}, PRESETS[name]));
        apply();
        return true;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
