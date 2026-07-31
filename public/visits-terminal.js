(() => {
  'use strict';

  const home = document.querySelector('.terminal.home');
  const log = document.getElementById('log');
  const form = document.getElementById('form');
  const input = document.getElementById('cmd');
  const overlay = document.getElementById('terminalOverlay');
  if (!home || !log || !form || !input || !overlay) return;

  const REFRESH_MS = 15000;
  const state = {
    active: false,
    timer: null,
    controller: null,
    generation: 0,
    body: null,
    lastData: null
  };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const safe = (value, fallback = '—') =>
    value === null || value === undefined || value === '' ? fallback : value;

  const normalize = (text) =>
    String(text || '').trim().toLowerCase().replace(/^\//, '').replace(/\s+/g, ' ');

  const normalizeCommand = (text) => {
    const value = normalize(text);
    if (value === 'visits all') return 'visits today';
    if (value === 'visits live') return 'visits now';
    return value;
  };

  const isVisitsCommand = (text) => {
    const value = normalize(text);
    return [
      'visits',
      'visits all',
      'visits live',
      'visits now',
      'visits today',
      'visits pages',
      'visits apps',
      'visits clicks',
      'visits health',
      'visits off'
    ].includes(value) || /^city\s+.+\s+[a-z]{2,3}$/i.test(value);
  };

  const commandLine = (text) =>
    `<div class="line"><span class="prompt">bt:~$</span> ${esc(text)}</div>`;

  const metric = (label, value) =>
    `<span class="bt-visits-metric"><span class="bt-visits-key">${esc(label)}</span><strong>${esc(safe(value, 0))}</strong></span>`;

  const sectionTitle = (label) =>
    `<div class="bt-visits-section-title">${esc(label)}</div>`;

  const empty = (text = 'none') =>
    `<div class="bt-visits-empty">${esc(text)}</div>`;

  const generatedTime = (data) => {
    const date = new Date(data?.generatedAt || '');
    return Number.isNaN(date.getTime())
      ? '--:--:--'
      : date.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
  };

  function showTerminal() {
    overlay.classList.add('open', 'is-tall');
    form.classList.add('is-active');
  }

  function stopMonitor() {
    state.generation += 1;
    state.active = false;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    if (state.controller) state.controller.abort();
    state.controller = null;
  }

  function createBlock(command) {
    for (const block of log.querySelectorAll('.cmd-block')) block.classList.add('past');
    const block = document.createElement('div');
    block.className = 'cmd-block bt-visits-command';
    block.innerHTML = commandLine(command);
    const body = document.createElement('div');
    body.className = 'bt-visits-body';
    body.innerHTML = '<div class="line dim">loading visits…</div>';
    block.appendChild(body);
    log.appendChild(block);
    log.scrollTop = log.scrollHeight;
    state.body = body;
    return body;
  }

  async function requestJson(path, generation) {
    const controller = new AbortController();
    state.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { accept: 'application/json', 'cache-control': 'no-store' }
      });
      const type = response.headers.get('content-type') || '';
      if (!type.includes('application/json')) {
        throw new Error(`unexpected ${type.split(';')[0] || 'response'}`);
      }
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      if (generation !== state.generation) throw new DOMException('stale request', 'AbortError');
      return data;
    } finally {
      clearTimeout(timeout);
      if (state.controller === controller) state.controller = null;
    }
  }

  function activeRows(data) {
    const rows = Array.isArray(data?.activeSessions) ? data.activeSessions : [];
    if (!rows.length) return empty('nobody active in the last 90 seconds');
    return `<div class="bt-visits-table bt-visits-active-table">
      <div class="bt-visits-row bt-visits-head-row"><span>city</span><span>device</span><span>page</span><span>age</span></div>
      ${rows.map((row) => `<div class="bt-visits-row">
        <span>${esc(`${safe(row.city, 'Unknown')} ${safe(row.country, '')}`.trim())}</span>
        <span>${esc(safe(row.device))}</span>
        <span class="bt-visits-path" title="${esc(safe(row.path, '/'))}">${esc(safe(row.path, '/'))}</span>
        <span class="bt-visits-num">${esc(safe(row.ageLabel, '0s'))}</span>
      </div>`).join('')}
    </div>`;
  }

  function cityRows(data) {
    const rows = Array.isArray(data?.citiesToday) ? data.citiesToday : [];
    if (!rows.length) return empty('no visits recorded today');
    return `<div class="bt-visits-table bt-visits-city-table">
      <div class="bt-visits-row bt-visits-head-row"><span>city</span><span>people</span><span>sessions</span><span>views</span><span>time</span><span>last</span></div>
      ${rows.map((row) => `<a class="bt-visits-row bt-visits-city-link" href="#" data-bt-city="${esc(row.city)}" data-bt-country="${esc(row.country)}">
        <span>${esc(`${safe(row.city, 'Unknown')} ${safe(row.country, '')}`.trim())}</span>
        <span class="bt-visits-num">${esc(safe(row.visitors, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.sessions, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.pageViews, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.visibleLabel ?? row.tabTimeLabel, '0s'))}</span>
        <span class="bt-visits-num">${esc(safe(row.lastSeenTime, '--:--'))}</span>
      </a>`).join('')}
    </div>`;
  }

  function clickRows(data, limit = 6) {
    const rows = Array.isArray(data?.clicksToday) ? data.clicksToday.slice(0, limit) : [];
    if (!rows.length) return '';
    return `${sectionTitle('CLICKS TODAY')}<div class="bt-visits-list">${rows.map((row) => {
      const action = safe(row.action, 'external_open').replaceAll('_', ' ');
      const label = row.appSlug ? `${row.appSlug} · ${action}` : action;
      return `<div class="bt-visits-list-row"><span>${esc(label)}</span><strong>${esc(safe(row.clicks, 0))}</strong></div>`;
    }).join('')}</div>`;
  }

  function renderSummary(data) {
    const totals = data?.totals || {};
    const activeSessions = totals.activeSessions ??
      (Array.isArray(data?.activeSessions) ? data.activeSessions.length : 0);
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● LIVE</span><span>${esc(generatedTime(data))}</span><span class="bt-visits-muted">active ≤90s · refresh 15s</span></div>
      ${sectionTitle('NOW')}
      <div class="bt-visits-metrics">${metric('people', totals.activePeople ?? 0)}${metric('sessions', activeSessions)}</div>
      ${activeRows(data)}
      ${sectionTitle('TODAY')}
      <div class="bt-visits-metrics">${metric('visitors', totals.visitorsToday ?? 0)}${metric('sessions', totals.sessionsToday ?? 0)}${metric('views', totals.pageViewsToday ?? 0)}${metric('clicks', totals.clicksToday ?? 0)}${metric('time', totals.visibleTodayLabel ?? totals.tabTimeTodayLabel ?? '0s')}</div>
      ${cityRows(data)}
      ${clickRows(data)}
    </div>`;
  }

  function renderNow(data) {
    const totals = data?.totals || {};
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● NOW</span><span>${esc(generatedTime(data))}</span><span class="bt-visits-muted">active ≤90s</span></div>
      <div class="bt-visits-metrics">${metric('people', totals.activePeople ?? 0)}${metric('sessions', totals.activeSessions ?? 0)}</div>
      ${activeRows(data)}
    </div>`;
  }

  function renderToday(data) {
    const totals = data?.totals || {};
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● TODAY</span><span>${esc(generatedTime(data))}</span></div>
      <div class="bt-visits-metrics">${metric('visitors', totals.visitorsToday ?? 0)}${metric('sessions', totals.sessionsToday ?? 0)}${metric('views', totals.pageViewsToday ?? 0)}${metric('clicks', totals.clicksToday ?? 0)}${metric('time', totals.visibleTodayLabel ?? totals.tabTimeTodayLabel ?? '0s')}</div>
      ${cityRows(data)}
    </div>`;
  }

  function renderSimpleTable(title, columns, rows) {
    if (!Array.isArray(rows) || !rows.length) {
      return `<div class="bt-visits">${sectionTitle(title)}${empty()}</div>`;
    }
    return `<div class="bt-visits">${sectionTitle(title)}
      <div class="bt-visits-table bt-visits-simple-table" style="--bt-cols:${columns.map((column) => column.width || '1fr').join(' ')}">
        <div class="bt-visits-row bt-visits-head-row">${columns.map((column) => `<span>${esc(column.label)}</span>`).join('')}</div>
        ${rows.map((row) => `<div class="bt-visits-row">${columns.map((column) => `<span class="${column.numeric ? 'bt-visits-num' : ''}">${esc(safe(row[column.key], column.fallback ?? '—'))}</span>`).join('')}</div>`).join('')}
      </div>
    </div>`;
  }

  const renderPages = (data) => renderSimpleTable('PAGES TODAY', [
    { label: 'page', key: 'path', width: 'minmax(0,1fr)' },
    { label: 'views', key: 'views', width: '64px', numeric: true },
    { label: 'people', key: 'visitors', width: '64px', numeric: true },
    { label: 'last', key: 'lastSeenTime', width: '78px', numeric: true }
  ], data?.pagesToday || []);

  const renderApps = (data) => renderSimpleTable('APPS TODAY', [
    { label: 'app', key: 'appSlug', width: 'minmax(0,1fr)' },
    { label: 'views', key: 'views', width: '64px', numeric: true },
    { label: 'clicks', key: 'clicks', width: '64px', numeric: true },
    { label: 'last', key: 'lastSeenTime', width: '78px', numeric: true }
  ], data?.appsToday || []);

  function renderClicks(data) {
    const rows = (data?.clicksToday || []).map((row) => ({
      label: row.appSlug
        ? `${row.appSlug} · ${safe(row.action, 'external_open').replaceAll('_', ' ')}`
        : safe(row.action, 'external_open').replaceAll('_', ' '),
      clicks: row.clicks,
      lastSeenTime: row.lastSeenTime
    }));
    return renderSimpleTable('CLICKS TODAY', [
      { label: 'action', key: 'label', width: 'minmax(0,1fr)' },
      { label: 'clicks', key: 'clicks', width: '64px', numeric: true },
      { label: 'last', key: 'lastSeenTime', width: '78px', numeric: true }
    ], rows);
  }

  function renderHealth(data) {
    const checks = Array.isArray(data?.checks) ? data.checks : [];
    return `<div class="bt-visits">${sectionTitle('VISITS HEALTH')}<div class="bt-visits-list">
      ${checks.map((check) => `<div class="bt-visits-list-row"><span>${esc(check.name)}</span><strong class="${check.ok ? 'bt-visits-ok' : 'bt-visits-bad'}">${check.ok ? 'ok' : 'failed'}</strong></div>`).join('') || '<div class="bt-visits-empty">no checks returned</div>'}
    </div></div>`;
  }

  function renderCity(data) {
    const totals = data?.totals || {};
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● CITY</span><strong>${esc(`${safe(data.city)} ${safe(data.country, '')}`.trim())}</strong><span>${esc(generatedTime(data))}</span></div>
      <div class="bt-visits-metrics">${metric('visitors', totals.visitors ?? 0)}${metric('sessions', totals.sessions ?? 0)}${metric('views', totals.pageViews ?? 0)}${metric('clicks', totals.clicks ?? 0)}${metric('time', totals.visibleLabel ?? totals.tabTimeLabel ?? '0s')}${metric('last', totals.lastSeenTime ?? '--:--')}</div>
    </div>`;
  }

  function renderError(error) {
    const prior = state.lastData ? renderSummary(state.lastData) : '';
    return `${prior}<div class="bt-visits-error">STALE · ${esc(error?.message || 'visits unavailable')}</div>`;
  }

  function schedule(generation) {
    if (!state.active || generation !== state.generation) return;
    if (document.visibilityState !== 'visible' || !overlay.classList.contains('open')) return;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => refreshMonitor(generation), REFRESH_MS);
  }

  async function refreshMonitor(generation) {
    const body = state.body;
    if (!state.active || generation !== state.generation || !body) return;
    if (document.visibilityState !== 'visible' || !overlay.classList.contains('open')) return;
    try {
      const data = await requestJson('/api/visits/summary', generation);
      if (generation !== state.generation || body !== state.body || !state.active) return;
      state.lastData = data;
      body.innerHTML = renderSummary(data);
    } catch (error) {
      if (error?.name !== 'AbortError' && generation === state.generation && body === state.body && state.active) {
        body.innerHTML = renderError(error);
      }
    } finally {
      if (generation === state.generation) schedule(generation);
    }
  }

  async function run(command) {
    const normalized = normalizeCommand(command);
    showTerminal();

    if (normalized === 'visits off') {
      stopMonitor();
      const body = createBlock(command);
      body.innerHTML = '<div class="line dim">visits monitor stopped</div>';
      return;
    }

    stopMonitor();
    const generation = state.generation;
    const body = createBlock(command);

    try {
      if (/^city\s+.+\s+[a-z]{2,3}$/i.test(normalized)) {
        const match = normalized.match(/^city\s+(.+)\s+([a-z]{2,3})$/i);
        const data = await requestJson(`/api/visits/city?city=${encodeURIComponent(match[1])}&country=${encodeURIComponent(match[2].toUpperCase())}`, generation);
        if (generation === state.generation && body === state.body) body.innerHTML = renderCity(data);
        return;
      }

      if (normalized === 'visits health') {
        const data = await requestJson('/api/visits/health', generation);
        if (generation === state.generation && body === state.body) body.innerHTML = renderHealth(data);
        return;
      }

      const data = await requestJson('/api/visits/summary', generation);
      if (generation !== state.generation || body !== state.body) return;
      state.lastData = data;

      if (normalized === 'visits now') body.innerHTML = renderNow(data);
      else if (normalized === 'visits today') body.innerHTML = renderToday(data);
      else if (normalized === 'visits pages') body.innerHTML = renderPages(data);
      else if (normalized === 'visits apps') body.innerHTML = renderApps(data);
      else if (normalized === 'visits clicks') body.innerHTML = renderClicks(data);
      else {
        state.active = true;
        state.body = body;
        body.innerHTML = renderSummary(data);
        schedule(generation);
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && generation === state.generation && body === state.body) {
        body.innerHTML = renderError(error);
      }
    }
  }

  form.addEventListener('submit', (event) => {
    const command = input.value.trim();
    if (!isVisitsCommand(command)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value = '';
    form.classList.remove('has-text');
    run(command);
  }, true);

  document.addEventListener('click', (event) => {
    const city = event.target.closest?.('[data-bt-city]');
    if (city) {
      event.preventDefault();
      event.stopImmediatePropagation();
      run(`city ${city.dataset.btCity} ${city.dataset.btCountry}`);
      return;
    }

    const trigger = event.target.closest?.('[data-command]');
    const command = trigger?.getAttribute('data-command') || '';
    if (!trigger || !isVisitsCommand(command)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    run(command);
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      return;
    }
    if (state.active && overlay.classList.contains('open')) refreshMonitor(state.generation);
  });

  new MutationObserver(() => {
    if (!overlay.classList.contains('open') && state.active) stopMonitor();
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

  window.BT_VISITS_TERMINAL = Object.freeze({
    run,
    renderSummary,
    renderNow,
    renderToday,
    renderPages,
    renderApps,
    renderClicks
  });
})();
