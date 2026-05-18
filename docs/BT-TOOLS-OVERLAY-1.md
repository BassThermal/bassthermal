# BT-TOOLS-OVERLAY-1

## Purpose
`bt-tools-overlay.v1.js` is a compact, embeddable UI runtime for external BassThermal apps to show **More BassThermal tools** using precomputed feed data.

## Relationship to BT-TOOLS-FEED-1
The overlay consumes `bt-tools-feed.v1.json` only. Recommendation scoring and ranking remain server-side/precomputed in BT-TOOLS-FEED-1.

## Why static feed fetch instead of in-app calculations
- Keeps app integrations tiny and consistent.
- Prevents drift in recommendation logic.
- Avoids parsing local build assets.
- Supports cross-origin fetch via Worker CORS.

## Embed snippet
```html
<meta name="bt-app-id" content="retrofy">
<button type="button" data-bt-tools-open>More tools</button>
<script src="https://www.bassthermal.com/bt-tools-overlay.v1.js"></script>
```

## App id resolution order
1. `options.currentApp`
2. Trigger `data-current-app`
3. `window.BT_CURRENT_APP`
4. `meta[name="bt-app-id"]`
5. `data-bt-current-app` on document/body
6. Bassthermal app path `/apps/{slug}/`

## Fallback behavior
- Unknown app id: "Unable to identify current app." + View all apps.
- Feed fetch failure: "Unable to load BassThermal tools right now." + View all apps.
- App missing in feed: "This app is not in the BassThermal tools feed yet." + View all apps.
- No recommendations: "No close related tool for this app. Weak/random matches are hidden." and app fallback message when present.

## Icon behavior
- Uses recommendation icon URL when present.
- Uses monogram fallback when icon is `null`.
- If image load fails, icon swaps to monogram.
- No guessed icon URLs.

## Diagnostics mode
Enabled by:
- `open({ debug: true })`
- `?bttoolsdebug=1`
- Trigger `data-bt-tools-debug="1"`

Shows current app, feed metadata, recommendation ids, icon source/fallback choice, cache source, and last error. Includes copy button.

## Cache behavior
- In-memory feed cache for active page session.
- Optional `localStorage` cache with 6-hour TTL (`bt.tools.feed.v1`, `bt.tools.feed.v1.ts`).
- Network preferred; falls back to memory/localStorage if fetch fails.

## Electron / WebView / Android notes
- No iframe required.
- No forced navigation to bassthermal.com UI.
- Host app only loads script and feed and renders local overlay DOM.

## Placement rules
Recommended:
- Help → More tools
- About → More tools
- Settings → BassThermal tools

Disallowed:
- Startup popup
- Ad banner
- Blocking modal
- Forced cross-promo before app use
