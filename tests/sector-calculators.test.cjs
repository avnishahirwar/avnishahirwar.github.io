'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { definitions } = require('../assets/sector-calculators.js');

test('OEE uses availability × performance × quality', () => {
 const r=definitions.oee.calculate({planned:480,downtime:30,cycle:60,total:400,good:380});
 assert.equal(r.Availability,'93.75%'); assert.equal(r.Performance,'88.889%'); assert.equal(r.Quality,'95%'); assert.equal(r['Overall equipment effectiveness'],'79.167%');
});
test('RevPAR, ADR and occupancy use available and sold room nights', () => {
 const r=definitions.revpar.calculate({revenue:180000,available:300,sold:240});
 assert.equal(r.RevPAR,'₹600.00'); assert.equal(r['Average daily rate (ADR)'],'₹750.00'); assert.equal(r['Occupancy rate'],'80%');
});
test('food cost ratio and gross profit', () => {
 const r=definitions.foodcost.calculate({ingredient:30000,sales:100000});
 assert.equal(r['Food cost percentage'],'30%'); assert.equal(r['Gross profit before other expenses'],'₹70,000.00');
});
test('freight uses greater of actual and dimensional weight', () => {
 const r=definitions.freight.calculate({actual:10,length:50,width:40,height:30,divisor:5000,rate:80,fixed:150});
 assert.equal(r['Dimensional weight'],'12 kg'); assert.equal(r['Chargeable weight'],'12 kg'); assert.equal(r['Estimated freight cost'],'₹1,110.00');
});
test('shipping applies fuel surcharge to base plus weight charge', () => {
 const r=definitions.shipping.calculate({base:100,weight:2,rate:40,fuel:10,handling:20,insurance:10});
 assert.equal(r['Estimated shipping total'],'₹242.00');
});
test('machine utilization excludes planned maintenance', () => {
 const r=definitions.machine.calculate({scheduled:10,maintenance:1,run:7.2});
 assert.equal(r['Machine utilization'],'80%');
});
test('fabric estimate includes layout efficiency and wastage', () => {
 const r=definitions.fabric.calculate({area:0.8,qty:100,width:150,efficiency:80,waste:5});
 assert.equal(r['Estimated fabric to plan'],'70.222 m');
});
test('domain inputs reject invalid denominators and inconsistent counts', () => {
 assert.throws(()=>definitions.oee.calculate({planned:10,downtime:10,cycle:1,total:1,good:1}),/Downtime/);
 assert.throws(()=>definitions.revpar.calculate({revenue:1,available:10,sold:11}),/cannot exceed/);
 assert.throws(()=>definitions.freight.calculate({actual:1,length:1,width:1,height:1,divisor:0,rate:1,fixed:0}),/greater than zero/);
 assert.throws(()=>definitions.machine.calculate({scheduled:2,maintenance:1,run:2}),/cannot exceed/);
 assert.throws(()=>definitions.fabric.calculate({area:1,qty:1,width:1,efficiency:101,waste:0}),/cannot exceed/);
});
