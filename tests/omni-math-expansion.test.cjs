const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(new URL('../assets/keyword-calculators.js', 'file://' + __filename), 'utf8');
function definitions(){const at=source.lastIndexOf('})();');const code=source.slice(0,at)+'globalThis.__defs=defs;'+source.slice(at);const sandbox={document:{readyState:'loading',addEventListener(){}}};vm.runInNewContext(code,sandbox,{timeout:1000});return sandbox.__defs;}
function close(a,b){assert.ok(Math.abs(a-b)<1e-8, a+' != '+b);}
test('nine new calculator routes are listed and use the shared calculator engine',()=>{
 const slugs=["percentage-change-calculator","percentage-increase-calculator","percentage-decrease-calculator","percentage-difference-calculator","fraction-to-percent-calculator","decimal-to-percent-converter","weighted-average-calculator","median-calculator","mode-calculator"];
 for(const slug of slugs){const html=fs.readFileSync(new URL('../calculators/'+slug+'.html','file://'+__filename),'utf8');assert.match(html,/keyword-calculators\.js/);assert.ok(html.includes('data-calculator="'+({ "percentage-change-calculator":"percentage-change", "percentage-increase-calculator":"percentage-increase", "percentage-decrease-calculator":"percentage-decrease", "percentage-difference-calculator":"percentage-difference", "fraction-to-percent-calculator":"fraction-to-percent", "decimal-to-percent-converter":"decimal-to-percent", "weighted-average-calculator":"weighted-average", "median-calculator":"median", "mode-calculator":"mode" }[slug]) +'"'));}
});
test('percentage change, increase, decrease and difference formulas return expected values',()=>{
 const d=definitions();close(d['percentage-change'].calc({oldValue:100,newValue:125})[1][1],25);close(d['percentage-increase'].calc({base:100,rate:15})[1][1],115);close(d['percentage-decrease'].calc({base:100,rate:15})[1][1],85);close(d['percentage-difference'].calc({first:100,second:120})[1][1],18.181818181818183);
 assert.equal(d['percentage-change'].calc({oldValue:0,newValue:5}).length,0);assert.equal(d['percentage-decrease'].calc({base:10,rate:110}).length,0);
});
test('fraction and decimal conversions are correct',()=>{
 const d=definitions();close(d['fraction-to-percent'].calc({numerator:3,denominator:4})[1][1],75);close(d['decimal-to-percent'].calc({decimal:0.75})[0][1],75);assert.equal(d['fraction-to-percent'].calc({numerator:3,denominator:0}).length,0);
});
test('weighted average, median and mode handle representative data',()=>{
 const d=definitions();close(d['weighted-average'].calc({values:'10,20,30',weights:'1,2,3'})[2][1],23.333333333333332);assert.equal(d['weighted-average'].calc({values:'1,2',weights:'1'}).length,0);
 close(d.median.calc({values:'4,1,7,3,9'})[2][1],4);close(d.median.calc({values:'1,3,7,9'})[2][1],5);
 assert.equal(d.mode.calc({values:'2,3,3,4,5,5,5'})[2][1],'5');assert.equal(d.mode.calc({values:'1,2,3'})[2][1],'No repeated mode');
});
