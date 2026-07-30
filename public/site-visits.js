(() => {
  'use strict';
  if (window.BT_SITE_VISITS || document.querySelector('.terminal.home')) return;
  window.BT_SITE_VISITS = true;

  const SESSION_KEY = 'bt_visit_session_id';
  const HEARTBEAT_MS = 30000;
  const getSessionId = () => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };
  const appSlug = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[0] === 'apps' && parts[1] ? parts[1] : '';
  };
  const actionFor = (anchor) => {
    const href = anchor.href || '';
    const host = anchor.hostname || '';
    const slug = anchor.closest('[data-app-slug]')?.dataset.appSlug || appSlug();
    if (host === 'apps.microsoft.com') return slug ? 'install_windows' : 'store_hub_windows';
    if (host === 'play.google.com') return slug ? 'install_android' : 'store_hub_android';
    if (host === 'dualticker.com' || host === 'www.dualticker.com') return 'open_web_app';
    if (href.includes('/guides/')) return 'guide_open';
    if (href.includes('/apps/')) return 'product_open';
    return '';
  };
  const send = (type, extra = {}) => {
    const payload = {
      type,
      sessionId: getSessionId(),
      path: location.pathname,
      sourcePath: location.pathname,
      appSlug: appSlug(),
      referrer: document.referrer || '',
      visible: document.visibilityState === 'visible',
      ...extra
    };
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/visit', new Blob([body], { type: 'application/json' }))) return;
    } catch {}
    fetch('/api/visit', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  };

  send('pageview');
  const heartbeat = () => { if (document.visibilityState === 'visible') send('heartbeat'); };
  setInterval(heartbeat, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', heartbeat);
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const action = actionFor(anchor);
    if (!action) return;
    send('click', { action, target: anchor.href, appSlug: anchor.closest('[data-app-slug]')?.dataset.appSlug || appSlug() });
  }, true);
})();
