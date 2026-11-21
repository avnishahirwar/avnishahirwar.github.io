(function (global) {
  'use strict';
  const tables = global.FCPublicProgramData || {};
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const finite = (value, label, min = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min) throw new Error(label + ' must be a valid number of ' + (min ? 'at least ' + min : '0 or more') + '.');
    return n;
  };
  const cap = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function gstQst({ amount, mode = 'add' }) {
    const entered = finite(amount, 'Amount');
    const net = mode === 'remove' ? entered / 1.14975 : entered;
    if (mode !== 'add' && mode !== 'remove') throw new Error('Choose a supported calculation mode.');
    const gst = round2(net * 0.05);
    const qst = round2(net * 0.09975);
    const tax = round2(gst + qst);
    return { net: round2(net), gst, qst, tax, total: mode === 'remove' ? round2(entered) : round2(net + tax), combinedRate: 14.975 };
  }

  function australia2020({ taxableIncome }) {
    const t = finite(taxableIncome, 'Taxable income');
    let base = t <= 18200 ? 0 : t <= 45000 ? (t - 18200) * 0.19 : t <= 120000 ? 5092 + (t - 45000) * 0.325 : t <= 180000 ? 29467 + (t - 120000) * 0.37 : 51667 + (t - 180000) * 0.45;
    let lito = t <= 37500 ? 700 : t <= 45000 ? 700 - 0.05 * (t - 37500) : t <= 66667 ? 325 - 0.015 * (t - 45000) : 0;
    let lmito = t <= 37000 ? 255 : t <= 48000 ? 255 + 0.075 * (t - 37000) : t <= 90000 ? 1080 : t <= 126000 ? 1080 - 0.03 * (t - 90000) : 0;
    lito = cap(lito, 0, 700); lmito = cap(lmito, 0, 1080);
    return { baseTax: round2(base), lito: round2(lito), lmito: round2(lmito), taxAfterOffsets: round2(Math.max(0, base - lito - lmito)) };
  }

  function rmd2026({ age, priorYearEndBalance, youngerSpouseSoleBeneficiary = false }) {
    const a = Math.floor(finite(age, 'Age', 0));
    const balance = finite(priorYearEndBalance, 'Prior-year-end balance');
    if (youngerSpouseSoleBeneficiary) throw new Error('This limited calculator does not model the IRS Table II younger-spouse exception. Use the IRS rules or a qualified adviser.');
    if (a < 73) return { rmd: 0, divisor: null, note: 'No standard lifetime RMD is calculated here for this age; workplace-plan and special cases are not modeled.' };
    const divisor = tables.rmd && tables.rmd[String(a)];
    if (!divisor) throw new Error('The IRS Uniform Lifetime Table value for this age is not available in this calculator. Check the current IRS table.');
    return { rmd: round2(balance / divisor), divisor, note: 'Traditional IRA owner-lifetime estimate using IRS Table III for 2026.' };
  }

  function californiaGss2({ caAgi, wages, filedByDeadline, residentHalfYear, residentOnPaymentDate, canBeDependent, identifier, qualifiedGss1, claimedDependentCredit }) {
    const agi = finite(caAgi, '2020 California AGI');
    const wage = finite(wages, '2020 wages');
    if (agi < 1 || agi > 75000 || wage > 75000 || !filedByDeadline || !residentHalfYear || !residentOnPaymentDate || canBeDependent) return { amount: 0, eligible: false, note: 'The entered facts do not meet the supported general historical requirements.' };
    let amount = null;
    if (identifier === 'SSN' && qualifiedGss1 && claimedDependentCredit) amount = 500;
    else if (identifier === 'SSN' && !qualifiedGss1 && !claimedDependentCredit) amount = 600;
    else if (identifier === 'ITIN' && qualifiedGss1 && claimedDependentCredit) amount = 1000;
    else if (identifier === 'SSN' && !qualifiedGss1 && claimedDependentCredit) amount = 1100;
    if (amount === null) return { amount: 0, eligible: false, note: 'No payment category is supported for this combination in the cited FTB bulletin.' };
    return { amount, eligible: true, note: 'Historical GSS II category estimate for a qualifying 2020 California return; payments are complete.' };
  }

  function unemploymentRate({ unemployed, employed }) {
    const u = finite(unemployed, 'Unemployed count');
    const e = finite(employed, 'Employed count');
    const laborForce = u + e;
    if (laborForce <= 0) throw new Error('The labor force must be greater than zero.');
    return { unemployed: u, employed: e, laborForce, rate: u / laborForce * 100 };
  }

  function sdlt2025({ price, completionDate, location }) {
    const p = finite(price, 'Chargeable consideration');
    if (!['England', 'Northern Ireland'].includes(location)) throw new Error('SDLT applies here only to qualifying transactions in England or Northern Ireland. Scotland and Wales use different taxes.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDate) || completionDate < '2025-04-01') throw new Error('This calculator supports the ordinary residential rates for transactions completing on or after 1 April 2025 only.');
    const bands = [[125000, 0], [250000, 0.02], [925000, 0.05], [1500000, 0.10], [Infinity, 0.12]];
    let lower = 0, tax = 0;
    for (const [upper, rate] of bands) {
      const slice = Math.max(0, Math.min(p, upper) - lower);
      tax += slice * rate;
      if (p <= upper) break;
      lower = upper;
    }
    return { tax: round2(tax), effectiveRate: p ? tax / p * 100 : 0, price: p, note: 'Ordinary residential baseline only; reliefs, surcharges and special transaction types are not included.' };
  }

  function apyContribution({ age, pension, frequency, indianCitizen, savingsAccount, incomeTaxPayer }) {
    const a = Math.floor(finite(age, 'Age', 0));
    const p = Number(pension);
    if (!indianCitizen || !savingsAccount || a < 18 || a > 40 || incomeTaxPayer) return { eligible: false, note: 'The entered facts do not meet the basic conditions for new APY enrolment as described by PFRDA.' };
    const row = (tables.apy || []).find(r => r[0] === a);
    if (!row) throw new Error('The official APY contribution table has no row for this age.');
    const pensionIndex = [1000, 2000, 3000, 4000, 5000].indexOf(p);
    const frequencyIndex = { monthly: 0, quarterly: 1, halfyearly: 2 }[frequency];
    if (pensionIndex < 0 || frequencyIndex === undefined) throw new Error('Select an official pension slab and contribution frequency.');
    return { eligible: true, age: a, pension: p, contribution: row[2 + pensionIndex * 3 + frequencyIndex], period: frequency, vestingYears: 60 - a, nomineeCorpus: 170000 * pensionIndex + 170000, note: 'Prescribed contribution selected directly from the 2015 PFRDA annex table; new-enrolment screen only.' };
  }

  const api = { gstQst, australia2020, rmd2026, californiaGss2, unemploymentRate, sdlt2025, apyContribution };
  global.FCPublicProgramCalculators = api;

  function bind() {
    const form = document.querySelector('form[data-public-calculator]');
    if (!form) return;
    const result = document.getElementById('public-result');
    const error = document.getElementById('public-error');
    const read = name => {
      const field = form.querySelector('[name="' + name + '"]');
      if (!field) return undefined;
      if (field.type === 'checkbox') return field.checked;
      if (field.value === 'true') return true;
      if (field.value === 'false') return false;
      return field.value;
    };
    const run = () => {
      try {
        const tool = form.dataset.publicCalculator;
        let value;
        if (tool === 'gst-qst') {
          value = gstQst({ amount: read('amount'), mode: read('mode') });
          result.textContent = `Net amount: CA$${value.net.toFixed(2)}\nGST (5%): CA$${value.gst.toFixed(2)}\nQST (9.975%): CA$${value.qst.toFixed(2)}\nTotal tax: CA$${value.tax.toFixed(2)}\nTotal: CA$${value.total.toFixed(2)} (combined rate 14.975%)`;
        } else if (tool === 'australia-2020') {
          value = australia2020({ taxableIncome: read('taxableIncome') });
          result.textContent = `2020–21 base income tax: A$${value.baseTax.toFixed(2)}\nLITO: A$${value.lito.toFixed(2)}\nLMITO: A$${value.lmito.toFixed(2)}\nEstimated tax after these offsets: A$${value.taxAfterOffsets.toFixed(2)} (Medicare levy excluded)`;
        } else if (tool === 'rmd-2026') {
          value = rmd2026({ age: read('age'), priorYearEndBalance: read('priorYearEndBalance'), youngerSpouseSoleBeneficiary: read('youngerSpouseSoleBeneficiary') });
          result.textContent = value.rmd === 0 ? value.note : `IRS Table III divisor: ${value.divisor}\nEstimated 2026 RMD: $${value.rmd.toFixed(2)}\n${value.note}`;
        } else if (tool === 'california-gss2') {
          value = californiaGss2({ caAgi: read('caAgi'), wages: read('wages'), filedByDeadline: read('filedByDeadline'), residentHalfYear: read('residentHalfYear'), residentOnPaymentDate: read('residentOnPaymentDate'), canBeDependent: read('canBeDependent'), identifier: read('identifier'), qualifiedGss1: read('qualifiedGss1'), claimedDependentCredit: read('claimedDependentCredit') });
          result.textContent = value.eligible ? `Historical GSS II category amount: $${value.amount}\n${value.note}` : `No supported payment category: $0\n${value.note}`;
        } else if (tool === 'unemployment-rate') {
          value = unemploymentRate({ unemployed: read('unemployed'), employed: read('employed') });
          result.textContent = `Labor force: ${value.laborForce.toLocaleString('en-US')}\nUnemployment rate: ${value.rate.toFixed(2)}%\nThis is a statistical rate, not a benefits-eligibility result.`;
        } else if (tool === 'sdlt-2025') {
          value = sdlt2025({ price: read('price'), completionDate: read('completionDate'), location: read('location') });
          result.textContent = `Illustrative SDLT: £${value.tax.toFixed(2)}\nEffective rate: ${value.effectiveRate.toFixed(2)}%\n${value.note}`;
        } else if (tool === 'apy') {
          value = apyContribution({ age: read('age'), pension: read('pension'), frequency: read('frequency'), indianCitizen: read('indianCitizen'), savingsAccount: read('savingsAccount'), incomeTaxPayer: read('incomeTaxPayer') });
          result.textContent = value.eligible ? `Prescribed ${value.period} contribution: ₹${value.contribution}\nVesting period: ${value.vestingYears} years\nGuaranteed monthly pension from age 60: ₹${value.pension}\nIndicative nominee corpus: ₹${value.nomineeCorpus.toLocaleString('en-IN')}\n${value.note}` : `Basic new-enrolment screen: not eligible\n${value.note}`;
        }
        error.textContent = '';
      } catch (e) {
        result.textContent = '';
        error.textContent = e.message;
      }
    };
    form.addEventListener('submit', event => { event.preventDefault(); run(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})(window);
