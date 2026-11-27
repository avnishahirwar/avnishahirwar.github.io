(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Equation engine
  //
  // A page provides window.FC_EQUATION_CONFIG = { variables: [...], equations:
  // [{ lhs, rhs: [...], formula }] }.  Each equation solves one variable (lhs)
  // from the others (rhs).  The visitor fills in the values they know, leaves
  // the value they want blank, and the engine solves every blank variable that
  // can be computed.  Blank fields are never treated as zero.
  // ---------------------------------------------------------------------------

  var MATH = {
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log, log: Math.log, log10: Math.log10, log2: Math.log2,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    cot: function (x) { return 1 / Math.tan(x); },
    acot: function (x) { return Math.atan(1 / x); },
    ceil: Math.ceil, floor: Math.floor, round: Math.round, fix: Math.trunc,
    min: Math.min, max: Math.max, pow: Math.pow,
    mod: function (a, b) { return ((a % b) + b) % b; },
    gamma: function gamma(z) {
      if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      z -= 1;
      var g = 7;
      var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
      var x = c[0];
      for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
      var t = z + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
  };

  function humanize(name) {
    var s = String(name);
    if (s.length <= 2) return s;
    s = s.replace(/_+/g, ' ')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Variables that hold calendar dates are entered with a date picker and
  // handled as whole days since 1970-01-01, so date arithmetic in the
  // formulas (end date = start date + days) works as written.
  function isDateVar(name) {
    var n = String(name);
    if (/^(include|is|use|has|with)_/i.test(n)) return false;
    return /^date\d*$/i.test(n) || /(^|_)date\d*$/i.test(n) || /^date_/i.test(n) || /[a-z]Date\d*$/.test(n) || /^(first|last|start|end)_?day$/i.test(n);
  }
  function isFlagVar(name) { return /^(include|is|use|has|with)_/i.test(String(name)); }
  function dateToDays(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    if (!m) return NaN;
    return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
  }
  function daysToDate(n) {
    var d = new Date(Math.round(n) * 86400000);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function translateFormula(formula) {
    return String(formula)
      .replace(/\^/g, '**')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\bPI\b|\bpi\b/g, 'Math.PI');
  }

  // Returns a function (arg values in eq.rhs order) or null when the formula
  // uses something the engine cannot evaluate faithfully (custom lookups, ...).
  function compile(eq, variables) {
    var known = {};
    (variables || []).forEach(function (v) { known[v] = true; });
    var src = String(eq.formula);
    var bad = false;
    src.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, function (m, fn) {
      if (!Object.prototype.hasOwnProperty.call(MATH, fn)) bad = true;
      return m;
    });
    if (bad) return null;
    var body = translateFormula(src).replace(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, function (m, fn) {
      return 'M.' + fn + '(';
    });
    // every remaining identifier must be an input variable or a constant
    var stripped = body.replace(/M\.[A-Za-z0-9_]+/g, '').replace(/Math\.PI/g, '');
    var ids = stripped.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (var i = 0; i < ids.length; i++) {
      if (eq.rhs.indexOf(ids[i]) === -1) return null;
    }
    try {
      var f = new Function('M', eq.rhs.join(',') ? eq.rhs.join(',') : 'x', 'return (' + body + ');');
      return function () { return f.apply(null, [MATH].concat(Array.prototype.slice.call(arguments))); };
    } catch (_) {
      return null;
    }
  }

  function prepare(cfg) {
    var eqs = [];
    (cfg.equations || []).forEach(function (e) {
      if (!e || typeof e.lhs !== 'string' || !Array.isArray(e.rhs)) return;
      eqs.push({ lhs: e.lhs, rhs: e.rhs, formula: e.formula, fn: compile(e, cfg.variables) });
    });
    return eqs;
  }

  // known: { variable: finiteNumber } for the fields the visitor filled in.
  function solve(eqs, known) {
    var vals = {};
    Object.keys(known).forEach(function (k) { vals[k] = known[k]; });
    var derived = {};
    var used = {};
    for (var pass = 0; pass < 5; pass++) {
      var changed = false;
      for (var i = 0; i < eqs.length; i++) {
        var e = eqs[i];
        if (!e.fn || Object.prototype.hasOwnProperty.call(known, e.lhs) || Object.prototype.hasOwnProperty.call(derived, e.lhs)) continue;
        var ready = true;
        for (var j = 0; j < e.rhs.length; j++) {
          if (!Number.isFinite(vals[e.rhs[j]])) { ready = false; break; }
        }
        if (!ready) continue;
        var v;
        try { v = e.fn.apply(null, e.rhs.map(function (k) { return vals[k]; })); } catch (_) { continue; }
        if (typeof v === 'boolean') v = v ? 1 : 0;
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        if (Math.abs(v) < 1e-12) v = 0; // remove floating-point noise such as 1.2e-16
        derived[e.lhs] = v;
        vals[e.lhs] = v;
        used[e.lhs] = e;
        changed = true;
      }
      if (!changed) break;
    }
    return { derived: derived, used: used };
  }

  function formatNumber(v) {
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-6) return v.toExponential(6).replace(/\.?0+e/, 'e');
    return Number(v.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }

  // Picks illustrative inputs for the first equation that can be evaluated.
  function sampleFor(eqs) {
    eqs = eqs.slice().sort(function (a, b) { return (isDateVar(b.lhs) ? 1 : 0) - (isDateVar(a.lhs) ? 1 : 0); });
    var candidates = [[2, 3, 4, 5, 6, 7, 8], [10, 20, 5, 4, 3, 2, 1], [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5], [100, 50, 25, 10, 5, 2, 1]];
    for (var i = 0; i < eqs.length; i++) {
      var e = eqs[i];
      if (!e.fn || e.rhs.length === 0 || e.rhs.length > 7) continue;
      for (var c = 0; c < candidates.length; c++) {
        var args = e.rhs.map(function (k, idx) { return isDateVar(k) ? 20103 + idx * 30 : isFlagVar(k) ? 0 : candidates[c][idx % candidates[c].length]; });
        var v;
        try { v = e.fn.apply(null, args); } catch (_) { continue; }
        if (typeof v === 'number' && Number.isFinite(v) && v > 0 && (!isDateVar(e.lhs) || v > 1000)) {
          var inputs = {};
          e.rhs.forEach(function (k, idx) { inputs[k] = args[idx]; });
          return { lhs: e.lhs, inputs: inputs, value: v, eq: e };
        }
      }
    }
    return null;
  }

  var api = { MATH: MATH, humanize: humanize, compile: compile, prepare: prepare, solve: solve, formatNumber: formatNumber, sampleFor: sampleFor, isDateVar: isDateVar, dateToDays: dateToDays, daysToDate: daysToDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FCEquationEngine = api;

  // ---------------------------------------------------------------------------
  // Page wiring
  // ---------------------------------------------------------------------------
  if (typeof document === 'undefined') return;
  var raw = root.FC_EQUATION_CONFIG;
  if (!raw) return;
  var cfg;
  try { cfg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return; }
  if (!cfg || !Array.isArray(cfg.variables) || !Array.isArray(cfg.equations)) return;
  var form = document.getElementById('calc');
  var out = document.getElementById('out');
  var go = document.getElementById('go');
  if (!form || !out || !go) return;

  var eqs = prepare(cfg);
  var solvable = {};
  eqs.forEach(function (e) { if (e.fn) solvable[e.lhs] = true; });

  form.setAttribute('role', 'group');
  form.setAttribute('aria-label', 'Calculator inputs');
  cfg.variables.forEach(function (v, idx) {
    var label = document.createElement('label');
    var span = document.createElement('span');
    span.textContent = humanize(v);
    var input = document.createElement('input');
    input.name = v;
    input.id = 'eq-' + idx;
    if (isDateVar(v)) {
      input.type = 'date';
    } else {
      input.type = 'number';
      input.step = 'any';
      input.inputMode = 'decimal';
      input.placeholder = isFlagVar(v) ? '0 = no, 1 = yes' : (solvable[v] ? 'Leave blank to solve' : 'Enter value');
    }
    label.appendChild(span);
    label.appendChild(input);
    form.appendChild(label);
  });

  var hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Fill in the values you know and leave the one you want to find blank. The calculator solves every blank field it can; empty fields are never treated as zero.';
  form.parentNode.insertBefore(hint, form);

  var actions = go.parentNode;
  var sampleBtn = document.createElement('button');
  sampleBtn.type = 'button';
  sampleBtn.id = 'eq-sample';
  sampleBtn.textContent = 'Fill sample values';
  sampleBtn.style.marginLeft = '8px';
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.id = 'eq-reset';
  resetBtn.textContent = 'Clear';
  resetBtn.style.marginLeft = '8px';
  actions.insertBefore(sampleBtn, go.nextSibling);
  actions.insertBefore(resetBtn, sampleBtn.nextSibling);

  function inputs() { return [].slice.call(form.querySelectorAll('input[name]')); }

  function show(node) {
    out.textContent = '';
    out.appendChild(node);
    out.style.display = 'block';
  }
  function message(text) {
    var p = document.createElement('p');
    p.textContent = text;
    show(p);
  }

  go.addEventListener('click', function () {
    var known = {};
    var blanks = [];
    inputs().forEach(function (i) {
      if (i.value.trim() === '') { blanks.push(i.name); return; }
      var n = i.type === 'date' ? dateToDays(i.value) : Number(i.value);
      if (Number.isFinite(n)) known[i.name] = n;
    });
    if (!Object.keys(known).length) { message('Enter at least one value to calculate.'); return; }
    if (!blanks.length) { message('Leave at least one field blank. The calculator solves for the blank fields.'); return; }
    var res = solve(eqs, known);
    var names = Object.keys(res.derived);
    if (!names.length) {
      var needs = [];
      blanks.forEach(function (b) {
        eqs.forEach(function (e) {
          if (e.fn && e.lhs === b && needs.length < 3) {
            var missing = e.rhs.filter(function (k) { return !Object.prototype.hasOwnProperty.call(known, k); });
            needs.push('To find ' + humanize(b) + ', also enter: ' + missing.map(humanize).join(', ') + '.');
          }
        });
      });
      message(needs.length ? needs.join(' ') : 'None of the blank fields can be solved from the values entered. Check that each remaining field is one this page can solve for.');
      return;
    }
    var table = document.createElement('table');
    var tbody = document.createElement('tbody');
    names.forEach(function (n) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.scope = 'row';
      th.textContent = humanize(n);
      var td = document.createElement('td');
      td.textContent = isDateVar(n) ? daysToDate(res.derived[n]) : formatNumber(res.derived[n]);
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'Results use the values exactly as entered, so enter every value in the units the formula expects (see the formulas below the calculator).';
    var wrap = document.createElement('div');
    wrap.appendChild(table);
    wrap.appendChild(note);
    show(wrap);
  });

  sampleBtn.addEventListener('click', function () {
    var s = sampleFor(eqs);
    if (!s) { message('This page has no formula the calculator can evaluate with sample numbers.'); return; }
    inputs().forEach(function (i) {
      if (!Object.prototype.hasOwnProperty.call(s.inputs, i.name)) { i.value = ''; return; }
      i.value = i.type === 'date' ? daysToDate(s.inputs[i.name]) : String(s.inputs[i.name]);
    });
    message('Sample numbers are illustrative only. Press Calculate to solve for ' + humanize(s.lhs) + '.');
  });

  resetBtn.addEventListener('click', function () {
    inputs().forEach(function (i) { i.value = ''; });
    out.style.display = 'none';
    out.textContent = '';
  });
})(typeof window !== 'undefined' ? window : globalThis);
