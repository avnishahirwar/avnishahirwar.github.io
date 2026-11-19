(function (root) {
  'use strict';

  const FREQUENCIES = Object.freeze({ monthly: 12, 'twice monthly': 24, biweekly: 26, weekly: 52 });
  const COMPOUNDING = Object.freeze({ monthly: 12, quarterly: 4, 'semi-annually': 2, annually: 1 });

  function finite(value, label, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(label + ' must be a valid number.');
    if (min !== undefined && number < min) throw new RangeError(label + ' must be at least ' + min + '.');
    if (max !== undefined && number > max) throw new RangeError(label + ' must be no more than ' + max + '.');
    return number;
  }

  function periodicRate(annualPercent, compoundsPerYear, periodsPerYear) {
    const nominal = finite(annualPercent, 'Annual interest rate', 0, 50) / 100;
    if (!Number.isInteger(compoundsPerYear) || compoundsPerYear < 1) throw new RangeError('Choose a valid compounding frequency.');
    if (!Number.isInteger(periodsPerYear) || periodsPerYear < 1) throw new RangeError('Choose a valid payment frequency.');
    const effectiveAnnual = Math.pow(1 + nominal / compoundsPerYear, compoundsPerYear) - 1;
    return Math.pow(1 + effectiveAnnual, 1 / periodsPerYear) - 1;
  }

  function payment(principal, rate, periods) {
    if (principal <= 0 || periods <= 0) throw new RangeError('Loan amount and number of payments must be positive.');
    if (rate === 0) return principal / periods;
    const denominator = 1 - Math.pow(1 + rate, -periods);
    if (!Number.isFinite(denominator) || denominator <= 0) throw new RangeError('These inputs do not produce a valid payment.');
    return principal * rate / denominator;
  }

  function amortize(principal, rate, scheduledPayment, extraPayment, maxPeriods) {
    let balance = principal;
    let totalInterest = 0;
    let totalPaid = 0;
    let periods = 0;
    let lastPayment = 0;
    const cap = Math.min(Math.max(1, Math.ceil(maxPeriods)), 6000);
    for (let i = 0; i < cap && balance > 0.000001; i += 1) {
      const interest = balance * rate;
      const due = scheduledPayment + extraPayment;
      if (!Number.isFinite(due) || due <= interest) throw new RangeError('The payment must be greater than the interest due in each period.');
      const principalPaid = Math.min(balance, due - interest);
      lastPayment = interest + principalPaid;
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
      totalPaid += lastPayment;
      periods += 1;
    }
    if (balance > 0.01) throw new RangeError('The loan is not paid off within the supported period.');
    return { periods, totalInterest, totalPaid, lastPayment, balance };
  }

  function base(v, frequencyOverride) {
    const principal = finite(v.loanAmount, 'Loan amount', 0.01, 1e15);
    const annualRate = finite(v.annualRate, 'Annual interest rate', 0, 50);
    const years = finite(v.termYears, 'Loan term', 1, 50);
    const frequency = frequencyOverride || FREQUENCIES[v.paymentFrequency || 'monthly'];
    const compounds = COMPOUNDING[v.compoundingFrequency || 'monthly'];
    const rate = periodicRate(annualRate, compounds, frequency);
    return { principal, annualRate, years, frequency, compounds, rate, periods: Math.round(years * frequency) };
  }

  function calculateMortgageTool(type, v) {
    if (!v || typeof v !== 'object') throw new TypeError('Calculator inputs are required.');
    if (type === 'rate') {
      const principal = finite(v.loanAmount, 'Loan amount', 0.01, 1e15);
      const years = finite(v.termYears, 'Loan term', 1, 50);
      const target = finite(v.targetPayment, 'Payment amount', 0.01, 1e15);
      const periods = Math.round(years * 12);
      if (target < principal / periods - 0.000001) throw new RangeError('The entered payment is too small to repay the principal over the selected term.');
      const maximumPayment = payment(principal, periodicRate(50, 12, 12), periods);
      if (target > maximumPayment) throw new RangeError('The implied annual rate is above the supported 50% range.');
      let low = 0, high = 0.5, annual = 0;
      for (let i = 0; i < 100; i += 1) {
        annual = (low + high) / 2;
        const rate = periodicRate(annual * 100, 12, 12);
        if (payment(principal, rate, periods) > target) high = annual;
        else low = annual;
      }
      const monthlyPayment = payment(principal, periodicRate(annual * 100, 12, 12), periods);
      return [{ label: 'Estimated nominal annual rate', value: annual * 100, kind: 'percent' }, { label: 'Payment check', value: monthlyPayment, kind: 'money' }];
    }

    if (type === 'penalty') {
      const balance = finite(v.loanAmount, 'Outstanding balance', 0.01, 1e15);
      const rate = finite(v.penaltyRate, 'Penalty interest rate', 0, 50);
      const months = finite(v.penaltyMonths, 'Interest months used by your lender', 0, 60);
      const fee = finite(v.fixedFee || 0, 'Other fixed lender fee', 0, 1e12);
      return [{ label: 'Interest-based estimate', value: balance * (rate / 100) * months / 12, kind: 'money' }, { label: 'Other fixed fee', value: fee, kind: 'money' }, { label: 'Estimated total penalty', value: balance * (rate / 100) * months / 12 + fee, kind: 'money' }];
    }

    if (type === 'points') {
      const b = base(v, 12);
      const points = finite(v.pointsPercent, 'Discount points', 0, 20);
      const reduction = finite(v.rateReduction, 'Interest-rate reduction', 0, 20);
      const basePayment = payment(b.principal, b.rate, b.periods);
      const reducedRate = periodicRate(Math.max(0, b.annualRate - reduction), b.compounds, 12);
      const reducedPayment = payment(b.principal, reducedRate, b.periods);
      const cost = b.principal * points / 100;
      const saving = basePayment - reducedPayment;
      return [{ label: 'Up-front points cost', value: cost, kind: 'money' }, { label: 'Monthly payment before points', value: basePayment, kind: 'money' }, { label: 'Monthly payment after points', value: reducedPayment, kind: 'money' }, { label: 'Monthly payment saving', value: saving, kind: 'money' }, { label: 'Break-even period', value: saving > 0 ? cost / saving : null, kind: 'months' }];
    }

    if (type === 'refinance') {
      const principal = finite(v.loanAmount, 'Current outstanding balance', 0.01, 1e15);
      const currentRate = finite(v.annualRate, 'Current annual interest rate', 0, 50);
      const newRate = finite(v.newRate, 'New annual interest rate', 0, 50);
      const remainingYears = finite(v.termYears, 'Remaining term', 1, 50);
      const newYears = finite(v.newTermYears, 'New loan term', 1, 50);
      const costs = finite(v.closingCosts || 0, 'Refinance costs', 0, 1e12);
      const oldR = periodicRate(currentRate, 12, 12);
      const newR = periodicRate(newRate, 12, 12);
      const oldPmt = payment(principal, oldR, remainingYears * 12);
      const newPmt = payment(principal + costs, newR, newYears * 12);
      const monthlySaving = oldPmt - newPmt;
      return [{ label: 'Current monthly principal and interest', value: oldPmt, kind: 'money' }, { label: 'New monthly principal and interest', value: newPmt, kind: 'money' }, { label: 'Monthly payment difference', value: monthlySaving, kind: 'money' }, { label: 'Refinance costs', value: costs, kind: 'money' }, { label: 'Simple break-even period', value: monthlySaving > 0 ? costs / monthlySaving : null, kind: 'months' }, { label: 'Interest under current loan', value: amortize(principal, oldR, oldPmt, 0, remainingYears * 12).totalInterest, kind: 'money' }, { label: 'Interest under new loan (including financed costs)', value: amortize(principal + costs, newR, newPmt, 0, newYears * 12).totalInterest, kind: 'money' }];
    }

    if (type === 'comparison') {
      const b = base(v, 12);
      const secondRate = finite(v.secondRate, 'Alternative annual interest rate', 0, 50);
      const secondYears = finite(v.secondTermYears, 'Alternative loan term', 1, 50);
      const firstRate = periodicRate(b.annualRate, b.compounds, 12);
      const altRate = periodicRate(secondRate, b.compounds, 12);
      const firstPmt = payment(b.principal, firstRate, b.years * 12);
      const altPmt = payment(b.principal, altRate, secondYears * 12);
      return [{ label: 'Option A monthly payment', value: firstPmt, kind: 'money' }, { label: 'Option A total interest', value: amortize(b.principal, firstRate, firstPmt, 0, b.years * 12).totalInterest, kind: 'money' }, { label: 'Option B monthly payment', value: altPmt, kind: 'money' }, { label: 'Option B total interest', value: amortize(b.principal, altRate, altPmt, 0, secondYears * 12).totalInterest, kind: 'money' }, { label: 'Monthly payment difference (A − B)', value: firstPmt - altPmt, kind: 'money' }];
    }

    const b = base(v);
    const scheduled = payment(b.principal, b.rate, b.periods);

    if (type === 'arm') {
      const change = finite(v.adjustmentPerReset, 'Rate change at each reset (percentage points)', -20, 20);
      const resetCap = finite(v.resetCap, 'Maximum rate change per reset (percentage points)', 0, 20);
      const lifetimeCap = finite(v.lifetimeCap, 'Lifetime rate change cap (percentage points)', 0, 30);
      const resetYears = finite(v.resetEveryYears, 'Years between rate resets', 1, 10);
      if (!Number.isInteger(resetYears)) throw new RangeError('Years between rate resets must be a whole number.');
      let balance = b.principal, totalInterest = 0, months = 0, currentRate = b.annualRate, currentPayment = scheduled;
      const maxMonths = b.years * 12;
      for (let month = 1; month <= maxMonths && balance > 0.000001; month += 1) {
        if (month > 1 && (month - 1) % (resetYears * 12) === 0) {
          const delta = Math.max(-resetCap, Math.min(resetCap, change));
          currentRate = Math.max(0, Math.max(b.annualRate - lifetimeCap, Math.min(b.annualRate + lifetimeCap, currentRate + delta)));
          const remaining = maxMonths - month + 1;
          currentPayment = payment(balance, periodicRate(currentRate, b.compounds, 12), remaining);
        }
        const interest = balance * periodicRate(currentRate, b.compounds, 12);
        const principalPaid = Math.min(balance, Math.max(0, currentPayment - interest));
        if (principalPaid <= 0 && balance > 0) throw new RangeError('The payment does not reduce the balance at the selected rate.');
        totalInterest += interest;
        balance = Math.max(0, balance - principalPaid);
        months = month;
      }
      if (balance > 0.01) throw new RangeError('The ARM scenario does not pay off within the selected term.');
      return [{ label: 'Initial monthly payment', value: scheduled, kind: 'money' }, { label: 'Final modelled annual rate', value: currentRate, kind: 'percent' }, { label: 'Payoff time', value: months, kind: 'months' }, { label: 'Total interest under entered reset scenario', value: totalInterest, kind: 'money' }];
    }

    if (type === 'interest-only') {
      const ioYears = finite(v.interestOnlyYears, 'Interest-only period', 1, b.years);
      const ioMonths = Math.round(ioYears * 12);
      const monthlyRate = periodicRate(b.annualRate, b.compounds, 12);
      const ioPayment = b.principal * monthlyRate;
      const ioInterest = ioPayment * ioMonths;
      if (ioMonths >= b.years * 12) return [{ label: 'Monthly interest-only payment', value: ioPayment, kind: 'money' }, { label: 'Interest during interest-only period', value: ioInterest, kind: 'money' }, { label: 'Principal remaining at the end of the term', value: b.principal, kind: 'money' }, { label: 'Total estimated interest', value: ioInterest, kind: 'money' }];
      const remainingMonths = b.years * 12 - ioMonths;
      const amortizedPayment = payment(b.principal, monthlyRate, remainingMonths);
      const tail = amortize(b.principal, monthlyRate, amortizedPayment, 0, remainingMonths);
      return [{ label: 'Monthly interest-only payment', value: ioPayment, kind: 'money' }, { label: 'Monthly payment after interest-only period', value: amortizedPayment, kind: 'money' }, { label: 'Interest during interest-only period', value: ioInterest, kind: 'money' }, { label: 'Interest during repayment period', value: tail.totalInterest, kind: 'money' }, { label: 'Total estimated interest', value: ioInterest + tail.totalInterest, kind: 'money' }];
    }

    if (type === 'biweekly' || type === 'biweekly-payment') {
      const monthlyRate = periodicRate(b.annualRate, b.compounds, 12);
      const monthlyPayment = payment(b.principal, monthlyRate, b.years * 12);
      const biweeklyRate = periodicRate(b.annualRate, b.compounds, 26);
      const regularBiweekly = monthlyPayment * 12 / 26;
      const acceleratedBiweekly = monthlyPayment / 2;
      const regular = amortize(b.principal, biweeklyRate, regularBiweekly, 0, b.years * 26 + 26);
      const accelerated = amortize(b.principal, biweeklyRate, acceleratedBiweekly, 0, b.years * 26 + 26);
      return [{ label: 'Standard monthly payment', value: monthlyPayment, kind: 'money' }, { label: 'Regular biweekly payment', value: regularBiweekly, kind: 'money' }, { label: 'Accelerated biweekly payment', value: acceleratedBiweekly, kind: 'money' }, { label: 'Regular biweekly total interest', value: regular.totalInterest, kind: 'money' }, { label: 'Accelerated biweekly total interest', value: accelerated.totalInterest, kind: 'money' }, { label: 'Accelerated payoff time', value: accelerated.periods, kind: 'periods' }, { label: 'Estimated interest saving vs regular biweekly', value: regular.totalInterest - accelerated.totalInterest, kind: 'money' }];
    }

    if (type === 'taxes-insurance' || type === 'home') {
      const tax = finite(v.annualPropertyTax || 0, 'Annual property tax', 0, 1e12);
      const insurance = finite(v.annualInsurance || 0, 'Annual home insurance', 0, 1e12);
      const maintenance = finite(v.monthlyMaintenance || 0, 'Monthly maintenance', 0, 1e12);
      const extra = tax / 12 + insurance / 12 + maintenance;
      return [{ label: 'Monthly principal and interest', value: scheduled * b.frequency / 12, kind: 'money' }, { label: 'Monthly property tax', value: tax / 12, kind: 'money' }, { label: 'Monthly home insurance', value: insurance / 12, kind: 'money' }, { label: 'Monthly maintenance', value: maintenance, kind: 'money' }, { label: 'Estimated monthly housing cost', value: scheduled * b.frequency / 12 + extra, kind: 'money' }, { label: 'Total loan interest', value: amortize(b.principal, b.rate, scheduled, 0, b.periods).totalInterest, kind: 'money' }];
    }

    const extraMonthly = finite(v.extraMonthlyPayment || 0, 'Additional monthly principal payment', 0, 1e12);
    const extraPerPeriod = extraMonthly * 12 / b.frequency;
    const schedule = amortize(b.principal, b.rate, scheduled, 0, b.periods);
    const withExtra = amortize(b.principal, b.rate, scheduled, extraPerPeriod, b.periods);
    if (type === 'payoff' || type === 'acceleration' || type === 'prepayment') {
      return [{ label: 'Scheduled payment per period', value: scheduled, kind: 'money' }, { label: 'Additional payment per month', value: extraMonthly, kind: 'money' }, { label: 'Original payoff time', value: schedule.periods, kind: 'periods' }, { label: 'Payoff time with extra payments', value: withExtra.periods, kind: 'periods' }, { label: 'Interest without extra payments', value: schedule.totalInterest, kind: 'money' }, { label: 'Interest with extra payments', value: withExtra.totalInterest, kind: 'money' }, { label: 'Estimated interest saved', value: schedule.totalInterest - withExtra.totalInterest, kind: 'money' }];
    }

    return [{ label: 'Payment per period', value: scheduled, kind: 'money' }, { label: 'Total interest over the term', value: schedule.totalInterest, kind: 'money' }, { label: 'Total principal and interest paid', value: schedule.totalPaid, kind: 'money' }, { label: 'Number of payments', value: schedule.periods, kind: 'periods' }];
  }

  const FIELD_SETS = {
    arm: ['loanAmount','annualRate','termYears','compoundingFrequency','adjustmentPerReset','resetCap','lifetimeCap','resetEveryYears'],
    biweekly: ['loanAmount','annualRate','termYears','compoundingFrequency'],
    'biweekly-payment': ['loanAmount','annualRate','termYears','compoundingFrequency'],
    home: ['loanAmount','annualRate','termYears','compoundingFrequency','annualPropertyTax','annualInsurance','monthlyMaintenance'],
    'taxes-insurance': ['loanAmount','annualRate','termYears','compoundingFrequency','annualPropertyTax','annualInsurance','monthlyMaintenance'],
    'interest-only': ['loanAmount','annualRate','termYears','compoundingFrequency','interestOnlyYears'],
    acceleration: ['loanAmount','annualRate','termYears','compoundingFrequency','extraMonthlyPayment'],
    payoff: ['loanAmount','annualRate','termYears','compoundingFrequency','extraMonthlyPayment'],
    prepayment: ['loanAmount','annualRate','termYears','compoundingFrequency','extraMonthlyPayment'],
    comparison: ['loanAmount','annualRate','termYears','compoundingFrequency','secondRate','secondTermYears'],
    interest: ['loanAmount','annualRate','termYears','compoundingFrequency'],
    penalty: ['loanAmount','penaltyRate','penaltyMonths','fixedFee'],
    points: ['loanAmount','annualRate','termYears','compoundingFrequency','pointsPercent','rateReduction'],
    rate: ['loanAmount','termYears','targetPayment'],
    refinance: ['loanAmount','annualRate','termYears','newRate','newTermYears','closingCosts'],
    simple: ['loanAmount','annualRate','termYears','compoundingFrequency','paymentFrequency']
  };

  const FIELD_DEFS = {
    loanAmount: { label: 'Loan amount / outstanding balance', type: 'number', min: 0.01, max: 1e15, step: '0.01' },
    annualRate: { label: 'Annual interest rate (%)', type: 'number', min: 0, max: 50, step: '0.01' },
    termYears: { label: 'Loan term / remaining term (years)', type: 'number', min: 1, max: 50, step: '1' },
    compoundingFrequency: { label: 'Interest compounding', type: 'select', options: [['monthly','Monthly'],['quarterly','Quarterly'],['semi-annually','Semi-annually'],['annually','Annually']] },
    paymentFrequency: { label: 'Payment frequency', type: 'select', options: [['monthly','Monthly'],['twice monthly','Twice monthly'],['biweekly','Biweekly'],['weekly','Weekly']] },
    annualPropertyTax: { label: 'Annual property tax (optional)', type: 'number', min: 0, step: '0.01', optional: true },
    annualInsurance: { label: 'Annual home insurance (optional)', type: 'number', min: 0, step: '0.01', optional: true },
    monthlyMaintenance: { label: 'Monthly maintenance / service charge (optional)', type: 'number', min: 0, step: '0.01', optional: true },
    extraMonthlyPayment: { label: 'Additional monthly principal payment (optional)', type: 'number', min: 0, step: '0.01', optional: true },
    adjustmentPerReset: { label: 'Rate change at each reset (percentage points)', type: 'number', min: -20, max: 20, step: '0.01' },
    resetCap: { label: 'Maximum rate change per reset (percentage points)', type: 'number', min: 0, max: 20, step: '0.01' },
    lifetimeCap: { label: 'Lifetime rate change cap (percentage points)', type: 'number', min: 0, max: 30, step: '0.01' },
    resetEveryYears: { label: 'Years between rate resets', type: 'number', min: 1, max: 10, step: '1' },
    interestOnlyYears: { label: 'Interest-only period (years)', type: 'number', min: 1, max: 50, step: '1' },
    secondRate: { label: 'Alternative annual interest rate (%)', type: 'number', min: 0, max: 50, step: '0.01' },
    secondTermYears: { label: 'Alternative loan term (years)', type: 'number', min: 1, max: 50, step: '1' },
    penaltyRate: { label: 'Annual rate used by your lender for the penalty (%)', type: 'number', min: 0, max: 50, step: '0.01' },
    penaltyMonths: { label: 'Number of interest months used by your lender', type: 'number', min: 0, max: 60, step: '1' },
    fixedFee: { label: 'Other fixed lender fee (optional)', type: 'number', min: 0, step: '0.01', optional: true },
    pointsPercent: { label: 'Discount points (% of loan amount)', type: 'number', min: 0, max: 20, step: '0.01' },
    rateReduction: { label: 'Rate reduction from points (percentage points)', type: 'number', min: 0, max: 20, step: '0.01' },
    targetPayment: { label: 'Monthly principal-and-interest payment', type: 'number', min: 0.01, step: '0.01' },
    newRate: { label: 'New annual interest rate (%)', type: 'number', min: 0, max: 50, step: '0.01' },
    newTermYears: { label: 'New loan term (years)', type: 'number', min: 1, max: 50, step: '1' },
    closingCosts: { label: 'Estimated refinance costs (optional)', type: 'number', min: 0, step: '0.01', optional: true }
  };

  function currency(value) {
    if (value === null || !Number.isFinite(value)) return 'Not available';
    try {
      if (root.FCLocale && typeof root.FCLocale.formatCurrency === 'function') {
        return root.FCLocale.formatCurrency(value, root.FCLocale.getCurrency(), { maximumFractionDigits: 2 });
      }
    } catch (_) {}
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    } catch (_) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  }

  function formatResult(item) {
    if (item.kind === 'money') return currency(item.value);
    if (item.kind === 'percent') return Number(item.value).toFixed(3) + '%';
    if (item.kind === 'months') return item.value === null ? 'No break-even from the entered values' : Number(item.value).toFixed(1) + ' months';
    if (item.kind === 'periods') return Math.ceil(item.value).toLocaleString() + ' payment periods';
    return String(item.value);
  }

  function renderResult(output, rows, type) {
    output.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Estimate';
    const list = document.createElement('dl');
    list.className = 'mortgage-tool-results';
    rows.forEach(item => {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = item.label;
      value.textContent = formatResult(item);
      list.append(term, value);
    });
    const note = document.createElement('p');
    note.className = 'mortgage-tool-note';
    note.textContent = type === 'penalty'
      ? 'Illustrative calculation only. Enter the exact method, rate, period and fees stated by your lender; penalty rules differ by contract and jurisdiction.'
      : 'Estimate only. The selected currency changes display formatting, not the underlying numeric inputs. Local taxes, fees, insurance rules and lender terms vary; enter applicable amounts yourself.';
    output.append(heading, list, note);
    output.hidden = false;
  }

  function mount() {
    const form = document.querySelector('form[data-mortgage-tool]');
    if (!form) return;
    const type = form.dataset.mortgageTool;
    if (!FIELD_SETS[type]) return;
    const output = document.getElementById('out');
    const oldButton = document.getElementById('go');
    if (!output || !oldButton) return;
    form.replaceChildren();
    form.classList.add('mortgage-tool-fields');
    FIELD_SETS[type].forEach(key => {
      const def = FIELD_DEFS[key];
      const label = document.createElement('label');
      label.className = 'mortgage-tool-field';
      label.textContent = def.label;
      let control;
      if (def.type === 'select') {
        control = document.createElement('select');
        def.options.forEach(([value, text]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          control.appendChild(option);
        });
      } else {
        control = document.createElement('input');
        control.type = 'number';
        control.min = String(def.min);
        if (def.max !== undefined) control.max = String(def.max);
        control.step = def.step || 'any';
        control.inputMode = 'decimal';
        if (def.optional) control.value = '0';
        else control.required = true;
      }
      control.name = key;
      control.id = 'mortgage-' + key;
      label.htmlFor = control.id;
      label.appendChild(control);
      form.appendChild(label);
    });
    const button = oldButton.cloneNode(false);
    button.type = 'button';
    button.id = 'go';
    button.className = oldButton.className;
    button.textContent = 'Calculate estimate';
    oldButton.replaceWith(button);
    output.classList.add('mortgage-tool-result');
    output.hidden = true;
    let lastRows = null;
    button.addEventListener('click', function () {
      if (!form.reportValidity()) return;
      const values = {};
      FIELD_SETS[type].forEach(key => {
        const control = form.elements.namedItem(key);
        values[key] = control ? control.value : undefined;
      });
      try {
        lastRows = calculateMortgageTool(type, values);
        renderResult(output, lastRows, type);
      } catch (error) {
        output.replaceChildren();
        const message = document.createElement('p');
        message.className = 'mortgage-tool-error';
        message.textContent = error instanceof Error ? error.message : 'Please check the values and try again.';
        output.appendChild(message);
        output.hidden = false;
      }
    });
    const refresh = () => { if (lastRows) renderResult(output, lastRows, type); };
    root.addEventListener('fc:localechange', refresh);
    root.addEventListener('fc:locale-ready', refresh);
  }

  const api = Object.freeze({ calculateMortgageTool, periodicRate, payment, amortize });
  root.FCMortgageTools = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
