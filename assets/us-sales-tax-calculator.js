(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FriendlySalesTaxCalculator = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function calculate({ amount, rate }) {
    const price = Number(amount);
    const taxRate = Number(rate);
    if (!Number.isFinite(price) || price < 0) throw new RangeError('Enter a valid purchase amount of zero or more.');
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new RangeError('Enter a combined sales-tax rate from 0% to 100%.');
    const tax = price * taxRate / 100;
    return { subtotal: price, rate: taxRate, tax, total: price + tax };
  }

  function mount(doc) {
    const form = doc.getElementById('us-sales-tax-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const amount = doc.getElementById('us-sales-tax-amount');
    const rate = doc.getElementById('us-sales-tax-rate');
    const currency = doc.getElementById('us-sales-tax-currency');
    const result = doc.getElementById('us-sales-tax-result');
    const error = doc.getElementById('us-sales-tax-error');
    const format = value => new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency.value, maximumFractionDigits: 2
    }).format(value);

    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      try {
        const totals = calculate({ amount: amount.value, rate: rate.value });
        result.innerHTML =
          '<dl class="results-grid">' +
          '<div><dt>Purchase amount</dt><dd>' + format(totals.subtotal) + '</dd></div>' +
          '<div><dt>Combined sales-tax rate</dt><dd>' + totals.rate.toFixed(3).replace(/\\.?0+$/, '') + '%</dd></div>' +
          '<div><dt>Estimated sales tax</dt><dd>' + format(totals.tax) + '</dd></div>' +
          '<div class="total"><dt>Total after tax</dt><dd>' + format(totals.total) + '</dd></div>' +
          '</dl>';
      } catch (err) {
        error.textContent = err.message;
        result.textContent = 'Enter valid values to see your estimate.';
      }
    });
  }

  return { calculate, mount };
});
