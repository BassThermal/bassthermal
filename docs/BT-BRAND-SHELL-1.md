# BassThermal Brand Shell and Brand Lab v3

## Purpose

This system gives every public BassThermal page one lowercase path identity while keeping experimental brand media independent from navigation and content.

## Public shell

The Worker injects versioned shell assets at the deployed HTML boundary for the homepage, products, Guides, publisher pages, and privacy pages. The runtime creates one `bt-site-header`, derives the visible path from the real route and page heading, removes only the known legacy breadcrumb nodes, and preserves the rest of each page.

The visual root is always `bassthermal`. Formal metadata remains `BassThermal`.

## Brand Lab

Brand Lab is an owner-only browser-local instrument. It loads on the homepage, with `?brandlab=1`, or after a local project has been activated. It supports independent header and background assets, image/GIF/video backgrounds, reduced-motion and mobile policies, direct repositioning, poster capture, and exact ZIP export/import.

Assets are stored as original `Blob` values in IndexedDB. Settings are stored in localStorage. No asset is uploaded or fetched from an external URL.

## Project package

`bassthermal.brand-project.v1` is a store-only ZIP package containing:

- `brand-manifest.json`
- original header/background/poster bytes under `assets/`
- `README.txt`

The importer validates paths, duplicate entries, CRC-32, allowed media types, byte counts, and SHA-256 before replacing the active project.

## Safety boundaries

- Navigation does not depend on Brand Lab.
- Background media is pointer-inert except during explicit reposition mode.
- Video is muted and pauses when the document is hidden.
- Reduced-motion and mobile policies can use a captured poster or hide media.
- `/brand disable` removes all visible media without removing the text shell.
- Legacy `/logo` aliases remain available during migration.

## Verification

Local executable gates:

- JavaScript syntax checks for the shell, loader, Brand Lab, and Worker entry.
- Deterministic route-model tests.
- Worker injection and idempotency tests.
- Brand Lab contract and no-network tests.
- Exact-byte stored-ZIP round trip.
- CRC corruption rejection.
- unsafe-path rejection.

Deployment verification uses `BT_VERIFY_BASE_URL=<preview> npm run verify:brand-shell`.
