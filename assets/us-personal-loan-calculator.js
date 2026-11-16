(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FriendlyUSPersonalLoanCalculator = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function calculate({ loanAmount, apr, termMonths, originationFeeRate = 0 }) {
    const amount = Number(loanAmount), rate = Number(apr), months = Number(termMonths), feeRate = Number(originationFeeRate);
    if (!Number.isFinite(amount) || amount <= 0) throw new RangeError('Loan amount must be greater than zero.');
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new RangeError('APR must be between 0% and 100%.');
    if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError('Term must be 1 to 120 whole months.');
    if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100) throw new RangeError('Origination fee must be between 0% and 100%.');
    const monthlyRate = rate / 1200;
    const payment = monthlyRate === 0 ? amount / months : amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    const totalPayments = payment * months;
    const fee = amount * feeRate / 100;
    return { loanAmount: amount, monthlyPayment: payment, totalPayments, totalInterest: totalPayments - amount, originationFee: fee, netProceedsIfWithheld: amount - fee };
  }
  function mount(doc) {
    const form = doc.getElementById('us-personal-loan-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const fields = {
      loanAmount: doc.getElementById('us-personal-loan-amount'),
      apr: doc.getElementById('us-personal-loan-apr'),
      termMonths: doc.getElementById('us-personal-loan-term'),
      originationFeeRate: doc.getElementById('us-personal-loan-fee')
    };
    const result = doc.getElementById('us-personal-loan-result');
    const error = doc.getElementById('us-personal-loan-error');
    const usd = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      try {
        const data = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value]));
        const r = calculate(data);
        result.innerHTML = '<dl class="results-grid">' +
          '<div><dt>Estimated monthly payment</dt><dd>' + usd(r.monthlyPayment) + '</dd></div>' +
          '<div><dt>Total of payments</dt><dd>' + usd(r.totalPayments) + '</dd></div>' +
          '<div><dt>Total interest</dt><dd>' + usd(r.totalInterest) + '</dd></div>' +
          '<div><dt>Estimated origination fee</dt><dd>' + usd(r.originationFee) + '</dd></div>' +
          '<div class="total"><dt>Net proceeds if fee is withheld</dt><dd>' + usd(r.netProceedsIfWithheld) + '</dd></div>' +
          '</dl>';
      } catch (err) {
        error.textContent = err.message;
        result.textContent = 'Enter valid loan assumptions to see the estimate.';
      }
    });
  }
  return { calculate, mount };
});
