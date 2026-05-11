window.BT_STORE_ASSETS = {
  generatedAt: null,
  source: 'manual-local-slots',
  note: 'Manual deterministic asset map. Drop files into public/assets/apps/<slug>/ and this manifest will use them. Missing files are allowed; the preview stays blank or falls back to icon only.',
  apps: {
    dualticker: {
      icon: {
        fallback: '/assets/apps/dualticker/icon.png',
        android: '/assets/apps/dualticker/icon.png',
        windows: '/assets/apps/dualticker/icon.png',
        web: '/assets/apps/dualticker/icon.png'
      },
      screenshots: {
        android: [
          '/assets/apps/dualticker/android/shot-01.png',
          '/assets/apps/dualticker/android/shot-02.png',
          '/assets/apps/dualticker/android/shot-03.png',
          '/assets/apps/dualticker/android/shot-04.png'
        ],
        windows: [
          '/assets/apps/dualticker/windows/shot-01.png',
          '/assets/apps/dualticker/windows/shot-02.png',
          '/assets/apps/dualticker/windows/shot-03.png',
          '/assets/apps/dualticker/windows/shot-04.png'
        ],
        web: [
          '/assets/apps/dualticker/web/shot-01.png',
          '/assets/apps/dualticker/web/shot-02.png'
        ]
      }
    },
    retrofy: {
      icon: { fallback: '/assets/apps/retrofy/icon.png', android: '/assets/apps/retrofy/icon.png', windows: '/assets/apps/retrofy/icon.png', web: null },
      screenshots: {
        android: ['/assets/apps/retrofy/android/shot-01.png', '/assets/apps/retrofy/android/shot-02.png', '/assets/apps/retrofy/android/shot-03.png', '/assets/apps/retrofy/android/shot-04.png'],
        windows: ['/assets/apps/retrofy/windows/shot-01.png', '/assets/apps/retrofy/windows/shot-02.png', '/assets/apps/retrofy/windows/shot-03.png', '/assets/apps/retrofy/windows/shot-04.png'],
        web: []
      }
    },
    'coptic-dictionary': {
      icon: { fallback: '/assets/apps/coptic-dictionary/icon.png', android: '/assets/apps/coptic-dictionary/icon.png', windows: '/assets/apps/coptic-dictionary/icon.png', web: null },
      screenshots: {
        android: ['/assets/apps/coptic-dictionary/android/shot-01.png', '/assets/apps/coptic-dictionary/android/shot-02.png', '/assets/apps/coptic-dictionary/android/shot-03.png', '/assets/apps/coptic-dictionary/android/shot-04.png'],
        windows: ['/assets/apps/coptic-dictionary/windows/shot-01.png', '/assets/apps/coptic-dictionary/windows/shot-02.png', '/assets/apps/coptic-dictionary/windows/shot-03.png', '/assets/apps/coptic-dictionary/windows/shot-04.png'],
        web: []
      }
    },
    'icon-pack-builder': {
      icon: { fallback: '/assets/apps/icon-pack-builder/icon.png', android: null, windows: '/assets/apps/icon-pack-builder/icon.png', web: null },
      screenshots: { android: [], windows: ['/assets/apps/icon-pack-builder/windows/shot-01.png', '/assets/apps/icon-pack-builder/windows/shot-02.png', '/assets/apps/icon-pack-builder/windows/shot-03.png', '/assets/apps/icon-pack-builder/windows/shot-04.png'], web: [] }
    },
    'favicon-harvester': {
      icon: { fallback: '/assets/apps/favicon-harvester/icon.png', android: null, windows: '/assets/apps/favicon-harvester/icon.png', web: null },
      screenshots: { android: [], windows: ['/assets/apps/favicon-harvester/windows/shot-01.png', '/assets/apps/favicon-harvester/windows/shot-02.png', '/assets/apps/favicon-harvester/windows/shot-03.png', '/assets/apps/favicon-harvester/windows/shot-04.png'], web: [] }
    },
    'isbn-manager': {
      icon: { fallback: '/assets/apps/isbn-manager/icon.png', android: null, windows: '/assets/apps/isbn-manager/icon.png', web: null },
      screenshots: { android: [], windows: ['/assets/apps/isbn-manager/windows/shot-01.png', '/assets/apps/isbn-manager/windows/shot-02.png', '/assets/apps/isbn-manager/windows/shot-03.png', '/assets/apps/isbn-manager/windows/shot-04.png'], web: [] }
    },
    'rss-finder': {
      icon: { fallback: '/assets/apps/rss-finder/icon.png', android: null, windows: null, web: '/assets/apps/rss-finder/icon.png' },
      screenshots: { android: [], windows: [], web: ['/assets/apps/rss-finder/web/shot-01.png', '/assets/apps/rss-finder/web/shot-02.png'] }
    }
  }
};

(() => {
  if (document.querySelector('script[data-bt-asset-preview]')) return;
  const script = document.createElement('script');
  script.src = '/asset-preview.js?v=stable-v6-manual';
  script.defer = true;
  script.dataset.btAssetPreview = '1';
  document.head.appendChild(script);
})();
