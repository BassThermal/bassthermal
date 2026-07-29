# Bassthermal UI Execution Specification

Status: Composition V2 implementation contract

## Direction

Bassthermal keeps its black, monospace, compact instrument identity. The approved direction is Calm Premium with Tight Instrument discipline:

- homepage remains one strong software list, not a card dashboard;
- product identity, Store actions, overview, workflow, and screenshots form one deliberate opening composition;
- one platform-aware screenshot explorer replaces stacked platform canvases;
- all Windows, Android, and web screenshots remain available;
- portrait and landscape media receive different geometry;
- Guides remains a calm library and articles remain content-first;
- motion explains state changes and focus, never decoration;
- mobile rearranges content instead of shrinking toward unreadable type.

## Non-negotiable rules

1. No UI framework, carousel, gesture package, or animation dependency.
2. No duplicated Store URLs, screenshot arrays, app facts, or guide routes.
3. Continue reading icons and screenshots from `BT_STORE_ASSETS`.
4. Missing media removes itself cleanly.
5. New assets continue populating through the existing manifest build.
6. One screenshot platform is visible at a time, but every valid asset remains accessible.
7. No autoplay, arbitrary cap, or show-more mechanism.
8. Static Store and guide anchors remain crawlable fallback truth.
9. No app-specific CSS or separate mobile markup.
10. No giant hero, gradients, rounded SaaS cards, fake proof, or animated background effects.
11. No core product text becomes JavaScript-only or hidden behind controls.

## Product composition

Enhanced product pages use three areas:

```text
identity  media
summary   media
```

Mobile becomes:

```text
identity
media
summary
```

Identity contains the existing product header intact. Summary moves the existing overview and workflow sections by normalized heading text. Use cases, guide, audience, FAQ, and footer remain below in their existing order. Products without screenshots collapse to a confident text-only composition. Without JavaScript, the original static page remains useful.

## Screenshot explorer

- One explorer for all platforms.
- Real platform buttons with `aria-pressed`.
- Platform order remains Windows, Android, web.
- Each platform remembers its selected image.
- One active image with arrows, `current / total`, full-size action, keyboard arrows, and touch swipe.
- All active-platform images appear in a native horizontally scrolling thumbnail rail.
- Inactive platform thumbnail DOM is not created until selected.
- Active image decodes before replacement and uses a monotonic selection token.
- Previous and next images preload after the active image resolves.
- Failed items are removed; empty platforms disappear; an empty explorer removes itself.
- One image hides arrows, count, and thumbnail rail.
- The existing fullscreen viewer remains and returns focus on close.

## Media geometry

Landscape media uses the available column and a practical maximum height. Portrait media uses a deliberately narrow, taller stage capped around phone-like width. A portrait screenshot must never float inside a full-width landscape frame. Mobile has no universal large minimum height and no horizontal overflow.

## Motion

Use approximately 110ms fast, 160ms normal, and 200ms slow transitions with `cubic-bezier(.2,.75,.25,1)`.

Approved motion: screenshot opacity, platform state, thumbnail border/brightness, homepage row response, Guides card response, Store badge 1px lift, and focus-visible treatment.

Forbidden: autoplay, entrance animation, staggered load, infinite loops, bouncing controls, particles, 3D transforms, scroll-jacking, and large background movement. All motion disables under `prefers-reduced-motion`.

## Homepage

- Preserve the generated single app catalogue and terminal functionality.
- Increase icon presence, app-name hierarchy, row rhythm, and description readability.
- Keep platform links aligned and natural page scrolling.
- Mobile retains approximately 13.5–14px base type and rearranges rows instead of shrinking.
- Static output must contain `Microsoft Store · Google Play · Guides · Support` and `Privacy · Guides · Support`.
- `tools/build-homepage-chrome.mjs` owns deterministic navigation, footer, and icon markup after catalog generation.

## Guides

The library remains two columns on useful desktop widths and one column on mobile. Improve title, metadata, description, border, icon, hover, and focus hierarchy only. Guide screenshots remain inline and automatic. Do not add search, categories, sorting, reading-time labels, author cards, newsletters, or a sticky table of contents.

## SEO, reliability, and accessibility

- Static `h1`, descriptions, overview, workflow, guide links, Store links, canonical metadata, and structured data remain unchanged.
- Screenshot controls affect supplemental media only.
- Interactive controls are buttons or anchors.
- Platform buttons use `aria-pressed`; thumbnails use `aria-current`; status uses `aria-live`.
- Swipe is supplemental.
- Focus-visible treatment is required.
- No third-party runtime dependency is added.

## Validation

Run:

```text
npm ci
npm run build:site
npm run catalog:validate
npm run home:validate
npm run test:product-pages
npm run test:site-composition
npm run test:app-icons
npm run test:redirects
npm run test:terminal-visits
node --check public/product-page.js
node --check public/microsoft-store-badge.js
```

Review homepage, Guides, RetroFy Windows and Android, DualTicker, a Windows-only product, a no-screenshot product, and guide pages at 1440×900, 1920×1080, 360×800, 390×844, 430×932, and phone desktop-site mode.

## Definition of done

The PR is complete only when the homepage, product composition, media explorer, Store actions, Guides, desktop, mobile, and deterministic build guards are all included. No visual surface is deliberately postponed.
