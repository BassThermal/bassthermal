(() => {
  'use strict';
  if (!document.querySelector('.terminal.home')) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const input = args[0];
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.includes('/api/visits/summary') || !response.ok) return response;
    try {
      const data = await response.clone().json();
      if (!data?.ok || !data.totals) return response;
      data.totals.activeBrowserSessions = data.totals.activeSessions;
      data.totals.activeSessions = data.totals.activePeople ?? data.totals.activeSessions;
      data.totals.browserSessionsToday = data.totals.sessionsToday;
      data.totals.sessionsToday = data.totals.visitorsToday ?? data.totals.sessionsToday;
      data.totals.tabTimeTodayMs = data.totals.visibleTodayMs ?? data.totals.tabTimeTodayMs;
      data.totals.tabTimeTodayLabel = data.totals.visibleTodayLabel ?? data.totals.tabTimeTodayLabel;
      return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch {
      return response;
    }
  };

  const relabel = (root = document) => {
    for (const node of root.querySelectorAll?.('.visits-k') || []) {
      const value = node.textContent.trim();
      if (value === 'act') node.textContent = 'people';
      else if (value === 'today') node.textContent = 'visitors';
      else if (value === 'tab') node.textContent = 'time';
    }
  };
  const log = document.getElementById('log');
  if (log) new MutationObserver(() => relabel(log)).observe(log, { childList: true, subtree: true });
})();
