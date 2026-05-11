(() => {
  'use strict';

  const controllerVersion = 'stable-v6-strict';
  const cycleMs = 9000;
  const state = { mode:'idle', slug:'', platform:'', list:[], index:-1, timer:0, seq:0 };
  const assets = () => (window.BT_STORE_ASSETS && window.BT_STORE_ASSETS.apps) || {};
  const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
  const uniq = (v) => [...new Set((v || []).filter(Boolean))];
  const node = (id) => document.getElementById(id);

  function rec(slug) { return assets()[slug] || null; }
  function isGeneratedSvg(src) { return String(src || '').startsWith('data:image/svg+xml'); }
  function isUsableShot(src) { return !!src && !isGeneratedSvg(src); }
  function realOnly(list) { return uniq(list).filter(isUsableShot); }

  function icon(slug, platform = '') {
    const i = (rec(slug) && rec(slug).icon) || {};
    return (platform && i[platform]) || i.fallback || i.android || i.windows || i.web || '';
  }

  function platformShots(slug, platform = '') {
    const s = (rec(slug) && rec(slug).screenshots) || {};
    return platform ? realOnly(arr(s[platform])) : [];
  }

  function genericShots(slug) {
    const s = (rec(slug) && rec(slug).screenshots) || {};
    return realOnly([...arr(s.android), ...arr(s.windows)]);
  }

  function items(slug, platform = '') {
    const shots = platform ? platformShots(slug, platform) : genericShots(slug);
    if (shots.length) return shots.map((src) => ({ src, icon:false, slug, platform }));
    const fallbackIcon = icon(slug, platform);
    return fallbackIcon ? [{ src:fallbackIcon, icon:true, slug, platform }] : [];
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
        if (!state.list.length) {
          const fallbackIcon = icon(state.slug, state.platform);
          state.list = fallbackIcon ? [{ src:fallbackIcon, icon:true, slug:state.slug, platform:state.platform }] : [];
          state.index = -1;
        }
        advance();
      };
      shot.src = item.src;
      shot.classList.remove('is-fading');
    }, 70);
  }

  function advance() {
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
    clearInterval(state.timer);
    advance();
    if (state.list.length > 1) state.timer = setInterval(advance, cycleMs);
  }

  function unlock() {
    state.mode = 'idle';
    state.slug = '';
    state.platform = '';
    state.list = [];
    state.index = -1;
    clearInterval(state.timer);
    clearPanel();
  }

  function targetFrom(event) {
    return event.target && event.target.closest ? event.target.closest('[data-preview-app]') : null;
  }

  function bind() {
    const panel = node('assetPanel');
    const table = node('appTable');
    if (!panel || !table || panel.dataset.btPreviewController === controllerVersion) return;
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
    unlock();

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
