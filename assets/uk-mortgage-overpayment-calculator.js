(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FriendlyUKMortgageOverpayment = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function monthlyPayment(principal, annualRate, months) {
    const r = annualRate / 1200;
    if (r === 0) return principal / months;
    const factor = Math.pow(1 + r, months);
    return principal * r * factor / (factor - 1);
  }

  function amortize(principal, annualRate, termYears, extraMonthly = 0) {
    const months = Math.round(termYears * 12);
    if (!Number.isFinite(principal) || principal <= 0) throw new RangeError('Enter a mortgage balance greater than zero.');
    if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) throw new RangeError('Enter an annual interest rate from 0% to 100%.');
    if (!Number.isFinite(termYears) || termYears <= 0 || termYears > 50) throw new RangeError('Enter a remaining term between 0 and 50 years.');
    if (!Number.isFinite(extraMonthly) || extraMonthly < 0) throw new RangeError('Enter a monthly overpayment of zero or more.');
    const scheduled = monthlyPayment(principal, annualRate, months);
    let balance = principal;
    let interestTotal = 0;
    let count = 0;
    const rate = annualRate / 1200;
    while (balance > 0.005 && count < months + 1) {
      const interest = balance * rate;
      const due = balance + interest;
      const scheduledThisMonth = Math.min(scheduled, due);
      const afterScheduled = Math.max(0, due - scheduledThisMonth);
      const extra = Math.min(extraMonthly, afterScheduled);
      interestTotal += interest;
      balance = Math.max(0, afterScheduled - extra);
      count++;
    }
    if (balance > 0.005) throw new RangeError('The entered term could not be amortised. Check the values.');
    return { scheduledMonthlyPayment: scheduled, months: count, interestTotal };
  }

  function compare({ principal, annualRate, termYears, extraMonthly }) {
    const base = amortize(Number(principal), Number(annualRate), Number(termYears), 0);
    const accelerated = amortize(Number(principal), Number(annualRate), Number(termYears), Number(extraMonthly));
    return {
      scheduledMonthlyPayment: base.scheduledMonthlyPayment,
      monthsWithoutOverpayment: base.months,
      monthsWithOverpayment: accelerated.months,
      interestWithoutOverpayment: base.interestTotal,
      interestWithOverpayment: accelerated.interestTotal,
      interestSaved: Math.max(0, base.interestTotal - accelerated.interestTotal),
      monthsSaved: Math.max(0, base.months - accelerated.months)
    };
  }

  function mount(doc) {
    const form = doc.getElementById('uk-overpayment-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const fields = {
      principal: doc.getElementById('uk-overpayment-balance'),
      annualRate: doc.getElementById('uk-overpayment-rate'),
      termYears: doc.getElementById('uk-overpayment-term'),
      extraMonthly: doc.getElementById('uk-overpayment-extra')
    };
    const result = doc.getElementById('uk-overpayment-result');
    const error = doc.getElementById('uk-overpayment-error');
    const gbp = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      try {
        const data = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value]));
        const outcome = compare(data);
        const years = Math.floor(outcome.monthsSaved / 12);
        const months = outcome.monthsSaved % 12;
        result.innerHTML =
          '<dl class="results-grid">' +
          '<div><dt>Estimated regular monthly payment</dt><dd>' + gbp(outcome.scheduledMonthlyPayment) + '</dd></div>' +
          '<div><dt>Interest without overpayments</dt><dd>' + gbp(outcome.interestWithoutOverpayment) + '</dd></div>' +
          '<div><dt>Interest with overpayments</dt><dd>' + gbp(outcome.interestWithOverpayment) + '</dd></div>' +
          '<div class="total"><dt>Estimated interest saved</dt><dd>' + gbp(outcome.interestSaved) + '</dd></div>' +
          '<div><dt>Time saved</dt><dd>' + years + ' years, ' + months + ' months</dd></div>' +
          '<div><dt>New estimated payoff time</dt><dd>' + Math.floor(outcome.monthsWithOverpayment / 12) + ' years, ' + (outcome.monthsWithOverpayment % 12) + ' months</dd></div>' +
          '</dl>';
      } catch (err) {
        error.textContent = err.message;
        result.textContent = 'Enter valid mortgage details to see your estimate.';
      }
    });
  }

  return { monthlyPayment, amortize, compare, mount };
});
