(function () {
  'use strict';

  const raw = window.FC_EQUATION_CONFIG;
  if (!raw) return;

  let config;
  try {
    config = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    return;
  }

  if (!config || !Array.isArray(config.variables) || !Array.isArray(config.equations)) return;

  const form = document.getElementById('calc');
  const output = document.getElementById('out');
  const calculateButton = document.getElementById('go');
  if (!form || !output || !calculateButton) return;

  const isIdentifier = value => typeof value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
  const variables = [...new Set(config.variables.filter(isIdentifier))];
  if (!variables.length) return;

  const acronyms = new Map([
    ['emi', 'EMI'], ['bmi', 'BMI'], ['gdp', 'GDP'], ['npv', 'NPV'],
    ['irr', 'IRR'], ['vo2', 'VO₂'], ['pi', 'π'], ['epf', 'EPF'],
    ['pf', 'PF'], ['gst', 'GST'], ['tds', 'TDS'], ['vat', 'VAT'],
    ['roi', 'ROI'], ['api', 'API'], ['cpi', 'CPI'], ['rmd', 'RMD'],
    ['usa', 'USA'], ['uk', 'UK'], ['us', 'US'], ['tc', 'Tc'], ['vc', 'Vc']
  ]);
  const commonVariableLabels = new Map([
    ['sig_fig', 'Significant figures'],
    ['sig_fig_checkbox', 'Use significant figures'],
    ['realAprox', 'Approximate real interest rate'],
    ['civilization_number', 'Number of civilizations']
  ]);

  function humanize(key, customLabels) {
    const custom = customLabels && customLabels[key];
    if (typeof custom === 'string' && custom.trim()) return custom.trim();
    if (commonVariableLabels.has(key)) return commonVariableLabels.get(key);

    const spaced = String(key)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = spaced.split(' ');
    return words.map((word, index) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return acronyms.get(lower);
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return index === 0
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : lower;
    }).join(' ');
  }

  function expressionFor(source) {
    return String(source)
      .replace(/\^/g, '**')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\blog10\b/g, 'Math.log10')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bcbrt\b/g, 'Math.cbrt')
      .replace(/\bpow\s*\(/g, 'Math.pow(')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\basin\b/g, 'Math.asin')
      .replace(/\bacos\b/g, 'Math.acos')
      .replace(/\batan2\b/g, 'Math.atan2')
      .replace(/\batan\b/g, 'Math.atan')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\bfloor\b/g, 'Math.floor')
      .replace(/\bceil\b/g, 'Math.ceil')
      .replace(/\bround\b/g, 'Math.round')
      .replace(/\bmin\b/g, 'Math.min')
      .replace(/\bmax\b/g, 'Math.max')
      .replace(/\bmod\s*\(/g, '__fcHelpers.mod(')
      .replace(/\bgetDayOfWeek\s*\(/g, '__fcHelpers.getDayOfWeek(')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/×/g, '*')
      .replace(/÷/g, '/');
  }

  const mathMethods = new Set([
    'log', 'log10', 'sqrt', 'cbrt', 'pow', 'abs', 'sin', 'cos', 'tan',
    'asin', 'acos', 'atan2', 'atan', 'exp', 'floor', 'ceil', 'round',
    'min', 'max', 'PI', 'mod', 'getDayOfWeek'
  ]);

  function compileEquation(equation) {
    if (!equation || !isIdentifier(equation.lhs) ||
        !Array.isArray(equation.rhs) ||
        equation.rhs.length === 0 ||
        !equation.rhs.every(key => variables.includes(key)) ||
        typeof equation.formula !== 'string') return null;

    const expression = expressionFor(equation.formula);
    // Calculator formulas are arithmetic expressions only. Reject arbitrary
    // JavaScript syntax and identifiers that are not declared variables/helpers.
    if (!/^[A-Za-z0-9_$\s.+\-*/%(),]*$/.test(expression)) return null;

    const allowed = new Set([...equation.rhs, '__fcHelpers', 'Math']);
    const identifiers = expression.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
    for (const identifier of identifiers) {
      if (!allowed.has(identifier) && !mathMethods.has(identifier)) return null;
    }

    try {
      return Function(
        ...equation.rhs,
        '__fcHelpers',
        'Math',
        'return (' + expression + ')'
      );
    } catch (_) {
      return null;
    }
  }

  const helpers = Object.freeze({
    mod: (a, b) => b === 0 ? NaN : ((a % b) + b) % b,
    getDayOfWeek: value => {
      const date = new Date(Number(value));
      return Number.isNaN(date.getTime()) ? NaN : date.getUTCDay();
    }
  });

  const inputLabels = config.inputLabels || config.variableLabels || {};
  const outputLabels = config.outputLabels || config.variableLabels || {};
  form.replaceChildren();

  for (const key of variables) {
    const labelText = humanize(key, inputLabels);
    const input = document.createElement('input');
    input.type = 'number';
    input.name = key;
    input.id = 'fc-equation-' + key.replace(/[^A-Za-z0-9_-]/g, '-');
    input.step = 'any';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', labelText);

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = labelText;
    label.appendChild(input);
    form.appendChild(label);
  }

  function showMessage(message, className) {
    const paragraph = document.createElement('p');
    paragraph.className = className || 'fc-equation-message';
    paragraph.setAttribute('role', 'status');
    paragraph.textContent = message;
    output.replaceChildren(paragraph);
    output.style.display = 'block';
  }

  calculateButton.addEventListener('click', function () {
    const values = Object.create(null);
    let invalid = false;

    for (const input of Array.from(form.elements || [])) {
      const rawValue = String(input.value == null ? '' : input.value).trim();
      if (!rawValue) continue;

      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        invalid = true;
        break;
      }
      values[input.name] = value;
    }

    if (invalid) {
      showMessage('Enter a valid finite number in each field you use.', 'fc-equation-error');
      return;
    }

    const rows = [];
    for (const equation of config.equations) {
      const calculate = compileEquation(equation);
      if (!calculate || !equation.rhs.every(key => Object.prototype.hasOwnProperty.call(values, key))) continue;

      try {
        const args = equation.rhs.map(key => values[key]);
        const result = calculate(...args, helpers, Math);
        if (!Number.isFinite(result)) continue;

        rows.push({
          label: humanize(equation.lhs, outputLabels),
          value: new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(result)
        });
      } catch (_) {
        // One invalid equation must not prevent other valid equations from running.
      }
    }

    if (!rows.length) {
      showMessage(
        'Enter the required values for at least one formula to display a result.',
        'fc-equation-empty'
      );
      return;
    }

    const table = document.createElement('table');
    table.className = 'fc-equation-results';
    const body = document.createElement('tbody');

    for (const row of rows) {
      const tr = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = row.label;
      const cell = document.createElement('td');
      cell.textContent = row.value;
      tr.appendChild(heading);
      tr.appendChild(cell);
      body.appendChild(tr);
    }

    table.appendChild(body);
    output.replaceChildren(table);
    output.style.display = 'block';
  });
})();