import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST_FILE = path.join(PUBLIC_DIR, 'store-assets.generated.js');
const MAX_SCREENSHOTS = 10;

const APPS = [
  { slug: 'dualticker', name: 'DualTicker', windowsProductId: '9p4txws57pld' },
  { slug: 'retrofy', name: 'RetroFy', windowsProductId: '9nk0mhg9f29r' },
  { slug: 'coptic-dictionary', name: 'Coptic Dictionary', windowsProductId: '9nxmkjl625r2' },
  { slug: 'icon-pack-builder', name: 'Icon Pack Builder', windowsProductId: '9mxvt3dfq295' },
  { slug: 'favicon-harvester', name: 'Favicon Harvester', windowsProductId: '9mxj31fxcq4f' },
  { slug: 'isbn-manager', name: 'ISBN Manager', windowsProductId: '9nr0nblx10fb' }
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 BassThermalMSStoreBrowserHarvester/1.0';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const uniq = (values) => [...new Set((values || []).filter(Boolean).map(cleanUrl).filter(Boolean))];

function cleanUrl(value) {
  try {
    let out = String(value || '').trim()
      .replace(/&amp;/g, '&')
      .replace(/\\u0026/g, '&')
      .replace(/\\u003d/g, '=')
      .replace(/\\u003a/g, ':')
      .replace(/\\u002f/gi, '/')
      .replace(/\\\//g, '/');
    out = out.replace(/^[('"\s]+/g, '').replace(/[)'",;<>\]\s\\]+$/g, '');
    return out;
  } catch {
    return '';
  }
}

function safeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
}

function extFrom(url, contentType = '') {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('image/webp')) return '.webp';
  if (ct.includes('image/png')) return '.png';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return '.jpg';
  if (ct.includes('image/svg')) return '.svg';
  const m = String(url || '').match(/\.(webp|png|jpe?g|svg)(?:$|[?#&])/i);
  return m ? (m[1].toLowerCase() === 'jpeg' ? '.jpg' : `.${m[1].toLowerCase()}`) : '.img';
}

function readImageDimensions(buffer) {
  try {
    if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer.length >= 10 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
      }
    }
    if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const type = buffer.toString('ascii', 12, 16);
      if (type === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
      if (type === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
  } catch {}
  return { width: 0, height: 0 };
}

function classify(url, dimensions, hint = '') {
  const w = dimensions.width || 0;
  const h = dimensions.height || 0;
  const ratio = w && h ? w / h : 0;
  const hay = `${url} ${hint}`.toLowerCase();
  if (/badge|rating|age|qr|barcode|glyph|sprite|favicon/i.test(hay)) return 'skip';
  if (/logo|icon|tile|storelogo|packageicon|appicon/.test(hay) || (w >= 80 && h >= 80 && ratio > 0.72 && ratio < 1.38 && w <= 1400 && h <= 1400)) return 'icon';
  if (/screenshot|screen|imagegallery|hero|poster|background/.test(hay) || (w >= 480 && h >= 260 && ratio >= 1.2)) return 'screenshot';
  return 'other';
}

function manifestSeed() {
  return { icon: { fallback: null, android: null, windows: null, web: null }, screenshots: { android: [], windows: [], web: [] } };
}

function cloneRecord(record) {
  const base = manifestSeed();
  const src = record || {};
  return {
    icon: { ...base.icon, ...(src.icon || {}) },
    screenshots: {
      android: arr(src.screenshots?.android),
      windows: arr(src.screenshots?.windows),
      web: arr(src.screenshots?.web)
    }
  };
}

async function readManifest() {
  try {
    const content = await readFile(MANIFEST_FILE, 'utf8');
    const sandbox = {
      window: {},
      document: { querySelector: () => null, createElement: () => ({}), head: { appendChild: () => {} } },
      setTimeout: () => 0,
      clearTimeout: () => {},
      setInterval: () => 0,
      clearInterval: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    try { vm.runInNewContext(content, sandbox, { timeout: 700 }); } catch {}
    return sandbox.window.BT_STORE_ASSETS || { generatedAt: null, source: 'empty', apps: {} };
  } catch {
    return { generatedAt: null, source: 'empty', apps: {} };
  }
}

function previewLoaderSnippet() {
  return `\n(() => {\n  if (document.querySelector('script[data-bt-asset-preview]')) return;\n  const script = document.createElement('script');\n  script.src = '/asset-preview.js?v=stable-v5';\n  script.defer = true;\n  script.dataset.btAssetPreview = '1';\n  document.head.appendChild(script);\n})();\n`;
}

async function writeManifest(manifest) {
  await writeFile(MANIFEST_FILE, `window.BT_STORE_ASSETS = ${JSON.stringify(manifest, null, 2)};\n${previewLoaderSnippet()}`, 'utf8');
}

function imageUrlCandidate(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/badge|rating|age|qr|barcode|glyph|sprite|favicon/i.test(url)) return false;
  return /store-images|store-images\.s-microsoft|store-images\.microsoft|microsoft|img-prod-cms-rt-microsoft-com/i.test(url);
}

async function collectForApp(browser, app) {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1100 },
    locale: 'en-US',
    extraHTTPHeaders: { 'accept-language': 'en-US,en;q=0.9' }
  });
  const page = await context.newPage();
  const found = new Map();

  const remember = (url, hint = '') => {
    const clean = cleanUrl(url);
    if (!imageUrlCandidate(clean)) return;
    if (!found.has(clean)) found.set(clean, hint);
  };

  page.on('response', async (response) => {
    const url = response.url();
    const headers = response.headers();
    const type = headers['content-type'] || '';
    if (/image\//i.test(type) || imageUrlCandidate(url)) remember(url, `response ${type}`);
    if (/json|javascript|text|html/i.test(type) && /apps|store|microsoft|displaycatalog|storeedge/i.test(url)) {
      try {
        const text = await response.text();
        for (const raw of text.match(/https?:\/\/[^"'<>\s\\]+/g) || []) remember(raw, `response-body ${url}`);
      } catch {}
    }
  });

  const urls = [
    `https://apps.microsoft.com/detail/${app.windowsProductId.toLowerCase()}?hl=en-US&gl=US`,
    `https://apps.microsoft.com/detail/${app.windowsProductId.toLowerCase()}?hl=en-US&gl=CA`,
    `https://apps.microsoft.com/store/detail/${app.windowsProductId.toLowerCase()}?hl=en-US&gl=US`
  ];

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4500);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(1800);
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1800);
      const browserUrls = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img, source').forEach((el) => {
          ['src', 'currentSrc', 'srcset', 'data-src', 'data-image-url'].forEach((attr) => {
            const value = el[attr] || el.getAttribute(attr);
            if (value) out.push(value);
          });
        });
        document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((el) => out.push(el.content));
        document.querySelectorAll('*').forEach((el) => {
          const bg = getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') out.push(bg);
        });
        performance.getEntriesByType('resource').forEach((entry) => out.push(entry.name));
        return out;
      });
      for (const raw of browserUrls) {
        for (const bit of String(raw).split(/,\s*/)) {
          const match = bit.match(/https?:\/\/[^\s)'"<>]+/i);
          if (match) remember(match[0], `dom ${url}`);
        }
      }
    } catch (error) {
      console.log(`! ${app.slug} browser page ${url} ${error.message}`);
    }
  }

  await context.close();
  return [...found.entries()].map(([url, hint]) => ({ url, hint }));
}

async function downloadWithContext(browser, app, candidate) {
  const page = await browser.newPage();
  try {
    const response = await page.goto(candidate.url, { waitUntil: 'load', timeout: 30000 });
    if (!response || !response.ok()) throw new Error(`HTTP ${response ? response.status() : 'no-response'}`);
    const buffer = await response.body();
    const contentType = response.headers()['content-type'] || '';
    return { buffer, contentType, ext: extFrom(candidate.url, contentType), dimensions: readImageDimensions(buffer) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function saveImage(app, stem, image) {
  const rel = `/assets/apps/${safeName(app.slug)}/windows/${safeName(stem)}${image.ext || '.img'}`;
  const full = path.join(PUBLIC_DIR, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, image.buffer);
  return rel;
}

async function processApp(browser, app) {
  const candidates = uniq((await collectForApp(browser, app)).map((item) => item.url)).map((url) => ({ url, hint: 'browser' }));
  let icon = null;
  const shots = [];
  let inspected = 0;

  for (const candidate of candidates.slice(0, 80)) {
    if (icon && shots.length >= MAX_SCREENSHOTS) break;
    try {
      inspected += 1;
      const image = await downloadWithContext(browser, app, candidate);
      if (!image.buffer || image.buffer.length < 1024) continue;
      const kind = classify(candidate.url, image.dimensions, candidate.hint);
      if (kind === 'skip') continue;
      if (!icon && kind === 'icon') {
        icon = await saveImage(app, 'icon', image);
        continue;
      }
      if (shots.length < MAX_SCREENSHOTS && kind !== 'icon') {
        shots.push(await saveImage(app, `shot-${String(shots.length + 1).padStart(2, '0')}`, image));
      }
    } catch {}
  }

  if (!icon && candidates[0]) {
    try { icon = await saveImage(app, 'icon', await downloadWithContext(browser, app, candidates[0])); } catch {}
  }

  return { icon, shots, candidateCount: candidates.length, inspected };
}

async function main() {
  console.log('BassThermal Microsoft browser asset harvest');
  const manifest = await readManifest();
  manifest.generatedAt = new Date().toISOString();
  manifest.source = 'tools/harvest-msstore-browser.mjs playwright-ms-v1';
  manifest.apps = manifest.apps || {};

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    for (const app of APPS) {
      const result = await processApp(browser, app);
      const record = cloneRecord(manifest.apps[app.slug]);
      if (result.icon) record.icon.windows = result.icon;
      if (result.shots.length) record.screenshots.windows = result.shots;
      record.icon.fallback = record.icon.android || record.icon.windows || record.icon.web || record.icon.fallback || null;
      manifest.apps[app.slug] = record;
      console.log(`${result.shots.length ? '✓' : '!'} ${app.slug} windows ${result.icon ? 'icon' : 'no-icon'} + ${result.shots.length} screenshots (${result.candidateCount} candidates, ${result.inspected} inspected)`);
    }
  } finally {
    await browser.close();
  }

  await writeManifest(manifest);
  console.log('wrote public/store-assets.generated.js');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
