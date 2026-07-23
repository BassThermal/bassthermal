window.BT_STORE_ASSETS = {
  "generatedAt": "2026-07-23T02:31:34.390Z",
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
    "courselab-beam": {
      "icon": {
        "fallback": "/assets/apps/courselab-beam/app.png",
        "android": null,
        "windows": null,
        "web": null
      },
      "screenshots": {
        "android": [],
        "windows": [
          "/assets/apps/courselab-beam/windows/shot-01.png",
          "/assets/apps/courselab-beam/windows/shot-02.png",
          "/assets/apps/courselab-beam/windows/shot-03.png",
          "/assets/apps/courselab-beam/windows/shot-04.png",
          "/assets/apps/courselab-beam/windows/shot-05.png",
          "/assets/apps/courselab-beam/windows/shot-06.png"
        ],
        "web": []
      }
    },
    "docbatch-pdf-converter": {
      "icon": {
        "fallback": "/assets/apps/docbatch-pdf-converter/app.png",
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
        "fallback": "/assets/apps/favicon-harvester/app.png",
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
    "rss-crawler": {
      "icon": {
        "fallback": "/assets/apps/rss-crawler/icon.png",
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
    "website-image-inventory": {
      "icon": {
        "fallback": "/assets/apps/website-image-inventory/app.png",
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

(() => {
  const styles = [
    ['/app-icons.css?v=2', 'icons'],
    ['/home-visual.css?v=2', 'home']
  ];
  for (const [href, key] of styles) {
    const selector = 'link[data-bt-app-icon-runtime="' + key + '"]';
    if (document.querySelector(selector)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-bt-app-icon-runtime', key);
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-bt-app-icon-runtime]')) {
    const script = document.createElement('script');
    script.src = '/app-icon-hydrator.js?v=2';
    script.defer = true;
    script.setAttribute('data-bt-app-icon-runtime', '1');
    document.head.appendChild(script);
  }
})();
