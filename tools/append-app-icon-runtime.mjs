import { promises as fs } from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'public', 'store-assets.generated.js');
const marker = 'data-bt-app-icon-runtime';
const runtime = `
(() => {
  const styles = [
    ['/app-icons.css?v=2', 'icons'],
    ['/home-visual.css?v=2', 'home']
  ];
  for (const [href, key] of styles) {
    const selector = `link[${marker}="${key}"]`;
    if (document.querySelector(selector)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('${marker}', key);
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[${marker}]')) {
    const script = document.createElement('script');
    script.src = '/app-icon-hydrator.js?v=2';
    script.defer = true;
    script.setAttribute('${marker}', '1');
    document.head.appendChild(script);
  }
})();
`;

let source = await fs.readFile(file, 'utf8');
if (!source.includes(marker)) {
  source = `${source.trimEnd()}\n${runtime}`;
} else {
  source = source
    .replaceAll('/app-icons.css?v=1', '/app-icons.css?v=2')
    .replaceAll('/home-visual.css?v=1', '/home-visual.css?v=2')
    .replaceAll('/app-icon-hydrator.js?v=1', '/app-icon-hydrator.js?v=2');
}
await fs.writeFile(file, source, 'utf8');
