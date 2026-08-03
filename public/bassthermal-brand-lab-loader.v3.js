(() => {
  'use strict';

  const ACTIVE_KEY = 'bt.brand.lab.active.v3';
  const RUNTIME = '/bassthermal-brand-lab.v3.js?v=3';
  let loadPromise = null;

  function parseCommand(raw) {
    const parts = String(raw || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length || !['/brand', 'brand', '/logo', 'logo'].includes(parts[0])) return null;
    return parts;
  }

  function loadRuntime() {
    if (window.BT_BRAND_LAB) return Promise.resolve(window.BT_BRAND_LAB);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-bt-brand-lab-runtime]');
      const script = existing || document.createElement('script');
      const finish = () => window.BT_BRAND_LAB
        ? resolve(window.BT_BRAND_LAB)
        : reject(new Error('Brand Lab loaded without its public API'));
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

  async function activate(action = 'open') {
    const api = await loadRuntime();
    document.querySelector('#btBrandBackground[data-default="1"]')?.remove();
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
