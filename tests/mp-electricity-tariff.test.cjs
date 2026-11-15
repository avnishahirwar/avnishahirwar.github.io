const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../assets/mp-electricity-tariff.js','file://'+__filename),'utf8');
const sandbox={window:{},document:{addEventListener(){},documentElement:{lang:'en'}}};
vm.runInNewContext(source,sandbox,{timeout:1000});
const calculate=sandbox.window.FCMpDomesticTariff.calculate;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.001,actual+' != '+expected);
test('MP LV-1.1 uses ₹3.72 per unit and no fixed charge',()=>{
 const r=calculate({units:30,other:0,area:'urban',category:'low',lowLoadWatts:100});
 close(r.energy,111.6);close(r.fixed,0);close(r.total,111.6);
});
test('MP LV-1.2 telescopic slabs and urban sanctioned-load fixed charge',()=>{
 const r=calculate({units:155,other:0,area:'urban',category:'standard',loadBlocks:11});
 close(r.energy,837.75);close(r.fixed,330);close(r.total,1167.75);
});
test('MP LV-1.2 rural fixed charge uses the rural per-0.1kW rate',()=>{
 const r=calculate({units:155,other:0,area:'rural',category:'standard',loadBlocks:11});
 close(r.fixed,308);close(r.total,1145.75);
});
test('MP LV-1.2 per-connection fixed charges apply through 150 units',()=>{
 close(calculate({units:50,other:0,area:'urban',category:'standard'}).fixed,81);
 close(calculate({units:100,other:0,area:'rural',category:'standard'}).fixed,111);
});
test('MP LV-1.2 requires explicit sanctioned-load blocks above 150 units',()=>{
 assert.throws(()=>calculate({units:151,other:0,area:'urban',category:'standard',loadBlocks:0}),/sanctioned load/);
});
test('invalid LV-1.1 eligibility and negative inputs are rejected',()=>{
 assert.throws(()=>calculate({units:31,other:0,area:'urban',category:'low',lowLoadWatts:100}),/LV-1.1/);
 assert.throws(()=>calculate({units:-1,other:0,area:'urban',category:'standard'}),/non-negative/);
});
test('English and Hindi pages share the tested official tariff engine and expose its inputs',()=>{
 for(const path of ['../calculators/electricity-bill-calculator.html','../hi/calculators/electricity-bill-calculator.html']){
  const html=fs.readFileSync(new URL(path,'file://'+__filename),'utf8');
  assert.match(html,/mp-electricity-tariff\.js/);
  for(const id of ['mpCategory','mpArea','mpLoadBlocks','mpUnits','mpTotal'])assert.ok(html.includes('id="'+id+'"'),path+' missing '+id);
  assert.match(html,/mperc\.in/);
 }
});
