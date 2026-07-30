import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync('public/visits-terminal.js', 'utf8');
const css = fs.readFileSync('public/visits-terminal.css', 'utf8');
const builder = fs.readFileSync('tools/build-homepage-chrome.mjs', 'utf8');
const finalizer = fs.readFileSync('tools/finalize-visits-runtime.mjs', 'utf8');
const wrangler = fs.readFileSync('wrangler.toml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const command of ['visits now','visits today','visits pages','visits apps','visits clicks','visits health','visits off']) assert.match(renderer, new RegExp(command.replace(' ', '\\s')));
for (const alias of ['visits all','visits live']) assert.match(finalizer, new RegExp(alias.replace(' ', '\\s')));
for (const label of ['NOW','TODAY','people','sessions','visitors','views','clicks','time']) assert.match(renderer, new RegExp(label));
for (const field of ['activePeople','activeSessions','visitorsToday','sessionsToday','pageViewsToday','clicksToday','visibleTodayLabel']) assert.match(renderer, new RegExp(field));
assert.match(renderer, /event\.stopImmediatePropagation\(\)/);
assert.match(renderer, /addEventListener\('submit',[\s\S]*true\)/);
assert.match(renderer, /addEventListener\('click',[\s\S]*true\)/);
assert.doesNotMatch(renderer, /\bsig\b|signalReasons|suspect/);
assert.doesNotMatch(renderer, /nativeFetch|window\.fetch\s*=/);
assert.match(finalizer, /generation-safe refresh/);
assert.match(finalizer, /document\.visibilityState !== 'visible'/);
assert.match(finalizer, /MutationObserver/);
assert.match(css, /bt-visits-city-table/);
assert.match(css, /@media\(max-width:520px\)/);
assert.match(builder, /visits-terminal\.js\?v=3/);
assert.match(builder, /visits-terminal\.css\?v=3/);
assert.doesNotMatch(builder, /VISITS_ADAPTER/);
assert.match(wrangler, /\[build\][\s\S]*command = "npm run build:site"/);
assert.match(pkg.scripts['build:site'], /visits:finalize/);

console.log('direct Visits renderer and production build contract passed');
