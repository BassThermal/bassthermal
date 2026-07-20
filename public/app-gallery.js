(() => {
  'use strict';
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  ready(() => {
    const slug = document.body.dataset.appSlug;
    const mount = document.querySelector('[data-app-gallery]');
    if (!slug || !mount || !window.BT_APP_ASSETS) return;
    const shots = window.BT_APP_ASSETS.screenshots(slug);
    if (!shots.length) return;
    mount.hidden = false;
    mount.innerHTML = '<div class="label">screenshots</div><div class="gallery-grid"></div>';
    const grid = mount.querySelector('.gallery-grid');
    shots.forEach((shot, i) => {
      const b = document.createElement('button'); b.className = 'gallery-shot'; b.type = 'button';
      const img = document.createElement('img'); img.src = shot.src; img.loading = 'lazy'; img.alt = `${slug.replaceAll('-', ' ')} ${shot.platform} screenshot ${i + 1}`;
      b.appendChild(img); b.addEventListener('click', () => openViewer(shot.src, img.alt)); grid.appendChild(b);
    });
  });
  function openViewer(src, alt) {
    const v = document.createElement('div'); v.className = 'gallery-viewer';
    v.innerHTML = '<button class="gallery-close" type="button" aria-label="Close screenshot">×</button>';
    const img = document.createElement('img'); img.src = src; img.alt = alt; v.appendChild(img); document.body.appendChild(v);
    const close = () => { v.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    v.querySelector('button').addEventListener('click', close); v.addEventListener('click', (e) => { if (e.target === v) close(); }); document.addEventListener('keydown', onKey);
  }
})();
