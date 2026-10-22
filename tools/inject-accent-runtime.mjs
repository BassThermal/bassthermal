import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const validateOnly = process.argv.includes('--validate-only');
const style = '<link rel="stylesheet" href="/bt-accent-system.css?v=2" data-bt-accent-style="1">';
const runtime = '<script src="/bt-accent-system.js?v=1" defer data-bt-accent-runtime="1"></script>';
const errors = [];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

function inject(source) {
  let next = source
    .replace(/\/bt-accent-system\.css\?v=\d+/g, '/bt-accent-system.css?v=2')
    .replace(/\/bt-accent-system\.js\?v=\d+/g, '/bt-accent-system.js?v=1');
  if (!next.includes('/bt-accent-system.css?v=2')) {
    next = next.replace(/<\/head>/i, `  ${style}\n</head>`);
  }
  if (!next.includes('/bt-accent-system.js?v=1')) {
    next = next.replace(/<\/head>/i, `  ${runtime}\n</head>`);
  }
  return next;
}

const files = walk(publicRoot);
for (const absolute of files) {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  const current = fs.readFileSync(absolute, 'utf8');
  const next = inject(current);
  if (!next.includes('/bt-accent-system.css?v=2')) errors.push(`${relative} missing accent stylesheet`);
  if (!next.includes('/bt-accent-system.js?v=1')) errors.push(`${relative} missing accent runtime`);
  if (!validateOnly && next !== current) fs.writeFileSync(absolute, next, 'utf8');
}

if (errors.length) {
  console.error(`accent runtime injection failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`accent runtime ${validateOnly ? 'validated' : 'injected'} across ${files.length} public HTML files`);
