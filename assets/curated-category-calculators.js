(function (root) {
  'use strict';

  const fail = message => { throw new Error(message); };
  const numericToken = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

  function number(raw, label) {
    const text = String(raw ?? '').trim();
    if (!numericToken.test(text)) fail(`${label} must be a finite number.`);
    const value = Number(text);
    if (!Number.isFinite(value)) fail(`${label} is outside the supported numeric range.`);
    return value;
  }

  function numberList(raw, label, maximum = 100) {
    const text = String(raw ?? '').trim();
    if (!text) fail(`Enter at least one ${label}.`);
    if (text.length > 5000) fail(`${label} input is too long (maximum 5,000 characters).`);
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length || tokens.length > maximum) fail(`Enter from 1 to ${maximum} ${label}.`);
    return tokens.map(token => number(token, label));
  }

  function format(value, digits = 10) {
    if (!Number.isFinite(value)) return 'not finite';
    if (value === 0 || Object.is(value, -0)) return '0';
    return Number(value.toPrecision(digits)).toString();
  }

  function calculateGdu(raw) {
    const highs = numberList(raw.highs, 'daily maximum temperatures', 90);
    const lows = numberList(raw.lows, 'daily minimum temperatures', 90);
    if (highs.length !== lows.length) fail('Enter the same number of daily highs and lows.');
    const base = number(raw.base, 'Base temperature');
    const capText = String(raw.upperCap ?? '').trim();
    const upperCap = capText ? number(capText, 'Upper temperature cutoff') : null;
    if (upperCap !== null && upperCap < base) fail('The upper cutoff cannot be below the base temperature.');
    const days = highs.map((high, index) => {
      const low = lows[index];
      if (high < low) fail(`Day ${index + 1}: daily maximum must be at least the daily minimum.`);
      const adjustedHigh = upperCap === null ? high : Math.min(high, upperCap);
      const adjustedLow = Math.max(low, base);
      const daily = Math.max(0, ((adjustedHigh + adjustedLow) / 2) - base);
      return { day: index + 1, high, low, adjustedHigh, adjustedLow, daily };
    });
    return { base, upperCap, days, total: days.reduce((sum, day) => sum + day.daily, 0) };
  }

  function calculateConcreteTube(raw) {
    const diameterIn = number(raw.diameterIn, 'Inside diameter');
    const lengthFt = number(raw.lengthFt, 'Fill length');
    const tubeCount = number(raw.tubeCount, 'Number of tubes');
    const allowancePercent = number(raw.allowancePercent, 'Allowance');
    if (diameterIn <= 0 || lengthFt <= 0) fail('Inside diameter and fill length must be greater than zero.');
    if (!Number.isInteger(tubeCount) || tubeCount < 1 || tubeCount > 10000) fail('Enter a whole number of tubes from 1 to 10,000.');
    if (allowancePercent < 0 || allowancePercent > 100) fail('Allowance must be from 0% to 100%.');
    const radiusFt = diameterIn / 24;
    const oneTubeFt3 = Math.PI * radiusFt * radiusFt * lengthFt;
    const geometricFt3 = oneTubeFt3 * tubeCount;
    const allowanceFt3 = geometricFt3 * allowancePercent / 100;
    return { diameterIn, lengthFt, tubeCount, allowancePercent, oneTubeFt3, geometricFt3, geometricYd3: geometricFt3 / 27, allowanceFt3, totalWithAllowanceFt3: geometricFt3 + allowanceFt3, totalWithAllowanceYd3: (geometricFt3 + allowanceFt3) / 27 };
  }

  function calculateCroreToMillion(rawAmount) {
    const crore = number(rawAmount, 'Amount in crore');
    return { crore, million: crore * 10, underlyingCount: crore * 10000000 };
  }

  function calculateFlightEmissions(raw) {
    const distanceKm = number(raw.distanceKm, 'Passenger distance');
    const factor = number(raw.factor, 'Emission factor');
    const factorNotes = String(raw.factorNotes ?? '').trim();
    if (distanceKm < 0 || factor < 0) fail('Distance and emission factor cannot be negative.');
    if (!factorNotes) fail('Enter the source or scope for the emission factor, or label it as an illustrative example.');
    return { distanceKm, factor, factorNotes, emissionsKg: distanceKm * factor, emissionsTonnes: (distanceKm * factor) / 1000 };
  }

  function calculateAverageCollectionPeriod(raw) {
    const beginningReceivables = number(raw.beginningReceivables, 'Beginning accounts receivable');
    const endingReceivables = number(raw.endingReceivables, 'Ending accounts receivable');
    const netCreditSales = number(raw.netCreditSales, 'Net credit sales');
    const periodDays = number(raw.periodDays, 'Period length');
    if (beginningReceivables < 0 || endingReceivables < 0) fail('Accounts-receivable balances cannot be negative.');
    if (netCreditSales <= 0) fail('Net credit sales must be greater than zero.');
    if (periodDays <= 0 || periodDays > 3660) fail('Period length must be greater than zero and no more than 3,660 days.');
    const averageReceivables = (beginningReceivables + endingReceivables) / 2;
    return { beginningReceivables, endingReceivables, averageReceivables, netCreditSales, periodDays, days: (averageReceivables / netCreditSales) * periodDays };
  }

  function calculateAbv(raw) {
    const originalGravity = number(raw.originalGravity, 'Original gravity');
    const finalGravity = number(raw.finalGravity, 'Final gravity');
    if (finalGravity <= 0 || originalGravity <= finalGravity || originalGravity >= 1.775) {
      fail('Enter positive specific-gravity readings with original gravity greater than final gravity and below 1.775.');
    }
    const alcoholByWeight = 76.08 * (originalGravity - finalGravity) / (1.775 - originalGravity);
    const abvPercent = alcoholByWeight * (finalGravity / 0.794);
    const shortcutPercent = (originalGravity - finalGravity) * 131.25;
    if (!Number.isFinite(abvPercent) || !Number.isFinite(shortcutPercent)) fail('These gravity values produce a result outside the supported range.');
    return { originalGravity, finalGravity, alcoholByWeight, abvPercent, shortcutPercent };
  }

  function calculateBai(raw) {
    const hipCm = number(raw.hipCm, 'Hip circumference');
    const heightCm = number(raw.heightCm, 'Height');
    if (hipCm <= 0 || heightCm <= 0) fail('Hip circumference and height must be greater than zero.');
    const heightM = heightCm / 100;
    return { hipCm, heightCm, heightM, bai: hipCm / Math.pow(heightM, 1.5) - 18 };
  }

  function calculateDistributive(raw) {
    const multiplier = number(raw.multiplier, 'Multiplier');
    const terms = numberList(raw.terms, 'numeric terms', 20);
    const products = terms.map(term => multiplier * term);
    return { multiplier, terms, products, total: products.reduce((sum, value) => sum + value, 0) };
  }

  function calculatePert(raw) {
    const optimistic = number(raw.optimistic, 'Optimistic estimate');
    const mostLikely = number(raw.mostLikely, 'Most-likely estimate');
    const pessimistic = number(raw.pessimistic, 'Pessimistic estimate');
    if (optimistic < 0 || mostLikely < optimistic || pessimistic < mostLikely) {
      fail('Use non-negative estimates in order: optimistic ≤ most likely ≤ pessimistic.');
    }
    const expected = (optimistic + 4 * mostLikely + pessimistic) / 6;
    return { optimistic, mostLikely, pessimistic, expected, unit: String(raw.unit ?? 'days') };
  }

  function calculateTimeOfFlight(raw) {
    const speed = number(raw.speed, 'Initial speed');
    const angleDegrees = number(raw.angleDegrees, 'Launch angle');
    const gravity = number(raw.gravity, 'Gravitational acceleration');
    if (speed < 0) fail('Initial speed cannot be negative.');
    if (angleDegrees < 0 || angleDegrees > 90) fail('Launch angle must be between 0° and 90° above the horizontal.');
    if (gravity <= 0) fail('Gravitational acceleration must be greater than zero.');
    const seconds = (2 * speed * Math.sin(angleDegrees * Math.PI / 180)) / gravity;
    return { speed, angleDegrees, gravity, seconds };
  }

  function calculateEra(raw) {
    const earnedRuns = number(raw.earnedRuns, 'Earned runs');
    const outs = number(raw.outs, 'Outs recorded');
    if (!Number.isInteger(earnedRuns) || earnedRuns < 0) fail('Earned runs must be a non-negative whole number.');
    if (!Number.isInteger(outs) || outs < 0) fail('Outs recorded must be a non-negative whole number.');
    if (outs === 0) return { earnedRuns, outs, defined: false, era: null };
    return { earnedRuns, outs, defined: true, era: (earnedRuns * 27) / outs };
  }

  function calculateFrequencyDistribution(raw) {
    const text = String(raw ?? '').trim();
    if (!text) fail('Enter at least one observation.');
    if (text.length > 10000) fail('Keep the dataset to 10,000 characters or fewer.');
    const tokens = text.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
    if (!tokens.length) fail('Enter at least one observation.');
    if (tokens.length > 1000) fail('Enter no more than 1,000 observations.');
    const allNumeric = tokens.every(token => numericToken.test(token) && Number.isFinite(Number(token)));
    let values;
    if (allNumeric) {
      const counts = new Map();
      tokens.forEach(token => {
        const value = Number(token);
        const normalized = value === 0 ? 0 : value;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      });
      values = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, frequency]) => ({ value: format(value), frequency, numericValue: value }));
    } else {
      const counts = new Map();
      tokens.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));
      values = [...counts.entries()].map(([value, frequency]) => ({ value, frequency, numericValue: null }));
    }
    const total = tokens.length;
    let cumulative = 0;
    const rows = values.map(item => {
      cumulative += item.frequency;
      return { ...item, relativeFrequency: item.frequency / total, percentage: (item.frequency / total) * 100, cumulativeFrequency: allNumeric ? cumulative : null, cumulativeRelativeFrequency: allNumeric ? cumulative / total : null };
    });
    return { numeric: allNumeric, total, rows };
  }

  const api = { calculateGdu, calculateConcreteTube, calculateCroreToMillion, calculateFlightEmissions, calculateAverageCollectionPeriod, calculateAbv, calculateBai, calculateDistributive, calculatePert, calculateTimeOfFlight, calculateEra, calculateFrequencyDistribution, format };

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function table(container, headings, rows) {
    const result = el('table', null, 'mc-result-table');
    const thead = el('thead');
    const header = el('tr');
    headings.forEach(label => header.appendChild(el('th', label)));
    thead.appendChild(header);
    const tbody = el('tbody');
    rows.forEach(values => {
      const tr = el('tr');
      values.forEach(value => tr.appendChild(el('td', value)));
      tbody.appendChild(tr);
    });
    result.append(thead, tbody);
    container.appendChild(result);
  }

  function summary(container, text) { container.appendChild(el('p', text, 'mc-result-summary')); }

  function renderGdu(container, result, unit) {
    container.appendChild(el('h2', 'Growing degree units'));
    summary(container, `Accumulated GDU: ${format(result.total)} ${unit === 'F' ? '°F·day' : '°C·day'} across ${result.days.length} day(s).`);
    table(container, ['Day', 'High', 'Low', 'Adjusted high', 'Adjusted low', 'GDU'], result.days.map(day => [day.day, `${format(day.high)}°${unit}`, `${format(day.low)}°${unit}`, `${format(day.adjustedHigh)}°${unit}`, `${format(day.adjustedLow)}°${unit}`, format(day.daily)]));
    container.appendChild(el('p', `Base temperature: ${format(result.base)}°${unit}; upper cutoff: ${result.upperCap === null ? 'none' : `${format(result.upperCap)}°${unit}`}.`, 'mc-caveat'));
  }

  function renderConcrete(container, r) {
    container.appendChild(el('h2', 'Concrete volume estimate'));
    summary(container, `${format(r.geometricFt3)} ft³ (${format(r.geometricYd3)} yd³) geometric volume for ${r.tubeCount} tube(s).`);
    table(container, ['Measure', 'Result'], [['One tube', `${format(r.oneTubeFt3)} ft³`], ['All tubes before allowance', `${format(r.geometricFt3)} ft³ (${format(r.geometricYd3)} yd³)`], [`User-entered allowance (${format(r.allowancePercent)}%)`, `${format(r.allowanceFt3)} ft³`], ['Total including allowance', `${format(r.totalWithAllowanceFt3)} ft³ (${format(r.totalWithAllowanceYd3)} yd³)`]]);
  }

  function renderSimple(container, title, result, rows) {
    container.appendChild(el('h2', title));
    if (result) summary(container, result);
    table(container, ['Measure', 'Result'], rows);
  }

  function renderFrequency(container, r) {
    container.appendChild(el('h2', 'Frequency distribution'));
    summary(container, `${r.total} observation(s), ${r.rows.length} distinct value(s)/category(ies).`);
    const headings = r.numeric ? ['Value', 'Frequency', 'Relative frequency', 'Percent', 'Cumulative frequency', 'Cumulative relative frequency'] : ['Category', 'Frequency', 'Relative frequency', 'Percent'];
    const rows = r.rows.map(item => r.numeric
      ? [item.value, item.frequency, format(item.relativeFrequency), `${format(item.percentage)}%`, item.cumulativeFrequency, format(item.cumulativeRelativeFrequency)]
      : [item.value, item.frequency, format(item.relativeFrequency), `${format(item.percentage)}%`]);
    table(container, headings, rows);
    if (!r.numeric) container.appendChild(el('p', 'Cumulative columns are omitted for nominal text categories because they have no inherent order.', 'mc-caveat'));
  }

  function init() {
    const form = document.getElementById('calcForm');
    const status = document.getElementById('calcStatus');
    const output = document.getElementById('calcResults');
    const key = document.body?.dataset?.calculator;
    if (!form || !status || !output || !key) return;
    const value = name => form.elements[name]?.value ?? '';
    const run = {
      'gdu': () => renderGdu(output, calculateGdu({ highs: value('highs'), lows: value('lows'), base: value('base'), upperCap: value('upperCap') }), value('unit')),
      'concrete-tube': () => { const r = calculateConcreteTube({ diameterIn: value('diameterIn'), lengthFt: value('lengthFt'), tubeCount: value('tubeCount'), allowancePercent: value('allowancePercent') }); renderConcrete(output, r); },
      'crore-million': () => { const r = calculateCroreToMillion(value('crore')); renderSimple(output, 'Crore to million conversion', `${format(r.crore)} crore = ${format(r.million)} million.`, [['Amount in crore', format(r.crore)], ['Equivalent amount in million', format(r.million)], ['Underlying count', format(r.underlyingCount)]]); },
      'flight-carbon': () => { const r = calculateFlightEmissions({ distanceKm: value('distanceKm'), factor: value('factor'), factorNotes: value('factorNotes') }); renderSimple(output, 'Distance-based flight emissions estimate', `${format(r.emissionsKg)} kg CO₂e (${format(r.emissionsTonnes)} t CO₂e), using the entered factor.`, [['Passenger distance', `${format(r.distanceKm)} passenger-km`], ['User-entered factor', `${format(r.factor)} kg CO₂e per passenger-km`], ['Factor source/scope note', r.factorNotes]]); },
      'collection-period': () => { const r = calculateAverageCollectionPeriod({ beginningReceivables: value('beginningReceivables'), endingReceivables: value('endingReceivables'), netCreditSales: value('netCreditSales'), periodDays: value('periodDays') }); renderSimple(output, 'Average collection period', `${format(r.days)} days.`, [['Average accounts receivable', format(r.averageReceivables)], ['Net credit sales for the period', format(r.netCreditSales)], ['Period length', `${format(r.periodDays)} days`]]); },
      'abv': () => { const r = calculateAbv({ originalGravity: value('originalGravity'), finalGravity: value('finalGravity') }); renderSimple(output, 'Estimated alcohol by volume', `${format(r.abvPercent, 6)}% ABV (gravity-based estimate).`, [['Alcohol by weight (intermediate)', `${format(r.alcoholByWeight, 6)}% ABW`], ['Primary ABV estimate', `${format(r.abvPercent, 6)}%`], ['Quick linear approximation', `${format(r.shortcutPercent, 6)}% (approximate)`]]); },
      'bai': () => { const r = calculateBai({ hipCm: value('hipCm'), heightCm: value('heightCm') }); renderSimple(output, 'Body Adiposity Index (BAI) estimate', `${format(r.bai, 6)} BAI points. This is an index estimate, not a body-fat measurement or diagnosis.`, [['Hip circumference', `${format(r.hipCm)} cm`], ['Height', `${format(r.heightCm)} cm (${format(r.heightM)} m)`], ['BAI index', `${format(r.bai, 6)} points`]]); },
      'distributive': () => { const r = calculateDistributive({ multiplier: value('multiplier'), terms: value('terms') }); const expanded = r.products.map((product, i) => `${format(r.multiplier)} × ${format(r.terms[i])} = ${format(product)}`).join('; '); renderSimple(output, 'Distributive expansion', `${format(r.multiplier)} × (${r.terms.map(value => format(value)).join(' + ')}) = ${r.products.map(value => format(value)).join(' + ')} = ${format(r.total)}.`, [['Term-by-term products', expanded], ['Evaluated total', format(r.total)]]); },
      'pert': () => { const r = calculatePert({ optimistic: value('optimistic'), mostLikely: value('mostLikely'), pessimistic: value('pessimistic'), unit: value('unit') }); renderSimple(output, 'PERT expected activity duration', `${format(r.expected)} ${r.unit}.`, [['Optimistic estimate (O)', `${format(r.optimistic)} ${r.unit}`], ['Most-likely estimate (M)', `${format(r.mostLikely)} ${r.unit}`], ['Pessimistic estimate (P)', `${format(r.pessimistic)} ${r.unit}`], ['Weighted expected duration', `${format(r.expected)} ${r.unit}`]]); },
      'time-flight': () => { const r = calculateTimeOfFlight({ speed: value('speed'), angleDegrees: value('angleDegrees'), gravity: value('gravity') }); renderSimple(output, 'Idealized time of flight', `${format(r.seconds, 8)} seconds.`, [['Initial speed', `${format(r.speed)} m/s`], ['Launch angle', `${format(r.angleDegrees)}° above horizontal`], ['Gravity magnitude', `${format(r.gravity)} m/s²`], ['Time in air', `${format(r.seconds, 8)} s`]]); },
      'era': () => { const r = calculateEra({ earnedRuns: value('earnedRuns'), outs: value('outs') }); if (!r.defined) { output.appendChild(el('h2', 'Earned Run Average')); summary(output, 'ERA is undefined because no outs have been recorded.'); return; } renderSimple(output, 'Earned Run Average (ERA)', `${format(r.era, 8)} runs per nine innings (rounded display: ${format(r.era, 4)}).`, [['Earned runs charged to pitcher', r.earnedRuns], ['Outs recorded', `${r.outs} (${Math.floor(r.outs / 3)} innings and ${r.outs % 3} out(s))`], ['ERA', format(r.era, 8)]]); },
      'frequency-distribution': () => renderFrequency(output, calculateFrequencyDistribution(value('dataset')))
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
  if (root) root.FCCuratedCalculators = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})(typeof window !== 'undefined' ? window : null);
