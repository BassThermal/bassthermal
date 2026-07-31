import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bt-catalog.json'), 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bt-site-content.json'), 'utf8'));
const errors = [];
const ensure = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(publicRoot, relative), 'utf8');
const htmlFiles = fs.readdirSync(publicRoot, { recursive: true }).filter((file) => file.endsWith('.html'));

function localTarget(href, sourceFile) {
  const clean = href.split('?')[0];
  const [pathname, fragment = ''] = clean.split('#');
  if (!pathname && fragment) return { file: sourceFile, fragment };
  if (!pathname.startsWith('/')) return null;
  if (pathname === '/') return { file: 'index.html', fragment };
  const relative = pathname.replace(/^\//, '');
  if (relative.endsWith('/')) return { file: `${relative}index.html`, fragment };
  return { file: relative, fragment };
}

function validateLinks() {
  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
      const target = localTarget(href, file);
      if (!target) continue;
      const absolute = path.join(publicRoot, target.file);
      ensure(fs.existsSync(absolute), `dead internal link in public/${file}: ${href}`);
      if (!fs.existsSync(absolute) || !target.fragment) continue;
      const targetHtml = fs.readFileSync(absolute, 'utf8');
      const escaped = target.fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      ensure(new RegExp(`id=["']${escaped}["']`).test(targetHtml), `missing fragment ${href} from public/${file}`);
    }
  }
}

const homepage = read('index.html');
ensure(homepage.includes(content.homepage.intro), 'homepage factual introduction missing');
ensure(!content.homepage.intro.toLowerCase().includes('canada'), 'homepage introduction must remain demure and not mention Canada');
ensure(homepage.includes('<div class="line dim home-section-label">apps</div>'), 'homepage apps section label missing');
ensure(!homepage.includes('10 apps · Windows · Android · Web'), 'stale homepage readout remains');
ensure(!homepage.includes('Independent software for practical work'), 'retired homepage sentence remains');
ensure(!/>win<|>and<|>web</.test(homepage), 'homepage contains abbreviated platform labels');
ensure(!homepage.includes('href="/terms/"') && !homepage.includes('href="/releases/"'), 'homepage contains retired route');

const hydrator = read('app-icon-hydrator.js');
ensure(!hydrator.includes('normalizeHomepageLanguage'), 'runtime still rewrites homepage language');
ensure(!hydrator.includes('ensureProductGuideLink'), 'runtime still repairs product Guide links');
const publisherShell = read('publisher-shell.js');
ensure(!publisherShell.includes("link('/terms/'"), 'publisher footer still injects missing Terms route');

const privacyHashes = new Set();
for (const app of catalog.apps) {
  const source = content.products[app.slug];
  ensure(Boolean(source), `content missing ${app.slug}`);
  const productFile = `apps/${app.slug}/index.html`;
  const product = read(productFile);
  ensure(product.includes(`<h1 class="product-title">${app.name}</h1>`), `${app.slug} product H1 mismatch`);
  ensure(product.includes(source.seo.title), `${app.slug} product title not authoritative`);
  ensure(product.includes(source.seo.description), `${app.slug} product description not authoritative`);
  ensure(product.includes(source.guide.href), `${app.slug} product Guide link is not direct`);
  for (const label of ['what it does', 'how it works', 'useful for', 'requirements + limits', 'guide', 'privacy + support']) {
    ensure(product.includes(`>${label}<`), `${app.slug} missing product section ${label}`);
  }
  for (const banned of ['who for', 'upcoming workflows', 'What is it for?', 'Where do I install it?', 'Where is it installed?', 'Store-ready', 'store-ready', 'all required assets']) {
    ensure(!product.includes(banned), `${app.slug} contains banned generic copy: ${banned}`);
  }
  ensure((product.match(/<h1\b/g) || []).length === 1, `${app.slug} must contain one H1`);
  ensure(product.includes('type="application/ld+json"'), `${app.slug} schema is missing`);
  ensure(product.includes(app.seo.operatingSystem), `${app.slug} schema platform truth missing`);

  const privacyRelative = `${app.links.privacy.replace(/^\//, '')}index.html`;
  const privacy = read(privacyRelative);
  for (const heading of ['What stays on the device', 'What may be requested online', 'What BassThermal receives', 'Store and platform services', 'Removing local data', 'Contact']) {
    ensure(privacy.includes(`<h2>${heading}</h2>`), `${app.slug} privacy missing ${heading}`);
  }
  ensure(privacy.includes(source.privacy.summary), `${app.slug} privacy summary mismatch`);
  ensure(privacy.includes(source.privacy.local), `${app.slug} local privacy text mismatch`);
  ensure(privacy.includes(source.privacy.online), `${app.slug} online privacy text mismatch`);
  const digest = crypto.createHash('sha256').update(privacy).digest('hex');
  ensure(!privacyHashes.has(digest), `${app.slug} privacy policy duplicates another product policy`);
  privacyHashes.add(digest);
}

const about = read('about/index.html');
ensure(about.includes('independent software developer based in Canada'), 'About must retain factual location');
ensure(!about.includes('Product pages document the current workflow'), 'About contains internal information-architecture copy');
const support = read('support/index.html');
ensure(support.includes('Including a few specific details'), 'Support opening is not human-facing');
ensure(support.includes('Email BassThermal'), 'Support direct email action missing');
const privacyDirectory = read('privacy/index.html');
ensure(!privacyDirectory.includes('visible-page heartbeats'), 'Privacy directory exposes internal analytics jargon');
ensure(privacyDirectory.includes('temporary same-day identifier'), 'Privacy directory plain-language deduplication note missing');

for (const relative of [
  'guides/dualticker/compare-live-headline-sources/index.html',
  'guides/icon-pack-builder/create-windows-app-icons-from-one-png/index.html',
  'guides/favicon-harvester/collect-favicons-from-a-list-of-websites/index.html'
]) {
  const guide = read(relative);
  ensure(!/<h2>\s*\d+\.\s*/.test(guide), `${relative} duplicates automatic Guide numbering`);
}

for (const file of htmlFiles) {
  const html = read(file);
  ensure(!/href=["']\/terms\/?["']/.test(html), `public/${file} links to missing Terms route`);
  ensure(!/href=["']\/releases\/?["']/.test(html), `public/${file} links to retired Releases route`);
  if (!file.startsWith('privacy/') || file === 'privacy/index.html') {
    ensure(!html.includes('Local-first desktop utilities process files locally where applicable.'), `public/${file} contains generic placeholder privacy text`);
  }
  if (file.startsWith('apps/') || file.startsWith('guides/') || ['about/index.html', 'support/index.html', 'privacy/index.html'].includes(file)) {
    ensure(/<title>[^<]+<\/title>/i.test(html), `public/${file} missing title`);
    ensure(/<meta name="description" content="[^"]+"/i.test(html), `public/${file} missing description`);
    ensure(/<link rel="canonical" href="https:\/\/bassthermal\.com\/[^"]*"/i.test(html), `public/${file} missing apex canonical`);
  }
}

validateLinks();

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  console.log(`PASS  Static content, SEO, direct links, and ${catalog.apps.length} product-specific privacy policies`);
}
