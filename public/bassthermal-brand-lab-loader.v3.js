(() => {
  'use strict';
  const ACTIVE_KEY = 'bt.brand.lab.active.v3';
  const isHomepage = location.pathname === '/' || location.pathname === '/index.html';
  let active = false;
  try {
    active = new URLSearchParams(location.search).get('brandlab') === '1' || localStorage.getItem(ACTIVE_KEY) === '1';
  } catch (error) {}
  if (!isHomepage && !active) return;
  if (document.querySelector('script[data-bt-brand-lab-runtime]')) return;
  const script = document.createElement('script');
  script.src = '/bassthermal-brand-lab.v3.js?v=3';
  script.defer = true;
  script.dataset.btBrandLabRuntime = '1';
  document.head.appendChild(script);
})();
