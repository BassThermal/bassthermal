(() => {
  'use strict';

  const controllerVersion = 'manual-index-v2';
  const platforms = ['android', 'windows', 'web'];
  const cycleMs = 9000;

  const state = {
    mode: 'idle',
    slug: '',
    platform: '',
    list: [],
    index: -1,
    timer: 0
  };

  const node = (id) => document.getElementById(id);

  function getManifestApp(slug) {
    return window.BT_STORE_ASSETS?.apps?.[slug] || null;
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
  }

  function stopCycle() {
    if (state.timer) clearInterval(state.timer);
    state.timer = 0;
  }

  function showCurrent() {
    const panel = node('assetPanel');
    const shot = node('assetShot');
    const item = state.list[state.index];
    if (!panel || !shot || !item) return;

    panel.dataset.previewMode = state.mode;
    panel.dataset.previewSlug = state.slug;
    panel.dataset.previewPlatform = state.platform;
    panel.classList.toggle('is-icon-fallback', !!item.icon);
    shot.src = item.src;
  }

  function startCycle() {
    stopCycle();
    if (state.list.length <= 1) return;
    state.timer = setInterval(() => {
      state.index = (state.index + 1) % state.list.length;
      showCurrent();
    }, cycleMs);
  }

  function buildPreviewList(slug, platform = '') {
    const app = getManifestApp(slug);
    if (!app) return [];

    const shots = app.screenshots || {};
    const icon = app.icon || {};

    if (platform) {
      const scopedShots = Array.isArray(shots[platform]) ? shots[platform] : [];
      if (scopedShots.length) return scopedShots.map((src) => ({ src, icon: false }));
      const scopedIcon = icon[platform] || icon.fallback || null;
      return scopedIcon ? [{ src: scopedIcon, icon: true }] : [];
    }

    const ordered = platforms.flatMap((pf) => (Array.isArray(shots[pf]) ? shots[pf] : []));
    if (ordered.length) return ordered.map((src) => ({ src, icon: false }));

    return icon.fallback ? [{ src: icon.fallback, icon: true }] : [];
  }

  function setPreview(slug, platform = '', mode = 'hover') {
    if (!slug) return;
    state.mode = mode;
    state.slug = slug;
    state.platform = platform;
    stopCycle();

    state.list = buildPreviewList(slug, platform);
    state.index = state.list.length ? 0 : -1;

    if (!state.list.length) {
      clearPanel();
      return;
    }

    showCurrent();
    startCycle();
  }

  function unlock() {
    state.mode = 'idle';
    state.slug = '';
    state.platform = '';
    state.list = [];
    state.index = -1;
    stopCycle();
    clearPanel();
  }

  function hydrateTitleIcons() {
    const icons = Array.from(document.querySelectorAll('.app-icon[data-app-icon-slug]'));
    for (const el of icons) {
      const slug = el.dataset.appIconSlug;
      const fallback = getManifestApp(slug)?.icon?.fallback || null;
      if (!fallback) {
        el.removeAttribute('src');
        el.classList.add('is-missing');
        continue;
      }
      el.src = fallback;
      el.classList.remove('is-missing');
    }
  }

  function targetFrom(event) {
    return event.target && event.target.closest ? event.target.closest('[data-preview-app]') : null;
  }

  function handleImageError() {
    if (state.index < 0 || !state.list.length) {
      clearPanel();
      return;
    }
    state.list.splice(state.index, 1);
    if (!state.list.length) {
      unlock();
      return;
    }
    if (state.index >= state.list.length) state.index = 0;
    showCurrent();
    startCycle();
  }

  function bind() {
    const panel = node('assetPanel');
    const shot = node('assetShot');
    const table = node('appTable');
    if (!panel || !shot || !table || panel.dataset.btPreviewController === controllerVersion) return;

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

    shot.addEventListener('error', handleImageError);
    panel.addEventListener('click', unlock);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') unlock(); });
  }

  function boot() {
    const wait = () => {
      if (node('assetPanel') && node('appTable')) bind();
      else setTimeout(wait, 60);
    };
    wait();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.BT_PREVIEW = {
    setPreview: (slug, platform = '') => setPreview(slug, platform, 'locked'),
    unlock,
    version: controllerVersion
  };
})();
