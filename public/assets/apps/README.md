# BassThermal manual app assets

Drop image files directly into `public/assets/apps/<slug>/`.

- No crawlers.
- No Playwright.
- No app-store scraping.
- Missing assets simply do not display.

## Supported platforms

- `android`
- `windows`
- `web`

## Icon rules

Accepted icon formats: `png`, `webp`, `jpg`, `jpeg`.

- Root icon (fallback):
  - `public/assets/apps/<slug>/icon.png`
  - `public/assets/apps/<slug>/icon.webp`
  - `public/assets/apps/<slug>/icon.jpg`
  - `public/assets/apps/<slug>/icon.jpeg`
- Platform icon:
  - `public/assets/apps/<slug>/android/icon.png` (or webp/jpg/jpeg)
  - `public/assets/apps/<slug>/windows/icon.png` (or webp/jpg/jpeg)
  - `public/assets/apps/<slug>/web/icon.png` (or webp/jpg/jpeg)

## Screenshot rules

Screenshots are any `png/webp/jpg/jpeg` file inside `android/`, `windows/`, or `web/` except `icon.*`.

Examples:

- `public/assets/apps/<slug>/android/shot-08.webp`
- `public/assets/apps/<slug>/android/anything-reasonable.png`
- `public/assets/apps/<slug>/windows/screen-2.jpg`

Exact `shot-01` is no longer required.

## Manifest build

Manifest is generated from local files only:

- Script: `tools/build-asset-manifest.mjs`
- Output: `public/store-assets.generated.js`

Build commands:

- `npm run assets:index`
- `npm run dev` (auto-runs `npm run assets:index` first)
- `npm run deploy` (auto-runs `npm run assets:index` first)
