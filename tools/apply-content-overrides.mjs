import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validateOnly = process.argv.includes('--validate-only');
const catalogPath = path.join(root, 'data', 'bt-catalog.json');
const contentPath = path.join(root, 'data', 'bt-site-content.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const errors = [];

const ensure = (condition, message) => { if (!condition) errors.push(message); };
ensure(content.schema === 'BT-SITE-CONTENT-1', 'site content schema must be BT-SITE-CONTENT-1');
ensure(Array.isArray(catalog.apps), 'catalog apps must be an array');
ensure(content.products && typeof content.products === 'object', 'site content products must be an object');

const catalogSlugs = new Set(catalog.apps.map((app) => app.slug));
const contentSlugs = new Set(Object.keys(content.products || {}));
for (const slug of catalogSlugs) ensure(contentSlugs.has(slug), `site content missing product ${slug}`);
for (const slug of contentSlugs) ensure(catalogSlugs.has(slug), `site content contains unknown product ${slug}`);

for (const app of catalog.apps || []) {
  const source = content.products?.[app.slug];
  if (!source) continue;
  ensure(typeof source.line === 'string' && source.line.trim(), `${app.slug} line is required`);
  ensure(typeof source.short === 'string' && source.short.trim(), `${app.slug} short is required`);
  ensure(typeof source.seo?.title === 'string' && source.seo.title.trim(), `${app.slug} SEO title is required`);
  ensure(typeof source.seo?.description === 'string' && source.seo.description.trim(), `${app.slug} SEO description is required`);
  app.line = source.line;
  app.short = source.short;
  app.seo = {
    ...app.seo,
    title: source.seo.title,
    description: source.seo.description
  };
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  if (!validateOnly) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`PASS  Applied human-facing catalog content for ${catalog.apps.length} products`);
}
