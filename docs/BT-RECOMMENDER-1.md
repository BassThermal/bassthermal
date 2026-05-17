# BT-RECOMMENDER-1

BT-RECOMMENDER-1 is the first reusable BassThermal related-apps module for quiet in-app discovery panels (“More BassThermal tools”). It consumes BT-CATALOG-1 generated data (`/catalog-lite.json`) and renders compact ranked recommendations.

## Embed usage
```html
<div data-bt-related data-current-app="retrofy" data-limit="3"></div>
<script src="https://bassthermal.com/related-apps.v1.js"></script>
```

- `data-current-app`: current app id/slug (e.g., `retrofy`).
- `data-limit`: max cards (default `3`, max `6`).

Current app resolution order: element `data-current-app` → `window.BT_CURRENT_APP` → `<meta name="bt-app-id">` → `/apps/<slug>/` path inference.

## Placement guidance
Recommended placements:
- Help → More BassThermal tools
- About → More tools
- Settings → BassThermal
- Existing footer/sidebar locations

Forbidden placements:
- Startup popup
- Blocking modal
- Fake ad banner
- Giant promo panel

## Integration notes
- HTML/WebView: include script and a `data-bt-related` container.
- Electron: set `window.BT_CURRENT_APP` before calling `window.BTRelated.renderAll()`.
- Android WebView: same embed model; script fetches catalog from script origin.
- Native fallback: if JS embedding is unavailable, link to `https://bassthermal.com/apps/`.

## Fetch/cache/fallback
- Fetch target: `<script-origin>/catalog-lite.json` (default origin fallback: `https://bassthermal.com`).
- Cache keys: `bt.catalog-lite.v1` and `bt.catalog-lite.v1.ts`.
- TTL: 24 hours.
- Fallback order: fresh network → cached catalog → bundled emergency snapshot.
- Errors fail silently.

## Scoring overview
Excludes current app, hidden apps, and apps where `visibility.showInAppOverlay !== true`.

Scoring:
- `+100` current.relatedTools hit
- `+100` reverse relatedTools hit
- `+45` same primary family
- `+25` candidate primary in current secondary
- `+25` current primary in candidate secondary
- `+22` same non-`NONE` discipline
- shared modes `+12` each (cap `+36`)
- shared audiences `+8` each (cap `+24`)
- shared workflow stages `+8` each (cap `+32`)
- shared outputs `+10` each (cap `+30`)
- shared tags `+4` each (cap `+32`)
- status boosts: live `+8`, shipping `+4`

Sort: score desc → live/shipping/lab → name A–Z.

## Versioning
Apps should pin `related-apps.v1.js`. Future breaking changes must ship in a new versioned filename instead of silently breaking old integrations.
