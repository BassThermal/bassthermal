window.BT_STORE_ASSETS = (() => {
  const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const svg = (body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">${body}</svg>`)}`;
  const icon = (label, stroke = '#58a6ff') => svg(`<rect x="48" y="48" width="864" height="444" fill="#050505" stroke="${stroke}" stroke-width="18"/><text x="480" y="308" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="168" font-weight="700" fill="${stroke}">${esc(label)}</text>`);
  const shot = (title, sub, stroke = '#58a6ff') => svg(`<rect x="1" y="1" width="958" height="538" fill="#020202" stroke="#30363d" stroke-width="2"/><rect x="32" y="34" width="896" height="472" fill="#050505" stroke="${stroke}" stroke-width="5"/><text x="64" y="96" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="30" font-weight="700" fill="#f0f6fc">${esc(title)}</text><text x="64" y="142" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#8b949e">${esc(sub)}</text><line x1="64" y1="178" x2="896" y2="178" stroke="#30363d" stroke-width="2"/><text x="64" y="244" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="24" fill="${stroke}">asset pending · platform-specific preview fallback</text><text x="64" y="292" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#484f58">store harvester did not return screenshots for this surface yet</text>`);

  const dtIcon = 'https://play-lh.googleusercontent.com/txuCsb-AVo50aVIlYS3guP7Gm9tzubyCahQ6QP5Yx7PWYaAwbBchQAfjtTGI99ppK-ulsPZsVC6tQ5wdFbfB%3Dw240-h480';
  const retroIcon = 'https://play-lh.googleusercontent.com/8t7-FbqdA-I9excKBXe4nlUqmcE9Vp80RTw9Q5oPFxhMwD1k6dewHWZEi-O2612N8EDhHObOySKb3DKcC02KVQ%3Dw240-h480';
  const copticIcon = 'https://play-lh.googleusercontent.com/_OvyNICX2Fxyv6AYMoTgcug77sOYBMHlJG9yi3ta4uO8amnY4HMfwQKR1pNFi5A5xlI3F5RvtyeQijnpV24vjwI%3Dw240-h480';

  const apps = {
    dualticker: {
      icon: { fallback: dtIcon, android: dtIcon, windows: dtIcon, web: dtIcon },
      screenshots: {
        android: [
          'https://play-lh.googleusercontent.com/EFnNjHnnF74xwiJ2Ns1_Rra0vmd-5AeTc7M_TrpH5briADa-JMB_NX2u120vW7XNomgE6DCbJWWnG3h2IQuY9Q%3Dw526-h296',
          'https://play-lh.googleusercontent.com/I7GhdnM_HIVCmmhmBUDcxQsewyS6Vi-_fFtVg3rqYRzvTM0vPpiP6a-uiBy9bSKgMwQgYH8GpBTJyrIy6zYz%3Dw526-h296',
          'https://play-lh.googleusercontent.com/xNx6KlyXVXhFNoq0hsbXETs-cZ5ZFe5B5T0wcNdfKau-7UHUefpuO8mdJKrBYGEV4BEC1oDxyCK5DO8_miP0%3Dw526-h296',
          'https://play-lh.googleusercontent.com/LriEuTA3vBtxCSSnbuYDcyUuoKSX5SlHl8rxs1M5FhNHmtzj6mmsr8Thb2y0aV5Q425iAnzTwI7PRk4lkFkuKA%3Dw526-h296'
        ],
        windows: [shot('DUALTICKER', 'windows surface · Microsoft Store screenshots pending', '#58a6ff')],
        web: [
          'https://play-lh.googleusercontent.com/EFnNjHnnF74xwiJ2Ns1_Rra0vmd-5AeTc7M_TrpH5briADa-JMB_NX2u120vW7XNomgE6DCbJWWnG3h2IQuY9Q%3Dw526-h296',
          'https://play-lh.googleusercontent.com/I7GhdnM_HIVCmmhmBUDcxQsewyS6Vi-_fFtVg3rqYRzvTM0vPpiP6a-uiBy9bSKgMwQgYH8GpBTJyrIy6zYz%3Dw526-h296'
        ]
      }
    },
    retrofy: {
      icon: { fallback: retroIcon, android: retroIcon, windows: retroIcon, web: null },
      screenshots: {
        android: [
          'https://play-lh.googleusercontent.com/n2ASarOu3Etf3HeWuIO7mEFoiK1KI47kxnDTxjeVqh-KVqq3oWjhMd4Ijo_TP6BlfRiIwsTeEaLvK_0YAu8z%3Dw526-h296',
          'https://play-lh.googleusercontent.com/DkKjhW0g0T_XtK0ew0Y-hDleLsU6AuP_tPCNLSHSi5oZ8gQ6GP0OzOOh2XH8UdPHbFESWR6TtG8ug9OOxuED3Os%3Dw526-h296',
          'https://play-lh.googleusercontent.com/baUiEjo57s2p4SxoRJfzDTM_TaiGexB-HhXhY9WmXYndMluCz_terONi9OGN1TXvFsDJDIQ20UiB31d9JUqUQLM%3Dw526-h296',
          'https://play-lh.googleusercontent.com/OPRtd3PAx4A4GBNYZD6U6N39IvKeeD3oCY7YsJPKOJ3qxP0C6lJicC_3ukidc2l5c2X9Oq-hpXcLsjBve5c9Ag%3Dw526-h296'
        ],
        windows: [shot('RETROFY', 'windows surface · Microsoft Store screenshots pending', '#7ee787')],
        web: []
      }
    },
    'coptic-dictionary': {
      icon: { fallback: copticIcon, android: copticIcon, windows: copticIcon, web: null },
      screenshots: {
        android: [
          'https://play-lh.googleusercontent.com/CG2Q4El_lEQlFQRIa2uZe0Jf20QDQASWeWOvkUfGZJyxNF-12JyLNt1JBXrbo0aCukKbD84TG_sehXADI4e15A%3Dw526-h296',
          'https://play-lh.googleusercontent.com/GXRx3j_2Jxy7EkYLzJci7WnUGxyHJ3l_oWsnxSCJgnYpjfbZAZ3VpAu5UU5O2NJjEgEHl3zZEV8vAEsqd7z6H6w%3Dw526-h296',
          'https://play-lh.googleusercontent.com/BA_L48R9WbRevoyYOwbXl4eRmJM4UHXOIQey_gN_npsCn7WPY7aUeGP8_RPrk4Hjg3GyeM9JtRvSDGiXFoPhwA%3Dw526-h296',
          'https://play-lh.googleusercontent.com/8NBY16GW9Qo4cYV-P7pg-w_tsXt8wSeoboAZYLFtCDihr2gJbd61mpRTGmzQEhSXC7_Az2v9WLTWbGvyxcQsccg%3Dw526-h296'
        ],
        windows: [shot('COPTIC DICTIONARY', 'windows surface · Microsoft Store screenshots pending', '#d29922')],
        web: []
      }
    },
    'icon-pack-builder': {
      icon: { fallback: icon('IP', '#58a6ff'), android: null, windows: icon('IP', '#58a6ff'), web: null },
      screenshots: { android: [], windows: [shot('ICON PACK BUILDER', 'windows surface · screenshots pending', '#58a6ff')], web: [] }
    },
    'favicon-harvester': {
      icon: { fallback: icon('FH', '#ffa657'), android: null, windows: icon('FH', '#ffa657'), web: null },
      screenshots: { android: [], windows: [shot('FAVICON HARVESTER', 'windows surface · screenshots pending', '#ffa657')], web: [] }
    },
    'isbn-manager': {
      icon: { fallback: icon('IS', '#d2a8ff'), android: null, windows: icon('IS', '#d2a8ff'), web: null },
      screenshots: { android: [], windows: [shot('ISBN MANAGER', 'windows surface · screenshots pending', '#d2a8ff')], web: [] }
    },
    'rss-finder': {
      icon: { fallback: icon('RS', '#484f58'), android: null, windows: icon('RS', '#484f58'), web: null },
      screenshots: { android: [], windows: [], web: [shot('RSS FINDER', 'lab surface · preview pending', '#484f58')] }
    }
  };

  return {
    generatedAt: '2026-05-11T13:07:00.000Z',
    source: 'seeded fallback manifest + runtime preview controller; rerun tools/harvest-store-assets.mjs only after fixing empty-output protection',
    apps
  };
})();

(() => {
  const ORDER = ['dualticker', 'retrofy', 'coptic-dictionary', 'icon-pack-builder', 'favicon-harvester', 'isbn-manager', 'rss-finder'];
  const state = { locked: false, list: [], index: -1, timer: 0, restoreTimer: 0, seq: 0 };
  const assets = () => (window.BT_STORE_ASSETS && window.BT_STORE_ASSETS.apps) || {};
  const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
  const uniq = (value) => [...new Set(value.filter(Boolean))];

  function iconFor(slug, platform = '') {
    const icon = (assets()[slug] && assets()[slug].icon) || {};
    return (platform && icon[platform]) || icon.fallback || icon.android || icon.windows || icon.web || '';
  }

  function screensFor(slug, platform = '') {
    const rec = assets()[slug] || {};
    const shots = rec.screenshots || {};
    if (platform && arr(shots[platform]).length) return arr(shots[platform]).map((src) => ({ src, icon: false }));
    const merged = uniq([...arr(shots.android), ...arr(shots.windows), ...arr(shots.web)]);
    if (merged.length) return merged.map((src) => ({ src, icon: false }));
    const fallback = iconFor(slug, platform);
    return fallback ? [{ src: fallback, icon: true }] : [];
  }

  function defaultItems() {
    return ORDER.flatMap((slug) => screensFor(slug, '').slice(0, 2));
  }

  function nodes() {
    return { panel: document.getElementById('assetPanel'), shot: document.getElementById('assetShot') };
  }

  function show(item) {
    const { panel, shot } = nodes();
    if (!panel || !shot || !item || !item.src) return;
    const seq = ++state.seq;
    shot.classList.add('is-fading');
    window.setTimeout(() => {
      if (seq !== state.seq) return;
      panel.classList.toggle('is-icon-fallback', !!item.icon);
      shot.onerror = () => advance(true);
      shot.src = item.src;
      shot.classList.remove('is-fading');
    }, 120);
  }

  function setList(list, start = 0) {
    const clean = list.filter((item) => item && item.src);
    state.list = clean.length ? clean : defaultItems();
    state.index = Math.max(-1, Math.min(start - 1, state.list.length - 1));
    advance(false);
  }

  function advance(fromError = false) {
    if (!state.list.length) state.list = defaultItems();
    if (!state.list.length) return;
    state.index = (state.index + 1) % state.list.length;
    if (fromError && state.list.length > 1) state.list.splice(state.index, 1);
    show(state.list[state.index]);
  }

  function setPreview(slug, platform = '', opts = {}) {
    if (!slug || !assets()[slug]) return;
    window.clearTimeout(state.restoreTimer);
    if (opts.lock) state.locked = true;
    setList(screensFor(slug, platform), 0);
  }

  function unlock() {
    state.locked = false;
    setList(defaultItems(), Math.max(0, state.index));
  }

  function bind() {
    const { panel } = nodes();
    if (!panel || panel.dataset.btPreviewBound === '1') return;
    panel.dataset.btPreviewBound = '1';

    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 980px) {
        .site-shell { display: block !important; width: 100% !important; height: auto !important; overflow: hidden !important; }
        .terminal { width: 100% !important; height: calc(100svh - max(17px, env(safe-area-inset-top)) - max(14px, env(safe-area-inset-bottom))) !important; }
        .asset-panel { display: none !important; }
      }
      .asset-shot { image-rendering: auto; }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('[data-preview-app][title]').forEach((el) => {
      el.dataset.btTitle = el.getAttribute('title') || '';
      el.removeAttribute('title');
    });

    const targetFrom = (event) => event.target && event.target.closest && event.target.closest('[data-preview-app]');

    document.addEventListener('pointerover', (event) => {
      const target = targetFrom(event);
      if (!target || state.locked) return;
      window.clearTimeout(state.restoreTimer);
      setPreview(target.dataset.previewApp, target.dataset.previewPlatform || '', { lock: false });
    });

    document.addEventListener('focusin', (event) => {
      const target = targetFrom(event);
      if (!target || state.locked) return;
      setPreview(target.dataset.previewApp, target.dataset.previewPlatform || '', { lock: false });
    });

    document.addEventListener('pointerout', (event) => {
      const target = targetFrom(event);
      if (!target || state.locked) return;
      window.clearTimeout(state.restoreTimer);
      state.restoreTimer = window.setTimeout(() => { if (!state.locked) unlock(); }, 160);
    });

    document.addEventListener('focusout', () => {
      if (!state.locked) state.restoreTimer = window.setTimeout(unlock, 160);
    });

    document.addEventListener('click', (event) => {
      const target = targetFrom(event);
      if (!target) return;
      setPreview(target.dataset.previewApp, target.dataset.previewPlatform || '', { lock: true });
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') unlock();
    });

    panel.addEventListener('click', unlock);

    setList(defaultItems());
    window.clearInterval(state.timer);
    state.timer = window.setInterval(() => advance(false), 9000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else window.setTimeout(bind, 0);

  window.BT_PREVIEW = { setPreview, unlock, advance };
})();
