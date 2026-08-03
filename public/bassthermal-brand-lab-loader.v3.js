(() => {
  'use strict';

  const ACTIVE_KEY = 'bt.brand.lab.active.v3';
  const SETTINGS_KEY = 'bt.brand.lab.settings.v3';
  const DB_NAME = 'bt-brand-lab';
  const DB_VERSION = 1;
  const STORE_NAME = 'assets';
  const BRAND_ASSET = '/assets/brand/bassthermal-mark-v1.webp';
  const BRAND_BYTES = 14568;
  const BRAND_SHA256 = 'a059081c7b34f0e1d768801e86ed82fd6d93c9c4e2bf474c22c09285e54d5ed2';
  const RUNTIME = '/bassthermal-brand-lab.v3.js?v=3';
  const DEFAULT_SETTINGS = Object.freeze({
    headerEnabled: true,
    markSize: 32,
    markGap: 7,
    markX: 0,
    markY: -1,
    markOpacity: 1,
    markGlow: 8,
    backgroundEnabled: true,
    backgroundOpacity: 0.23,
    backgroundScale: 1.1,
    backgroundX: 24,
    backgroundY: 48,
    backgroundBlur: 7,
    backgroundFit: 'contain',
    backgroundSpeed: 1,
    backgroundLoop: false,
    maskStrength: 0.26,
    reducedMotion: 'hide',
    mobilePolicy: 'allow'
  });

  let loadPromise = null;
  let seedPromise = null;

  function parseCommand(raw) {
    const parts = String(raw || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length || !['/brand', 'brand', '/logo', 'logo'].includes(parts[0])) return null;
    return parts;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Local project storage is unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open Brand Lab storage'));
    });
  }

  function readExistingAssets(database) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const result = { header: null, background: null };
      const header = store.get('header');
      const background = store.get('background');
      header.onsuccess = () => { result.header = header.result || null; };
      background.onsuccess = () => { result.background = background.result || null; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('Unable to inspect Brand Lab storage'));
      transaction.onabort = () => reject(transaction.error || new Error('Brand Lab storage inspection aborted'));
    });
  }

  function writeMissingAssets(database, existing, record) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      if (!existing.header) store.put({ blob: record.blob, meta: { ...record.meta, role: 'header' } }, 'header');
      if (!existing.background) store.put({ blob: record.blob, meta: { ...record.meta, role: 'background' } }, 'background');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Unable to seed Brand Lab storage'));
      transaction.onabort = () => reject(transaction.error || new Error('Brand Lab storage seeding aborted'));
    });
  }

  async function digestHex(blob) {
    if (!window.crypto?.subtle) throw new Error('Secure hashing is unavailable');
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function fetchVerifiedBrandAsset() {
    const response = await fetch(BRAND_ASSET, { cache: 'force-cache', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Unable to load the selected brand asset (${response.status})`);
    const blob = await response.blob();
    if (blob.size !== BRAND_BYTES) throw new Error('Selected brand asset byte count does not match');
    if (await digestHex(blob) !== BRAND_SHA256) throw new Error('Selected brand asset identity does not match');
    return {
      blob,
      meta: {
        name: 'bassthermal-mark-v1.webp',
        type: 'image/webp',
        kind: 'image',
        bytes: BRAND_BYTES,
        width: 512,
        height: 512,
        duration: 0,
        sha256: BRAND_SHA256,
        savedAt: new Date().toISOString()
      }
    };
  }

  async function seedDefaults() {
    if (seedPromise) return seedPromise;
    seedPromise = (async () => {
      try {
        if (!localStorage.getItem(SETTINGS_KEY)) localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      } catch (error) {}

      const database = await openDatabase();
      try {
        const existing = await readExistingAssets(database);
        if (existing.header && existing.background) return;
        const record = await fetchVerifiedBrandAsset();
        await writeMissingAssets(database, existing, record);
      } finally {
        database.close();
      }
    })();
    return seedPromise;
  }

  function removeStaticBackground() {
    document.querySelector('#btBrandBackground[data-default="1"]')?.remove();
  }

  function loadRuntime() {
    if (window.BT_BRAND_LAB) return Promise.resolve(window.BT_BRAND_LAB);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-bt-brand-lab-runtime]');
      const script = existing || document.createElement('script');
      const finish = () => {
        if (window.BT_BRAND_LAB) resolve(window.BT_BRAND_LAB);
        else reject(new Error('Brand Lab loaded without its public API'));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error('Unable to load Brand Lab')), { once: true });
      if (!existing) {
        script.src = RUNTIME;
        script.defer = true;
        script.dataset.btBrandLabRuntime = '1';
        document.head.appendChild(script);
      }
    });
    return loadPromise;
  }

  function waitForRestoredProject(api) {
    return new Promise((resolve) => {
      const started = performance.now();
      const check = () => {
        const summary = document.querySelector('#btBrandLab [data-summary="header"]')?.textContent || '';
        if (summary && summary !== 'none') return resolve(api);
        if (performance.now() - started > 3000) return resolve(api);
        requestAnimationFrame(check);
      };
      check();
    });
  }

  async function activate(action = 'open') {
    await seedDefaults();
    removeStaticBackground();
    const api = await waitForRestoredProject(await loadRuntime());
    if (action === 'close') return api.close();
    if (action === 'reset') { api.reset(); return api.open(); }
    if (action === 'disable') { api.disable(); return api.open(); }
    if (action === 'export') { api.open(); return api.exportProject(); }
    if (action === 'import') {
      api.open();
      return document.querySelector('#btBrandLab [data-action="import"]')?.click();
    }
    return api.open();
  }

  function attachCommandBoundary() {
    const form = document.getElementById('form');
    const input = document.getElementById('cmd');
    if (!form || !input) return;
    form.addEventListener('submit', (event) => {
      const parts = parseCommand(input.value);
      if (!parts) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = '';
      activate(parts[1] || 'open').catch((error) => console.error('[Brand Lab]', error));
    }, true);
  }

  function requestedByUrl() {
    try { return new URLSearchParams(location.search).get('brandlab') === '1'; }
    catch (error) { return false; }
  }

  try { localStorage.removeItem(ACTIVE_KEY); } catch (error) {}
  document.documentElement.removeAttribute('data-bt-brand-header');
  attachCommandBoundary();
  if (requestedByUrl()) activate('open').catch((error) => console.error('[Brand Lab]', error));
})();
