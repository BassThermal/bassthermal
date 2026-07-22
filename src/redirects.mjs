export const LEGACY_REDIRECTS = Object.freeze({
  "/apps": "/",
  "/apps/": "/",
  "/tools": "/",
  "/tools/": "/",
  "/tools/find-rss-feed-from-website": "/apps/rss-finder/",
  "/tools/rss-feed-finder-for-windows": "/apps/rss-finder/",
  "/tools/find-hidden-rss-feeds": "/apps/rss-finder/",
  "/tools/export-rss-feeds-to-csv": "/apps/rss-finder/",
  "/tools/rss-crawler-for-research": "/apps/rss-finder/",
  "/tools/generate-windows-app-icons-from-png": "/apps/icon-pack-builder/",
  "/tools/create-icon-pack-for-windows-app": "/apps/icon-pack-builder/",
  "/tools/png-to-ico-icon-pack-builder": "/apps/icon-pack-builder/",
  "/tools/microsoft-store-app-icon-generator": "/apps/icon-pack-builder/",
  "/tools/extract-favicons-from-websites": "/apps/favicon-harvester/",
  "/tools/bulk-favicon-downloader-windows": "/apps/favicon-harvester/",
  "/tools/get-website-icon-from-url": "/apps/favicon-harvester/",
  "/tools/isbn-lookup-windows-app": "/apps/isbn-manager/",
  "/tools/isbn-barcode-label-maker": "/apps/isbn-manager/",
  "/tools/book-inventory-manager-windows": "/apps/isbn-manager/"
});

function legacyTargetForPath(pathname) {
  if (Object.hasOwn(LEGACY_REDIRECTS, pathname)) return LEGACY_REDIRECTS[pathname];
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const withoutSlash = pathname.slice(0, -1);
    if (Object.hasOwn(LEGACY_REDIRECTS, withoutSlash)) return LEGACY_REDIRECTS[withoutSlash];
  }
  return null;
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function resolveRedirectUrl(inputUrl, method = "GET") {
  if (method !== "GET" && method !== "HEAD") return null;
  const url = inputUrl instanceof URL ? new URL(inputUrl.toString()) : new URL(inputUrl);

  // Visits and other API requests must remain same-origin on both hostnames.
  // Redirecting a browser fetch from www to apex changes origin and can reject
  // before the API response is available to the terminal.
  if (isApiPath(url.pathname)) return null;

  const targetPath = legacyTargetForPath(url.pathname);
  const canonicalHost = url.hostname === "www.bassthermal.com";
  if (!targetPath && !canonicalHost) return null;
  url.protocol = "https:";
  if (canonicalHost) url.hostname = "bassthermal.com";
  if (targetPath) url.pathname = targetPath;
  return url.toString();
}
