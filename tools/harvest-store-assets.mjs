import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST_FILE = path.join(PUBLIC_DIR, 'store-assets.generated.js');
const MAX_SCREENSHOTS = 10;
const REQUEST_DELAY_MS = 140;

const APPS = [
  { slug: 'dualticker', name: 'DualTicker', windowsProductId: '9p4txws57pld', androidPackage: 'com.bassthermal.dualtickerlens', webUrl: 'https://www.dualticker.com/' },
  { slug: 'retrofy', name: 'RetroFy', windowsProductId: '9nk0mhg9f29r', androidPackage: null, androidDiscoveryName: 'Retrofy' },
  { slug: 'coptic-dictionary', name: 'Coptic Dictionary', windowsProductId: '9nxmkjl625r2', androidPackage: 'com.bassthermal.copticdictionary' },
  { slug: 'icon-pack-builder', name: 'Icon Pack Builder', windowsProductId: '9mxvt3dfq295' },
  { slug: 'favicon-harvester', name: 'Favicon Harvester', windowsProductId: '9mxj31fxcq4f' },
  { slug: 'isbn-manager', name: 'ISBN Manager', windowsProductId: '9nr0nblx10fb' },
  { slug: 'rss-finder', name: 'RSS Finder', lab: true }
];

const TEXT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 BassThermalAssetHarvester/2.0',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'accept-language': 'en-US,en;q=0.9'
};

const IMG_HEADERS = {
  'user-agent': TEXT_HEADERS['user-agent'],
  'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9'
};

function sleep(ms = REQUEST_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlAndEscapes(input) {
  return String(input || '')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u003a/g, ':')
    .replace(/\\u002f/g, '/')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/\u0026/g, '&')
    .replace(/\u003d/g, '=')
    .replace(/\u003a/g, ':')
    .replace(/\u002f/gi, '/')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanUrl(url) {
  let out = decodeHtmlAndEscapes(url).trim();
  out = out.replace(/^[('"\s]+/g, '');
  out = out.replace(/[)'",;<>\]\s\\]+$/g, '');
  out = out.replace(/\\/g, '');
  return out;
}

function uniq(values) {
  return [...new Set((values || []).map(cleanUrl).filter(Boolean))];
}

function safeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
}

function extFrom(url, contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('image/webp')) return '.webp';
  if (ct.includes('image/png')) return '.png';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return '.jpg';
  if (ct.includes('image/svg')) return '.svg';
  const m = String(url || '').match(/\.(webp|png|jpe?g|svg)(?:$|[?#&])/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? '.jpg' : `.${m[1].toLowerCase()}`;
  return '.img';
}

async function fetchText(url, headers = TEXT_HEADERS) {
  await sleep();
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url, headers = TEXT_HEADERS) {
  await sleep();
  const response = await fetch(url, { headers: { ...headers, accept: 'application/json,*/*;q=0.8' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchImage(url) {
  await sleep();
  const response = await fetch(url, { headers: IMG_HEADERS, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  return { buffer, contentType, ext: extFrom(url, contentType), dimensions: readImageDimensions(buffer, contentType) };
}

function readImageDimensions(buffer, contentType = '') {
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
      if (type === 'VP8X' && buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
      if (type === 'VP8 ' && buffer.length >= 30) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      if (type === 'VP8L' && buffer.length >= 25) {
        const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
        return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
    }
  } catch {}
  return { width: 0, height: 0, contentType };
}

function classifyImage(url, dimensions, hint = '') {
  const width = dimensions?.width || 0;
  const height = dimensions?.height || 0;
  const ratio = width && height ? width / height : 0;
  const hay = `${url} ${hint}`.toLowerCase();

  const likelyIcon = /logo|icon|tile|square|packageicon|appicon|iconic|storelogo/.test(hay) || (width >= 80 && height >= 80 && ratio > 0.72 && ratio < 1.38 && width <= 1200 && height <= 1200);
  const likelyShot = /screenshot|screen|hero|poster|background|trailer|imagegallery/.test(hay) || (width >= 480 && height >= 260 && ratio >= 1.25);

  if (likelyShot && !/logo|icon|tile|storelogo/.test(hay)) return 'screenshot';
  if (likelyIcon) return 'icon';
  if (likelyShot) return 'screenshot';
  return 'other';
}

async function saveImage(app, platform, stem, url, image) {
  const ext = image.ext || '.img';
  const rel = `/assets/apps/${safeName(app.slug)}/${safeName(platform)}/${safeName(stem)}${ext}`;
  const full = path.join(PUBLIC_DIR, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, image.buffer);
  return rel;
}

function appSeedRecord() {
  return { icon: { fallback: null, android: null, windows: null, web: null }, screenshots: { android: [], windows: [], web: [] } };
}

function cloneRecord(record) {
  const base = appSeedRecord();
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

async function readExistingManifest() {
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
    try { vm.runInNewContext(content, sandbox, { timeout: 500 }); } catch {}
    return sandbox.window.BT_STORE_ASSETS || { generatedAt: null, source: 'empty', apps: {} };
  } catch {
    return { generatedAt: null, source: 'empty', apps: {} };
  }
}

function collectUrlsFromText(text, source = '') {
  const decoded = decodeHtmlAndEscapes(text);
  const out = [];
  const patterns = [
    /https?:\/\/[^"'<>\s\\]+/g,
    /https%3A%2F%2F[^"'<>\s\\]+/gi
  ];
  for (const re of patterns) {
    for (const raw of decoded.match(re) || []) {
      const url = cleanUrl(raw.replace(/%3A/gi, ':').replace(/%2F/gi, '/').replace(/%3F/gi, '?').replace(/%26/gi, '&').replace(/%3D/gi, '='));
      out.push({ url, hint: source });
    }
  }
  return out;
}

function collectMicrosoftImageCandidates(value, out = [], hint = '') {
  if (value == null) return out;
  if (typeof value === 'string') {
    const urls = collectUrlsFromText(value, hint);
    for (const item of urls) {
      if (/store-images|store-images\.s-microsoft|store-images\.microsoft|storeedge|microsoft\.com\/.*image/i.test(item.url)) {
        out.push(item);
      }
    }
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectMicrosoftImageCandidates(item, out, `${hint} array[${index}]`));
    return out;
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectMicrosoftImageCandidates(item, out, `${hint} ${key}`);
  }
  return out;
}

function filterMicrosoftCandidates(candidates) {
  const filtered = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const url = cleanUrl(candidate.url);
    if (!/^https?:\/\//i.test(url)) continue;
    if (!/store-images|store-images\.s-microsoft|store-images\.microsoft|microsoft/i.test(url)) continue;
    if (/\.svg(?:$|[?#])/i.test(url) && !/logo|icon/i.test(`${url} ${candidate.hint}`)) continue;
    if (/badge|rating|age|qr|barcode|glyph|sprite|favicon/i.test(url)) continue;
    const key = url.replace(/([?&](w|h|width|height|mode|format|quality)=[^&]+)/gi, '');
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push({ url, hint: candidate.hint || '' });
  }
  return filtered;
}

function microsoftPageUrls(productId) {
  const id = productId.toLowerCase();
  const markets = [
    { gl: 'CA', hl: 'en-US', market: 'CA', lang: 'en-US' },
    { gl: 'US', hl: 'en-US', market: 'US', lang: 'en-US' },
    { gl: 'CA', hl: 'en-CA', market: 'CA', lang: 'en-CA' }
  ];
  const urls = [];
  for (const item of markets) {
    urls.push(`https://apps.microsoft.com/detail/${id}?hl=${item.hl}&gl=${item.gl}`);
    urls.push(`https://apps.microsoft.com/store/detail/${id}?hl=${item.hl}&gl=${item.gl}`);
    urls.push(`https://apps.microsoft.com/detail/${id}?hl=${item.hl}&gl=${item.gl}&ocid=pdpshare`);
  }
  return urls;
}

function microsoftJsonUrls(productId) {
  const id = productId.toUpperCase();
  const combos = [
    ['CA', 'en-US'], ['US', 'en-US'], ['CA', 'en-CA'], ['GB', 'en-GB']
  ];
  const urls = [];
  for (const [market, lang] of combos) {
    urls.push(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${id}&market=${market}&languages=${lang}&MS-CV=DGU1mcuYo0WMMp+F.1`);
    urls.push(`https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/${id}?market=${market}&locale=${lang}&deviceFamily=Windows.Desktop`);
    urls.push(`https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/${id}?market=${market}&locale=${lang}`);
  }
  return urls;
}

async function harvestMicrosoft(app, report) {
  if (!app.windowsProductId) return { icon: null, shots: [] };
  const candidates = [];
  const pageFailures = [];
  const jsonFailures = [];

  for (const url of microsoftPageUrls(app.windowsProductId)) {
    try {
      const html = await fetchText(url);
      candidates.push(...collectMicrosoftImageCandidates(html, [], `html ${url}`));
      const scriptUrls = uniq((html.match(/<script[^>]+src=["']([^"']+)/gi) || []).map((tag) => {
        const m = tag.match(/src=["']([^"']+)/i);
        if (!m) return '';
        try { return new URL(decodeHtmlAndEscapes(m[1]), url).href; } catch { return ''; }
      })).filter((src) => /apps\.microsoft|store|assets|_next|static/i.test(src)).slice(0, 12);
      for (const scriptUrl of scriptUrls) {
        try {
          const script = await fetchText(scriptUrl, { ...TEXT_HEADERS, accept: 'application/javascript,text/javascript,*/*;q=0.8' });
          candidates.push(...collectMicrosoftImageCandidates(script, [], `script ${scriptUrl}`));
        } catch {}
      }
    } catch (error) {
      pageFailures.push(`${url} ${error.message}`);
    }
  }

  for (const url of microsoftJsonUrls(app.windowsProductId)) {
    try {
      const json = await fetchJson(url);
      candidates.push(...collectMicrosoftImageCandidates(json, [], `json ${url}`));
    } catch (error) {
      jsonFailures.push(`${url} ${error.message}`);
    }
  }

  const urls = filterMicrosoftCandidates(candidates);
  if (!urls.length) {
    report.push(`! ${app.slug} windows no Microsoft image URLs found (${pageFailures.length} page failures, ${jsonFailures.length} catalog failures)`);
    return { icon: null, shots: [] };
  }

  let icon = null;
  const shots = [];
  let inspected = 0;
  for (const candidate of urls.slice(0, 48)) {
    if (shots.length >= MAX_SCREENSHOTS && icon) break;
    inspected += 1;
    try {
      const image = await fetchImage(candidate.url);
      const type = classifyImage(candidate.url, image.dimensions, candidate.hint);
      if (!icon && (type === 'icon' || /logo|icon|tile|storelogo/i.test(candidate.hint))) {
        icon = await saveImage(app, 'windows', 'icon', candidate.url, image);
        continue;
      }
      if (shots.length < MAX_SCREENSHOTS && type !== 'icon') {
        shots.push(await saveImage(app, 'windows', `shot-${String(shots.length + 1).padStart(2, '0')}`, candidate.url, image));
      }
    } catch {}
  }

  if (!icon) {
    for (const candidate of urls.slice(0, 20)) {
      try {
        const image = await fetchImage(candidate.url);
        icon = await saveImage(app, 'windows', 'icon', candidate.url, image);
        break;
      } catch {}
    }
  }

  report.push(`✓ ${app.slug} windows ${icon ? 'icon' : 'no-icon'} + ${shots.length} screenshots (${urls.length} candidates, ${inspected} inspected)`);
  return { icon, shots };
}

async function resolveAndroidPackage(app) {
  if (app.androidPackage) return app.androidPackage;
  try {
    const html = decodeHtmlAndEscapes(await fetchText('https://play.google.com/store/apps/developer?id=BassThermal&hl=en_CA&gl=CA'));
    for (const m of html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)) {
      const around = html.slice(Math.max(0, m.index - 260), m.index + 320).toLowerCase();
      if (around.includes((app.androidDiscoveryName || app.name).toLowerCase())) return m[1];
    }
  } catch {}
  return null;
}

async function harvestAndroid(app, report) {
  const pkg = await resolveAndroidPackage(app);
  if (!pkg) {
    report.push(`! ${app.slug} android unresolved package id`);
    return { icon: null, shots: [] };
  }
  try {
    const html = decodeHtmlAndEscapes(await fetchText(`https://play.google.com/store/apps/details?id=${pkg}&hl=en_CA&gl=CA`));
    const urls = uniq((html.match(/https:\/\/play-lh\.googleusercontent\.com\/[^"'<>\\\s)]+/g) || []).map(cleanUrl));
    let icon = null;
    const shots = [];
    for (const url of urls) {
      try {
        const image = await fetchImage(url);
        const type = classifyImage(url, image.dimensions, 'google play');
        if (!icon && type === 'icon') {
          icon = await saveImage(app, 'android', 'icon', url, image);
          continue;
        }
        if (shots.length < MAX_SCREENSHOTS && type !== 'icon') shots.push(await saveImage(app, 'android', `shot-${String(shots.length + 1).padStart(2, '0')}`, url, image));
      } catch {}
    }
    if (!icon && urls[0]) {
      try { icon = await saveImage(app, 'android', 'icon', urls[0], await fetchImage(urls[0])); } catch {}
    }
    report.push(`✓ ${app.slug} android ${icon ? 'icon' : 'no-icon'} + ${shots.length} screenshots`);
    return { icon, shots };
  } catch (error) {
    report.push(`! ${app.slug} android ${error.message}`);
    return { icon: null, shots: [] };
  }
}

async function harvestWeb(app, report) {
  if (!app.webUrl) return { shots: [] };
  try {
    const html = await fetchText(app.webUrl, { ...TEXT_HEADERS, accept: 'text/html,*/*;q=0.8' });
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i);
    if (!m?.[1]) throw new Error('og:image missing');
    const url = new URL(decodeHtmlAndEscapes(m[1]), app.webUrl).href;
    const shot = await saveImage(app, 'web', 'shot-01', url, await fetchImage(url));
    report.push(`✓ ${app.slug} web 1 screenshot`);
    return { shots: [shot] };
  } catch (error) {
    report.push(`! ${app.slug} web ${error.message}`);
    return { shots: [] };
  }
}

function mergePlatform(existing, harvested, platform) {
  const record = cloneRecord(existing);
  if (harvested.icon) record.icon[platform] = harvested.icon;
  if (harvested.shots?.length) record.screenshots[platform] = harvested.shots;
  record.icon.fallback = record.icon.android || record.icon.windows || record.icon.web || record.icon.fallback || null;
  return record;
}

function previewLoaderSnippet() {
  return `\n(() => {\n  if (document.querySelector('script[data-bt-asset-preview]')) return;\n  const script = document.createElement('script');\n  script.src = '/asset-preview.js?v=stable-v3';\n  script.defer = true;\n  script.dataset.btAssetPreview = '1';\n  document.head.appendChild(script);\n})();\n`;
}

async function main() {
  const existing = await readExistingManifest();
  const manifest = { generatedAt: new Date().toISOString(), source: 'tools/harvest-store-assets.mjs robust-ms-v2', apps: { ...(existing.apps || {}) } };
  const report = [];
  console.log('BassThermal asset harvest');

  for (const app of APPS) {
    if (app.lab) {
      manifest.apps[app.slug] = cloneRecord(manifest.apps[app.slug]);
      report.push(`- ${app.slug} lab/no store assets`);
      continue;
    }

    let record = cloneRecord(manifest.apps[app.slug]);
    const android = await harvestAndroid(app, report);
    record = mergePlatform(record, android, 'android');
    const windows = await harvestMicrosoft(app, report);
    record = mergePlatform(record, windows, 'windows');
    const web = await harvestWeb(app, report);
    if (web.shots?.length) record.screenshots.web = web.shots;
    record.icon.fallback = record.icon.android || record.icon.windows || record.icon.web || record.icon.fallback || null;
    manifest.apps[app.slug] = record;
  }

  await writeFile(MANIFEST_FILE, `window.BT_STORE_ASSETS = ${JSON.stringify(manifest, null, 2)};\n${previewLoaderSnippet()}`, 'utf8');
  for (const line of report) console.log(line);
  console.log('wrote public/store-assets.generated.js');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
