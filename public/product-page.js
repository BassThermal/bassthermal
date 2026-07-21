(() => {
  const body = document.body;
  const slug = body && body.dataset ? body.dataset.appSlug : '';
  const header = document.querySelector('.product-header');
  const img = document.querySelector('.product-icon');
  const apps = window.BT_STORE_ASSETS && window.BT_STORE_ASSETS.apps;
  const fallback = slug && apps && apps[slug] && apps[slug].icon && apps[slug].icon.fallback;
  if (!header || !img || typeof fallback !== 'string' || !fallback) return;
  img.addEventListener('load', () => {
    header.classList.add('has-product-icon');
  }, { once: true });
  img.addEventListener('error', () => {
    img.removeAttribute('src');
  }, { once: true });
  img.src = fallback;
})();
