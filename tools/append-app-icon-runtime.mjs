import { promises as fs } from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'public', 'store-assets.generated.js');
const marker = 'data-bt-app-icon-runtime';
const runtime = `
(() => {
  const styles = [
    ['/app-icons.css?v=1', 'icons'],
    ['/home-visual.css?v=1', 'home']
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
    script.src = '/app-icon-hydrator.js?v=1';
    script.defer = true;
    script.setAttribute('${marker}', '1');
    document.head.appendChild(script);
  }
})();
`;

let source = await fs.readFile(file, 'utf8');
if (!source.includes(marker)) {
  source = `${source.trimEnd()}\n${runtime}`;
  await fs.writeFile(file, source, 'utf8');
}
