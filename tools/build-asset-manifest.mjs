import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'public');
const appsRoot = path.join(publicRoot, 'assets', 'apps');
const previewCacheRoot = path.join(publicRoot, 'assets', 'app-preview-cache');
const outputFile = path.join(publicRoot, 'store-assets.generated.js');
const platforms = ['android', 'windows', 'web'];
const browserImageExts = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif']);
const iconPriority = ['.png', '.webp', '.jpg', '.jpeg', '.ico'];

function toWebPath(absPath) {
  const rel = path.relative(publicRoot, absPath).split(path.sep).join('/');
  return `/${rel}`;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function screenshotCompare(a, b) {
  const aPref = /^(shot|screen|screenshot)/i.test(a);
  const bPref = /^(shot|screen|screenshot)/i.test(b);
  if (aPref !== bPref) return aPref ? -1 : 1;
  return naturalCompare(a, b);
}

async function listSubdirs(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(naturalCompare);
}

async function detectImageKind(absPath) {
  try {
    const handle = await fs.open(absPath, 'r');
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();
    const b = buffer.subarray(0, bytesRead);

    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
    if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    if (b.length >= 6) {
      const sig = b.toString('ascii', 0, 6);
      if (sig === 'GIF87a' || sig === 'GIF89a') return 'gif';
    }
    if (b.length >= 16) {
      const head = b.toString('ascii', 0, Math.min(32, b.length));
      if (head.includes('ftypavif') || head.includes('ftypavis')) return 'avif';
    }
  } catch {
    return null;
  }
  return null;
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

function isIconName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).toLowerCase();
  return base === 'icon' || base.startsWith('icon.');
}

async function listPlatformScreenshots({ slug, platform, platformDir, warnings }) {
  let entries = [];
  try {
    entries = await fs.readdir(platformDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out = [];
  let normalizeIndex = 1;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (name.startsWith('.')) continue;

    const absPath = path.join(platformDir, name);
    const ext = path.extname(name).toLowerCase();

    if (ext === '.ico' || ext === '.icns') {
      warnings.push(`skipped ${ext} screenshot candidate: ${slug}/${platform}/${name}`);
      continue;
    }

    if (isIconName(name)) continue;

    const byExt = browserImageExts.has(ext);
    const detectedKind = byExt ? null : await detectImageKind(absPath);

    if (byExt) {
      out.push({ sortName: name, webPath: toWebPath(absPath) });
      continue;
    }

    if (!detectedKind) {
      warnings.push(`skipped non-image file: ${slug}/${platform}/${name}`);
      continue;
    }

    const normalizedName = `${String(normalizeIndex).padStart(3, '0')}.${detectedKind}`;
    normalizeIndex += 1;
    const cacheDir = path.join(previewCacheRoot, slug, platform);
    const cacheAbsPath = path.join(cacheDir, normalizedName);
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.copyFile(absPath, cacheAbsPath);
    const cacheWebPath = toWebPath(cacheAbsPath);
    out.push({ sortName: name, webPath: cacheWebPath });
    warnings.push(`normalized weird image file to ${cacheWebPath} from ${slug}/${platform}/${name}`);
  }

  return out.sort((a, b) => screenshotCompare(a.sortName, b.sortName)).map((item) => item.webPath);
}

async function buildManifest() {
  await fs.rm(previewCacheRoot, { recursive: true, force: true });

  const apps = {};
  const slugs = await listSubdirs(appsRoot);
  const report = [];
  const warnings = [];

  for (const slug of slugs) {
    const slugDir = path.join(appsRoot, slug);
    const rootIcon = await pickIcon(slugDir);
    const icon = {
      fallback: rootIcon && path.extname(rootIcon).toLowerCase() !== '.ico' ? toWebPath(rootIcon) : null,
      android: null,
      windows: null,
      web: null
    };

    const screenshots = { android: [], windows: [], web: [] };

    for (const platform of platforms) {
      const platformDir = path.join(slugDir, platform);
      const platformIcon = await pickIcon(platformDir);
      if (platformIcon && path.extname(platformIcon).toLowerCase() !== '.ico') {
        icon[platform] = toWebPath(platformIcon);
      }

      screenshots[platform] = await listPlatformScreenshots({ slug, platform, platformDir, warnings });
    }

    if (!icon.fallback) {
      icon.fallback = icon.android || icon.windows || icon.web || null;
    }

    apps[slug] = { icon, screenshots };
    report.push({ slug, iconPath: icon.fallback, counts: Object.fromEntries(platforms.map((p) => [p, screenshots[p].length])) });
  }

  return {
    manifest: {
      generatedAt: new Date().toISOString(),
      source: 'tools/build-asset-manifest.mjs manual-local-scan',
      apps
    },
    report,
    warnings
  };
}

async function main() {
  const { manifest, report, warnings } = await buildManifest();
  const js = `window.BT_STORE_ASSETS = ${JSON.stringify(manifest, null, 2)};\n\n(() => {\n  if (document.querySelector('script[data-bt-asset-preview]')) return;\n  const script = document.createElement('script');\n  script.src = '/asset-preview.js?v=manual-index-v2';\n  script.defer = true;\n  script.dataset.btAssetPreview = '1';\n  document.head.appendChild(script);\n})();\n`;
  await fs.writeFile(outputFile, js, 'utf8');

  console.log('BassThermal asset manifest');
  console.log('public/assets/apps scanned');
  console.log('');
  for (const item of report) {
    console.log(item.slug);
    console.log(`  icon: ${item.iconPath ? `yes (${item.iconPath})` : 'no'}`);
    for (const platform of platforms) {
      console.log(`  ${platform} screenshots: ${item.counts[platform]}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log('');
  }

  console.log(`Generated ${path.relative(repoRoot, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
