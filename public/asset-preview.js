(() => {
  'use strict';

  const controllerVersion = 'stable-v4';
  const order = ['dualticker','retrofy','coptic-dictionary','icon-pack-builder','favicon-harvester','isbn-manager','rss-finder'];
  const cycleMs = 9000;
  const state = { mode:'auto', slug:'', platform:'', list:[], index:-1, global:[], globalIndex:-1, timer:0, seq:0 };
  const assets = () => (window.BT_STORE_ASSETS && window.BT_STORE_ASSETS.apps) || {};
  const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
  const uniq = (v) => [...new Set((v || []).filter(Boolean))];
  const node = (id) => document.getElementById(id);

  function rec(slug) { return assets()[slug] || null; }
  function icon(slug, platform = '') {
    const i = (rec(slug) && rec(slug).icon) || {};
    return (platform && i[platform]) || i.fallback || i.android || i.windows || i.web || '';
  }
  function shotUrls(slug, platform = '') {
    const s = (rec(slug) && rec(slug).screenshots) || {};
    if (platform) return uniq(arr(s[platform]));
    return uniq([...arr(s.web), ...arr(s.android), ...arr(s.windows)]);
  }
  function items(slug, platform = '') {
    const shots = shotUrls(slug, platform);
    if (shots.length) return shots.map((src) => ({ src, icon:false, slug, platform }));
    const fallbackIcon = icon(slug, platform);
    return fallbackIcon ? [{ src:fallbackIcon, icon:true, slug, platform }] : [];
  }
  function globalItems() {
    return order.flatMap((slug) => items(slug, '').slice(0, 1));
  }
  function show(item) {
    const panel = node('assetPanel');
    const shot = node('assetShot');
    if (!panel || !shot || !item || !item.src) return;
    const seq = ++state.seq;
    panel.dataset.previewMode = state.mode;
    panel.dataset.previewSlug = item.slug || state.slug || '';
    panel.dataset.previewPlatform = item.platform || state.platform || '';
    shot.classList.add('is-fading');
    setTimeout(() => {
      if (seq !== state.seq) return;
      panel.classList.toggle('is-icon-fallback', !!item.icon);
      shot.onerror = () => {
        state.list = state.list.filter((x) => x.src !== item.src);
        state.global = state.global.filter((x) => x.src !== item.src);
        advance(state.mode === 'auto');
      };
      shot.src = item.src;
      shot.classList.remove('is-fading');
    }, 70);
  }
  function advance(useGlobal = false) {
    if (useGlobal || state.mode === 'auto') {
      if (!state.global.length) state.global = globalItems();
      if (!state.global.length) return;
      state.globalIndex = (state.globalIndex + 1) % state.global.length;
      show(state.global[state.globalIndex]);
      return;
    }
    if (!state.list.length) return;
    state.index = (state.index + 1) % state.list.length;
    show(state.list[state.index]);
  }
  function setPreview(slug, platform = '', mode = 'hover') {
    if (!slug || !rec(slug)) return;
    state.mode = mode;
    state.slug = slug;
    state.platform = platform || '';
    state.list = items(slug, platform);
    state.index = -1;
    advance(false);
    restart();
  }
  function unlock() {
    state.mode = 'auto';
    state.slug = '';
    state.platform = '';
    state.list = [];
    advance(true);
    restart();
  }
  function restart() {
    clearInterval(state.timer);
    state.timer = setInterval(() => advance(state.mode === 'auto'), cycleMs);
  }
  function targetFrom(event) {
    return event.target && event.target.closest ? event.target.closest('[data-preview-app]') : null;
  }
  function bind() {
    const panel = node('assetPanel');
    const table = node('appTable');
    if (!panel || !table) return;
    panel.dataset.btPreviewController = controllerVersion;
    document.querySelectorAll('[data-preview-app][title]').forEach((el) => {
      el.setAttribute('aria-label', el.getAttribute('title') || el.textContent || 'Preview');
      el.removeAttribute('title');
    });
    if (!document.getElementById('bt-preview-guard-css')) {
      const style = document.createElement('style');
      style.id = 'bt-preview-guard-css';
      style.textContent = '@media (max-width:980px){.site-shell{display:block!important;width:100%!important;height:auto!important;overflow:hidden!important}.terminal{width:100%!important;height:calc(100svh - max(17px, env(safe-area-inset-top)) - max(14px, env(safe-area-inset-bottom)))!important}.asset-panel{display:none!important}}.asset-panel[hidden]{display:none!important}';
      document.head.appendChild(style);
    }
    state.global = globalItems();
    panel.hidden = !state.global.length;
    advance(true);
    restart();

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
  window.BT_PREVIEW = { setPreview:(slug, platform='') => setPreview(slug, platform, 'locked'), unlock, version: controllerVersion };
})();
