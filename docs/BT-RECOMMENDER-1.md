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

Product rule: Help/About/Settings only, never startup popup/ad banner.

## Fetch/cache/fallback
- Fetch target: `<stable-script-origin>/catalog-lite.json`.
- Stable script origin is resolved once at load (`document.currentScript.src` when it is `related-apps.v1.js`, else scanning script tags for `related-apps.v1.js`).
- If origin cannot be determined, fallback origin is `https://bassthermal.com`.
- Recommended embed source: `https://bassthermal.com/related-apps.v1.js`, which then resolves catalog fetches to the same BassThermal origin.
- Cache keys: `bt.catalog-lite.v1` and `bt.catalog-lite.v1.ts`.
- TTL: 24 hours.
- Fallback order: fresh network → cached catalog → bundled emergency snapshot.
- Errors fail silently.

## No generic false positives policy
The widget must answer: “What other BassThermal tool is genuinely useful from here?” It must not show random app cards from generic overlap.

Excludes current app, hidden apps, and apps where `visibility.showInAppOverlay !== true`.

## Strong vs weak scoring
`STRONG_RELATIONSHIP_THRESHOLD = 30`

Strong relationship score:
- `+100` current.relatedTools hit
- `+100` reverse relatedTools hit
- `+45` same primary family
- `+25` candidate primary in current secondary
- `+25` current primary in candidate secondary
- `+22` same non-`NONE` discipline
- shared specific outputs `+14` each (cap `+42`)
- shared specific tags `+8` each (cap `+40`)

Weak relationship score (ranking support only):
- shared modes `+12` each (cap `+24`)
- shared non-generic audiences `+6` each (cap `+12`)
- shared non-generic workflow stages `+4` each (cap `+12`)

Status boost: live `+8`, shipping `+4`.

Final score = strongRelationshipScore + weakRelationshipScore + statusBoost.

Qualification rules:
- qualify if explicit relatedTools edge exists (forward or reverse), OR
- qualify if `strongRelationshipScore >= 30`
- weak-only overlap never qualifies, even if final score would be high

## Generic ignore lists used for strong qualification
Generic values do not count as strong relationship evidence:

- `GENERIC_AUDIENCES`: `general_user`, `user`, `creator`, `researcher`, `publisher`, `operator`, `student`, `designer`, `developer`
- `GENERIC_WORKFLOW`: `inspect`, `export`, `validate`, `lookup`, `study`, `generate`, `convert`, `create`, `collect`, `monitor`, `compare`, `publish`
- `GENERIC_TAGS`: `windows`, `android`, `web`, `offline`, `batch`, `csv`, `url`
- `GENERIC_OUTPUTS`: `csv_export`, `metadata_report`, `reference_card`

These still remain valid catalog metadata for display/filtering.

## Relationship tiers and reasons
- `explicit`: relatedTools edge
- `family`: same/bridged family
- `domain`: discipline/output/tag-based strong relationship
- `weak`: rejected weak-only candidate

Reason priority:
1. relatedTools reason
2. Same/bridged family → “Same tool family.”
3. Same discipline with specific output/tag overlap → “Related workflow domain.”
4. Shared specific output → “Related output.”
5. Shared specific tag → “Related utility.”
6. Fallback → “Related BassThermal tool.”

## Lonely app fallback rule
If no recommendations qualify, render only the fallback:
- title: `More BassThermal tools`
- link: `View all apps`

Do not force cards for lonely apps.

## Debug/explain support
`window.BTRelated.explain(currentAppId, catalog, options)` returns:
- `current`
- `recommendations` (qualified only)
- `rejected` (includes strong/weak/status and `rejectedReason`)

Each entry includes:
- `score`
- `relationshipScore` (compat alias: strong + weak)
- `strongRelationshipScore`
- `weakRelationshipScore`
- `statusBoost`
- `qualification`
- `tier`
- `reason` (for qualified)
- debug metrics (`sharedSpecificTags`, `sharedSpecificOutputs`, etc.)

Debug cards include score, strong, weak, status, qualification path, tier, and resolved origin details.

`window.BTRelated.getOrigin()` returns the stable resolved origin used for catalog fetches and relative link resolution.

## Future app classification guidance
For useful recommendations, define specific:
- `primaryFamily`
- `discipline`
- `outputs`
- `tags`
- `relatedTools`

Broad generic metadata alone should not be relied on for recommendations.

## Versioning
Apps should pin `related-apps.v1.js`. Future breaking changes must ship in a new versioned filename instead of silently breaking old integrations.
