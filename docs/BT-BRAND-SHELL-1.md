# BassThermal Brand Shell and Brand Lab v3

## Purpose

This system gives every public BassThermal page one lowercase path identity, one stable navigation rail, and one selected visual brand while keeping Brand Lab experiments isolated from navigation and content.

## Selected brand

The owner-selected Brand Lab project is recorded in `data/bt-brand-selection.v1.json`.

Its source PNG is preserved by SHA-256 in the selection record. The deployed asset is a cropped 512 × 512 WebP at:

`/assets/brand/bassthermal-mark-v1.webp`

Cropping removes the original canvas's unused transparent area. The selected mark itself is unchanged; the header size and offsets are normalized for the cropped asset rather than blindly copying source-project pixel values.

The same selected mark is intentionally reused as the subtle atmospheric page background.

## Public shell

`tools/build-public-brand-shell.mjs` is the final static build owner for the public identity. It runs after the catalogue, content, homepage, publisher, accent and feed builders and writes the complete shell into every supported `public/**/index.html` route before Wrangler uploads the asset directory.

The built HTML itself contains:

- the selected mark beside `bassthermal`;
- the route path and shared navigation;
- the permanent background layer;
- the favicon contract;
- the shell stylesheet;
- only the lightweight experimental Brand Lab command loader.

The Worker does not create, replace or repair public HTML. Public routes remain Worker-first only so canonical-host and legacy redirects can execute; after redirect handling, the Worker returns the already-built static asset unchanged. Visits and report APIs remain Worker-owned.

The desktop shell is a 52 px minimum-height sticky rail aligned to the page content edges. It uses an almost-opaque black surface, a restrained divider and shadow, a 32 px mark, a lowercase wordmark, and one vertically centered navigation row.

At 900 px and below, the path and navigation become two compact rows. At 520 px and below, spacing and type reduce again without introducing a hamburger menu or horizontal scrolling. Scroll padding and target margins prevent sticky-header anchor obstruction.

The visual root is always `bassthermal`. Formal metadata remains `BassThermal`.

## Permanent background

The selected background is built into the initial HTML and is pointer-inert. The desktop defaults preserve the selected project values for opacity, scale, focal point, blur and readability mask. Mobile receives a more conservative crop and stronger mask.

The sticky rail uses an independent nearly opaque surface so background media cannot make navigation muddy or unreadable.

## Brand Lab

Brand Lab is an owner-only browser-local experiment. The full editor is not loaded during an ordinary visit and a stored experiment never auto-applies on reload.

The lightweight loader intercepts `/brand` and legacy `/logo` commands. `?brandlab=1` is the only URL-based automatic activation. On explicit activation it:

1. Loads the committed same-origin selected asset.
2. Verifies its exact byte count and SHA-256.
3. Seeds missing header and background records into IndexedDB in one transaction.
4. Seeds settings only when no local Brand Lab settings already exist.
5. Removes the permanent static background before the editor takes ownership.
6. Loads Brand Lab and restores the verified local project.

Existing local projects are not overwritten. Closing or reloading the ordinary website returns to the same public brand every visitor receives.

Brand Lab supports independent header and background assets, image/GIF/video backgrounds, reduced-motion and mobile policies, direct repositioning, poster capture, and exact ZIP export/import.

Assets are stored as original `Blob` values in IndexedDB. Settings are stored in localStorage. No asset is uploaded and no third-party asset URL is fetched.

## Project package

`bassthermal.brand-project.v1` is a store-only ZIP package containing:

- `brand-manifest.json`
- original header/background/poster bytes under `assets/`
- `README.txt`

The importer validates paths, duplicate entries, CRC-32, allowed media types, byte counts, and SHA-256 before replacing the active project.

## Safety boundaries

- Navigation does not depend on Brand Lab.
- The selected header and background are present in built HTML before JavaScript runs.
- Background media is pointer-inert except during explicit Brand Lab reposition mode.
- Video is muted and pauses when the document is hidden.
- Reduced-motion and mobile policies can use a captured poster or hide media.
- Legacy `/logo` aliases remain available during migration.
- A failed or unused Brand Lab cannot remove or rebuild the universal navigation.
- Stored Brand Lab state cannot silently change what an ordinary visitor sees.

## Verification

Executable gates cover:

- static shell build and validation across all supported routes;
- deterministic route models;
- exactly one site header, background, favicon, stylesheet and experimental loader;
- absence of legacy top-line, product and Guide identities;
- absence of the runtime public-shell script;
- sticky, compact and anchor-offset CSS contracts;
- selected asset path, byte count and SHA-256 identity;
- explicit-only Brand Lab activation and exact default seeding;
- Worker pass-through ownership with public redirect routes and `/api/*` handling;
- Brand Lab video continuity and transactional project imports;
- exact-byte stored-ZIP round trip;
- CRC corruption and unsafe-path rejection.

Deployment verification uses:

`BT_VERIFY_BASE_URL=<preview> npm run verify:brand-shell`
