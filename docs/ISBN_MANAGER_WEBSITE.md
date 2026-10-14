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
