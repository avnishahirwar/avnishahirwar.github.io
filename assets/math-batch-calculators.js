(function (root) {
  'use strict';

  const fail = message => { throw new Error(message); };

  function splitTokens(raw, label, maximum) {
    const text = String(raw ?? '').trim();
    if (!text) fail('Enter at least one value.');
    if (text.length > 800) fail('Input is too long. Keep it under 800 characters.');
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) fail('Enter at least one value.');
    if (tokens.length > maximum) fail(`Enter no more than ${maximum} ${label}.`);
    return tokens;
  }

  function parseFiniteToken(token, label) {
    const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    if (!numericPattern.test(token)) fail(`${label} must contain only finite numbers.`);
    const value = Number(token);
    if (!Number.isFinite(value)) fail(`${label} contains a number outside the supported range.`);
    const mantissa = token.split(/[eE]/, 1)[0];
    if (value === 0 && /[1-9]/.test(mantissa)) fail(`${label} contains a value too small for safe numeric handling.`);
    return value;
  }

  function powerSet(raw) {
    const text = String(raw ?? '');
    if (text.length > 800) fail('Input is too long. Keep it under 800 characters.');
    const elements = text.trim()
      ? [...new Set(text.split(/[\n,;]/).map(item => item.trim()).filter(Boolean))]
      : [];
    if (elements.some(item => item.length > 40)) fail('Each set element must be 40 characters or fewer.');
    if (elements.length > 10) fail('Enter at most 10 distinct elements (up to 1,024 subsets).');
    const count = 1n << BigInt(elements.length);
    const subsets = [];
    for (let mask = 0n; mask < count; mask++) {
      const subset = [];
      for (let bit = 0; bit < elements.length; bit++) {
        if ((mask & (1n << BigInt(bit))) !== 0n) subset.push(elements[bit]);
      }
      subsets.push(subset);
    }
    return { elements, count: count.toString(), subsets };
  }

  function tokenizeFormula(source) {
    const text = String(source ?? '').trim();
    if (!text) fail('Enter a Boolean formula.');
    if (text.length > 200) fail('Keep the formula to 200 characters or fewer.');
    const tokens = [];
    let i = 0;
    const operators = [
      ['<->', 'IFF'], ['<=>', 'IFF'], ['->', 'IMPLIES'], ['=>', 'IMPLIES'],
      ['&&', 'AND'], ['||', 'OR'], ['!', 'NOT'], ['~', 'NOT'],
      ['&', 'AND'], ['|', 'OR'], ['^', 'XOR'], ['(', 'LPAREN'], [')', 'RPAREN']
    ];
    while (i < text.length) {
      if (/\s/.test(text[i])) { i++; continue; }
      const operator = operators.find(([symbol]) => text.startsWith(symbol, i));
      if (operator) {
        tokens.push({ type: operator[1], value: operator[0] });
        i += operator[0].length;
      } else {
        const match = text.slice(i).match(/^[A-Za-z][A-Za-z0-9_]*/);
        if (!match) fail(`Unsupported character at position ${i + 1}. Use variables, parentheses, and the listed logic operators.`);
        const word = match[0];
        const upper = word.toUpperCase();
        const keywords = { NOT: 'NOT', AND: 'AND', OR: 'OR', XOR: 'XOR', IMPLIES: 'IMPLIES', IFF: 'IFF' };
        if (upper === 'TRUE' || upper === 'FALSE') {
          tokens.push({ type: 'CONST', value: upper === 'TRUE' });
        } else if (keywords[upper]) {
          tokens.push({ type: keywords[upper], value: word });
        } else {
          tokens.push({ type: 'VAR', value: upper });
        }
        i += word.length;
      }
      if (tokens.length > 128) fail('The formula has too many tokens; shorten it to 128 tokens or fewer.');
    }
    return tokens;
  }

  function parseFormula(source) {
    const tokens = tokenizeFormula(source);
    const variables = [...new Set(tokens.filter(token => token.type === 'VAR').map(token => token.value))].sort();
    if (variables.length > 10) fail('Use no more than 10 distinct variables (up to 1,024 rows).');
    let position = 0;
    let depth = 0;
    const peek = type => tokens[position]?.type === type;
    const take = type => {
      if (!peek(type)) return null;
      return tokens[position++];
    };
    const node = (type, fields = {}) => ({ type, ...fields });

    function primary() {
      if (++depth > 64) fail('The formula is nested too deeply.');
      try {
        const constant = take('CONST');
        if (constant) return node('CONST', { value: constant.value });
        const variable = take('VAR');
        if (variable) return node('VAR', { value: variable.value });
        if (take('LPAREN')) {
          const inside = equivalence();
          if (!take('RPAREN')) fail('Add a closing parenthesis.');
          return inside;
        }
        fail('Expected a variable, true/false, NOT, or an opening parenthesis.');
      } finally {
        depth--;
      }
    }

    function unary() {
      if (take('NOT')) return node('NOT', { child: unary() });
      return primary();
    }
    function conjunction() {
      let left = unary();
      while (take('AND')) left = node('AND', { left, right: unary() });
      return left;
    }
    function exclusiveOr() {
      let left = conjunction();
      while (take('XOR')) left = node('XOR', { left, right: conjunction() });
      return left;
    }
    function disjunction() {
      let left = exclusiveOr();
      while (take('OR')) left = node('OR', { left, right: exclusiveOr() });
      return left;
    }
    function implication() {
      const left = disjunction();
      if (take('IMPLIES')) return node('IMPLIES', { left, right: implication() });
      return left;
    }
    function equivalence() {
      let left = implication();
      while (take('IFF')) left = node('IFF', { left, right: implication() });
      return left;
    }

    const ast = equivalence();
    if (position !== tokens.length) {
      const token = tokens[position];
      if (token.type === 'RPAREN') fail('There is an unmatched closing parenthesis.');
      fail(`Unexpected token “${token.value}”. Add an operator or parentheses.`);
    }
    if (!tokens.length) fail('Enter a Boolean formula.');
    return { ast, variables };
  }

  function evaluate(ast, assignment) {
    switch (ast.type) {
      case 'CONST': return ast.value;
      case 'VAR': return assignment[ast.value];
      case 'NOT': return !evaluate(ast.child, assignment);
      case 'AND': return evaluate(ast.left, assignment) && evaluate(ast.right, assignment);
      case 'XOR': return evaluate(ast.left, assignment) !== evaluate(ast.right, assignment);
      case 'OR': return evaluate(ast.left, assignment) || evaluate(ast.right, assignment);
      case 'IMPLIES': return !evaluate(ast.left, assignment) || evaluate(ast.right, assignment);
      case 'IFF': return evaluate(ast.left, assignment) === evaluate(ast.right, assignment);
      default: fail('The formula contains an unsupported operation.');
    }
  }

  function truthTable(source) {
    const { ast, variables } = parseFormula(source);
    const rowCount = 2 ** variables.length;
    const rows = [];
    for (let mask = 0; mask < rowCount; mask++) {
      const assignment = {};
      variables.forEach((variable, index) => {
        assignment[variable] = Boolean((mask >> (variables.length - index - 1)) & 1);
      });
      rows.push({ assignment, result: evaluate(ast, assignment) });
    }
    const trueCount = rows.filter(row => row.result).length;
    const classification = trueCount === rows.length ? 'tautology' : trueCount === 0 ? 'contradiction' : 'contingent';
    return { expression: String(source).trim(), variables, rows, classification };
  }

  function parseCoefficients(raw, label, maximum = 21) {
    const tokens = splitTokens(raw, label, maximum);
    return tokens.map(token => parseFiniteToken(token, label));
  }

  function trimLeadingZeros(coefficients) {
    const first = coefficients.findIndex(value => value !== 0);
    return first < 0 ? [0] : coefficients.slice(first);
  }

  function countSignChanges(signs) {
    const nonzero = signs.filter(sign => sign !== 0);
    let changes = 0;
    for (let i = 1; i < nonzero.length; i++) if (nonzero[i] !== nonzero[i - 1]) changes++;
    return changes;
  }

  function possibleRootCounts(variations) {
    const counts = [];
    for (let value = variations; value >= 0; value -= 2) counts.push(value);
    return counts;
  }

  function descartes(raw) {
    let coefficients = trimLeadingZeros(parseCoefficients(raw, 'Coefficients'));
    if (coefficients.length === 1 && coefficients[0] === 0) fail('Descartes’ rule does not apply to the zero polynomial.');
    if (coefficients.length > 21) fail('Use a polynomial of degree 20 or less.');
    const degree = coefficients.length - 1;
    const signs = coefficients.map(value => value === 0 ? 0 : value > 0 ? 1 : -1);
    const negativeSigns = coefficients.map((value, index) => {
      if (value === 0) return 0;
      const power = degree - index;
      const sign = value > 0 ? 1 : -1;
      return power % 2 ? -sign : sign;
    });
    let zeroRoots = 0;
    for (let i = coefficients.length - 1; i >= 0 && coefficients[i] === 0; i--) zeroRoots++;
    const positiveVariations = countSignChanges(signs);
    const negativeVariations = countSignChanges(negativeSigns);
    return {
      coefficients,
      degree,
      positiveVariations,
      negativeVariations,
      positiveCounts: possibleRootCounts(positiveVariations),
      negativeCounts: possibleRootCounts(negativeVariations),
      zeroRoots
    };
  }

  function formatNumber(value, maximumSignificantDigits = 10) {
    if (!Number.isFinite(value)) return 'not finite';
    if (Object.is(value, -0) || value === 0) return '0';
    return Number(value.toPrecision(maximumSignificantDigits)).toString();
  }

  function formatPolynomial(coefficients, variable = 'x') {
    const parts = [];
    coefficients.forEach((coefficient, index) => {
      if (coefficient === 0) return;
      const power = coefficients.length - index - 1;
      const negative = coefficient < 0;
      const magnitude = Math.abs(coefficient);
      let term;
      if (power === 0) term = formatNumber(magnitude);
      else {
        const coefficientText = magnitude === 1 ? '' : formatNumber(magnitude);
        term = coefficientText + variable + (power === 1 ? '' : '^' + power);
      }
      if (!parts.length) parts.push((negative ? '−' : '') + term);
      else parts.push((negative ? '− ' : '+ ') + term);
    });
    return parts.length ? parts.join(' ') : '0';
  }

  function syntheticDivision(raw, rootValue) {
    const divisorRoot = parseFiniteToken(String(rootValue ?? '').trim(), 'The divisor root');
    const coefficients = trimLeadingZeros(parseCoefficients(raw, 'Coefficients'));
    if (coefficients.length > 21) fail('Use a polynomial of degree 20 or less.');
    const isZeroPolynomial = coefficients.length === 1 && coefficients[0] === 0;
    if (isZeroPolynomial) return { coefficients, divisorRoot, quotient: [0], bottomRow: [0], remainder: 0, identity: '0 = (x − c)·0 + 0' };
    if (coefficients.length === 1) {
      const remainder = coefficients[0];
      return { coefficients, divisorRoot, quotient: [0], bottomRow: [remainder], remainder, identity: `${formatPolynomial(coefficients)} = (x − ${formatNumber(divisorRoot)})·0 + ${formatNumber(remainder)}` };
    }
    const bottomRow = [coefficients[0]];
    for (let i = 1; i < coefficients.length; i++) {
      const next = coefficients[i] + divisorRoot * bottomRow[i - 1];
      if (!Number.isFinite(next)) fail('The result exceeds the supported numeric range.');
      bottomRow.push(next);
    }
    const quotient = bottomRow.slice(0, -1);
    const remainder = bottomRow[bottomRow.length - 1];
    return {
      coefficients,
      divisorRoot,
      quotient,
      bottomRow,
      remainder,
      identity: `${formatPolynomial(coefficients)} = (x − ${formatNumber(divisorRoot)})(${formatPolynomial(quotient)}) + ${formatNumber(remainder)}`
    };
  }

  function consecutiveIntegers(rawTarget) {
    const raw = String(rawTarget ?? '').trim();
    if (!/^[+-]?\d+$/.test(raw)) fail('Enter a whole-number target sum.');
    const target = BigInt(raw);
    if (target < 3n || target > 1000000000n) fail('Enter a target sum from 3 to 1,000,000,000.');
    const runs = [];
    for (let length = 2n; (length * (length + 1n)) / 2n <= target; length++) {
      const twiceTarget = 2n * target;
      if (twiceTarget % length !== 0n) continue;
      const doubledStart = twiceTarget / length - length + 1n;
      if (doubledStart % 2n !== 0n) continue;
      const start = doubledStart / 2n;
      if (start < 1n) continue;
      const values = [];
      for (let offset = 0n; offset < length; offset++) values.push(start + offset);
      runs.push({ start: start.toString(), length: length.toString(), values: values.map(String), expression: values.join(' + ') });
    }
    return { target: target.toString(), runs };
  }

  const api = { powerSet, tokenizeFormula, parseFormula, truthTable, descartes, syntheticDivision, consecutiveIntegers, formatPolynomial };

  function element(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined && text !== null) item.textContent = String(text);
    if (className) item.className = className;
    return item;
  }

  function resultTable(container, headers, rows) {
    const table = element('table', null, 'mc-result-table');
    const thead = element('thead');
    const headRow = element('tr');
    headers.forEach(label => headRow.appendChild(element('th', label)));
    thead.appendChild(headRow);
    const tbody = element('tbody');
    rows.forEach(row => {
      const tr = element('tr');
      row.forEach(value => tr.appendChild(element('td', value)));
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    container.appendChild(table);
  }

  function renderPowerSet(container, result) {
    container.appendChild(element('h2', 'Result'));
    container.appendChild(element('p', `${result.elements.length} distinct element(s); ${result.count} subset(s).`, 'mc-result-summary'));
    const details = element('details', null, 'mc-subsets');
    details.appendChild(element('summary', `Show all ${result.count} subsets`));
    const list = element('ol');
    result.subsets.forEach(subset => list.appendChild(element('li', subset.length ? `{ ${subset.join(', ')} }` : '∅')));
    details.appendChild(list);
    container.appendChild(details);
  }

  function renderTruthTable(container, result) {
    container.appendChild(element('h2', 'Truth table'));
    container.appendChild(element('p', `Classification: ${result.classification}. ${result.rows.length} row(s) evaluated.`, 'mc-result-summary'));
    const headers = [...result.variables, result.expression];
    const rows = result.rows.map(row => [
      ...result.variables.map(variable => row.assignment[variable] ? 'T' : 'F'),
      row.result ? 'T' : 'F'
    ]);
    resultTable(container, headers, rows);
  }

  function renderDescartes(container, result) {
    container.appendChild(element('h2', 'Possible real-root counts'));
    container.appendChild(element('p', `Polynomial degree: ${result.degree}. These are possibilities allowed by Descartes’ rule, not solved roots.`, 'mc-result-summary'));
    resultTable(container, ['Check', 'Sign changes', 'Possible root count(s)'], [
      ['Positive real roots', result.positiveVariations, result.positiveCounts.join(', ')],
      ['Negative real roots', result.negativeVariations, result.negativeCounts.join(', ')],
      ['Zero roots (multiplicity)', '—', result.zeroRoots]
    ]);
    container.appendChild(element('p', `Coefficients used in descending powers: ${result.coefficients.join(', ')}`));
  }

  function renderSyntheticDivision(container, result) {
    container.appendChild(element('h2', 'Synthetic division result'));
    container.appendChild(element('p', `Divisor: x − (${formatNumber(result.divisorRoot)}).`, 'mc-result-summary'));
    resultTable(container, ['Output', 'Value'], [
      ['Quotient', formatPolynomial(result.quotient)],
      ['Remainder', formatNumber(result.remainder)],
      ['Bottom-row coefficients', result.bottomRow.map(value => formatNumber(value)).join(', ')]
    ]);
    container.appendChild(element('p', result.identity, 'mc-equation'));
    container.appendChild(element('p', 'Decimal inputs are evaluated with floating-point arithmetic; a displayed remainder rounded to zero is not proof of exact divisibility.', 'mc-caveat'));
  }

  function renderConsecutive(container, result) {
    container.appendChild(element('h2', 'Positive consecutive-integer sums'));
    container.appendChild(element('p', `${result.runs.length} representation(s) found for ${result.target}. One-term representations are excluded.`, 'mc-result-summary'));
    if (!result.runs.length) {
      container.appendChild(element('p', 'No sum of two or more positive consecutive integers equals this target.'));
      return;
    }
    const list = element('ol');
    result.runs.forEach(run => list.appendChild(element('li', `${run.expression} = ${result.target} (${run.length} terms)`)));
    container.appendChild(list);
  }

  function init() {
    const form = document.getElementById('calcForm');
    const status = document.getElementById('calcStatus');
    const output = document.getElementById('calcResults');
    const key = document.body?.dataset?.calculator;
    if (!form || !status || !output || !key) return;
    const run = {
      'power-set': () => renderPowerSet(output, powerSet(form.elements.elements.value)),
      'truth-table': () => renderTruthTable(output, truthTable(form.elements.expression.value)),
      'descartes-rule': () => renderDescartes(output, descartes(form.elements.coefficients.value)),
      'synthetic-division': () => renderSyntheticDivision(output, syntheticDivision(form.elements.coefficients.value, form.elements.divisorRoot.value)),
      'consecutive-integers': () => renderConsecutive(output, consecutiveIntegers(form.elements.targetSum.value))
    }[key];
    if (!run) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      output.replaceChildren();
      output.hidden = false;
      try {
        run();
        status.textContent = 'Calculation complete. Review the method and limitations below.';
        status.className = 'mc-status';
      } catch (error) {
        output.replaceChildren();
        status.textContent = error instanceof Error ? error.message : 'Please check the entered values.';
        status.className = 'mc-status mc-error';
      }
    });
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FCMathBatch = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})(typeof window !== 'undefined' ? window : null);
