const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../assets/scientific-calculator.js','file://'+__filename),'utf8');
const listeners={};
const window={};
const document={addEventListener:(name,fn)=>{listeners[name]=fn}};
vm.runInNewContext(source,{window,document,Intl,Math,Number,Error});
test('scientific calculator returns evaluation trace for arithmetic and functions',()=>{
 const trace=[];
 const value=window.FCScientific.evaluate('sin(30)+sqrt(16)','deg',null,trace);
 assert.ok(Math.abs(value-4.5)<1e-10);
 assert.ok(trace.some(x=>x.label.startsWith('sin(')));
 assert.ok(trace.some(x=>x.label.startsWith('sqrt(')));
 assert.equal(trace.at(-1).value,value);
});
test('scientific calculator supports x-variable sampling for graphs',()=>{
 assert.equal(window.FCScientific.evaluate('x^2-4','deg',3),5);
 assert.ok(Math.abs(window.FCScientific.evaluate('sin(x)','deg',30)-0.5)<1e-10);
});
test('scientific calculator preserves validation for unsupported expressions',()=>{
 assert.throws(()=>window.FCScientific.evaluate('window.alert(1)'));
 assert.throws(()=>window.FCScientific.evaluate('sqrt(-1)'));
 assert.throws(()=>window.FCScientific.evaluate('x+1'));
});
test('scientific calculator page includes accessible worked steps and graph panels',()=>{
 const html=fs.readFileSync(new URL('../calculators/scientific-calculator.html','file://'+__filename),'utf8');
 assert.match(html,/id="workedSteps"/);
 assert.match(html,/id="functionGraph"/);
 assert.match(html,/aria-label="Graph of the entered mathematical function/);
});
