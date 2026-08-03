import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const indexPath = path.join(root, 'public', 'index.html');
const content = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bt-site-content.json'), 'utf8'));
const TOPNAV = '<nav class="topnav" aria-label="Primary"><a href="/guides/">Guides</a> · <a href="/support/">Support</a></nav>';
const FOOTER = '<footer class="footer"><a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · <a href="/security/">Security</a></footer>';
const INTRO = `<div class="line soft">${content.homepage.intro}</div>`;
const SECTION_LABEL = `<div class="line dim home-section-label">${content.homepage.sectionLabel}</div>`;
const VISITS_STYLE = '<link rel="stylesheet" href="/visits-terminal.css?v=3" data-bt-visual-style="visits-terminal">';
const VISITS_RENDERER = '<script src="/visits-terminal.js?v=3" defer data-bt-runtime="visits-terminal"></script>';

function addIcons(source) {
  return source.replace(/<a class="app-name" href="\/apps\/([^/]+)\/">([^<]+)<\/a>/g,
    '<a class="app-name app-title-link" href="/apps/$1/"><img class="app-icon is-missing" data-app-icon-slug="$1" alt="" aria-hidden="true" decoding="async"><span>$2</span></a>');
}

function normalizePlatformLabels(source) {
  return source
    .replace(/(<a class="tag windows"[^>]*>)win(<\/a>)/g, '$1Windows$2')
    .replace(/(<a class="tag android"[^>]*>)and(<\/a>)/g, '$1Android$2')
    .replace(/(<a class="tag web"[^>]*>)web(<\/a>)/g, '$1Web$2');
}

function removeLegacyReadoutRuntime(source) {
  return source
    .replace(/^\s*const readout = document\.getElementById\("readout"\);\r?\n/m, '')
    .replace(/^\s*function updateReadout\(\) \{[\s\S]*?^\s*\}\r?\n/m, '')
    .replace(/^\s*updateReadout\(\);\r?\n/m, '');
}

function removeLegacyHeaderStyles(source) {
  return source
    .replace(/\n\s*\.topline\s*\{[\s\S]*?\}\s*\n\s*\.topline strong\s*\{[\s\S]*?\}\s*/g, '\n')
    .replace(/\n\s*\.right\s*\{[\s\S]*?\}\s*/g, '\n')
    .replace(/\n\s*\.topline\s*\{\s*display:\s*block;\s*\}\s*/g, '\n')
    .replace(/\n\s*\.right\s*\{\s*display:\s*block;\s*text-align:\s*left;\s*margin-top:\s*2px;\s*\}\s*/g, '\n');
}

function transform(source) {
  const canonicalHeaderPattern = /(<header class="bt-site-header"[\s\S]*?<\/header>)/;
  const legacyHeaderPattern = /(<header class="topline">[\s\S]*?<\/header>)/;
  const hasCanonicalHeader = canonicalHeaderPattern.test(source);
  const headerPattern = hasCanonicalHeader ? canonicalHeaderPattern : legacyHeaderPattern;
  const navPattern = /<nav class="topnav" aria-label="Primary">[\s\S]*?<\/nav>/;
  const footerPattern = /<footer class="footer">[\s\S]*?<\/footer>/;
  const readoutPattern = /\s*<div class="right" id="readout">[\s\S]*?<\/div>/;
  const existingIntroPattern = /\s*<div class="line soft(?: home-intro)?">[\s\S]*?<\/div>/;
  const existingLabelPattern = /\s*<div class="line dim home-section-label">[\s\S]*?<\/div>/;

  if (!hasCanonicalHeader && !navPattern.test(source)) throw new Error('homepage primary navigation marker missing');
  if (!footerPattern.test(source)) throw new Error('homepage footer marker missing');
  if (!headerPattern.test(source)) throw new Error('homepage header marker missing');

  let output = source;
  if (!hasCanonicalHeader) output = output.replace(navPattern, TOPNAV);
  output = output
    .replace(footerPattern, FOOTER)
    .replace(readoutPattern, '')
    .replace(existingIntroPattern, '')
    .replace(existingLabelPattern, '');

  output = output.replace(headerPattern, `$1\n    ${INTRO}\n    ${SECTION_LABEL}`);
  output = normalizePlatformLabels(addIcons(output));
  output = removeLegacyReadoutRuntime(output);
  output = removeLegacyHeaderStyles(output);
  output = output.replace(/\s*<script src="\/visits-terminal-v2\.js\?v=2"[^>]*><\/script>/g, '');

  if (!output.includes('/visits-terminal.css')) output = output.replace(/<\/head>/i, `  ${VISITS_STYLE}\n</head>`);
  if (!output.includes('/visits-terminal.js')) output = output.replace(/<\/head>/i, `  ${VISITS_RENDERER}\n</head>`);
  return output;
}

function validate(source) {
  const errors = [];
  const hasCanonicalHeader = source.includes('class="bt-site-header"');
  if (hasCanonicalHeader) {
    if (!source.includes('class="bt-site-primary"')) errors.push('homepage canonical primary navigation is missing');
  } else if (!source.includes(TOPNAV)) errors.push('homepage top navigation is not canonical');
  if (!source.includes(FOOTER)) errors.push('homepage footer is not canonical');
  if (!source.includes(INTRO)) errors.push('homepage factual introduction is missing');
  if (!source.includes(SECTION_LABEL)) errors.push('homepage apps section label is missing');
  if (content.homepage.intro.toLowerCase().includes('canada')) errors.push('homepage introduction must not mention Canada');
  if (!source.includes('/visits-terminal.css?v=3')) errors.push('homepage Visits renderer styles missing');
  if (!source.includes('/visits-terminal.js?v=3')) errors.push('homepage direct Visits renderer missing');
  if (source.includes('/visits-terminal-v2.js')) errors.push('legacy Visits adapter remains');
  if (source.includes('id="readout"') || source.includes('10 apps · Windows · Android · Web')) errors.push('homepage status readout must not exist');
  if (source.includes('.topline')) errors.push('homepage legacy top-line styles must not exist');
  if (/\bconst readout\b|function updateReadout\b|updateReadout\(\)/.test(source)) errors.push('homepage readout runtime must not exist');
  if (source.includes('Independent software for practical work, study, and specialist workflows.')) errors.push('retired homepage sentence remains');
  if (source.includes('href="/terms/"') || source.includes('href="/releases/"')) errors.push('homepage contains retired utility route');
  if (/<a class="tag (?:windows|android|web)"[^>]*>(?:win|and|web)<\/a>/.test(source)) errors.push('homepage contains abbreviated platform labels');
  const rows = source.match(/class="row app-row"/g) || [];
  const icons = source.match(/data-app-icon-slug=/g) || [];
  if (rows.length !== icons.length) errors.push(`homepage icon count ${icons.length} must match app row count ${rows.length}`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS  Homepage identity, navigation, direct Visits renderer, and ${icons.length} app icons`);
  return true;
}

const source = fs.readFileSync(indexPath, 'utf8');
const output = transform(source);
if (!validateOnly) fs.writeFileSync(indexPath, output, 'utf8');
validate(output);
