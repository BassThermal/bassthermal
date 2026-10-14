import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const base=path.join(root,'public/isbnmanager');
const routes=['','product','features','bookstores','bookstores/kilkenny','bookstores/how-it-works','pricing','download','help','updates','account','privacy','terms'];
for(const route of routes){
  const file=path.join(base,route,'index.html');
  assert.ok(fs.existsSync(file),'Missing route '+route);
  const text=fs.readFileSync(file,'utf8');
  assert.match(text,/<h1(?:\s|>)/,'Page must be statically rendered: '+route);
  assert.match(text,/<meta name="description" content="[^"]+"/,'SEO description missing: '+route);
  assert.match(text,/<link rel="canonical" href="https:\/\/bassthermal\.com\/isbnmanager\//);
  assert.match(text,/\/isbnmanager\/site\.css/);
  assert.match(text,/\/isbnmanager\/site\.js/);
  assert.doesNotMatch(text,/href="#\//,'Old hash route on '+route);
  assert.doesNotMatch(text,/<h1[^>]*><\/h1>/,'Empty content '+route);
}
for(const file of ['site.js','site.css','sitemap.xml']){
  assert.ok(fs.statSync(path.join(base,file)).size>100,'Missing published asset '+file);
}
execFileSync(process.execPath,['--check',path.join(base,'site.js')]);
const down=fs.readFileSync(path.join(base,'download/index.html'),'utf8');
assert.ok(down.includes('apps.microsoft.com/detail/9nr0nblx10fb'),'Verified Microsoft Store link missing');
const example=fs.readFileSync(path.join(base,'bookstores/kilkenny/index.html'),'utf8');
assert.match(example,/noindex,follow/,'Unverified example must be excluded from search');
const account=fs.readFileSync(path.join(base,'account/index.html'),'utf8');
assert.match(account,/No credentials are accepted|not connected|Non-functional account/i,'Account must not imply live auth');
const map=fs.readFileSync(path.join(base,'sitemap.xml'),'utf8');
assert.ok(map.includes('/isbnmanager/bookstores/'));
assert.ok(!map.includes('/isbnmanager/bookstores/kilkenny/'));
console.log('PASS: 13 SSR routes, canonical tags, SEO descriptions, app assets, Store link, noindex safety, and JS syntax');
