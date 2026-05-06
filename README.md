# BassThermal Cloudflare Worker (Static Assets)

This repository deploys a minimal static landing page through Cloudflare Workers Static Assets.

## Project structure

- `wrangler.toml` → Worker config
- `public/` → static assets directory served by Cloudflare
- `public/index.html` → landing page

## Local setup

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

Cloudflare deploy command currently used by CI is also supported:

```bash
npx wrangler deploy
```

## Cloudflare settings

Use these settings for connected deploy flow:

- **Root directory:** `/`
- **Build command:** none (or `npm install` if you want Cloudflare to install dependencies)
- **Deploy command:** `npx wrangler deploy`

## Static assets configuration

`wrangler.toml` is configured with:

- `[assets]`
- `directory = "./public"`

That means Cloudflare serves files from `public/`.

## Custom domain setup

If custom domains are not attached via `wrangler.toml` routes, attach them in the Cloudflare dashboard:

1. **Workers & Pages** → `bassthermal`
2. **Settings** → **Domains & Routes**
3. **Add** → **Custom Domain**
4. Add:
   - `bassthermal.com`
   - `www.bassthermal.com`
