const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const page=fs.readFileSync(path.join(root,'calculator/why-friendly-calculator.html'),'utf8');
test('homepage presents Friendly Calculator consistently as an India and worldwide calculator platform',()=>{
 assert.ok(home.includes('<title>Free Online Calculators | Friendly Calculator</title>'));
 assert.match(home,/<meta property="og:site_name" content="Friendly Calculator">/);
 const entities=[...home.matchAll(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match=>{
  const data=JSON.parse(match[1]);
  return Array.isArray(data['@graph'])?data['@graph']:[data];
 });
 assert.ok(entities.some(entity=>entity['@type']==='WebSite'&&entity['@id']==='https://friendlycalculator.in/#website'&&entity.url==='https://friendlycalculator.in/'&&entity.name==='Friendly Calculator'));
 assert.match(home,/A calculator website for India, Madhya Pradesh and worldwide users/);
 assert.match(home,/why-friendly-calculator\.html/);
});
test('brand discovery page targets regional and multilingual intent without unsupported popularity claims',()=>{
 assert.ok(page.includes('<title>Calculator Website for India, Madhya | Friendly Calc</title>'));
 assert.match(page,/canonical" href="https:\/\/friendlycalculator\.in\/calculator\/why-friendly-calculator\.html"/);
 for(const term of ['Indian top calculator website','world top calculator website','Madhya Pradesh top calculator website','most popular calculator website','top calculator website','multiple language support calculator'])assert.ok(page.toLowerCase().includes(term.toLowerCase()),'Missing query theme: '+term);
 assert.match(page,/does not claim to be No\. 1 or the most popular/);
 assert.match(page,/site-shell\.js/);
 assert.match(page,/professional-tax-calculator\.html/);
 assert.match(page,/electricity-bill-calculator\.html/);
 assert.match(page,/international\//);
});
