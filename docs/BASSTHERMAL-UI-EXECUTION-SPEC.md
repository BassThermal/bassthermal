# Bassthermal UI Execution Specification

Status: approved direction, implementation in progress

## 1. Approved direction

Bassthermal keeps its existing identity: black background, monospace typography, compact information density, square geometry, thin borders, restrained platform colour, and direct product language.

The chosen direction is **Calm Premium** with elements of **Tight Instrument**:

- homepage remains a strong app list rather than a generic card dashboard;
- Guides remains a calm library;
- product pages gain a stronger product header and coherent install actions;
- screenshots gain a lightweight canvas with arrows, thumbnails, swipe, and the existing fullscreen viewer;
- article pages remain content-first and readable;
- mobile rearranges content instead of shrinking it into unreadable desktop proportions.

This is a refinement, not a rebrand or framework migration.

## 2. Non-negotiable rules

1. Do not add a UI framework, carousel dependency, or animation library.
2. Do not duplicate Store URLs, screenshot lists, app facts, or platform metadata.
3. Continue reading icons and screenshots from `BT_STORE_ASSETS`.
4. Missing screenshots must remove the media surface cleanly.
5. New screenshots added to the normal asset folders must populate automatically after the existing manifest build.
6. Windows, Android, and web screenshots remain distinct groups.
7. Existing normal Store anchors remain in HTML for crawlability and failure fallback.
8. No autoplay, rotating hero, hidden screenshot cap, or “show more” mechanism.
9. No app-specific CSS unless a genuine content defect cannot be solved by the shared system.
10. No giant marketing hero, gradients, rounded SaaS cards, decorative dashboards, or fake social proof.

## 3. Existing systems to preserve

### Product media

`public/product-page.js` already:

- loads the product icon from the generated asset manifest;
- groups screenshots by platform;
- provides a fullscreen viewer;
- supports keyboard navigation;
- supports touch swiping in the fullscreen viewer.

The new screenshot canvas extends this implementation. It does not replace the viewer or asset pipeline.

### Guides

`public/guide-page.js` already loads icons and every available screenshot from the same manifest. Guide content remains independent of screenshot filenames or counts.

### Store actions

`public/microsoft-store-badge.js` derives Microsoft and Google actions from the real anchors already in product and guide HTML. The fallback anchors remain present and are concealed only after the matching badge mounts.

## 4. Component contracts

### Homepage

- Keep one app catalogue.
- Preserve fast scanning and compact rows.
- Increase confidence through type, icon scale, spacing, and contrast rather than cards.
- Desktop keeps names, descriptions, and platform links easy to compare.
- Mobile gives descriptions and links sufficient room and uses natural page scrolling.
- No filters, categories, or promotional hero.

### Product header

Order:

1. breadcrumb;
2. icon and product title;
3. concise subtitle;
4. web platform link when applicable;
5. Store badge row;
6. content.

The icon, title, subtitle, and Store actions must read as one product identity block.

### Store actions

- Microsoft and Google badges remain side by side when both exist.
- The pair scales within the available width without wrapping under normal supported phone widths.
- Visible branded rectangles should feel balanced; raw image dimensions do not need to be identical.
- Hover and focus motion remains restrained.
- Web remains a text action.

### Product screenshot canvas

For every platform with screenshots:

- show one active screenshot in a dedicated canvas;
- show previous and next controls when more than one item exists;
- show `current / total` status;
- show all screenshots as a thumbnail strip;
- clicking a thumbnail changes the active item;
- clicking the active item opens the existing fullscreen viewer at that item;
- keyboard left/right works when the canvas is focused;
- horizontal touch swipe changes the active item;
- orientation is respected without manual metadata;
- one screenshot produces a clean canvas without inactive controls;
- no screenshots produce no screenshots section.

### Guides library

- Two columns at useful desktop widths, one column on mobile.
- Strong but restrained card borders.
- Visitor-facing introduction.
- App icon, article title, app name, and concise description remain.
- No planned states, search, filters, or categories.

### Guide articles

- Comfortable reading width and stronger hierarchy.
- Screenshot media remains automatic.
- Product CTA stays compact.
- Related links remain minimal.
- No sticky table of contents in this pass.

## 5. Design rhythm

Shared spacing intent:

- 4px: tightly related details;
- 8px: title/subtitle and labels;
- 12px: controls and compact groups;
- 18px: related blocks;
- 24px: normal sections;
- 32px: major transitions.

Typography must remain readable on mobile. Responsive layout changes should not rely on reducing the global root size toward 11px.

## 6. File map

### Shared foundation

- `public/style.css`
- homepage embedded styles in `public/index.html`

### Product experience

- `public/product-page-v2.css`
- `public/product-page-media.css`
- `public/product-page.js`
- `public/microsoft-store-badge.css`

### Guides

- `public/guide-page.css`
- `public/guides/index.html`

### Explicitly out of scope

- catalog data and generated catalog outputs;
- Store URLs and package identifiers;
- sitemap generation;
- Worker routing;
- visit telemetry;
- app repositories;
- screenshot folder conventions;
- guide facts and app claims.

## 7. Implementation batches

### Batch 1 — foundation and content surfaces

- product header hierarchy;
- Guides library refinement;
- article reading rhythm;
- Store-action balance;
- public-facing Guides introduction.

### Batch 2 — screenshot canvas

- extend existing product media renderer;
- active canvas, arrows, status, thumbnails, keyboard, and touch;
- retain fullscreen viewer;
- validate zero, one, and many screenshots.

### Batch 3 — homepage refinement

- preserve single-list structure;
- strengthen scale, spacing, navigation, and vertical mobile behavior;
- avoid forced viewport fitting.

### Batch 4 — rendered review and correction

Review at:

- 1440 × 900;
- 1920 × 1080;
- 360 × 800;
- 390 × 844;
- 430 × 932;
- phone browser desktop-site mode.

Representative pages:

- homepage;
- Guides library;
- RetroFy product page;
- DualTicker product page;
- Windows-only product;
- product with no screenshots;
- guide with screenshots;
- guide without screenshots.

## 8. Slop and danger register

Reject any implementation that:

- adds a dependency for the gallery;
- requires manual screenshot arrays in page HTML;
- creates separate mobile markup;
- removes crawlable Store anchors;
- autoplays screenshots;
- hides arbitrary assets;
- creates one-off visual rules per app;
- solves mobile by globally shrinking typography;
- turns product pages into Store-listing clones;
- adds decorative interface with no user purpose;
- changes catalog, routing, analytics, or app facts during the visual pass.

## 9. Definition of done

- Bassthermal still looks unmistakably like Bassthermal.
- Homepage remains a compact, confident catalogue.
- Product identity and install actions form one coherent header.
- Screenshot browsing is intentional, automatic, keyboard-accessible, and touch-friendly.
- Guides feels like a calm library.
- Articles remain highly readable.
- No horizontal overflow at supported mobile widths.
- Missing media and external badge failures degrade cleanly.
- Existing build, catalog, product-page, redirect, terminal, and icon checks remain passing.
