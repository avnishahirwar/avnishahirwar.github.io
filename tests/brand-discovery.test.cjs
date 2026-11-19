const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const page=fs.readFileSync(path.join(root,'calculator/why-friendly-calculator.html'),'utf8');
test('homepage presents Friendly Calculator consistently as an India and worldwide calculator platform',()=>{
 assert.ok(home.includes('<title>Wealth, Property &amp;amp; Free Online | Friendly Calc</title>'));\| EMI, GST &amp; Tax<\/title>/);
 assert.match(home,/<meta property="og:site_name" content="Friendly Calculator">/);
 assert.match(home,/"@type":"WebSite","@id":"https:\/\/friendlycalculator\.in\/#website","name":"Friendly Calculator"/);
 assert.match(home,/A calculator website for India, Madhya Pradesh and worldwide users/);
 assert.match(home,/why-friendly-calculator\.html/);
});
test('brand discovery page targets regional and multilingual intent without unsupported popularity claims',()=>{
 assert.match(page,/<title>Calculator Website for India, Madhya Pradesh &amp; Worldwide \| Friendly Calculator<\/title>/);
 assert.match(page,/canonical" href="https:\/\/friendlycalculator\.in\/calculator\/why-friendly-calculator\.html"/);
 for(const term of ['Indian top calculator website','world top calculator website','Madhya Pradesh top calculator website','most popular calculator website','top calculator website','multiple language support calculator'])assert.ok(page.toLowerCase().includes(term.toLowerCase()),'Missing query theme: '+term);
 assert.match(page,/does not claim to be No\. 1 or the most popular/);
 assert.match(page,/site-shell\.js/);
 assert.match(page,/professional-tax-calculator\.html/);
 assert.match(page,/electricity-bill-calculator\.html/);
 assert.match(page,/international\//);
});
