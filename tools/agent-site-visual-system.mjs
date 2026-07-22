import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value, 'utf8');
const pages = [
  'dualticker','retrofy','coptic-dictionary','icon-pack-builder','favicon-harvester',
  'isbn-manager','rss-crawler','docbatch-pdf-converter','website-image-inventory','courselab-beam'
].map((slug) => `public/apps/${slug}/index.html`);

const marker = '/* BT-VISUAL-SYSTEM-1 */';
let css = read('public/style.css');
if (css.includes(marker)) css = css.slice(0, css.indexOf(marker)).trimEnd() + '\n';
css += `
${marker}
:root{--section:#6e7681;--row-hover:rgba(255,255,255,.026)}
.product-page{max-width:1120px;padding-bottom:28px}
.product-header{max-width:78ch;gap:9px 14px}
.product-header.has-product-icon{grid-template-columns:54px minmax(0,1fr)}
.product-icon{width:54px;height:54px}
.product-content{width:100%;max-width:none;gap:24px}
.product-section:not(.product-screenshots),.product-footer{max-width:78ch}
.product-section-title{margin:0 0 2px;color:var(--section);font-size:12.5px;font-weight:400;line-height:1.4;text-transform:lowercase}
.product-section>div:not(.product-section-title),.product-section li{line-height:1.55}
.product-footer{margin-top:4px;padding-top:12px;border-top:1px solid var(--line);color:var(--dim)}
.product-footer a{color:var(--soft)}
@media(max-width:860px){.product-header.has-product-icon{grid-template-columns:44px minmax(0,1fr)}.product-icon{width:44px;height:44px}.product-content{gap:20px}}
`;
write('public/style.css', css);

write('public/product-page-media.css', `.product-screenshots{width:100%;max-width:1040px;gap:10px}.product-shot-platforms{display:grid;gap:18px}.product-shot-group{display:grid;gap:7px}.product-shot-group-title{margin:0;color:var(--soft);font-size:12px;font-weight:400;text-transform:capitalize}.product-shot-grid{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}.product-shot{display:block;flex:1 1 320px;max-width:430px;min-width:220px;padding:0;border:0;background:transparent;color:var(--soft);text-align:left}.product-shot[data-orientation="portrait"]{flex:0 1 210px;max-width:240px;min-width:170px}.product-shot:hover,.product-shot:focus-visible{text-decoration:none}.product-shot img{display:block;width:100%;height:auto;max-height:430px;object-fit:contain;object-position:top center;background:#050505;border:1px solid var(--line)}.product-shot:hover img,.product-shot:focus-visible img{border-color:var(--soft)}.product-shot-viewer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.9)}.product-shot-viewer-frame{position:relative;display:grid;place-items:center;max-width:min(1200px,100%);max-height:100%}.product-shot-viewer-frame img{display:block;max-width:100%;max-height:calc(100vh - 48px);object-fit:contain;background:#000;border:1px solid var(--line)}.product-shot-viewer-close{position:absolute;top:7px;right:9px;z-index:1;width:32px;height:32px;display:grid;place-items:center;background:rgba(0,0,0,.84);border:1px solid var(--line);color:var(--hot);font-size:20px;line-height:1}.product-shot-viewer-close:hover,.product-shot-viewer-close:focus-visible{text-decoration:none;border-color:var(--soft)}@media(max-width:700px){.product-shot-grid{gap:9px}.product-shot{flex-basis:calc(50% - 5px);min-width:150px}.product-shot[data-orientation="portrait"]{flex-basis:calc(50% - 5px);max-width:220px;min-width:135px}.product-shot img{max-height:320px}.product-shot-viewer{padding:10px}.product-shot-viewer-frame img{max-height:calc(100vh - 20px)}}@media(max-width:390px){.product-shot,.product-shot[data-orientation="portrait"]{flex-basis:100%;max-width:100%;min-width:0}.product-shot[data-orientation="portrait"]{max-width:220px}}\n`);

write('public/product-page.js', `(() => {
  let initialized = false;
  let activeViewer = null;
  const platformOrder = ['windows', 'android', 'web'];
  const platformNames = { windows: 'Windows', android: 'Android', web: 'Web' };

  function ensureMediaStyles() {
    if (document.querySelector('link[data-product-page-media]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/product-page-media.css';
    link.dataset.productPageMedia = '1';
    document.head.append(link);
  }

  function closeViewer() {
    if (!activeViewer) return;
    const { root, trigger, onKeydown } = activeViewer;
    document.removeEventListener('keydown', onKeydown);
    root.remove();
    activeViewer = null;
    trigger?.focus?.();
  }

  function openViewer(src, alt, trigger) {
    closeViewer();
    const root = document.createElement('div');
    root.className = 'product-shot-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', alt);
    const frame = document.createElement('div');
    frame.className = 'product-shot-viewer-frame';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'product-shot-viewer-close';
    close.setAttribute('aria-label', 'Close screenshot');
    close.textContent = '×';
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    frame.append(close, image);
    root.append(frame);
    document.body.append(root);
    const onKeydown = (event) => { if (event.key === 'Escape') closeViewer(); };
    close.addEventListener('click', closeViewer);
    root.addEventListener('click', (event) => { if (event.target === root) closeViewer(); });
    document.addEventListener('keydown', onKeydown);
    activeViewer = { root, trigger, onKeydown };
    close.focus();
  }

  function renderIcon(app, header) {
    const img = document.querySelector('.product-icon');
    const fallback = app?.icon?.fallback;
    if (!img || typeof fallback !== 'string' || !fallback) return;
    img.addEventListener('load', () => header.classList.add('has-product-icon'), { once: true });
    img.addEventListener('error', () => { img.removeAttribute('src'); header.classList.remove('has-product-icon'); }, { once: true });
    img.src = fallback;
  }

  function renderScreenshots(app) {
    const screenshots = app?.screenshots || {};
    const groups = platformOrder
      .map((platform) => ({ platform, items: Array.isArray(screenshots[platform]) ? screenshots[platform] : [] }))
      .filter((group) => group.items.length);
    if (!groups.length) return;
    const content = document.querySelector('.product-content');
    if (!content || content.querySelector('[data-product-screenshots]')) return;
    const productName = document.querySelector('.product-title')?.textContent?.trim() || 'Product';
    const section = document.createElement('section');
    section.className = 'product-section product-screenshots';
    section.dataset.productScreenshots = '1';
    const heading = document.createElement('h2');
    heading.className = 'product-section-title';
    heading.textContent = 'screenshots';
    const platforms = document.createElement('div');
    platforms.className = 'product-shot-platforms';

    groups.forEach((group) => {
      const wrapper = document.createElement('section');
      wrapper.className = 'product-shot-group';
      const groupTitle = document.createElement('h3');
      groupTitle.className = 'product-shot-group-title';
      groupTitle.textContent = platformNames[group.platform] || group.platform;
      const gallery = document.createElement('div');
      gallery.className = 'product-shot-grid';
      group.items.forEach((src, index) => {
        const alt = `${productName} ${group.platform} screenshot ${index + 1}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-shot';
        button.setAttribute('aria-label', `Open ${alt}`);
        const image = document.createElement('img');
        image.src = src;
        image.alt = alt;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', () => {
          button.dataset.orientation = image.naturalHeight > image.naturalWidth * 1.12 ? 'portrait' : 'landscape';
        }, { once: true });
        button.append(image);
        button.addEventListener('click', () => openViewer(src, alt, button));
        gallery.append(button);
      });
      wrapper.append(groupTitle, gallery);
      platforms.append(wrapper);
    });

    section.append(heading, platforms);
    const faq = content.querySelector('.product-section.faq');
    if (faq) content.insertBefore(section, faq);
    else content.append(section);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureMediaStyles();
    const slug = document.body?.dataset?.appSlug || '';
    const header = document.querySelector('.product-header');
    const app = slug ? window.BT_STORE_ASSETS?.apps?.[slug] : null;
    if (!header || !app) return;
    renderIcon(app, header);
    renderScreenshots(app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();\n`);

function cleanFaq(html) {
  return html.replace(/<section class="product-section faq">([\s\S]*?)<\/section>/g, (whole, inner) => {
    let next = inner.replace(/<div><div class="q">([^<]+)<\/div><div>([\s\S]*?)<\/div><\/div>/g, (entry, question) => {
      const q = question.trim();
      if (/^Does .+ require a BassThermal account\?$/i.test(q)) return '';
      if (/^Where do I install it\?$/i.test(q)) return '';
      if (/^What does .+ do\?$/i.test(q)) return '';
      if (/^What kind of output does .+ make\?$/i.test(q)) return '';
      return entry;
    });
    if (!next.includes('class="q"')) return '';
    return `<section class="product-section faq">${next}</section>`;
  });
}

for (const file of pages) {
  let html = read(file);
  html = html.replace(/<div class="product-section-title">([^<]+)<\/div>/g, '<h2 class="product-section-title">$1</h2>');
  html = html.replace(/<section class="product-section"><h2 class="product-section-title">who for<\/h2>[\s\S]*?<\/section>\s*/gi, '');
  html = cleanFaq(html);
  html = html.replace(/<section class="product-section"><h2 class="product-section-title">privacy \+ support<\/h2><div>([\s\S]*?)<\/div><\/section>/i, '<footer class="product-footer">$1 · <a href="/">all apps</a></footer>');
  write(file, html);
}

let index = read('public/index.html');
index = index.replace('<div class="brand"><strong>BASSTHERMAL</strong></div>', '<h1 class="brand">BASSTHERMAL</h1>');
index = index.replaceAll('10 apps · Windows · Android · Web', '10 apps');
const homeMarker = '/* BT-HOME-VISUAL-SYSTEM-1 */';
if (!index.includes(homeMarker)) {
  index = index.replace('</style>', `${homeMarker}\n.site-shell{max-width:1220px;margin:0 auto}.brand{margin:0;color:var(--hot);font-size:14px;line-height:1.42;font-weight:700;letter-spacing:.01em}.app-row{padding:9px 8px;margin:0 -8px;transition:background 100ms ease}.app-row:hover,.app-row:focus-within{background:var(--row-hover,rgba(255,255,255,.026))}.app-title-link{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:8px}.app-icon{width:20px;height:20px;margin:0;object-fit:contain;vertical-align:middle}.app-icon.is-missing{display:block;visibility:hidden}.app-meta{padding-left:30px}.topline{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:baseline}.right{min-width:5ch}@media(max-width:820px){.topline{grid-template-columns:1fr;gap:2px}.topnav,.right{text-align:left}.app-row{margin:0;padding:8px 4px}.app-meta{padding-left:30px}}\n</style>`);
}
write('public/index.html', index);

let validator = read('tools/validate-product-pages.mjs');
if (!validator.includes('product-footer')) {
  validator = validator.replace("const requiredClasses = ['product-header','product-icon','product-heading','product-title','product-subtitle','product-platforms','product-section','product-section-title'];", "const requiredClasses = ['product-header','product-icon','product-heading','product-title','product-subtitle','product-platforms','product-section','product-section-title','product-footer'];");
  validator = validator.replace("  if (html.includes('CourseLab Beam: Shear & Moment: shear')) fail(file, 'duplicate CourseLab breadcrumb text remains');", "  if (html.includes('CourseLab Beam: Shear & Moment: shear')) fail(file, 'duplicate CourseLab breadcrumb text remains');\n  if (/class=[\"']product-section-title[\"']>who for</i.test(html)) fail(file, 'generic who for section remains');\n  if (/privacy \+ support/i.test(html)) fail(file, 'titled privacy + support block remains');\n  if (!/<h2 class=[\"']product-section-title[\"']>/i.test(html)) fail(file, 'semantic section headings missing');");
  write('tools/validate-product-pages.mjs', validator);
}

console.log('BassThermal visual system migration applied.');
