'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const engine = fs.readFileSync(path.join(__dirname, '..', 'assets', 'generated-equation-calculator.js'), 'utf8');

function makeElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    elements: [],
    attributes: {},
    style: {},
    value: '',
    name: '',
    textContent: '',
    innerHTML: '',
    appendChild(child) {
      this.children.push(child);
      if (this.tagName === 'FORM' && child.tagName === 'LABEL') {
        this.elements.push(...child.children.filter(item => item.tagName === 'INPUT'));
      }
      return child;
    },
    replaceChildren(...children) {
      this.children = children;
      if (this.tagName === 'FORM') {
        this.elements = children.flatMap(child => child.children.filter(item => item.tagName === 'INPUT'));
      }
      this.textContent = children.map(child => child.textContent || '').join('');
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(name, callback) {
      this.listeners ||= {};
      this.listeners[name] = callback;
    }
  };
}

function boot(config) {
  const created = [];
  const elements = {
    calc: makeElement('form'),
    out: makeElement('div'),
    go: makeElement('button')
  };
  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement(tag) { const node=makeElement(tag); created.push(node); return node; }
  };
  const context = {window:{FC_EQUATION_CONFIG:config},document,Intl,Date,Math,Number,Object,String,Array};
  vm.runInNewContext(engine, context, {timeout:1000});
  const click = () => elements.go.listeners.click();
  const input = name => elements.calc.elements.find(item => item.name === name);
  return {elements,click,input,created};
}

test('variable keys become readable labels and explicit labels override defaults',()=>{
  const app=boot({
    variables:['base_amount','interestRate','dragCoefficient','sig_fig'],
    inputLabels:{base_amount:'Principal amount',interestRate:'Annual rate (%)'},
    outputLabels:{dragCoefficient:'Drag force'},
    equations:[]
  });
  const labels=['base_amount','interestRate','dragCoefficient','sig_fig'].map(key=>app.input(key).attributes['aria-label']);
  assert.deepEqual(labels,['Principal amount','Annual rate (%)','Drag coefficient','Significant figures']);
  assert.equal(app.input('base_amount').attributes['aria-label'],'Principal amount');
  assert.ok(app.input('base_amount').id.startsWith('fc-equation-'));
});

test('blank fields are not silently converted to zero',()=>{
  const app=boot({
    variables:['principal','rate'],
    equations:[{lhs:'interest',rhs:['principal','rate'],formula:'principal*rate/100'}]
  });
  app.input('principal').value='1000';
  app.click();
  assert.match(app.elements.out.textContent,/Enter the required values/);
  assert.equal(app.elements.out.children.length,1);
  assert.equal(app.elements.out.children[0].tagName,'P');
});

test('valid formulas render human-readable results using text nodes',()=>{
  const app=boot({
    variables:['principal','rate'],
    outputLabels:{interest:'Estimated interest'},
    equations:[{lhs:'interest',rhs:['principal','rate'],formula:'principal*rate/100'}]
  });
  app.input('principal').value='1000';
  app.input('rate').value='5';
  app.click();
  const table=app.elements.out.children[0];
  assert.equal(table.tagName,'TABLE');
  const row=table.children[0].children[0];
  assert.equal(row.children[0].textContent,'Estimated interest');
  assert.equal(row.children[1].textContent,'50');
  assert.equal(row.children[0].innerHTML,'');
});

test('mathematical helpers such as powers and square roots remain supported',()=>{
  const app=boot({
    variables:['area'],
    equations:[{lhs:'side',rhs:['area'],formula:'sqrt(area)'}]
  });
  app.input('area').value='81';
  app.click();
  const row=app.elements.out.children[0].children[0].children[0];
  assert.equal(row.children[0].textContent,'Side');
  assert.equal(row.children[1].textContent,'9');
});

test('modulo helper handles negative values with a non-negative remainder',()=>{
  const app=boot({
    variables:['value','divisor'],
    equations:[{lhs:'remainder',rhs:['value','divisor'],formula:'mod(value, divisor)'}]
  });
  app.input('value').value='-5';
  app.input('divisor').value='3';
  app.click();
  const row=app.elements.out.children[0].children[0].children[0];
  assert.equal(row.children[1].textContent,'1');
});

test('unknown identifiers and executable JavaScript syntax are rejected',()=>{
  const app=boot({
    variables:['value'],
    equations:[{lhs:'result',rhs:['value'],formula:'globalThis.process.exit()'}]
  });
  app.input('value').value='1';
  app.click();
  assert.match(app.elements.out.textContent,/Enter the required values/);
});

test('custom labels containing markup are displayed as literal text',()=>{
  const label='<img src=x onerror=alert(1)>';
  const app=boot({variables:['value'],inputLabels:{value:label},equations:[]});
  assert.equal(app.elements.calc.children[0].textContent,label);
  assert.equal(app.elements.calc.children[0].innerHTML,'');
});
