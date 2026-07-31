import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync('public/visits-terminal.js', 'utf8');
const css = fs.readFileSync('public/visits-terminal.css', 'utf8');
const hydrator = fs.readFileSync('public/app-icon-hydrator.js', 'utf8');
const wrangler = fs.readFileSync('wrangler.toml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const command of ['visits all','visits live','visits now','visits today','visits pages','visits apps','visits clicks','visits health','visits off']) {
  assert.match(renderer, new RegExp(command.replace(' ', '\\s')));
}
for (const label of ['NOW','TODAY','people','sessions','visitors','views','clicks','time']) {
  assert.match(renderer, new RegExp(label));
}
for (const field of ['activePeople','activeSessions','visitorsToday','sessionsToday','pageViewsToday','clicksToday','visibleTodayLabel']) {
  assert.match(renderer, new RegExp(field));
}

const summarySource = renderer.slice(
  renderer.indexOf('function renderSummary'),
  renderer.indexOf('function renderNow')
);
assert.match(summarySource, /bt-visits-summary-lines/);
assert.match(summarySource, /compactActive\(data\)/);
assert.match(summarySource, /compactCities\(data\)/);
assert.match(summarySource, /compactClick\(data\)/);
assert.doesNotMatch(summarySource, /activeRows\(data\)|cityRows\(data\)|CLICKS TODAY/);
assert.match(renderer, /slice\(0, limit\)/);
assert.match(renderer, /\+\$\{remaining\} more/);
assert.match(renderer, /data-command="\/visits today"/);
assert.match(renderer, /top click/);

assert.match(renderer, /event\.stopImmediatePropagation\(\)/);
assert.match(renderer, /addEventListener\('submit',[\s\S]*true\)/);
assert.match(renderer, /addEventListener\('click',[\s\S]*true\)/);
assert.match(renderer, /generation/);
assert.match(renderer, /AbortController/);
assert.match(renderer, /document\.visibilityState/);
assert.match(renderer, /MutationObserver/);
assert.doesNotMatch(renderer, /\bsig\b|signalReasons|suspect/);
assert.doesNotMatch(renderer, /nativeFetch|window\.fetch\s*=/);

for (const selector of [
  'bt-visits-overview',
  'bt-visits-summary-lines',
  'bt-visits-compact-group',
  'bt-visits-active-compact',
  'bt-visits-city-compact',
  'bt-visits-more'
]) {
  assert.match(css, new RegExp(selector));
}
assert.match(css, /bt-visits-city-table/);
assert.match(css, /@media \(max-width: 520px\)/);
assert.match(hydrator, /visits-terminal\.js\?v=5/);
assert.match(hydrator, /visits-terminal\.css\?v=5/);
assert.match(hydrator, /href="\/guides\/"/);
assert.match(hydrator, /href="\/about\/"/);

assert.doesNotMatch(wrangler, /\[build\]/);
assert.equal(pkg.scripts.deploy, 'wrangler deploy');
assert.equal(pkg.scripts.dev, 'wrangler dev');
assert.doesNotMatch(pkg.scripts['build:site'], /visits:finalize/);

console.log('compact Visits overview and static deployment contract passed');
