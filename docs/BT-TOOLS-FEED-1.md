# BT-TOOLS-FEED-1

## Purpose
`BT-TOOLS-FEED-1` is a static JSON feed (`/bt-tools-feed.v1.json`) that external BassThermal apps can fetch to render **More BassThermal tools** without embedding the website UI.

## Why external apps fetch this feed
External apps need one app-ready payload that already combines:
- catalog-lite app metadata
- PR46-quality related-tool recommendations
- store asset icon availability

This avoids duplicating recommendation logic in each app and keeps cross-app suggestions consistent.

## Why apps should not parse `store-assets.generated.js`
`store-assets.generated.js` is a website asset manifest script, not a stable external-app contract. Apps should consume the feed instead of parsing that JS file or running `asset-preview.js` behavior.

## Field behavior
- `icon`: chosen from the first available of `fallback`, `android`, `windows`, `web` from `BT_STORE_ASSETS`.
- `icon` is always absolute when present (`https://www.bassthermal.com/assets/...`).
- `icon` is `null` when no icon exists.
- `monogram` is always present, including when `icon` is `null`.

## Recommendation behavior
Feed generation preserves PR46-style quality filters:
- no current-app self recommendation
- excludes hidden and `showInAppOverlay !== true` apps
- excludes weak-only/generic-only matches
- no random live-only filler suggestions
- lonely apps can return an empty `recommendations` array and use fallback only

## Fallback behavior
Every app includes:
- `fallback.label = "View all apps"`
- `fallback.href = "https://bassthermal.com/"`

## Caching expectations
The worker serves `/bt-tools-feed.v1.json` with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- `Cache-Control: public, max-age=300, stale-while-revalidate=86400`

Apps should tolerate short-lived cache staleness and refresh from network when appropriate.

## Next planned step
Next planned implementation step is **BT-TOOLS-OVERLAY-1**, which will consume this feed in UI surfaces.
