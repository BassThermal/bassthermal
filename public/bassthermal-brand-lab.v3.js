(function () {
  'use strict';

  var VERSION = '3.0.0';
  var SETTINGS_KEY = 'bt.brand.lab.settings.v3';
  var ACTIVE_KEY = 'bt.brand.lab.active.v3';
  var DB_NAME = 'bt-brand-lab';
  var DB_VERSION = 1;
  var STORE_NAME = 'assets';
  var PROJECT_SCHEMA = 'bassthermal.brand-project.v1';
  var MAX_PROJECT_BYTES = 64 * 1024 * 1024;
  var MAX_HEADER_BYTES = 8 * 1024 * 1024;
  var MAX_BACKGROUND_BYTES = 56 * 1024 * 1024;
  var IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  var VIDEO_TYPES = ['video/mp4', 'video/webm'];
  var HEADER_TYPES = IMAGE_TYPES.slice();
  var BACKGROUND_TYPES = IMAGE_TYPES.concat(VIDEO_TYPES);

  var DEFAULTS = Object.freeze({
    headerEnabled: true,
    markSize: 26,
    markGap: 8,
    markX: 0,
    markY: 0,
    markOpacity: 1,
    markGlow: 0,
    backgroundEnabled: false,
    backgroundOpacity: 0.08,
    backgroundScale: 1.1,
    backgroundX: 72,
    backgroundY: 50,
    backgroundBlur: 0,
    backgroundFit: 'contain',
    backgroundSpeed: 1,
    backgroundLoop: true,
    maskStrength: 0.34,
    reducedMotion: 'poster',
    mobilePolicy: 'poster'
  });

  var state = {
    settings: loadSettings(),
    assets: { header: null, background: null, poster: null },
    urls: { header: '', background: '', poster: '' },
    panel: null,
    status: null,
    backgroundRoot: null,
    backgroundMedia: null,
    backgroundNode: null,
    backgroundSignature: '',
    mask: null,
    inputs: {},
    open: false,
    repositioning: false,
    drag: null
  };

  function clamp(value, min, max) {
    value = Number(value);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  }

  function sanitize(input) {
    input = input || {};
    return {
      headerEnabled: input.headerEnabled !== false,
      markSize: clamp(input.markSize == null ? DEFAULTS.markSize : input.markSize, 16, 72),
      markGap: clamp(input.markGap == null ? DEFAULTS.markGap : input.markGap, 0, 32),
      markX: clamp(input.markX == null ? DEFAULTS.markX : input.markX, -20, 20),
      markY: clamp(input.markY == null ? DEFAULTS.markY : input.markY, -20, 20),
      markOpacity: clamp(input.markOpacity == null ? DEFAULTS.markOpacity : input.markOpacity, 0.1, 1),
      markGlow: clamp(input.markGlow == null ? DEFAULTS.markGlow : input.markGlow, 0, 24),
      backgroundEnabled: input.backgroundEnabled === true,
      backgroundOpacity: clamp(input.backgroundOpacity == null ? DEFAULTS.backgroundOpacity : input.backgroundOpacity, 0, 0.4),
      backgroundScale: clamp(input.backgroundScale == null ? DEFAULTS.backgroundScale : input.backgroundScale, 0.35, 3),
      backgroundX: clamp(input.backgroundX == null ? DEFAULTS.backgroundX : input.backgroundX, 0, 100),
      backgroundY: clamp(input.backgroundY == null ? DEFAULTS.backgroundY : input.backgroundY, 0, 100),
      backgroundBlur: clamp(input.backgroundBlur == null ? DEFAULTS.backgroundBlur : input.backgroundBlur, 0, 24),
      backgroundFit: ['contain', 'cover', 'natural'].indexOf(input.backgroundFit) >= 0 ? input.backgroundFit : DEFAULTS.backgroundFit,
      backgroundSpeed: clamp(input.backgroundSpeed == null ? DEFAULTS.backgroundSpeed : input.backgroundSpeed, 0.25, 2),
      backgroundLoop: input.backgroundLoop !== false,
      maskStrength: clamp(input.maskStrength == null ? DEFAULTS.maskStrength : input.maskStrength, 0, 0.85),
      reducedMotion: ['poster', 'hide', 'allow'].indexOf(input.reducedMotion) >= 0 ? input.reducedMotion : DEFAULTS.reducedMotion,
      mobilePolicy: ['poster', 'allow', 'hide'].indexOf(input.mobilePolicy) >= 0 ? input.mobilePolicy : DEFAULTS.mobilePolicy
    };
  }

  function loadSettings() {
    try { return sanitize(Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {})); }
    catch (error) { return Object.assign({}, DEFAULTS); }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (error) {}
  }

  function setActive(active) {
    try { localStorage.setItem(ACTIVE_KEY, active ? '1' : '0'); } catch (error) {}
  }

  function shouldAutoActivate() {
    try {
      var params = new URLSearchParams(location.search);
      return params.get('brandlab') === '1' || localStorage.getItem(ACTIVE_KEY) === '1';
    } catch (error) { return false; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('Local project storage is unavailable'));
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Unable to open local project storage')); };
    });
  }

  async function databaseAction(mode, action) {
    var database = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = database.transaction(STORE_NAME, mode);
      var request = action(transaction.objectStore(STORE_NAME));
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        database.close();
        resolve(value == null ? null : value);
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        database.close();
        reject(error || new Error('Local project storage failed'));
      }
      if (request) {
        request.onsuccess = function () { finish(request.result); };
        request.onerror = function () { fail(request.error); };
      } else transaction.oncomplete = function () { finish(null); };
      transaction.onerror = function () { fail(transaction.error); };
      transaction.onabort = function () { fail(transaction.error); };
    });
  }

  function readAsset(key) { return databaseAction('readonly', function (store) { return store.get(key); }); }
  function writeAsset(key, value) { return databaseAction('readwrite', function (store) { store.put(value, key); return null; }); }
  function deleteAsset(key) { return databaseAction('readwrite', function (store) { store.delete(key); return null; }); }

  async function replaceProjectAssets(records) {
    var database = await openDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = database.transaction(STORE_NAME, 'readwrite');
      var store = transaction.objectStore(STORE_NAME);
      ['header', 'background', 'poster'].forEach(function (key) {
        if (records[key]) store.put(records[key], key);
        else store.delete(key);
      });
      transaction.oncomplete = function () { database.close(); resolve(); };
      transaction.onerror = function () {
        var error = transaction.error || new Error('Project storage transaction failed');
        database.close(); reject(error);
      };
      transaction.onabort = function () {
        var error = transaction.error || new Error('Project storage transaction aborted');
        database.close(); reject(error);
      };
    });
  }

  async function sha256(blob) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Secure hashing is unavailable');
    var digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.prototype.map.call(new Uint8Array(digest), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  function safeName(name, fallback) {
    var value = String(name || fallback || 'asset').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return value || fallback || 'asset';
  }

  function assetKind(type) { return VIDEO_TYPES.indexOf(type) >= 0 ? 'video' : 'image'; }

  function inspectImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function () {
        var result = { width: image.naturalWidth || 0, height: image.naturalHeight || 0, duration: 0 };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Unreadable image')); };
      image.src = url;
    });
  }

  function inspectVideo(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = function () {
        var result = { width: video.videoWidth || 0, height: video.videoHeight || 0, duration: Number(video.duration) || 0 };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      video.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Unreadable or unsupported video')); };
      video.src = url;
    });
  }

  async function makeRecord(file, role) {
    var allowed = role === 'header' ? HEADER_TYPES : BACKGROUND_TYPES;
    var max = role === 'header' ? MAX_HEADER_BYTES : MAX_BACKGROUND_BYTES;
    if (allowed.indexOf(file.type) < 0) throw new Error(role === 'header' ? 'Header supports PNG, JPEG, WebP or GIF' : 'Background supports PNG, JPEG, WebP, GIF, MP4 or WebM');
    if (file.size > max) throw new Error(role === 'header' ? 'Header asset exceeds 8 MB' : 'Background asset exceeds 56 MB');
    var kind = assetKind(file.type);
    var inspection = kind === 'video' ? await inspectVideo(file) : await inspectImage(file);
    return {
      blob: file,
      meta: {
        role: role,
        name: safeName(file.name, role),
        type: file.type,
        kind: kind,
        bytes: file.size,
        width: inspection.width,
        height: inspection.height,
        duration: inspection.duration,
        sha256: await sha256(file),
        savedAt: new Date().toISOString()
      }
    };
  }

  function revoke(role) {
    if (state.urls[role]) URL.revokeObjectURL(state.urls[role]);
    state.urls[role] = '';
  }

  function setUrl(role) {
    revoke(role);
    var record = state.assets[role];
    if (record && record.blob) state.urls[role] = URL.createObjectURL(record.blob);
  }

  function ensureBackground() {
    if (state.backgroundRoot) return;
    var root = document.createElement('div');
    root.id = 'btBrandBackground';
    root.setAttribute('aria-hidden', 'true');
    var media = document.createElement('div');
    media.className = 'bt-brand-media';
    var mask = document.createElement('div');
    mask.className = 'bt-brand-mask';
    root.append(media, mask);
    document.body.prepend(root);
    state.backgroundRoot = root;
    state.backgroundMedia = media;
    state.mask = mask;
    root.addEventListener('pointerdown', beginDrag);
    root.addEventListener('wheel', handleWheel, { passive: false });
  }

  function reducedMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function mobileView() { return window.matchMedia && matchMedia('(max-width: 700px)').matches; }

  function chooseBackgroundAsset() {
    var background = state.assets.background;
    if (!background) return null;
    var policy = reducedMotion() ? state.settings.reducedMotion : (mobileView() ? state.settings.mobilePolicy : 'allow');
    if (policy === 'hide') return null;
    if (policy === 'poster' && state.assets.poster) return state.assets.poster;
    if (policy === 'poster' && background.meta.kind === 'video') return null;
    return background;
  }

  function renderBackground() {
    ensureBackground();
    var root = state.backgroundRoot;
    var selected = chooseBackgroundAsset();
    var active = state.settings.backgroundEnabled && selected;
    root.dataset.active = active ? '1' : '0';
    root.dataset.reposition = state.repositioning ? '1' : '0';
    if (!active) {
      if (state.backgroundNode && state.backgroundNode.tagName === 'VIDEO') state.backgroundNode.pause();
      state.backgroundMedia.textContent = '';
      state.backgroundNode = null;
      state.backgroundSignature = '';
      return;
    }

    var role = selected === state.assets.poster ? 'poster' : 'background';
    var url = state.urls[role];
    var signature = role + ':' + selected.meta.kind + ':' + url;
    var node = state.backgroundNode;
    if (!node || state.backgroundSignature !== signature) {
      if (node && node.tagName === 'VIDEO') node.pause();
      state.backgroundMedia.textContent = '';
      if (selected.meta.kind === 'video') {
        node = document.createElement('video');
        node.muted = true;
        node.defaultMuted = true;
        node.playsInline = true;
        node.preload = 'metadata';
        node.src = url;
      } else {
        node = document.createElement('img');
        node.alt = '';
        node.decoding = 'async';
        node.src = url;
      }
      node.className = 'bt-brand-background-asset';
      state.backgroundMedia.append(node);
      state.backgroundNode = node;
      state.backgroundSignature = signature;
    }

    if (node.tagName === 'VIDEO') {
      node.loop = state.settings.backgroundLoop;
      node.playbackRate = state.settings.backgroundSpeed;
      if (state.urls.poster) node.poster = state.urls.poster;
      else node.removeAttribute('poster');
      if (!document.hidden && node.paused) {
        var play = node.play();
        if (play && play.catch) play.catch(function () { setStatus('Video loaded; browser blocked autoplay', 'warn'); });
      }
    }
  }

  function apply() {
    state.settings = sanitize(state.settings);
    var root = document.documentElement;
    root.style.setProperty('--bt-brand-mark-size', state.settings.markSize + 'px');
    root.style.setProperty('--bt-brand-mark-gap', state.settings.markGap + 'px');
    root.style.setProperty('--bt-brand-mark-x', state.settings.markX + 'px');
    root.style.setProperty('--bt-brand-mark-y', state.settings.markY + 'px');
    root.style.setProperty('--bt-brand-mark-opacity', String(state.settings.markOpacity));
    root.style.setProperty('--bt-brand-mark-glow', state.settings.markGlow + 'px');
    root.style.setProperty('--bt-brand-bg-opacity', String(state.settings.backgroundOpacity));
    root.style.setProperty('--bt-brand-bg-scale', String(state.settings.backgroundScale));
    root.style.setProperty('--bt-brand-bg-x', state.settings.backgroundX + '%');
    root.style.setProperty('--bt-brand-bg-y', state.settings.backgroundY + '%');
    root.style.setProperty('--bt-brand-bg-blur', state.settings.backgroundBlur + 'px');
    root.style.setProperty('--bt-brand-mask', String(state.settings.maskStrength));
    root.dataset.btBrandFit = state.settings.backgroundFit;

    document.querySelectorAll('.bt-site-mark-slot').forEach(function (slot) {
      var image = slot.querySelector('.bt-site-mark');
      if (!image) return;
      var defaultSrc = image.dataset.defaultSrc || image.getAttribute('src') || '';
      var useCustom = state.settings.headerEnabled && state.assets.header && state.urls.header;
      if (useCustom) {
        image.src = state.urls.header;
        slot.dataset.custom = '1';
      } else {
        if (defaultSrc) image.src = defaultSrc;
        slot.dataset.custom = '0';
      }
      slot.dataset.ready = '1';
    });
    renderBackground();
    saveSettings();
    syncPanel();
  }

  function updateSettings(partial, message) {
    state.settings = sanitize(Object.assign({}, state.settings, partial || {}));
    apply();
    setStatus(message || 'Preview updated', 'ok');
  }

  function humanBytes(value) {
    if (!value) return '0 B';
    var units = ['B', 'KB', 'MB'];
    var index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    return (value / Math.pow(1024, index)).toFixed(index ? 1 : 0) + ' ' + units[index];
  }

  function assetSummary(role) {
    var record = state.assets[role];
    if (!record) return 'none';
    var meta = record.meta;
    var details = [meta.type.replace(/^image\//, '').replace(/^video\//, '').toUpperCase(), meta.width + '×' + meta.height, humanBytes(meta.bytes)];
    if (meta.duration) details.splice(2, 0, meta.duration.toFixed(1) + ' s');
    return details.join(' · ');
  }

  function setStatus(text, tone) {
    if (!state.status) return;
    state.status.textContent = text;
    state.status.dataset.tone = tone || '';
  }

  function range(label, key, min, max, step) {
    return '<label class="btbl-range"><span>' + escapeHtml(label) + '</span><input type="range" data-setting="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '"><output data-output="' + key + '"></output></label>';
  }

  function select(label, key, values) {
    return '<label class="btbl-select"><span>' + escapeHtml(label) + '</span><select data-setting="' + key + '">' + values.map(function (value) { return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'; }).join('') + '</select></label>';
  }

  function createPanel() {
    var panel = document.createElement('section');
    panel.id = 'btBrandLab';
    panel.setAttribute('aria-label', 'Brand Lab');
    panel.innerHTML = [
      '<header class="btbl-head"><div><strong>Brand Lab</strong><div>Optional logo override, background media and exact project package</div></div><button type="button" data-action="close" aria-label="Close">×</button></header>',
      '<div class="btbl-body">',
        '<section><h2>Logo override</h2><div class="btbl-asset"><div><strong data-summary="header">none</strong><small>PNG · JPEG · WebP · GIF · max 8 MB</small></div><div><button type="button" data-action="choose-header">Choose</button><button type="button" data-action="clear-header">Clear</button></div></div>',
        '<label class="btbl-check"><input type="checkbox" data-setting="headerEnabled"> Use custom logo</label>',
        range('Size', 'markSize', 16, 72, 1), range('Gap', 'markGap', 0, 32, 1), range('Horizontal', 'markX', -20, 20, 1), range('Vertical', 'markY', -20, 20, 1), range('Opacity', 'markOpacity', .1, 1, .05), range('Glow', 'markGlow', 0, 24, 1),
        '</section>',
        '<section><h2>Background</h2><div class="btbl-asset"><div><strong data-summary="background">none</strong><small>PNG · JPEG · WebP · GIF · MP4 · WebM · max 56 MB</small></div><div><button type="button" data-action="choose-background">Choose</button><button type="button" data-action="clear-background">Clear</button></div></div>',
        '<label class="btbl-check"><input type="checkbox" data-setting="backgroundEnabled"> Show background media</label>',
        range('Opacity', 'backgroundOpacity', 0, .4, .01), range('Scale', 'backgroundScale', .35, 3, .01), range('Horizontal', 'backgroundX', 0, 100, 1), range('Vertical', 'backgroundY', 0, 100, 1), range('Blur', 'backgroundBlur', 0, 24, 1), range('Text mask', 'maskStrength', 0, .85, .01),
        select('Fit', 'backgroundFit', ['contain', 'cover', 'natural']), select('Reduced motion', 'reducedMotion', ['poster', 'hide', 'allow']), select('Mobile', 'mobilePolicy', ['poster', 'allow', 'hide']),
        '<label class="btbl-check"><input type="checkbox" data-setting="backgroundLoop"> Loop video</label>', range('Video speed', 'backgroundSpeed', .25, 2, .05),
        '<div class="btbl-actions"><button type="button" data-action="reposition">Reposition on page</button><button type="button" data-action="capture-poster">Capture video poster</button></div>',
        '<div class="btbl-asset"><div><strong data-summary="poster">poster: none</strong><small>Used for reduced motion and optional mobile fallback</small></div><div><button type="button" data-action="clear-poster">Clear</button></div></div>',
        '</section>',
        '<section><h2>Project</h2><div class="btbl-actions"><button type="button" data-action="export">Export ZIP</button><button type="button" data-action="import">Import ZIP</button><button type="button" data-action="disable">Disable media</button><button type="button" data-action="reset">Reset controls</button></div><p class="btbl-note">The ZIP contains the original asset bytes, manifest, settings and SHA-256 identities. No local paths or browser history.</p></section>',
      '</div>',
      '<footer class="btbl-foot"><span class="btbl-status">Browser-local project</span><span>v' + VERSION + '</span></footer>'
    ].join('');
    document.body.append(panel);
    return panel;
  }

  function createInput(accept) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.hidden = true;
    document.body.append(input);
    return input;
  }

  function syncPanel() {
    if (!state.panel) return;
    state.panel.querySelectorAll('[data-setting]').forEach(function (control) {
      var key = control.dataset.setting;
      var value = state.settings[key];
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = value;
      var output = state.panel.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value);
    });
    ['header', 'background', 'poster'].forEach(function (role) {
      var node = state.panel.querySelector('[data-summary="' + role + '"]');
      if (node) node.textContent = (role === 'poster' ? 'poster: ' : '') + assetSummary(role);
    });
    var reposition = state.panel.querySelector('[data-action="reposition"]');
    if (reposition) reposition.textContent = state.repositioning ? 'Finish repositioning' : 'Reposition on page';
  }

  async function chooseFile(role, file) {
    if (!file) return;
    setStatus('Inspecting ' + role + '…');
    try {
      var record = await makeRecord(file, role);
      await writeAsset(role, record);
      state.assets[role] = record;
      setUrl(role);
      apply();
      setStatus(role.charAt(0).toUpperCase() + role.slice(1) + ' loaded locally', 'ok');
    } catch (error) { setStatus(error.message || 'Unable to load asset', 'warn'); }
  }

  async function clearRole(role) {
    try { await deleteAsset(role); } catch (error) {}
    revoke(role);
    state.assets[role] = null;
    apply();
    setStatus(role.charAt(0).toUpperCase() + role.slice(1) + ' cleared', 'ok');
  }

  function resetControls() {
    state.settings = Object.assign({}, DEFAULTS);
    state.settings.headerEnabled = false;
    state.repositioning = false;
    apply();
    setStatus('Controls reset; committed logo restored', 'ok');
  }

  function disableMedia() {
    state.settings.headerEnabled = false;
    state.settings.backgroundEnabled = false;
    state.repositioning = false;
    apply();
    setStatus('Custom logo and background disabled', 'ok');
  }

  function beginDrag(event) {
    if (!state.repositioning || event.button !== 0) return;
    event.preventDefault();
    state.drag = { x: event.clientX, y: event.clientY, startX: state.settings.backgroundX, startY: state.settings.backgroundY };
    state.backgroundRoot.setPointerCapture(event.pointerId);
    state.backgroundRoot.addEventListener('pointermove', moveDrag);
    state.backgroundRoot.addEventListener('pointerup', endDrag, { once: true });
    state.backgroundRoot.addEventListener('pointercancel', endDrag, { once: true });
  }

  function moveDrag(event) {
    if (!state.drag) return;
    var x = state.drag.startX + (event.clientX - state.drag.x) / Math.max(1, innerWidth) * 100;
    var y = state.drag.startY + (event.clientY - state.drag.y) / Math.max(1, innerHeight) * 100;
    updateSettings({ backgroundX: x, backgroundY: y }, 'Position updated');
  }

  function endDrag(event) {
    state.backgroundRoot.removeEventListener('pointermove', moveDrag);
    try { state.backgroundRoot.releasePointerCapture(event.pointerId); } catch (error) {}
    state.drag = null;
  }

  function handleWheel(event) {
    if (!state.repositioning) return;
    event.preventDefault();
    updateSettings({ backgroundScale: state.settings.backgroundScale + (event.deltaY < 0 ? .05 : -.05) }, 'Scale updated');
  }

  async function capturePoster() {
    var video = state.backgroundMedia && state.backgroundMedia.querySelector('video');
    if (!video || !video.videoWidth) return setStatus('Load and play a video background first', 'warn');
    try {
      var canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/webp', .9); });
      if (!blob) throw new Error('Poster capture failed');
      var file = new File([blob], 'background-poster.webp', { type: 'image/webp' });
      var record = await makeRecord(file, 'background');
      record.meta.role = 'poster';
      await writeAsset('poster', record);
      state.assets.poster = record;
      setUrl('poster');
      apply();
      setStatus('Video poster captured', 'ok');
    } catch (error) { setStatus(error.message || 'Poster capture failed', 'warn'); }
  }

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0 ^ -1;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }

  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function concat(parts) {
    var length = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var result = new Uint8Array(length);
    var offset = 0;
    parts.forEach(function (part) { result.set(part, offset); offset += part.length; });
    return result;
  }

  function makeZip(entries) {
    var encoder = new TextEncoder();
    var locals = [];
    var centrals = [];
    var offset = 0;
    entries.forEach(function (entry) {
      var name = encoder.encode(entry.name);
      var data = entry.data;
      var crc = crc32(data);
      var local = new Uint8Array(30 + name.length);
      var lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0); u16(lv, 8, 0); u16(lv, 10, 0); u16(lv, 12, 0);
      u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length); u16(lv, 26, name.length); u16(lv, 28, 0);
      local.set(name, 30);
      locals.push(local, data);

      var central = new Uint8Array(46 + name.length);
      var cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0); u16(cv, 10, 0); u16(cv, 12, 0); u16(cv, 14, 0);
      u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length); u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0);
      u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(name, 46);
      centrals.push(central);
      offset += local.length + data.length;
    });
    var centralData = concat(centrals);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, entries.length); u16(ev, 10, entries.length);
    u32(ev, 12, centralData.length); u32(ev, 16, offset); u16(ev, 20, 0);
    return new Blob(locals.concat([centralData, end]), { type: 'application/zip' });
  }

  function parseZip(buffer) {
    var bytes = new Uint8Array(buffer);
    var view = new DataView(buffer);
    var decoder = new TextDecoder();
    var files = new Map();
    var offset = 0;
    while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      var method = view.getUint16(offset + 8, true);
      var crc = view.getUint32(offset + 14, true);
      var size = view.getUint32(offset + 18, true);
      var nameLength = view.getUint16(offset + 26, true);
      var extraLength = view.getUint16(offset + 28, true);
      if (method !== 0) throw new Error('Project ZIP uses unsupported compression');
      var nameStart = offset + 30;
      var dataStart = nameStart + nameLength + extraLength;
      var dataEnd = dataStart + size;
      if (dataEnd > bytes.length) throw new Error('Project ZIP is truncated');
      var name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
      if (!name || name.indexOf('..') >= 0 || name.startsWith('/') || name.indexOf('\\') >= 0) throw new Error('Project ZIP contains an unsafe path');
      if (files.has(name)) throw new Error('Project ZIP contains duplicate files');
      var data = bytes.slice(dataStart, dataEnd);
      if (crc32(data) !== crc) throw new Error('Project ZIP CRC mismatch');
      files.set(name, data);
      offset = dataEnd;
      if (files.size > 12) throw new Error('Project ZIP contains too many files');
    }
    return files;
  }

  function manifestAsset(role, path) {
    var record = state.assets[role];
    if (!record) return null;
    return Object.assign({ file: path }, record.meta);
  }

  async function exportProject() {
    try {
      var entries = [];
      var assets = {};
      var mappings = [
        ['header', 'assets/header-' + (state.assets.header ? safeName(state.assets.header.meta.name, 'mark') : '')],
        ['background', 'assets/background-' + (state.assets.background ? safeName(state.assets.background.meta.name, 'media') : '')],
        ['poster', 'assets/background-poster.webp']
      ];
      for (var i = 0; i < mappings.length; i++) {
        var role = mappings[i][0];
        var path = mappings[i][1];
        var record = state.assets[role];
        if (!record) continue;
        var data = new Uint8Array(await record.blob.arrayBuffer());
        entries.push({ name: path, data: data });
        assets[role] = manifestAsset(role, path);
      }
      var manifest = {
        schema: PROJECT_SCHEMA,
        brandLabVersion: VERSION,
        generatedAt: new Date().toISOString(),
        assets: assets,
        settings: Object.assign({}, state.settings)
      };
      var encoder = new TextEncoder();
      entries.unshift({ name: 'brand-manifest.json', data: encoder.encode(JSON.stringify(manifest, null, 2) + '\n') });
      entries.push({ name: 'README.txt', data: encoder.encode('BassThermal Brand Lab project\nContains original local asset bytes and exact visual settings.\n') });
      var zip = makeZip(entries);
      if (zip.size > MAX_PROJECT_BYTES) throw new Error('Project exceeds 64 MB');
      var url = URL.createObjectURL(zip);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'bassthermal-brand-project-' + new Date().toISOString().replace(/[:.]/g, '-') + '.zip';
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setStatus('Project ZIP exported with original assets', 'ok');
    } catch (error) { setStatus(error.message || 'Project export failed', 'warn'); }
  }

  async function recordFromBytes(meta, data) {
    var blob = new Blob([data], { type: meta.type });
    if (blob.size !== meta.bytes) throw new Error('Asset size does not match manifest');
    if (await sha256(blob) !== meta.sha256) throw new Error('Asset SHA-256 does not match manifest');
    return { blob: blob, meta: Object.assign({}, meta) };
  }

  async function importProject(file) {
    if (!file) return;
    if (file.size > MAX_PROJECT_BYTES) return setStatus('Project ZIP exceeds 64 MB', 'warn');
    setStatus('Validating project ZIP…');
    try {
      var files = parseZip(await file.arrayBuffer());
      var manifestBytes = files.get('brand-manifest.json');
      if (!manifestBytes) throw new Error('Project manifest is missing');
      var manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
      if (manifest.schema !== PROJECT_SCHEMA) throw new Error('Unsupported project schema');
      var next = { header: null, background: null, poster: null };
      for (var role of ['header', 'background', 'poster']) {
        var meta = manifest.assets && manifest.assets[role];
        if (!meta) continue;
        if (!meta.file || meta.file.indexOf('assets/') !== 0) throw new Error('Manifest contains an invalid asset path');
        var data = files.get(meta.file);
        if (!data) throw new Error('Manifest asset is missing: ' + role);
        var allowed = role === 'header' ? HEADER_TYPES : (role === 'poster' ? IMAGE_TYPES : BACKGROUND_TYPES);
        if (allowed.indexOf(meta.type) < 0) throw new Error('Manifest contains an unsupported asset type');
        next[role] = await recordFromBytes(meta, data);
      }
      var nextSettings = sanitize(manifest.settings || {});
      await replaceProjectAssets(next);
      state.assets = next;
      state.settings = nextSettings;
      ['header', 'background', 'poster'].forEach(setUrl);
      apply();
      setActive(true);
      setStatus('Project imported and verified', 'ok');
    } catch (error) { setStatus(error.message || 'Project import failed; current project kept', 'warn'); }
  }

  function handleInput(event) {
    var control = event.target.closest('[data-setting]');
    if (!control || !state.panel.contains(control)) return;
    var key = control.dataset.setting;
    var value = control.type === 'checkbox' ? control.checked : (control.tagName === 'SELECT' ? control.value : Number(control.value));
    var partial = {}; partial[key] = value;
    updateSettings(partial);
  }

  function handleClick(event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.dataset.action;
    if (action === 'close') closePanel();
    else if (action === 'choose-header') state.inputs.header.click();
    else if (action === 'choose-background') state.inputs.background.click();
    else if (action === 'clear-header') clearRole('header');
    else if (action === 'clear-background') clearRole('background');
    else if (action === 'clear-poster') clearRole('poster');
    else if (action === 'reset') resetControls();
    else if (action === 'disable') disableMedia();
    else if (action === 'capture-poster') capturePoster();
    else if (action === 'export') exportProject();
    else if (action === 'import') state.inputs.project.click();
    else if (action === 'reposition') {
      state.repositioning = !state.repositioning;
      apply();
      setStatus(state.repositioning ? 'Drag background; wheel changes scale; Escape finishes' : 'Repositioning finished', 'ok');
    }
  }

  function closeTerminalOverlay() {
    var close = document.getElementById('terminalClose');
    if (close) close.click();
  }

  function openPanel() {
    state.open = true;
    state.panel.dataset.open = '1';
    setActive(true);
    syncPanel();
    closeTerminalOverlay();
    setStatus('Browser-local live preview', 'ok');
  }

  function closePanel() {
    state.open = false;
    state.repositioning = false;
    state.panel.dataset.open = '0';
    apply();
  }

  function parseCommand(raw) {
    var parts = String(raw || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length || ['/brand', 'brand', '/logo', 'logo'].indexOf(parts[0]) < 0) return null;
    return parts;
  }

  function executeCommand(raw) {
    var parts = parseCommand(raw);
    if (!parts) return false;
    var action = parts[1] || 'open';
    if (action === 'close') closePanel();
    else if (action === 'reset') { resetControls(); openPanel(); }
    else if (action === 'disable') { disableMedia(); openPanel(); }
    else if (action === 'export') { exportProject(); openPanel(); }
    else if (action === 'import') { openPanel(); state.inputs.project.click(); }
    else openPanel();
    return true;
  }

  function attachCommandInterceptor() {
    var form = document.getElementById('form');
    var input = document.getElementById('cmd');
    if (!form || !input) return;
    form.addEventListener('submit', function (event) {
      var raw = String(input.value || '').trim();
      if (!parseCommand(raw)) return;
      event.preventDefault(); event.stopImmediatePropagation(); input.value = '';
      executeCommand(raw);
    }, true);
  }

  async function restore() {
    for (var role of ['header', 'background', 'poster']) {
      try { state.assets[role] = await readAsset(role); } catch (error) { state.assets[role] = null; }
      setUrl(role);
    }
    apply();
  }

  function installStyles() {
    if (document.querySelector('link[data-bt-brand-lab-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = '/bassthermal-brand-lab.v3.css?v=3'; link.dataset.btBrandLabStyle = '1';
    document.head.append(link);
  }

  function init() {
    installStyles();
    ensureBackground();
    state.panel = createPanel();
    state.status = state.panel.querySelector('.btbl-status');
    state.inputs.header = createInput(HEADER_TYPES.join(','));
    state.inputs.background = createInput(BACKGROUND_TYPES.join(','));
    state.inputs.project = createInput('.zip,application/zip');
    state.inputs.header.addEventListener('change', function () { chooseFile('header', state.inputs.header.files && state.inputs.header.files[0]); state.inputs.header.value = ''; });
    state.inputs.background.addEventListener('change', function () { chooseFile('background', state.inputs.background.files && state.inputs.background.files[0]); state.inputs.background.value = ''; });
    state.inputs.project.addEventListener('change', function () { importProject(state.inputs.project.files && state.inputs.project.files[0]); state.inputs.project.value = ''; });
    state.panel.addEventListener('input', handleInput);
    state.panel.addEventListener('change', handleInput);
    state.panel.addEventListener('click', handleClick);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.repositioning) { state.repositioning = false; apply(); setStatus('Repositioning finished', 'ok'); }
      else if (event.key === 'Escape' && state.open) closePanel();
    });
    document.addEventListener('visibilitychange', function () {
      var video = state.backgroundMedia && state.backgroundMedia.querySelector('video');
      if (!video) return;
      if (document.hidden) video.pause();
      else if (state.settings.backgroundEnabled) video.play().catch(function () {});
    });
    document.addEventListener('bt:site-shell-ready', apply);
    attachCommandInterceptor();
    restore().then(function () { if (shouldAutoActivate()) openPanel(); });
    window.BT_BRAND_LAB = Object.freeze({
      version: VERSION,
      open: openPanel,
      close: closePanel,
      reset: resetControls,
      disable: disableMedia,
      exportProject: exportProject,
      importProject: importProject,
      getSettings: function () { return Object.assign({}, state.settings); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
