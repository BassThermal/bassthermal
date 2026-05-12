# BassThermal manual app assets

Drop screenshots here:

`public/assets/apps/<slug>/<platform>/`

Platforms:

- `windows`
- `android`
- `web`

Any valid image in those folders becomes a screenshot:

- `png`
- `jpg` / `jpeg`
- `webp`
- `gif`
- `avif`
- weird/no-extension image files may be normalized automatically

Rules:

- Files named like `icon.*` are treated as icons, not screenshots.
- `.ico` and `.icns` are ignored for screenshots.
- Dotfiles and non-image junk are skipped.

Icons:

- `icon.png` / `icon.webp` / `icon.jpg` / `icon.jpeg` at app root or platform folder
- `.ico` can exist as an icon source signal, but is ignored as screenshot

Examples:

- `public/assets/apps/icon-pack-builder/windows/shot-01.png`
- `public/assets/apps/icon-pack-builder/windows/my-export-screen.png`
- `public/assets/apps/icon-pack-builder/windows/apps.27766.weirdfile`

All should work as screenshots if image data is valid.

## Manifest build

Manifest is generated from local files only:

- Script: `tools/build-asset-manifest.mjs`
- Output: `public/store-assets.generated.js`
- Normalized weird-image cache: `public/assets/app-preview-cache/`

To regenerate:

- `npm run assets:index`

Deploy/dev already regenerate automatically through package.json scripts.
