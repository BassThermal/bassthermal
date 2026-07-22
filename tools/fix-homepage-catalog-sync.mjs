import fs from 'node:fs';

const buildPath = 'tools/build-catalog.mjs';
let lines = fs.readFileSync(buildPath, 'utf8').split('\n');

const syncIndex = lines.findIndex((line) => line.includes('html = html.replace(/    const apps ='));
if (syncIndex < 0) throw new Error('homepage JS sync line not found');
lines.splice(syncIndex, 1,
  "  const jsAppsPattern = /(^\\s*const apps = )\\[[\\s\\S]*?^\\s*\\];/m;",
  "  ensure(jsAppsPattern.test(html), 'homepage JS app array marker missing');",
  "  html = html.replace(jsAppsPattern, `$1${homepageJsApps()};`);"
);

const tableMatchIndex = lines.findIndex((line) => line.includes('const tableMatch = check.match'));
if (tableMatchIndex < 0) throw new Error('homepage validation anchor not found');
const validationStart = lines.findIndex((line, index) => index > tableMatchIndex && line === '  for (const app of homepageApps()) {');
if (validationStart < 0) throw new Error('homepage validation loop not found');
const validationEnd = lines.findIndex((line, index) => index > validationStart && line === '  }');
if (validationEnd < 0) throw new Error('homepage validation loop end not found');
lines.splice(validationStart, validationEnd - validationStart + 1,
  "  const jsAppsMatch = check.match(/const apps = (\\[[\\s\\S]*?\\]);/);",
  "  ensure(Boolean(jsAppsMatch), 'homepage JS app array missing');",
  "  const jsAppsSource = jsAppsMatch?.[1] || '';",
  "  for (const app of homepageApps()) {",
  "    ensure(check.includes(`href=\"/apps/${app.slug}/\"`), `homepage missing app link: ${app.slug}`);",
  "    ensure(check.includes(`\"name\": \"${app.name}\"`), `homepage JSON-LD missing app name: ${app.name}`);",
  "    ensure(jsAppsSource.includes(`\"slug\": \"${app.slug}\"`), `homepage JS missing app slug: ${app.slug}`);",
  "    ensure(jsAppsSource.includes(`\"name\": \"${app.name}\"`), `homepage JS missing app name: ${app.name}`);",
  "  }",
  "  ensure(!jsAppsSource.includes('\"slug\": \"rss-finder\"'), 'homepage JS still contains legacy rss-finder slug');"
);

fs.writeFileSync(buildPath, lines.join('\n'));

const indexPath = 'public/index.html';
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace('"rss-finder": "feed discovery"', '"rss-crawler": "feed discovery"');
fs.writeFileSync(indexPath, index);

console.log('homepage catalog synchronization repaired');
