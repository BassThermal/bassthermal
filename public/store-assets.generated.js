window.BT_STORE_ASSETS = {
  "generatedAt": "2026-05-19T04:33:01.234Z",
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
          "/assets/apps/coptic-dictionary/windows/shot-01.png",
          "/assets/app-preview-cache/coptic-dictionary/windows/001.jpg"
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
    "favicon-harvester": {
      "icon": {
        "fallback": "/og/favicon-harvester.png",
        "android": null,
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [],
        "windows": [],
        "web": []
      }
    },
    "icon-pack-builder": {
      "icon": {
        "fallback": "/assets/apps/icon-pack-builder/icon.png",
        "android": null,
        "windows": "/assets/apps/icon-pack-builder/windows/icon.png",
        "web": null
      },
      "screenshots": {
        "android": [],
        "windows": [
          "/assets/apps/icon-pack-builder/windows/shot-1.png",
          "/assets/apps/icon-pack-builder/windows/shot-2.png"
        ],
        "web": []
      }
    },
    "isbn-manager": {
      "icon": {
        "fallback": "/assets/apps/isbn-manager/icon.png",
        "android": null,
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
    },
    "rss-finder": {
      "icon": {
        "fallback": "/og/rss-finder.png",
        "android": null,
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [],
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
