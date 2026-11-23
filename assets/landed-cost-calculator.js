(function (root) {
  'use strict';

  function calculateLandedCost(values) {
    const fields = [
      ['quantity', 'Quantity'],
      ['goodsValue', 'Goods purchase value'],
      ['originFreight', 'Origin inland freight'],
      ['internationalFreight', 'International freight'],
      ['insurance', 'Cargo insurance'],
      ['customsDuty', 'Customs duty amount'],
      ['clearance', 'Customs clearance and brokerage'],
      ['destinationFreight', 'Destination inland delivery'],
      ['otherCharges', 'Other charges']
    ];
    for (const [key, label] of fields) {
      const value = values[key];
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(label + ' must be a valid non-negative number.');
      }
    }
    if (values.quantity <= 0) throw new Error('Quantity must be greater than zero.');
    const logistics = values.originFreight + values.internationalFreight + values.insurance + values.destinationFreight;
    const fees = values.customsDuty + values.clearance + values.otherCharges;
    const total = values.goodsValue + logistics + fees;
    return {
      goodsValue: values.goodsValue,
      logistics,
      importFees: fees,
      total,
      perUnit: total / values.quantity,
      note: 'All amounts must use the same currency. Customs duty and taxes are user-entered amounts; this tool does not classify goods or determine statutory rates.'
    };
  }

  function format(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }

  function init() {
    const form = root.document && root.document.getElementById('landed-cost-form');
    const output = root.document && root.document.getElementById('landed-cost-result');
    if (!form || !output) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const values = {};
      for (const field of form.elements) {
        if (!field.name) continue;
        values[field.name] = field.value === '' ? NaN : Number(field.value);
      }
      try {
        const result = calculateLandedCost(values);
        output.replaceChildren();
        const heading = root.document.createElement('h2');
        heading.textContent = 'Estimated landed cost';
        output.appendChild(heading);
        const rows = [
          ['Goods purchase value', result.goodsValue],
          ['Logistics and insurance', result.logistics],
          ['Customs duty and other fees', result.importFees],
          ['Total landed cost', result.total],
          ['Landed cost per unit', result.perUnit]
        ];
        const list = root.document.createElement('dl');
        for (const [label, value] of rows) {
          const term = root.document.createElement('dt');
          const detail = root.document.createElement('dd');
          term.textContent = label;
          detail.textContent = format(value);
          list.append(term, detail);
        }
        output.append(heading, list);
        const note = root.document.createElement('p');
        note.textContent = result.note;
        output.appendChild(note);
      } catch (error) {
        output.textContent = error.message;
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateLandedCost };
  }
  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
