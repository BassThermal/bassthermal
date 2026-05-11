window.BT_STORE_ASSETS = {
  generatedAt: null,
  source: 'manual-local-config',
  platforms: ['android', 'windows', 'web'],
  slugs: [
    'dualticker',
    'retrofy',
    'coptic-dictionary',
    'icon-pack-builder',
    'favicon-harvester',
    'isbn-manager',
    'rss-finder'
  ]
};

(() => {
  if (document.querySelector('script[data-bt-asset-preview]')) return;
  const script = document.createElement('script');
  script.src = '/asset-preview.js?v=manual-local-v1';
  script.defer = true;
  script.dataset.btAssetPreview = '1';
  document.head.appendChild(script);
})();
