/**
 * Publishes a crawlable ISBN Manager microsite under /isbnmanager/.
 * Source: tools/isbn-manager-web.template.html
 * No npm dependencies, credentials, API calls or customer information.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'tools/isbn-manager-web.template.html'),'utf8');
const out=path.join(root,'public/isbnmanager');
const base='/isbnmanager';
const host='https://bassthermal.com';
const store='https://apps.microsoft.com/detail/9nr0nblx10fb?hl=en-US&gl=CA';
const css=source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!css||!script)throw new Error('ISBN Manager source missing CSS or JS');
const descriptors={
 '/':['ISBN Manager | Windows Book Inventory & Bookstore Software','Catalog books by ISBN, receive stock, manage checkout, print labels and review reports with ISBN Manager for Windows.'],
 '/product':['Product | ISBN Manager','A focused Windows desktop application for catalog, stock, checkout, labels and reports.'],
 '/features':['Features | ISBN Manager','Book catalog, receiving, point of sale, stocktake, barcode labels and reports in ISBN Manager.'],
 '/bookstores':['Bookstore Directory | ISBN Manager','Learn about the upcoming opt-in independent bookstore directory and preview the listing design.'],
 '/bookstores/kilkenny':['Example Bookstore Listing | ISBN Manager','An illustrative bookstore profile, not a verified directory member.'],
 '/bookstores/how-it-works':['How Bookstore Listings Work | ISBN Manager','How bookstore owners can prepare, preview and approve optional public business details.'],
 '/pricing':['Pricing & Licensing | ISBN Manager','Learn about the current Microsoft Store purchase option and future bookstore licensing plans.'],
 '/download':['Download for Windows | ISBN Manager','Install ISBN Manager for Windows from the official Microsoft Store product listing.'],
 '/help':['Help & FAQ | ISBN Manager','Guides, answers and direct support for ISBN Manager software.'],
 '/updates':['Product Roadmap | ISBN Manager','Ideas and planned developments for ISBN Manager; not a claim of shipped features.'],
 '/account':['Account Plans | ISBN Manager','Future software license account experience; no online sign-in is available.'],
 '/privacy':['Privacy Approach | ISBN Manager','How private book records are separated from optional public business listings.'],
 '/terms':['Future Commercial Terms | ISBN Manager','License and purchase terms are not yet published here.']
};
const urlFor=p=>base+(p==='/'?'/':p+'/');
const escaped=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const setup=s=>s.split('function routePath()')[0].replace(/^\s*\(\(\)=>\{'use strict';/,'');
const makePages=s=>vm.runInNewContext(setup(s)+'\n({routes})',{URL,console},{timeout:2000}).routes;
const staticRoutes=makePages(script);
const routes=Object.keys(descriptors);
for(const p of routes)if(!staticRoutes[p])throw new Error('Missing website route: '+p);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'site.css'),css+'\n/* Dedicated product site under BassThermal */\n@media(max-width:700px){.prototype-bar{font-size:9px}}\n');

let runtime=script;
runtime=runtime.replace(/function routePath\(\)\{[\s\S]*?\}\nfunction render\(\)/,
  "function routePath(){const p=decodeURIComponent(location.pathname).replace(/^\\/isbnmanager\\/?/,'/').replace(/\\/$/,'')||'/';return routes[p]?p:'/'}\nfunction render()");
runtime=runtime.replace(
  "window.scrollTo({top:0,behavior:'instant'});",
  "document.querySelectorAll('a[href^=\"#/\"]').forEach(a=>{const p=a.getAttribute('href').slice(1);a.setAttribute('href','/isbnmanager'+(p==='/'?'/':p+'/'));});"
);
runtime=runtime.replace("window.addEventListener('hashchange',render);render();","render();");
runtime=runtime.replaceAll('INTERACTIVE WEBSITE CONCEPT','ISBN MANAGER BY BASSTHERMAL');
runtime=runtime.replaceAll('No installer is bundled with this website design.','Install from the official Microsoft Store listing.');
runtime=runtime.replaceAll('Release link pending','Available on Microsoft Store');
runtime=runtime.replaceAll('The verified installer URL, version, checksum, and publisher details must be wired to the release pipeline before this becomes an actual download page.','Install from the verified Microsoft Store product listing. Separate installers and checksums are not offered here.');
runtime=runtime.replaceAll("href=\"https://bassthermal.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Visit BassThermal's official site",
    'href="'+store+'" target="_blank" rel="noopener noreferrer">Open Microsoft Store');
runtime=runtime.replaceAll('This leads to BassThermal, not directly to an installer.','Microsoft Store handles installation and purchase.');
runtime=runtime.replaceAll('Example derived from the bookstore-directory prototype. Not a live listing.','Example only. Not a verified or participating bookstore.');
fs.writeFileSync(path.join(out,'site.js'),runtime);

let shell=source.replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="/isbnmanager/site.css">')
  .replace(/<script>[\s\S]*?<\/script>/,'<script src="/isbnmanager/site.js" defer></script>');
shell=shell.replace('<b>INTERACTIVE WEBSITE CONCEPT</b> &nbsp;·&nbsp; No live purchase, account, download, or directory submission',
 '<b>ISBN MANAGER</b> &nbsp;·&nbsp; Windows desktop software · by BassThermal');
shell=shell.replace('ISBN Manager website design study','ISBN Manager');
const htmlFor=makePages(runtime);
const linked=s=>s.replace(/href="#(\/[^"\s]*)"/g,(_,p)=>'href="'+urlFor(p)+'"');
for(const p of routes){
  const [title,description]=descriptors[p];
  let html=shell.replace('<main id="main" tabindex="-1"></main>',
    '<main id="main" tabindex="-1">'+linked(htmlFor[p]())+'</main>');
  html=linked(html)
   .replace(/<title>[\s\S]*?<\/title>/,'<title>'+escaped(title)+'</title>')
   .replace(/<meta name="description" content="[^"]*">/,
     '<meta name="description" content="'+escaped(description)+'">\n'
     +'<link rel="canonical" href="'+host+urlFor(p)+'">\n'
     +'<meta property="og:type" content="website"><meta property="og:title" content="'+escaped(title)+'">\n'
     +'<meta property="og:description" content="'+escaped(description)+'"><meta property="og:image" content="'+host+'/og.png">');
  if(['/bookstores/kilkenny','/account','/privacy','/terms'].includes(p))html=html.replace('</head>','<meta name="robots" content="noindex,follow">\n</head>');
  const dest=p==='/'?out:path.join(out,p.slice(1));
  fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'index.html'),html);
}
const published=routes.filter(p=>!['/bookstores/kilkenny','/account','/privacy','/terms'].includes(p));
fs.writeFileSync(path.join(out,'sitemap.xml'),
 '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
 +published.map(p=>'  <url><loc>'+host+urlFor(p)+'</loc></url>').join('\n')+'\n</urlset>\n');
const robots=path.join(root,'public/robots.txt');
if(fs.existsSync(robots)){
  const entry='Sitemap: '+host+base+'/sitemap.xml';
  const current=fs.readFileSync(robots,'utf8');
  if(!current.includes(entry))fs.writeFileSync(robots,current.trimEnd()+'\n'+entry+'\n');
}
console.log('ISBN Manager: published '+routes.length+' static pages.');
