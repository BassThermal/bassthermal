import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const indexPath = path.join(root, 'public', 'index.html');
const TOPNAV = '<nav class="topnav" aria-label="Primary"><a href="/guides/">Guides</a> · <a href="/support/">Support</a></nav>';
const FOOTER = '<footer class="footer"><a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · <a href="/security/">Security</a></footer>';
const VISITS_RENDERER = '<script src="/visits-terminal.js?v=3" defer data-bt-runtime="visits-terminal"></script>';

function addIcons(source) {
  return source.replace(/<a class="app-name" href="\/apps\/([^/]+)\/">([^<]+)<\/a>/g,
    '<a class="app-name app-title-link" href="/apps/$1/"><img class="app-icon is-missing" data-app-icon-slug="$1" alt="" aria-hidden="true" decoding="async"><span>$2</span></a>');
}

function transform(source) {
  const navPattern = /<nav class="topnav" aria-label="Primary">[\s\S]*?<\/nav>/;
  const footerPattern = /<footer class="footer">[\s\S]*?<\/footer>/;
  const readoutPattern = /\s*<div class="right" id="readout">[\s\S]*?<\/div>/;
  if (!navPattern.test(source)) throw new Error('homepage primary navigation marker missing');
  if (!footerPattern.test(source)) throw new Error('homepage footer marker missing');
  let output = addIcons(source.replace(navPattern, TOPNAV).replace(footerPattern, FOOTER).replace(readoutPattern, ''));
  output = output.replace(/\s*<script src="\/visits-terminal-v2\.js\?v=2"[^>]*><\/script>/g, '');
  if (!output.includes('/visits-terminal.js')) output = output.replace(/<\/head>/i, `  ${VISITS_RENDERER}\n</head>`);
  return output;
}

function validate(source) {
  const errors = [];
  if (!source.includes(TOPNAV)) errors.push('homepage top navigation is not canonical');
  if (!source.includes(FOOTER)) errors.push('homepage footer is not canonical');
  if (!source.includes('/visits-terminal.js?v=3')) errors.push('homepage direct Visits renderer missing');
  if (source.includes('/visits-terminal-v2.js')) errors.push('legacy Visits adapter remains');
  if (source.includes('id="readout"') || source.includes('10 apps · Windows · Android · Web')) errors.push('homepage status readout must not exist');
  if (source.includes('href="/terms/"') || source.includes('href="/releases/"')) errors.push('homepage contains retired utility route');
  const rows = source.match(/class="row app-row"/g) || [];
  const icons = source.match(/data-app-icon-slug=/g) || [];
  if (rows.length !== icons.length) errors.push(`homepage icon count ${icons.length} must match app row count ${rows.length}`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS  Homepage chrome, direct Visits renderer, and ${icons.length} app icons`);
  return true;
}

const source = fs.readFileSync(indexPath, 'utf8');
const output = transform(source);
if (!validateOnly) fs.writeFileSync(indexPath, output, 'utf8');
validate(output);
