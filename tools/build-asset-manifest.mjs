import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'public');
const appsRoot = path.join(publicRoot, 'assets', 'apps');
const catalogFile = path.join(repoRoot, 'data', 'bt-catalog.json');
const assetSourcesFile = path.join(repoRoot, 'data', 'bt-asset-sources.json');
const previewCacheRoot = path.join(publicRoot, 'assets', 'app-preview-cache');
const outputFile = path.join(publicRoot, 'store-assets.generated.js');
const platforms = ['android', 'windows', 'web'];
const browserImageExts = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif']);
const browserIconExts = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg']);
const rasterIconExts = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const iconPriority = ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico'];
const iconBasenames = ['icon', 'app'];

function toWebPath(absPath) {
  const rel = path.relative(publicRoot, absPath).split(path.sep).join('/');
  return `/${rel}`;
}


async function pathExists(absPath) {
  try {
    const stat = await fs.stat(absPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function normalizeRepoPath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (/^https?:\/\//i.test(value)) return null;
  const normalized = value.split(/[?#]/, 1)[0];
  return path.resolve(repoRoot, normalized);
}

function isUnderDir(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

async function isSafeSvg(absPath) {
  let text = '';
  try {
    text = await fs.readFile(absPath, 'utf8');
  } catch {
    return false;
  }
  const lower = text.toLowerCase();
  if (!lower.includes('<svg')) return false;
  if (/<script\b/i.test(text)) return false;
  if (/<foreignobject\b/i.test(text)) return false;
  if (/\son[a-z]+\s*=/i.test(text)) return false;
  if (/href\s*=\s*["']\s*javascript:/i.test(text)) return false;
  if (/\b(?:src|href|xlink:href)\s*=\s*["']\s*data:/i.test(text)) return false;
  return true;
}

async function isBrowserSafeIcon(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (!browserIconExts.has(ext)) return false;
  if (!(await pathExists(absPath))) return false;
  if (ext === '.svg') return isSafeSvg(absPath);

  const detectedKind = await detectImageKind(absPath);
  if (!detectedKind) return false;
  if (!rasterIconExts.has(`.${detectedKind}`)) return false;
  if (ext === '.jpg' || ext === '.jpeg') return detectedKind === 'jpg';
  return ext === `.${detectedKind}`;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function listCatalogSlugs() {
  const catalog = await readJsonIfExists(catalogFile, { apps: [] });
  return (catalog.apps || [])
    .map((app) => app.slug || app.id)
    .filter(Boolean)
    .sort(naturalCompare);
}

async function loadAssetSources(warnings) {
  const sources = await readJsonIfExists(assetSourcesFile, { schema: 'BT-ASSET-SOURCES-1', apps: {} });
  if (sources.schema !== 'BT-ASSET-SOURCES-1') {
    warnings.push(`ignored ${path.relative(repoRoot, assetSourcesFile)}: unsupported schema ${sources.schema || '<missing>'}`);
    return {};
  }
  return sources.apps || {};
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
  for (const basename of iconBasenames) {
    for (const ext of iconPriority) {
      const candidate = path.join(dir, `${basename}${ext}`);
      if (await isBrowserSafeIcon(candidate)) return candidate;
    }
  }
  return null;
}


async function resolveMappedIcon({ slug, sourcePath, warnings }) {
  const sourceAbsPath = normalizeRepoPath(sourcePath);
  if (!sourceAbsPath) {
    warnings.push(`ignored mapped icon for ${slug}: path must be a local repo path`);
    return null;
  }

  if (!isUnderDir(sourceAbsPath, repoRoot)) {
    warnings.push(`ignored mapped icon for ${slug}: path is outside repo`);
    return null;
  }

  if (!(await isBrowserSafeIcon(sourceAbsPath))) {
    warnings.push(`ignored mapped icon for ${slug}: unsupported or unsafe image ${path.relative(repoRoot, sourceAbsPath)}`);
    return null;
  }

  if (isUnderDir(sourceAbsPath, publicRoot)) {
    return toWebPath(sourceAbsPath);
  }

  const ext = path.extname(sourceAbsPath).toLowerCase();
  const targetDir = path.join(appsRoot, slug);
  const targetAbsPath = path.join(targetDir, `icon${ext}`);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(sourceAbsPath, targetAbsPath);
  warnings.push(`copied mapped icon for ${slug} to ${path.relative(repoRoot, targetAbsPath)}`);
  return toWebPath(targetAbsPath);
}

function isIconName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).toLowerCase();
  return base === 'icon' || base === 'app' || base.startsWith('icon.') || base.startsWith('app.');
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
  const report = [];
  const warnings = [];
  const assetSources = await loadAssetSources(warnings);
  const [assetSlugs, catalogSlugs] = await Promise.all([listSubdirs(appsRoot), listCatalogSlugs()]);
  const slugs = [...new Set([...catalogSlugs, ...assetSlugs])].sort(naturalCompare);

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

    if (!icon.fallback && assetSources[slug]?.icon) {
      icon.fallback = await resolveMappedIcon({ slug, sourcePath: assetSources[slug].icon, warnings });
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
