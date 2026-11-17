'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const graph=require('../assets/graphing-calculator.js');
test('evaluates arithmetic, powers and conventional unary precedence',()=>{assert.equal(graph.compile('x^2 - 4')(3),5);assert.equal(graph.compile('-x^2') (3),-9);assert.equal(graph.compile('2^-2')(0),0.25);});
test('supports constants and approved math functions',()=>{assert.ok(Math.abs(graph.compile('sin(pi/2)')(0)-1)<1e-12);assert.equal(graph.compile('sqrt(abs(-9))')(0),3);assert.equal(graph.compile('log(e)')(0),1);});
test('rejects unknown identifiers, disallowed functions and malformed syntax',()=>{assert.throws(()=>graph.compile('process.exit()'));assert.throws(()=>graph.compile('random()'));assert.throws(()=>graph.compile('x +'));assert.throws(()=>graph.compile('window.location'));});
test('samples finite and discontinuous regions without throwing',()=>{const points=graph.sample('1/x',-1,1,4);assert.equal(points.length,5);assert.equal(points[2].y,NaN);assert.equal(points[0].y,-1);});
