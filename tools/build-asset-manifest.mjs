import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const appsRoot = path.join(repoRoot, 'public', 'assets', 'apps');
const outputFile = path.join(repoRoot, 'public', 'store-assets.generated.js');
const platforms = ['android', 'windows', 'web'];
const imageExts = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const iconPriority = ['.png', '.webp', '.jpg', '.jpeg'];

function toWebPath(absPath) {
  const rel = path.relative(path.join(repoRoot, 'public'), absPath).split(path.sep).join('/');
  return `/${rel}`;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function screenshotCompare(a, b) {
  const aShot = /^shot[-_ ]?\d+/i.test(a);
  const bShot = /^shot[-_ ]?\d+/i.test(b);
  if (aShot !== bShot) return aShot ? -1 : 1;
  return naturalCompare(a, b);
}

async function listSubdirs(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name) .sort(screenshotCompare);
}

async function pickIcon(dir) {
  for (const ext of iconPriority) {
    const candidate = path.join(dir, `icon${ext}`);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {}
  }
  return null;
}

async function listPlatformScreenshots(platformDir) {
  let entries = [];
  try {
    entries = await fs.readdir(platformDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      if (!imageExts.has(ext)) return false;
      return !/^icon\.(png|webp|jpe?g)$/i.test(name);
    })
    .sort(naturalCompare)
    .map((name) => toWebPath(path.join(platformDir, name)));
}

async function buildManifest() {
  const apps = {};
  const slugs = await listSubdirs(appsRoot);

  for (const slug of slugs) {
    const slugDir = path.join(appsRoot, slug);
    const rootIcon = await pickIcon(slugDir);
    const icon = {
      fallback: rootIcon ? toWebPath(rootIcon) : null,
      android: null,
      windows: null,
      web: null
    };
    const screenshots = { android: [], windows: [], web: [] };

    for (const platform of platforms) {
      const platformDir = path.join(slugDir, platform);
      const platformIcon = await pickIcon(platformDir);
      icon[platform] = platformIcon ? toWebPath(platformIcon) : null;
      screenshots[platform] = await listPlatformScreenshots(platformDir);
    }

    if (!icon.fallback) {
      icon.fallback = icon.android || icon.windows || icon.web || null;
    }

    apps[slug] = { icon, screenshots };
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'tools/build-asset-manifest.mjs manual-local-scan',
    apps
  };
}

async function main() {
  const manifest = await buildManifest();
  const js = `window.BT_STORE_ASSETS = ${JSON.stringify(manifest, null, 2)};\n\n(() => {\n  if (document.querySelector('script[data-bt-asset-preview]')) return;\n  const script = document.createElement('script');\n  script.src = '/asset-preview.js?v=manual-index-v2';\n  script.defer = true;\n  script.dataset.btAssetPreview = '1';\n  document.head.appendChild(script);\n})();\n`;
  await fs.writeFile(outputFile, js, 'utf8');
  console.log(`Generated ${path.relative(repoRoot, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
