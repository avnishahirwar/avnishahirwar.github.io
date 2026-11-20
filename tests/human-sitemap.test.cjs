const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'assets/calculator-search-index.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'sitemap.html'),'utf8');
const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
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
 assert.match(html,/data-sitemap-total="3129"/);
 assert.ok(html.includes('<strong>3,129</strong> public catalogue entries'));
 assert.ok(html.includes('<strong>3,126</strong> calculator pages'));
 assert.ok(html.includes('<strong>3</strong> international entries'));
 assert.ok(html.includes('<strong>36</strong> catalogue categories'));
});
