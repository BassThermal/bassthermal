# BassThermal app assets

Use the canonical app slug from `data/bt-catalog.json`.

```text
public/assets/apps/<app-slug>/
  icon.png or app.png
  windows/
    shot-01.png
    shot-02.png
  android/
    shot-01.png
  web/
    shot-01.png
```

## Owner workflow

1. Add, replace, rename, move, or delete images in GitHub.
2. Keep the app icon directly in the app folder as `icon.*` or `app.*`.
3. Put screenshots inside `windows`, `android`, or `web`.
4. Commit the change.

GitHub then validates the folders and refreshes `public/store-assets.generated.js` automatically. You do not need to run an asset-manifest command locally.

If a screenshot is accidentally placed directly in the app folder, the check fails with the exact app and filename to move. It no longer fails silently.

## Supported assets

Browser icons: PNG, WebP, JPG/JPEG, or safe SVG. `.ico` can remain as a source file but is not used as a browser screenshot.

Screenshots: PNG, WebP, JPG/JPEG, GIF, or AVIF. Files named `icon.*` or `app.*` are treated as icons, not screenshots.

Example:

```text
public/assets/apps/courselab-beam/app.png
public/assets/apps/courselab-beam/windows/shot-01.png
public/assets/apps/courselab-beam/windows/shot-02.png
public/assets/apps/courselab-beam/android/shot-01.webp
```
