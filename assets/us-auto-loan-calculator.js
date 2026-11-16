(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FriendlyUSAutoLoanCalculator = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function calculate({ vehiclePrice, taxableAmount, salesTaxRate, fees, downPayment, tradeInEquity, apr, termMonths }) {
    const values = { vehiclePrice, taxableAmount, salesTaxRate, fees, downPayment, tradeInEquity, apr, termMonths };
    for (const [key, raw] of Object.entries(values)) {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new RangeError('Enter valid numeric values for all fields.');
      values[key] = value;
    }
    if (values.vehiclePrice <= 0) throw new RangeError('Vehicle price must be greater than zero.');
    if (values.taxableAmount < 0 || values.taxableAmount > values.vehiclePrice) throw new RangeError('Taxable amount must be between zero and the vehicle price.');
    if (values.salesTaxRate < 0 || values.salesTaxRate > 100) throw new RangeError('Sales-tax rate must be between 0% and 100%.');
    if (values.fees < 0 || values.downPayment < 0 || values.tradeInEquity < 0) throw new RangeError('Fees, down payment and trade-in equity cannot be negative.');
    if (values.apr < 0 || values.apr > 100) throw new RangeError('APR must be between 0% and 100%.');
    if (!Number.isInteger(values.termMonths) || values.termMonths < 1 || values.termMonths > 120) throw new RangeError('Loan term must be 1 to 120 whole months.');

    const salesTax = values.taxableAmount * values.salesTaxRate / 100;
    const outTheDoor = values.vehiclePrice + salesTax + values.fees;
    const amountFinanced = outTheDoor - values.downPayment - values.tradeInEquity;
    if (amountFinanced <= 0) throw new RangeError('Down payment and trade-in equity must be less than the total purchase amount.');
    const monthlyRate = values.apr / 1200;
    const monthlyPayment = monthlyRate === 0
      ? amountFinanced / values.termMonths
      : amountFinanced * monthlyRate / (1 - Math.pow(1 + monthlyRate, -values.termMonths));
    const totalPayments = monthlyPayment * values.termMonths;
    return { salesTax, outTheDoor, amountFinanced, monthlyPayment, totalInterest: totalPayments - amountFinanced, totalLoanPayments: totalPayments, totalCostIncludingUpfront: totalPayments + values.downPayment + values.tradeInEquity };
  }

  function mount(doc) {
    const form = doc.getElementById('us-auto-loan-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const ids = ['vehiclePrice','taxableAmount','salesTaxRate','fees','downPayment','tradeInEquity','apr','termMonths'];
    const inputs = Object.fromEntries(ids.map(id => [id, doc.getElementById('us-auto-loan-' + id)]));
    const result = doc.getElementById('us-auto-loan-result');
    const error = doc.getElementById('us-auto-loan-error');
    const format = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      try {
        const data = Object.fromEntries(ids.map(id => [id, inputs[id].value]));
        const out = calculate(data);
        result.innerHTML = '<dl class="results-grid">' +
          '<div><dt>Estimated sales tax</dt><dd>' + format(out.salesTax) + '</dd></div>' +
          '<div><dt>Out-the-door price</dt><dd>' + format(out.outTheDoor) + '</dd></div>' +
          '<div><dt>Amount financed</dt><dd>' + format(out.amountFinanced) + '</dd></div>' +
          '<div><dt>Estimated monthly payment</dt><dd>' + format(out.monthlyPayment) + '</dd></div>' +
          '<div><dt>Total loan interest</dt><dd>' + format(out.totalInterest) + '</dd></div>' +
          '<div class="total"><dt>Total of loan payments</dt><dd>' + format(out.totalLoanPayments) + '</dd></div>' +
          '</dl>';
      } catch (err) {
        error.textContent = err.message;
        result.textContent = 'Enter valid vehicle and loan details to see your estimate.';
      }
    });
  }

  return { calculate, mount };
});
