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

The Worker renders the complete shell into each HTML response before JavaScript executes. This prevents an uppercase or legacy breadcrumb flash and leaves the identity and navigation usable when JavaScript is unavailable.

The desktop shell is a 60 px minimum-height sticky rail aligned to the page content edges. It uses an almost-opaque black surface, a restrained divider and shadow, a 38 px mark, a lowercase wordmark, and one vertically centered navigation row.

At 900 px and below, the path and navigation become two compact rows. At 520 px and below, spacing and type reduce again without introducing a hamburger menu or horizontal scrolling. Scroll padding and target margins prevent sticky-header anchor obstruction.

The visual root is always `bassthermal`. Formal metadata remains `BassThermal`.

## Permanent background

The selected background is rendered in the initial HTML response and is pointer-inert. The desktop defaults preserve the selected project values for opacity, scale, focal point, blur and readability mask. Mobile receives a more conservative crop and stronger mask.

The sticky rail uses an independent nearly opaque surface so background media cannot make navigation muddy or unreadable.

## Brand Lab

Brand Lab is an owner-only browser-local instrument. The full editor is not loaded during an ordinary visit.

The lightweight loader intercepts `/brand` and legacy `/logo` commands. On first activation it:

1. Loads the committed same-origin selected asset.
2. Verifies its exact byte count and SHA-256.
3. Seeds missing header and background records into IndexedDB in one transaction.
4. Seeds settings only when no local Brand Lab settings already exist.
5. Removes the permanent static background before the editor takes ownership.
6. Loads Brand Lab and restores the verified local project.

Existing local projects are not overwritten. `?brandlab=1` and the local active-project flag restore the editor on subsequent routes.

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
- The selected header and background are present before deferred JavaScript runs.
- Background media is pointer-inert except during explicit Brand Lab reposition mode.
- Video is muted and pauses when the document is hidden.
- Reduced-motion and mobile policies can use a captured poster or hide media.
- `/brand disable` removes all visible media without removing the text shell.
- Legacy `/logo` aliases remain available during migration.
- A failed Brand Lab load cannot remove or rebuild the universal navigation.

## Verification

Executable gates cover:

- JavaScript syntax for the shell, loader, Brand Lab and Worker entry.
- Deterministic route models.
- Static response rendering and idempotency.
- Exactly one site header and one permanent background.
- Sticky, compact and anchor-offset CSS contracts.
- Selected asset path, byte count and SHA-256 identity.
- Lazy Brand Lab command interception and exact default seeding.
- Brand Lab video continuity and transactional project imports.
- Exact-byte stored-ZIP round trip.
- CRC corruption and unsafe-path rejection.

Deployment verification uses:

`BT_VERIFY_BASE_URL=<preview> npm run verify:brand-shell`
