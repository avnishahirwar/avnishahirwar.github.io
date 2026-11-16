(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FriendlyGBWorkplacePensionCalculator = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LOWER = 6240;
  const UPPER = 50270;

  function calculate({ annualPay, employeeRate = 5, employerRate = 3 }) {
    const pay = Number(annualPay);
    const employee = Number(employeeRate);
    const employer = Number(employerRate);
    if (!Number.isFinite(pay) || pay < 0) throw new RangeError('Enter annual gross pay of zero or more.');
    if (!Number.isFinite(employee) || employee < 0 || employee > 100) throw new RangeError('Employee contribution rate must be between 0% and 100%.');
    if (!Number.isFinite(employer) || employer < 0 || employer > 100) throw new RangeError('Employer contribution rate must be between 0% and 100%.');
    const qualifyingEarnings = Math.max(0, Math.min(pay, UPPER) - LOWER);
    const employeeAnnual = qualifyingEarnings * employee / 100;
    const employerAnnual = qualifyingEarnings * employer / 100;
    return {
      annualPay: pay,
      qualifyingEarnings,
      employeeAnnual,
      employerAnnual,
      totalAnnual: employeeAnnual + employerAnnual,
      employeeMonthly: employeeAnnual / 12,
      employerMonthly: employerAnnual / 12,
      totalMonthly: (employeeAnnual + employerAnnual) / 12,
      lowerThreshold: LOWER,
      upperThreshold: UPPER
    };
  }

  function mount(doc) {
    const form = doc.getElementById('gb-pension-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const pay = doc.getElementById('gb-pension-pay');
    const employee = doc.getElementById('gb-pension-employee-rate');
    const employer = doc.getElementById('gb-pension-employer-rate');
    const result = doc.getElementById('gb-pension-result');
    const error = doc.getElementById('gb-pension-error');
    const gbp = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      try {
        const r = calculate({ annualPay: pay.value, employeeRate: employee.value, employerRate: employer.value });
        result.innerHTML = '<dl class="results-grid">' +
          '<div><dt>Qualifying earnings used</dt><dd>' + gbp(r.qualifyingEarnings) + '</dd></div>' +
          '<div><dt>Your annual contribution</dt><dd>' + gbp(r.employeeAnnual) + '</dd></div>' +
          '<div><dt>Employer annual contribution</dt><dd>' + gbp(r.employerAnnual) + '</dd></div>' +
          '<div class="total"><dt>Total annual pension contribution</dt><dd>' + gbp(r.totalAnnual) + '</dd></div>' +
          '<div><dt>Your monthly contribution</dt><dd>' + gbp(r.employeeMonthly) + '</dd></div>' +
          '<div><dt>Employer monthly contribution</dt><dd>' + gbp(r.employerMonthly) + '</dd></div>' +
          '<div><dt>Total monthly contribution</dt><dd>' + gbp(r.totalMonthly) + '</dd></div>' +
          '</dl>';
      } catch (err) {
        error.textContent = err.message;
        result.textContent = 'Enter valid annual pay and contribution rates.';
      }
    });
  }
  return { calculate, mount, LOWER, UPPER };
});
