# BassThermal manual app assets

Use the canonical catalog slug from `data/bt-catalog.json` for every asset folder, even when the public product name changes.

## Icons

Preferred browser icon:

`public/assets/apps/<slug>/icon.png`

Platform-specific icons, only when needed:

`public/assets/apps/<slug>/<platform>/icon.png`

Supported browser icon names include `icon.png`, `icon.webp`, `icon.jpg`, `icon.jpeg`, and safe `icon.svg` files. `.ico` may remain as a source/reference file but is not used as a browser screenshot.

## Screenshots

Drop screenshots here:

`public/assets/apps/<slug>/<platform>/`

Platforms:

- `windows`
- `android`
- `web`

Examples:

- `public/assets/apps/icon-pack-builder/windows/shot-01.png`
- `public/assets/apps/retrofy/android/shot-02.webp`
- `public/assets/apps/rss-finder/windows/shot-01.png`

Any valid PNG, JPG/JPEG, WebP, GIF, or AVIF in a platform folder becomes a screenshot. Weird or extensionless image files may be normalized automatically.

Rules:

- Files named `icon.*` are icons, not screenshots.
- `.ico` and `.icns` are ignored as screenshots.
- Dotfiles and non-image junk are skipped.
- Do not create a second asset folder when a product is renamed publicly.

RSS example:

- Public name: `RSS Crawler`
- Canonical slug: `rss-finder`
- Product route: `/apps/rss-finder/`
- Asset root: `public/assets/apps/rss-finder/`

## Manifest build

The manifest is generated from local files:

- Script: `tools/build-asset-manifest.mjs`
- Output: `public/store-assets.generated.js`
- Normalized image cache: `public/assets/app-preview-cache/`

Regenerate manually with:

`npm run assets:index`

Normal development, build, and deploy commands also regenerate the manifest.
