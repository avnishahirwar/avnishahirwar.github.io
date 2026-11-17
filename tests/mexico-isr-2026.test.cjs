'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(root,'international/mexico/isr-monthly-calculator.html'),'utf8');
const hub=fs.readFileSync(path.join(root,'international/mexico/index.html'),'utf8');
const match=page.match(/const brackets=(\[[\s\S]*?\]);\s*const form=/);
assert.ok(match,'2026 monthly ISR tariff table must exist');
const brackets=vm.runInNewContext('('+match[1]+')');

test('Mexico ISR page is indexable, canonical, localized and cites the official 2026 DOF tariff',()=>{
 assert.match(page,/<html lang="es-MX">/);
 assert.match(page,/rel="canonical" href="https:\/\/friendlycalculator\.in\/international\/mexico\/isr-monthly-calculator\.html"/);
 assert.match(page,/index,follow/);
 assert.match(page,/application\/ld\+json/);
 assert.match(page,/https:\/\/www\.dof\.gob\.mx\/nota_detalle\.php\?codigo=5777219&amp;fecha=28\/12\/2025/);
 assert.match(page,/artículos 96 de la Ley del ISR y 175 de su Reglamento/);
 assert.ok(hub.includes('/international/mexico/isr-monthly-calculator.html'));
});

test('Mexico ISR monthly calculator preserves all 11 official 2026 tariff bands',()=>{
 assert.equal(brackets.length,11);
 assert.deepEqual(Array.from(brackets,x=>[x.lower,x.upper,x.fixed,x.rate]),[
  [0.01,844.59,0,1.92],[844.60,7168.51,16.22,6.40],[7168.52,12598.02,420.95,10.88],
  [12598.03,14644.64,1011.68,16.00],[14644.65,17533.64,1339.14,17.92],[17533.65,35362.83,1856.84,21.36],
  [35362.84,55736.68,5665.16,23.52],[55736.69,106410.50,10457.09,30.00],
  [106410.51,141880.66,25659.23,32.00],[141880.67,425641.99,37009.69,34.00],
  [425642.00,Infinity,133488.54,35.00]
 ]);
});

test('Mexico ISR calculation uses fixed quota plus marginal rate on income above the lower bound',()=>{
 const income=20000,row=brackets.find(x=>income>=x.lower&&income<=x.upper);
 const tax=Math.max(0,row.fixed+(income-row.lower)*row.rate/100);
 assert.equal(Number(tax.toFixed(2)),2383.65);
 assert.equal(Number((brackets[0].fixed+(844.59-brackets[0].lower)*brackets[0].rate/100).toFixed(2)),16.22);
});

test('Mexico ISR page states the monthly estimate exclusions and does not present it as net salary or final annual tax',()=>{
 assert.match(page,/No calcula el ajuste anual/);
 assert.match(page,/no calcula cuotas del IMSS, INFONAVIT/);
 assert.match(page,/no es una calculadora de salario neto/i);
 assert.match(page,/estimación mensual/);
});
