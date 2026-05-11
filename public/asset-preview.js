(() => {
  'use strict';

  const controllerVersion = 'manual-local-v1';
  const platforms = ['android', 'windows', 'web'];
  const exts = ['png', 'webp', 'jpg', 'jpeg'];
  const nums = Array.from({ length: 20 }, (_, i) => i + 1);
  const cycleMs = 9000;
  const maxShots = 8;
  const state = { mode: 'idle', slug: '', platform: '', list: [], index: -1, timer: 0, seq: 0 };

  const node = (id) => document.getElementById(id);
  const uniq = (v) => [...new Set((v || []).filter(Boolean))];

  function preload(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function candidateIconPaths(slug, platform = '') {
    const root = exts.map((ext) => `/assets/apps/${slug}/icon.${ext}`);
    const platformIcons = platform ? exts.map((ext) => `/assets/apps/${slug}/${platform}/icon.${ext}`) : [];
    return uniq([...root, ...platformIcons]);
  }

  function candidateShotPaths(slug, platform) {
    const out = [];
    for (const n of nums) {
      const pad = String(n).padStart(2, '0');
      for (const ext of exts) {
        out.push(`/assets/apps/${slug}/${platform}/shot-${pad}.${ext}`);
        out.push(`/assets/apps/${slug}/${platform}/shot-${n}.${ext}`);
      }
    }
    return uniq(out);
  }

  async function loadFirst(paths) {
    for (const src of uniq(paths)) {
      const ok = await preload(src);
      if (ok) return ok;
    }
    return null;
  }

  async function loadMany(paths, maxCount = maxShots) {
    const found = [];
    for (const src of uniq(paths)) {
      const ok = await preload(src);
      if (ok) found.push(ok);
      if (found.length >= maxCount) break;
    }
    return found;
  }

  function clearPanel() {
    const panel = node('assetPanel');
    const shot = node('assetShot');
    if (!panel || !shot) return;
    panel.dataset.previewMode = 'idle';
    panel.dataset.previewSlug = '';
    panel.dataset.previewPlatform = '';
    panel.classList.remove('is-icon-fallback');
    shot.removeAttribute('src');
    shot.classList.remove('is-fading');
  }

  function stopCycle() { if (state.timer) clearInterval(state.timer); state.timer = 0; }

  function showCurrent() {
    const panel = node('assetPanel');
    const shot = node('assetShot');
    const item = state.list[state.index];
    if (!panel || !shot || !item) return;
    panel.dataset.previewMode = state.mode;
    panel.dataset.previewSlug = state.slug;
    panel.dataset.previewPlatform = state.platform;
    panel.classList.toggle('is-icon-fallback', !!item.icon);
    shot.classList.add('is-fading');
    setTimeout(() => {
      shot.src = item.src;
      shot.classList.remove('is-fading');
    }, 70);
  }

  function startCycle() {
    stopCycle();
    if (state.list.length <= 1) return;
    state.timer = setInterval(() => {
      state.index = (state.index + 1) % state.list.length;
      showCurrent();
    }, cycleMs);
  }

  async function resolvePreview(slug, platform) {
    if (platform) {
      const shots = await loadMany(candidateShotPaths(slug, platform));
      if (shots.length) return shots.map((src) => ({ src, icon: false }));
      const icon = await loadFirst(candidateIconPaths(slug, platform));
      return icon ? [{ src: icon, icon: true }] : [];
    }

    for (const pf of platforms) {
      const shots = await loadMany(candidateShotPaths(slug, pf));
      if (shots.length) return shots.map((src) => ({ src, icon: false }));
    }

    const icon = await loadFirst(uniq([
      ...candidateIconPaths(slug),
      ...platforms.flatMap((pf) => candidateIconPaths(slug, pf))
    ]));
    return icon ? [{ src: icon, icon: true }] : [];
  }

  async function setPreview(slug, platform = '', mode = 'hover') {
    if (!slug) return;
    state.mode = mode;
    state.slug = slug;
    state.platform = platform;
    const seq = ++state.seq;
    stopCycle();
    const list = await resolvePreview(slug, platform);
    if (seq !== state.seq) return;
    state.list = list;
    state.index = list.length ? 0 : -1;
    if (!list.length) { clearPanel(); return; }
    showCurrent();
    if (mode === 'locked') startCycle();
  }

  function unlock() {
    ++state.seq;
    state.mode = 'idle';
    state.slug = '';
    state.platform = '';
    state.list = [];
    state.index = -1;
    stopCycle();
    clearPanel();
  }

  async function hydrateTitleIcons() {
    const icons = Array.from(document.querySelectorAll('.app-icon[data-app-icon-slug]'));
    for (const el of icons) {
      const slug = el.dataset.appIconSlug;
      const src = await loadFirst(uniq([
        ...candidateIconPaths(slug),
        ...platforms.flatMap((pf) => candidateIconPaths(slug, pf))
      ]));
      if (!src) continue;
      el.src = src;
      el.classList.remove('is-missing');
    }
  }

  function targetFrom(event) { return event.target && event.target.closest ? event.target.closest('[data-preview-app]') : null; }

  function bind() {
    const panel = node('assetPanel');
    const table = node('appTable');
    if (!panel || !table || panel.dataset.btPreviewController === controllerVersion) return;
    panel.dataset.btPreviewController = controllerVersion;
    unlock();
    hydrateTitleIcons();

    document.addEventListener('pointerover', (event) => {
      const t = targetFrom(event);
      if (t && state.mode !== 'locked') setPreview(t.dataset.previewApp, t.dataset.previewPlatform || '', 'hover');
    }, true);
    document.addEventListener('focusin', (event) => {
      const t = targetFrom(event);
      if (t && state.mode !== 'locked') setPreview(t.dataset.previewApp, t.dataset.previewPlatform || '', 'hover');
    }, true);
    document.addEventListener('click', (event) => {
      const t = targetFrom(event);
      if (t) setPreview(t.dataset.previewApp, t.dataset.previewPlatform || '', 'locked');
    }, true);

    panel.addEventListener('click', unlock);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') unlock(); });
  }

  function boot() {
    const wait = () => {
      if (node('assetPanel') && node('appTable') && node('appTable').children.length) bind();
      else setTimeout(wait, 60);
    };
    wait();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.BT_PREVIEW = { setPreview: (slug, platform = '') => setPreview(slug, platform, 'locked'), unlock, version: controllerVersion };
})();
