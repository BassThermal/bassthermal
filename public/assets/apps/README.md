# BassThermal manual app assets

Drop icons/screenshots directly into `public/assets/apps/<slug>/`.

- No crawlers.
- No Playwright.
- No app-store scraping.
- No `.img` placeholder files.

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

Screenshots are **any** `png/webp/jpg/jpeg` inside platform folders except `icon.*`.

Examples:

- `public/assets/apps/<slug>/android/shot-08.webp`
- `public/assets/apps/<slug>/android/anything-reasonable.png`
- `public/assets/apps/<slug>/windows/screen-2.jpg`

No exact `shot-01` requirement anymore.

## Manifest build

Manifest is generated from local files only:

- Script: `tools/build-asset-manifest.mjs`
- Output: `public/store-assets.generated.js`

Build commands:

- `npm run assets:index`
- `npm run dev` (builds manifest first)
- `npm run deploy` (builds manifest first)
