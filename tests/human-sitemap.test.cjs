const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'assets/calculator-search-index.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'sitemap.html'),'utf8');
const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
const client=fs.readFileSync(path.join(root,'assets/human-sitemap.js'),'utf8');
const { renderHumanSitemap } = require('../scripts/generate-human-sitemap.cjs');

test('human sitemap lists every public calculator catalogue URL exactly once',()=>{
 const urls=[...html.matchAll(/<li class="sitemap-item" data-search="[^"]*"><a href="([^"]+)">/g)].map(m=>m[1]);
 assert.equal(urls.length,entries.length);
 assert.equal(new Set(urls).size,urls.length);
 assert.deepEqual([...urls].sort(),entries.map(x=>x.url).sort());
});
test('human sitemap groups every catalogue category and has indexable metadata',()=>{
 const categories=new Set(entries.map(x=>(x.category||'Other').trim().toLocaleLowerCase('en')));
 assert.equal((html.match(/<details class="sitemap-category"/g)||[]).length,categories.size);
 assert.match(html,/<meta name="robots" content="index,follow/);
 assert.match(html,/<link rel="canonical" href="https:\/\/friendlycalculator\.in\/sitemap\.html"/);
 assert.match(html,/<h1 id="sitemap-title">Friendly Calculator Sitemap<\/h1>/);
});
test('shared footer exposes sitemap in every supported language',()=>{
 assert.match(shell,/'\/sitemap\.html'/);
 for(const label of ['Sitemap','Sitemap (Englisch)','साइटमैप (अंग्रेज़ी)','Mapa del sitio (inglés)','Plan du site (anglais)','Mapa do site (inglês)','خريطة الموقع (بالإنجليزية)','Peta situs (Inggris)','সাইটম্যাপ (ইংরেজি)','தள வரைபடம் (ஆங்கிலம்)','サイトマップ（英語）','Карта сайта (англ.)'])assert.ok(shell.includes(label),'Missing footer label '+label);
});

test('human sitemap generator reproduces the checked-in complete catalogue without changing the site shell',()=>{
 assert.equal(renderHumanSitemap(html,entries),html);
 const total=entries.length;
 const calculators=entries.filter(x=>x.url.startsWith('/calculators/')).length;
 const international=total-calculators;
 const categories=new Set(entries.map(x=>(x.category||'Other').trim().toLocaleLowerCase('en'))).size;
 assert.ok(html.includes('data-sitemap-total="'+total+'"'));
 assert.ok(html.includes('<strong>'+total.toLocaleString('en-US')+'</strong> public catalogue entries'));
 assert.ok(html.includes('<strong>'+calculators.toLocaleString('en-US')+'</strong> calculator pages'));
 assert.ok(html.includes('<strong>'+international.toLocaleString('en-US')+'</strong> international entries'));
 assert.ok(html.includes('<p class="fc-sitemap-status" id="sitemap-status" role="status" aria-live="polite">'+total.toLocaleString('en-US')+' entries across '+categories.toLocaleString('en-US')+' categories.</p>'));
 assert.ok(html.includes('<strong>'+categories.toLocaleString('en-US')+'</strong> catalogue categories'));
});


test('human sitemap initializes its visible total from the generated catalogue on page load', () => {
 assert.ok(client.includes("const total=Number(document.querySelector('[data-sitemap-total]')?.dataset.sitemapTotal||0);"));
 assert.ok(client.lastIndexOf('filter();') > client.indexOf("document.querySelectorAll('.sitemap-category-index a')"), 'The initial count refresh must run after event listeners are registered');
 assert.ok(client.includes("status.textContent=query?visible.toLocaleString()+' matching calculator entries.':total.toLocaleString()+' entries across '+groups.length+' categories.';"));
});
