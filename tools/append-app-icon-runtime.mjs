import { promises as fs } from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'public', 'store-assets.generated.js');
const marker = 'data-bt-app-icon-runtime';
const runtime = `
(() => {
  const styles = [
    ['/app-icons.css?v=2', 'icons'],
    ['/home-visual.css?v=4', 'home'],
    ['/bt-accent-system.css?v=1', 'accent']
  ];
  for (const [href, key] of styles) {
    const selector = 'link[${marker}="' + key + '"]';
    if (document.querySelector(selector)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('${marker}', key);
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[${marker}]')) {
    const script = document.createElement('script');
    script.src = '/app-icon-hydrator.js?v=6';
    script.defer = true;
    script.setAttribute('${marker}', '1');
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-bt-accent-runtime]')) {
    const script = document.createElement('script');
    script.src = '/bt-accent-system.js?v=1';
    script.defer = true;
    script.setAttribute('data-bt-accent-runtime', '1');
    document.head.appendChild(script);
  }
})();
`;

let source = await fs.readFile(file, 'utf8');
if (!source.includes(marker)) source = `${source.trimEnd()}\n${runtime}`;
else source = source
  .replaceAll('/app-icons.css?v=1', '/app-icons.css?v=2')
  .replaceAll('/home-visual.css?v=1', '/home-visual.css?v=4')
  .replaceAll('/home-visual.css?v=2', '/home-visual.css?v=4')
  .replaceAll('/home-visual.css?v=3', '/home-visual.css?v=4')
  .replaceAll('/app-icon-hydrator.js?v=1', '/app-icon-hydrator.js?v=6')
  .replaceAll('/app-icon-hydrator.js?v=2', '/app-icon-hydrator.js?v=6')
  .replaceAll('/app-icon-hydrator.js?v=3', '/app-icon-hydrator.js?v=6')
  .replaceAll('/app-icon-hydrator.js?v=4', '/app-icon-hydrator.js?v=6')
  .replaceAll('/app-icon-hydrator.js?v=5', '/app-icon-hydrator.js?v=6');

if (!source.includes('/bt-accent-system.css?v=1')) {
  source = source.replace("    ['/home-visual.css?v=4', 'home']", "    ['/home-visual.css?v=4', 'home'],\n    ['/bt-accent-system.css?v=1', 'accent']");
}
if (!source.includes('data-bt-accent-runtime')) {
  source = source.replace(/\n\}\)\(\);\s*$/, `\n  if (!document.querySelector('script[data-bt-accent-runtime]')) {\n    const script = document.createElement('script');\n    script.src = '/bt-accent-system.js?v=1';\n    script.defer = true;\n    script.setAttribute('data-bt-accent-runtime', '1');\n    document.head.appendChild(script);\n  }\n})();\n`);
}
await fs.writeFile(file, source, 'utf8');
