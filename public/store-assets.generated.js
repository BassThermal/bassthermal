window.BT_STORE_ASSETS = {
  "generatedAt": "2026-05-11T21:55:36.965Z",
  "source": "tools/build-asset-manifest.mjs manual-local-scan",
  "apps": {
    "coptic-dictionary": {
      "icon": {
        "fallback": "/assets/apps/coptic-dictionary/android/icon.png",
        "android": "/assets/apps/coptic-dictionary/android/icon.png",
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [
          "/assets/apps/coptic-dictionary/android/shot-08.webp",
          "/assets/apps/coptic-dictionary/android/shot-09.webp",
          "/assets/apps/coptic-dictionary/android/shot-10.webp"
        ],
        "windows": [
          "/assets/apps/coptic-dictionary/windows/shot-01.png"
        ],
        "web": []
      }
    },
    "dualticker": {
      "icon": {
        "fallback": "/assets/apps/dualticker/android/icon.png",
        "android": "/assets/apps/dualticker/android/icon.png",
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [],
        "windows": [],
        "web": []
      }
    },
    "retrofy": {
      "icon": {
        "fallback": "/assets/apps/retrofy/android/icon.png",
        "android": "/assets/apps/retrofy/android/icon.png",
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [
          "/assets/apps/retrofy/android/shot-08.webp",
          "/assets/apps/retrofy/android/shot-09.webp",
          "/assets/apps/retrofy/android/shot-10.webp"
        ],
        "windows": [],
        "web": []
      }
    }
  }
};

(() => {
  if (document.querySelector('script[data-bt-asset-preview]')) return;
  const script = document.createElement('script');
  script.src = '/asset-preview.js?v=manual-index-v2';
  script.defer = true;
  script.dataset.btAssetPreview = '1';
  document.head.appendChild(script);
})();
