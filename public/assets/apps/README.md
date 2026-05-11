# BassThermal manual app assets

The website uses a deterministic manual asset map. Do not run crawlers. Do not commit scraped `.img` files.

Drop verified images into these folders.

## Naming

Use these names exactly:

- `icon.png` at the app root
- `android/shot-01.png`, `android/shot-02.png`, ...
- `windows/shot-01.png`, `windows/shot-02.png`, ...
- `web/shot-01.png`, `web/shot-02.png`, ...

PNG is the canonical format. Keep screenshots reasonably compressed.

## Folders

```txt
public/assets/apps/
  dualticker/
    icon.png
    android/shot-01.png
    windows/shot-01.png
    web/shot-01.png
  retrofy/
    icon.png
    android/shot-01.png
    windows/shot-01.png
  coptic-dictionary/
    icon.png
    android/shot-01.png
    windows/shot-01.png
  icon-pack-builder/
    icon.png
    windows/shot-01.png
  favicon-harvester/
    icon.png
    windows/shot-01.png
  isbn-manager/
    icon.png
    windows/shot-01.png
  rss-finder/
    icon.png
    web/shot-01.png
```

If an expected file is missing, the preview simply skips/falls back. Missing files are allowed.
