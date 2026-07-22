import fs from 'node:fs';

const catalogPath = 'data/bt-catalog.json';
const pagePath = 'public/apps/courselab-beam/index.html';
const windowsUrl = 'https://apps.microsoft.com/detail/9mzx7h0whbcc';
const androidUrl = 'https://play.google.com/store/apps/details?id=com.bassthermal.courselabbeams';

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const app = catalog.apps.find((item) => item.slug === 'courselab-beam');
if (!app) throw new Error('CourseLab Beam catalog entry not found');

catalog.version = '2026.07.22.3';
app.tags = [...new Set([...(app.tags || []), 'windows'])];
app.platforms = ['windows', 'android'];
app.links.windows = windowsUrl;
app.seo.title = 'CourseLab Beam shear force and bending moment calculator for Windows and Android | BassThermal';
app.seo.description = 'Build determinate beam cases and view support reactions, shear-force diagrams, bending-moment diagrams, and calculation steps on Windows or Android.';
app.seo.operatingSystem = 'Windows, Android';
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

let page = fs.readFileSync(pagePath, 'utf8');
page = page
  .replace('CourseLab Beam shear force and bending moment calculator for Android | BassThermal', 'CourseLab Beam shear force and bending moment calculator for Windows and Android | BassThermal')
  .replaceAll('Build determinate beam cases and view support reactions, shear-force diagrams, bending-moment diagrams, and calculation steps on Android.', 'Build determinate beam cases and view support reactions, shear-force diagrams, bending-moment diagrams, and calculation steps on Windows or Android.')
  .replace('"operatingSystem":"Android"', '"operatingSystem":"Windows, Android"')
  .replace(`"downloadUrl":"${androidUrl}"`, `"downloadUrl":["${windowsUrl}","${androidUrl}"]`)
  .replace(`<div class="product-platforms cta-row"><a class="tag android" href="${androidUrl}">android</a></div>`, `<div class="product-platforms cta-row"><a class="tag windows" href="${windowsUrl}">windows</a> <a class="tag android" href="${androidUrl}">android</a></div>`)
  .replace('CourseLab Beam is a focused Android calculator for building determinate beam-loading cases', 'CourseLab Beam is a focused Windows and Android calculator for building determinate beam-loading cases')
  .replace('review reactions and calculation steps on a phone or tablet', 'review reactions and calculation steps on a Windows PC, phone, or tablet')
  .replace('From the Android link above.', 'From the Windows or Android link above.');

fs.writeFileSync(pagePath, page);
console.log('CourseLab Beam registered for Windows and Android.');
