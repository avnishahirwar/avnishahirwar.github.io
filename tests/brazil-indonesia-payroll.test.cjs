'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculateBrazilINSS2026}=require('../assets/brazil-inss-2026.js');
const {calculateIndonesiaPPh21TER,TER_TABLES}=require('../assets/indonesia-pph21.js');
const root=path.join(__dirname,'..');

test('Brazil 2026 employee INSS uses progressive official contribution bands',()=>{
 const r=calculateBrazilINSS2026(5000);
 assert.equal(r.contribution,501.51);
 assert.equal(r.contributionBase,5000);
 assert.equal(r.year,2026);
 assert.equal(r.capped,false);
});
test('Brazil INSS caps contribution base at the official 2026 ceiling',()=>{
 const r=calculateBrazilINSS2026(10000);
 assert.equal(r.contributionBase,8475.55);
 assert.equal(r.ceiling,8475.55);
 assert.equal(r.capped,true);
 assert.equal(r.contribution,988.09);
});
test('Brazil INSS calculator rejects negative and non-finite amounts',()=>{
 assert.throws(()=>calculateBrazilINSS2026(-1),RangeError);
 assert.throws(()=>calculateBrazilINSS2026('NaN'),RangeError);
});
test('Brazil INSS page is indexable, canonical, linked from Brazil hub and cites official INSS sources',()=>{
 const page=fs.readFileSync(path.join(root,'international/brazil-inss-2026-calculator.html'),'utf8');
 const hub=fs.readFileSync(path.join(root,'international/brazil/index.html'),'utf8');
 assert.match(page,/<html lang="pt-BR">/);
 assert.match(page,/rel="canonical"/);
 assert.match(page,/"@type":"SoftwareApplication"/);
 assert.match(page,/gov\.br\/inss/);
 assert.match(page,/8\.475,55/);
 assert.ok(hub.includes('/international/brazil-inss-2026-calculator.html'));
 assert.ok(hub.includes('/international/brazil-irpf-2026-calculator.html'));
});
test('Indonesia PP 58/2023 TER tables contain complete official monthly rate schedules',()=>{
 assert.equal(TER_TABLES.A.length,44);
 assert.equal(TER_TABLES.B.length,40);
 assert.equal(TER_TABLES.C.length,41);
 assert.deepEqual(TER_TABLES.A[0],[5400000,0]);
 assert.deepEqual(TER_TABLES.A[43],[Infinity,34]);
 assert.deepEqual(TER_TABLES.B[0],[6200000,0]);
 assert.deepEqual(TER_TABLES.B[39],[Infinity,34]);
 assert.deepEqual(TER_TABLES.C[0],[6600000,0]);
 assert.deepEqual(TER_TABLES.C[40],[Infinity,34]);
});
test('Indonesia PPh 21 maps PTKP statuses to TER categories and applies rates to gross monthly income',()=>{
 const a=calculateIndonesiaPPh21TER(10000000,{maritalStatus:'single',dependents:0,month:'November'});
 assert.equal(a.category,'A');assert.equal(a.rate,2);assert.equal(a.withholding,200000);
 const b=calculateIndonesiaPPh21TER(12000000,{maritalStatus:'married',dependents:1,month:'November'});
 assert.equal(b.category,'B');assert.equal(b.rate,3);assert.equal(b.withholding,360000);
 const c=calculateIndonesiaPPh21TER(13000000,{maritalStatus:'married',dependents:3,month:'November'});
 assert.equal(c.category,'C');assert.equal(c.rate,4);assert.equal(c.withholding,520000);
});
test('Indonesia PPh 21 calculator excludes December and validates PTKP inputs',()=>{
 assert.throws(()=>calculateIndonesiaPPh21TER(12000000,{month:'December'}),RangeError);
 assert.throws(()=>calculateIndonesiaPPh21TER(12000000,{maritalStatus:'single',dependents:4}),RangeError);
 assert.throws(()=>calculateIndonesiaPPh21TER(-1),RangeError);
});
test('Indonesia PPh 21 page is indexable, canonical, linked from country hub and clearly scoped',()=>{
 const page=fs.readFileSync(path.join(root,'international/indonesia-pph21-monthly-calculator.html'),'utf8');
 const hub=fs.readFileSync(path.join(root,'international/indonesia/index.html'),'utf8');
 assert.match(page,/<html lang="id-ID">/);
 assert.match(page,/rel="canonical"/);
 assert.match(page,/"@type":"SoftwareApplication"/);
 assert.match(page,/PP 58\/2023/);
 assert.match(page,/Januari sampai November/);
 assert.match(page,/Desember/);
 assert.match(page,/peraturan\.bpk\.go\.id/);
 assert.ok(hub.includes('/international/indonesia-pph21-monthly-calculator.html'));
});
