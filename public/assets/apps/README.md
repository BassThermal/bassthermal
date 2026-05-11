# BassThermal manual app assets

Drop app assets directly into `public/assets/apps/<slug>/` and platform subfolders.

- No crawlers.
- No scraped `.img` files.
- Missing files are allowed.

## Supported platforms

- `android`
- `windows`
- `web`

## Icon naming rules

Icons can be at app root or platform folder, using `png/webp/jpg/jpeg`:

- `/assets/apps/<slug>/icon.png`
- `/assets/apps/<slug>/icon.webp`
- `/assets/apps/<slug>/icon.jpg`
- `/assets/apps/<slug>/icon.jpeg`
- `/assets/apps/<slug>/<platform>/icon.png`
- `/assets/apps/<slug>/<platform>/icon.webp`
- `/assets/apps/<slug>/<platform>/icon.jpg`
- `/assets/apps/<slug>/<platform>/icon.jpeg`

## Screenshot naming rules

Screenshots are scanned in each platform folder for `shot-1` through `shot-20`, both padded and unpadded, and `png/webp/jpg/jpeg`:

- `shot-01.png`, `shot-01.webp`, `shot-01.jpg`, `shot-01.jpeg`
- `shot-1.png`, `shot-1.webp`, `shot-1.jpg`, `shot-1.jpeg`
- ... up to `shot-20.*`

You do **not** need exact `shot-01.png` only. `shot-08.webp` works.
