import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const indexPath = path.join(root, 'public', 'index.html');
const TOPNAV = '<nav class="topnav" aria-label="Primary"><a href="https://apps.microsoft.com/search/publisher?name=BassThermal&hl=en-US&gl=CA">Microsoft Store</a> · <a href="https://play.google.com/store/apps/developer?id=BassThermal">Google Play</a> · <a href="/guides/">Guides</a> · <a href="/support/">Support</a></nav>';
const FOOTER = '<footer class="footer"><a href="/privacy/">Privacy</a> · <a href="/guides/">Guides</a> · <a href="/support/">Support</a></footer>';

function addIcons(source) {
  return source.replace(/<a class="app-name" href="\/apps\/([^/]+)\/">([^<]+)<\/a>/g,
    '<a class="app-name app-title-link" href="/apps/$1/"><img class="app-icon is-missing" data-app-icon-slug="$1" alt="" aria-hidden="true" decoding="async"><span>$2</span></a>');
}

function transform(source) {
  const navPattern = /<nav class="topnav" aria-label="Primary">[\s\S]*?<\/nav>/;
  const footerPattern = /<footer class="footer">[\s\S]*?<\/footer>/;
  if (!navPattern.test(source)) throw new Error('homepage primary navigation marker missing');
  if (!footerPattern.test(source)) throw new Error('homepage footer marker missing');
  return addIcons(source.replace(navPattern, TOPNAV).replace(footerPattern, FOOTER));
}

function validate(source) {
  const errors = [];
  if ((source.match(/href="\/guides\/"/g) || []).length < 2) errors.push('homepage requires Guides links in top navigation and footer');
  if (!source.includes(TOPNAV)) errors.push('homepage top navigation is not canonical');
  if (!source.includes(FOOTER)) errors.push('homepage footer is not canonical');
  const rows = source.match(/class="row app-row"/g) || [];
  const icons = source.match(/data-app-icon-slug=/g) || [];
  if (rows.length !== icons.length) errors.push(`homepage icon count ${icons.length} must match app row count ${rows.length}`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS  Homepage chrome and ${icons.length} app icons`);
  return true;
}

const source = fs.readFileSync(indexPath, 'utf8');
const output = transform(source);
if (!validateOnly) fs.writeFileSync(indexPath, output, 'utf8');
validate(output);
