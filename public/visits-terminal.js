(() => {
  'use strict';

  const home = document.querySelector('.terminal.home');
  const log = document.getElementById('log');
  const form = document.getElementById('form');
  const input = document.getElementById('cmd');
  const overlay = document.getElementById('terminalOverlay');
  if (!home || !log || !form || !input || !overlay) return;

  const REFRESH_MS = 15000;
  const state = { active: false, timer: null, block: null, body: null, inFlight: false, lastData: null };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const safe = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : value;
  const commandLine = (text) => `<div class="line"><span class="prompt">bt:~$</span> ${esc(text)}</div>`;
  const normalize = (text) => String(text || '').trim().toLowerCase().replace(/^\//, '').replace(/\s+/g, ' ');
  const isVisitsCommand = (text) => {
    const value = normalize(text);
    return value === 'visits' || value === 'visits now' || value === 'visits today' || value === 'visits pages' || value === 'visits apps' || value === 'visits clicks' || value === 'visits health' || value === 'visits off' || /^city\s+.+\s+[a-z]{2,3}$/i.test(value);
  };

  function showTerminal() {
    overlay.classList.add('open', 'is-tall');
    form.classList.add('is-active');
  }

  function stopMonitor() {
    state.active = false;
    state.inFlight = false;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
  }

  function createBlock(command) {
    [...log.querySelectorAll('.cmd-block')].forEach((block) => block.classList.add('past'));
    const block = document.createElement('div');
    block.className = 'cmd-block bt-visits-command';
    block.innerHTML = commandLine(command);
    const body = document.createElement('div');
    body.className = 'bt-visits-body';
    body.innerHTML = '<div class="line dim">loading visits…</div>';
    block.appendChild(body);
    log.appendChild(block);
    log.scrollTop = log.scrollHeight;
    state.block = block;
    state.body = body;
    return body;
  }

  async function requestJson(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { accept: 'application/json', 'cache-control': 'no-store' }
      });
      const type = response.headers.get('content-type') || '';
      if (!type.includes('application/json')) throw new Error(`unexpected ${type.split(';')[0] || 'response'}`);
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  const generatedTime = (data) => {
    const date = new Date(data?.generatedAt || '');
    return Number.isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const metric = (label, value) => `<span class="bt-visits-metric"><span class="bt-visits-key">${esc(label)}</span><strong>${esc(safe(value, 0))}</strong></span>`;
  const sectionTitle = (label) => `<div class="bt-visits-section-title">${esc(label)}</div>`;
  const empty = (text = 'none') => `<div class="bt-visits-empty">${esc(text)}</div>`;

  function activeRows(data) {
    const rows = Array.isArray(data?.activeSessions) ? data.activeSessions : [];
    if (!rows.length) return empty('nobody active in the last 90 seconds');
    return `<div class="bt-visits-table bt-visits-active-table">
      <div class="bt-visits-row bt-visits-head-row"><span>city</span><span>device</span><span>page</span><span>age</span></div>
      ${rows.map((row) => `<div class="bt-visits-row">
        <span class="bt-visits-city">${esc(`${safe(row.city, 'Unknown')} ${safe(row.country, '')}`.trim())}</span>
        <span class="bt-visits-device">${esc(safe(row.device))}</span>
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
        <span class="bt-visits-city">${esc(`${safe(row.city, 'Unknown')} ${safe(row.country, '')}`.trim())}</span>
        <span class="bt-visits-num">${esc(safe(row.visitors, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.sessions, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.pageViews, 0))}</span>
        <span class="bt-visits-num">${esc(safe(row.visibleLabel ?? row.tabTimeLabel, '0s'))}</span>
        <span class="bt-visits-num">${esc(safe(row.lastSeenTime, '--:--'))}</span>
      </a>`).join('')}
    </div>`;
  }

  function clickRows(data, limit = 6) {
    const rows = (data?.clicksToday || []).slice(0, limit);
    if (!rows.length) return '';
    return `${sectionTitle('CLICKS TODAY')}<div class="bt-visits-list">${rows.map((row) => {
      const action = safe(row.action, 'external_open').replaceAll('_', ' ');
      const label = row.appSlug ? `${row.appSlug} · ${action}` : action;
      return `<div class="bt-visits-list-row"><span>${esc(label)}</span><strong>${esc(safe(row.clicks, 0))}</strong></div>`;
    }).join('')}</div>`;
  }

  function renderSummary(data) {
    const totals = data?.totals || {};
    const activePeople = totals.activePeople ?? 0;
    const activeSessions = totals.activeSessions ?? (Array.isArray(data?.activeSessions) ? data.activeSessions.length : 0);
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● LIVE</span><span>${esc(generatedTime(data))}</span><span class="bt-visits-muted">active ≤90s · refresh 15s</span></div>
      ${sectionTitle('NOW')}
      <div class="bt-visits-metrics">${metric('people', activePeople)}${metric('sessions', activeSessions)}</div>
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
    if (!rows.length) return `<div class="bt-visits">${sectionTitle(title)}${empty()}</div>`;
    return `<div class="bt-visits">${sectionTitle(title)}<div class="bt-visits-table bt-visits-simple-table" style="--bt-cols:${columns.map((column) => column.width || '1fr').join(' ')}">
      <div class="bt-visits-row bt-visits-head-row">${columns.map((column) => `<span>${esc(column.label)}</span>`).join('')}</div>
      ${rows.map((row) => `<div class="bt-visits-row">${columns.map((column) => `<span class="${column.numeric ? 'bt-visits-num' : ''}">${esc(safe(row[column.key], column.fallback ?? '—'))}</span>`).join('')}</div>`).join('')}
    </div></div>`;
  }

  function renderPages(data) {
    return renderSimpleTable('PAGES TODAY', [
      { label: 'page', key: 'path', width: 'minmax(0,1fr)' },
      { label: 'views', key: 'views', width: '64px', numeric: true },
      { label: 'people', key: 'visitors', width: '64px', numeric: true },
      { label: 'last', key: 'lastSeenTime', width: '78px', numeric: true }
    ], data?.pagesToday || []);
  }

  function renderApps(data) {
    return renderSimpleTable('APPS TODAY', [
      { label: 'app', key: 'appSlug', width: 'minmax(0,1fr)' },
      { label: 'views', key: 'views', width: '64px', numeric: true },
      { label: 'clicks', key: 'clicks', width: '64px', numeric: true },
      { label: 'last', key: 'lastSeenTime', width: '78px', numeric: true }
    ], data?.appsToday || []);
  }

  function renderClicks(data) {
    const rows = (data?.clicksToday || []).map((row) => ({
      label: row.appSlug ? `${row.appSlug} · ${safe(row.action, 'external_open').replaceAll('_', ' ')}` : safe(row.action, 'external_open').replaceAll('_', ' '),
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
    const checks = data?.checks || [];
    return `<div class="bt-visits">${sectionTitle('VISITS HEALTH')}<div class="bt-visits-list">${checks.map((check) => `<div class="bt-visits-list-row"><span>${esc(check.name)}</span><strong class="${check.ok ? 'bt-visits-ok' : 'bt-visits-bad'}">${check.ok ? 'ok' : 'failed'}</strong></div>`).join('')}</div></div>`;
  }

  function renderCity(data) {
    const totals = data?.totals || {};
    return `<div class="bt-visits">
      <div class="bt-visits-status"><span class="bt-visits-live">● CITY</span><strong>${esc(`${safe(data.city)} ${safe(data.country, '')}`.trim())}</strong><span>${esc(generatedTime(data))}</span></div>
      <div class="bt-visits-metrics">${metric('visitors', totals.visitors ?? 0)}${metric('sessions', totals.sessions ?? 0)}${metric('views', totals.pageViews ?? 0)}${metric('clicks', totals.clicks ?? 0)}${metric('time', totals.visibleLabel ?? totals.tabTimeLabel ?? '0s')}${metric('last', totals.lastSeenTime ?? '--:--')}</div>
    </div>`;
  }

  function renderError(error) {
    const previous = state.lastData ? renderSummary(state.lastData) : '';
    return `${previous}<div class="bt-visits-error">STALE · ${esc(error?.message || 'visits unavailable')}</div>`;
  }

  function schedule() {
    if (!state.active) return;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(refreshMonitor, REFRESH_MS);
  }

  async function refreshMonitor() {
    if (!state.active || state.inFlight || !state.body) return;
    state.inFlight = true;
    try {
      const data = await requestJson('/api/visits/summary');
      state.lastData = data;
      state.body.innerHTML = renderSummary(data);
    } catch (error) {
      state.body.innerHTML = renderError(error);
    } finally {
      state.inFlight = false;
      schedule();
    }
  }

  async function run(command) {
    const normalized = normalize(command);
    showTerminal();
    if (normalized === 'visits off') {
      stopMonitor();
      const body = createBlock(command);
      body.innerHTML = '<div class="line dim">visits monitor stopped</div>';
      return;
    }

    stopMonitor();
    const body = createBlock(command);
    try {
      if (/^city\s+.+\s+[a-z]{2,3}$/i.test(normalized)) {
        const match = normalized.match(/^city\s+(.+)\s+([a-z]{2,3})$/i);
        const data = await requestJson(`/api/visits/city?city=${encodeURIComponent(match[1])}&country=${encodeURIComponent(match[2].toUpperCase())}`);
        body.innerHTML = renderCity(data);
        return;
      }
      if (normalized === 'visits health') {
        body.innerHTML = renderHealth(await requestJson('/api/visits/health'));
        return;
      }
      const data = await requestJson('/api/visits/summary');
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
        schedule();
      }
    } catch (error) {
      body.innerHTML = renderError(error);
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
    if (document.visibilityState === 'visible' && state.active && !state.inFlight) refreshMonitor();
  });

  window.BT_VISITS_TERMINAL = Object.freeze({ run, renderSummary, renderNow, renderToday, renderPages, renderApps, renderClicks });
})();
