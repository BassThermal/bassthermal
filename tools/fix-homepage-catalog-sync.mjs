import fs from 'node:fs';

const buildPath = 'tools/build-catalog.mjs';
let build = fs.readFileSync(buildPath, 'utf8');

const oldSync = `  html = html.replace(/    const apps = \\[\\n.*?\\n    \\];/s, \`    const apps = \\${homepageJsApps()};\`);`;
const newSync = `  const jsAppsPattern = /(^\\s*const apps = )\\[[\\s\\S]*?^\\s*\\];/m;\n  ensure(jsAppsPattern.test(html), 'homepage JS app array marker missing');\n  html = html.replace(jsAppsPattern, \`$1\\${homepageJsApps()};\`);`;
if (!build.includes(oldSync)) throw new Error('expected homepage JS sync line not found');
build = build.replace(oldSync, newSync);

const oldValidation = `  for (const app of homepageApps()) {\n    ensure(check.includes(\`href="/apps/\\${app.slug}/"\`), \`homepage missing app link: \\${app.slug}\`);\n    ensure(check.includes(\`"name": "\\${app.name}"\`), \`homepage JSON-LD missing app name: \\${app.name}\`);\n    ensure(check.includes(\`name": "\\${app.name}"\`) || check.includes(\`name: "\\${app.name}"\`), \`homepage JS missing app name: \\${app.name}\`);\n  }`;
const newValidation = `  const jsAppsMatch = check.match(/const apps = (\\[[\\s\\S]*?\\]);/);\n  ensure(Boolean(jsAppsMatch), 'homepage JS app array missing');\n  const jsAppsSource = jsAppsMatch?.[1] || '';\n  for (const app of homepageApps()) {\n    ensure(check.includes(\`href="/apps/\\${app.slug}/"\`), \`homepage missing app link: \\${app.slug}\`);\n    ensure(check.includes(\`"name": "\\${app.name}"\`), \`homepage JSON-LD missing app name: \\${app.name}\`);\n    ensure(jsAppsSource.includes(\`"slug": "\\${app.slug}"\`), \`homepage JS missing app slug: \\${app.slug}\`);\n    ensure(jsAppsSource.includes(\`"name": "\\${app.name}"\`), \`homepage JS missing app name: \\${app.name}\`);\n  }\n  ensure(!jsAppsSource.includes('"slug": "rss-finder"'), 'homepage JS still contains legacy rss-finder slug');`;
if (!build.includes(oldValidation)) throw new Error('expected homepage validation block not found');
build = build.replace(oldValidation, newValidation);
fs.writeFileSync(buildPath, build);

const indexPath = 'public/index.html';
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace('"rss-finder": "feed discovery"', '"rss-crawler": "feed discovery"');
fs.writeFileSync(indexPath, index);

console.log('homepage catalog synchronization repaired');
