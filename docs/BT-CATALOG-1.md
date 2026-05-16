# BT-CATALOG-1

BT-CATALOG-1 is the BassThermal product catalog spine. It is a strict, validated product graph used for consistency, routing, SEO support, and future app-aware tool discovery.

It is **not** a marketing popup system.

## Model rules

- Exactly one `primaryFamily` per app.
- `secondaryFamilies` are optional and capped at 2.
- `primaryFamily` is the shelf.
- `discipline` is the technical domain.
- `modes` describe what kind of app it is.
- `audiences` describe who uses it.
- `workflowStages` describe where it fits in process.
- `outputs` describe what it produces.
- `tags` describe specific objects or processes.
- `relatedTools` are hand-curated next-step links with reasons.
- `intentPages` represent SEO search-intent landing pages in `/tools/`.

`klass` is legacy rough typing and is not the long-term backbone.

## Engineering/AEC classification rules

Engineering/AEC apps often overlap with education. Do not flatten classification into one label.

- Use `primaryFamily: ENGINEERING_AEC` when the core function is engineering/AEC.
- Use discipline values such as `STRUCTURAL`, `CONSTRUCTION_OPS`, `ARCHITECTURE_DRAFTING`.
- Use mode values such as `CALCULATOR`, `VISUALIZER`, `EDUCATOR`, `REPORT_GENERATOR`.
- Learning/professional distinctions can evolve later without overbuilding now.

Examples (documentation-only):

- BeamLab-style app: primaryFamily `ENGINEERING_AEC`, discipline `STRUCTURAL`, modes `CALCULATOR`, `VISUALIZER`, `EDUCATOR`, audiences `student`, `engineering_learner`, outputs `diagram`, `calc_sheet`, tags `engineering`, `structural`, `education`.
- Title Block Maker: primaryFamily `ENGINEERING_AEC`, discipline `ARCHITECTURE_DRAFTING`, modes `GENERATOR`, `EXPORT_TOOL`, audiences `drafter`, `architect`, `contractor`, outputs `pdf_report`, tags `aec`, `drafting`.
- Rebar Cut List Maker: primaryFamily `ENGINEERING_AEC`, discipline `CONSTRUCTION_OPS`, modes `CALCULATOR`, `REPORT_GENERATOR`, audiences `contractor`, `estimator`, `field_worker`, outputs `cut_list`, `pdf_report`, tags `construction`, `structural`.

## Future in-app overlay behavior (not implemented in this PR)

Future app overlays should:

- Fetch `/catalog-lite.json`.
- Cache it.
- Fall back to a bundled snapshot if fetch fails.
- Rank recommendations by relatedTools, family, discipline, mode, audience, workflow, and tags.
- Hide the current app from recommendations.
- Avoid startup popups.
- Avoid ad/promo styling.

## SEO safeguards

- Keep static crawlable pages.
- Preserve canonical URLs.
- Preserve sitemap coverage.
- Keep `/tools/` pages as intent pages; do not collapse into `/apps/`.
- Do not move important content to client-only rendering.
