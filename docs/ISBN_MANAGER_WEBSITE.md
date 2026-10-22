# ISBN Manager — dedicated public website

**Public URL after deployment:** `https://bassthermal.com/isbnmanager/`

The public website is part of BassThermal's existing Cloudflare Worker + static asset site. It does **not** modify ISBN Manager's private desktop database, sell bookstore inventory, or collect directory submissions.

## Development

From the BassThermal repository root:

```bash
npm run isbnmanager:build
npm run isbnmanager:validate
npm run dev
```

Authoritative editable design source: `tools/isbn-manager-web.template.html`. Build script: `tools/build-isbn-manager-website.mjs`. All 13 static route folders, common site.css/site.js, and the ISBN Manager sitemap are emitted into `public/isbnmanager/`. The existing `site-shell:build` command also generates these on deploy.

## Public functionality

- 13 statically rendered paths, mobile navigation, product tabs, basic directory preview/filter, accessible headings.
- Correct canonical URL, title, description and Open Graph metadata per route.
- Official ISBN Manager Windows Store listing on the download page.
- Relevant BassThermal support and guide links.

## Deliberately NOT active

- Stripe billing or accounts, license/device authorization, direct installer release pipeline.
- Public bookstore membership, bookstore ownership verification, directory submissions, remote synchronization, or inventory upload.
- Final pricing, legal terms, verified real-world bookstore listings.
- The Kilkenny shop identity is an **illustrative sample only**, not a verified or approved directory member. Its example profile is `noindex`. Never present it as a customer without consent.

## Before public launch

1. Review wording against the currently shipped desktop release and secure approval for screenshots and third-party logos.
2. Confirm legacy user entitlements and final pricing; current purchase/install stays on Microsoft Store until verified changes.
3. Establish actual terms and policy before activating online billing/accounts.
4. Implement a separate, consent-driven and moderated directory backend, with owner verification and withdrawal. Default must remain PRIVATE.
5. Review content and visual design in a staging preview. Test mobile, keyboard and no-JavaScript rendering.
6. Merge PR and deploy via existing Cloudflare process after approval. PR creation does **not** deploy.

This source is intended as the initial website implementation. It is not a claim that unbuilt server functions are live.


## BassThermal product-route presentation

The existing `/apps/isbn-manager/` route is a full-page snapshot of `BassThermal/isbnmanager-website/index.html`, **not** the older generic application listing and **not** the generated `/isbnmanager/` multipage prototype. The snapshot's source blob is documented in its HTML comment. The only visible site-wide navigation on this route is the root-level sticky BassThermal header; the standalone page's own navigation stays in the DOM for its JavaScript dependencies but is visually hidden.

Keep the source product design, illustration data, and interactive demo unchanged when refreshing from the `isbnmanager-website` repository. Copy a vetted current `index.html` into this route and reapply the documented parent-brand header mount. Do not put the standalone page inside an iframe or replace its real content with a redirect. Review the source's product claims before publishing. Keep the `https://isbnmanager.com/` canonical link to avoid competing search-index copies.

The generic content generator, generic product validator, publisher runtime injector, and accent runtime injector deliberately exempt this route. `tools/build-public-brand-shell.mjs` owns only its root-level BassThermal navigation injection. Run `npm run content:build`, `npm run test:product-pages`, and `npm run test:site-shell` after updates.
