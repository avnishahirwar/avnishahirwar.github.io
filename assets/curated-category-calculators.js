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

  function wholeNumber(raw, label, minimum, maximum) {
    const value = number(raw, label);
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      fail(`${label} must be a whole number from ${minimum} to ${maximum}.`);
    }
    return value;
  }

  function calculateCricketTemperature(raw) {
    const chirps = wholeNumber(raw.chirps, '15-second chirp count', 0, 1000);
    const fahrenheit = chirps + 40;
    return { chirps, fahrenheit, celsius: (fahrenheit - 32) * 5 / 9, convention: 'NOAA: 15-second count + 40°F' };
  }

  function calculateCountersinkDepth(raw) {
    const majorDiameter = number(raw.majorDiameter, 'Countersink diameter');
    const pilotDiameter = number(raw.pilotDiameter, 'Pilot-hole diameter');
    const angleDegrees = number(raw.angleDegrees, 'Included angle');
    if (majorDiameter <= 0 || pilotDiameter <= 0 || majorDiameter <= pilotDiameter) fail('Use positive diameters, with countersink diameter larger than pilot-hole diameter.');
    if (angleDegrees <= 0 || angleDegrees >= 180) fail('Included angle must be greater than 0° and less than 180°.');
    const depth = (majorDiameter - pilotDiameter) / (2 * Math.tan(angleDegrees * Math.PI / 360));
    return { majorDiameter, pilotDiameter, angleDegrees, depth };
  }

  function calculateInchPounds(raw) {
    const inchPounds = number(raw, 'Torque in lbf·in');
    return { inchPounds, footPounds: inchPounds / 12 };
  }

  function calculateDollarWords(raw) {
    const text = String(raw ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) fail('Enter a non-negative USD amount with no more than two decimal places (no commas).');
    const [whole, fraction = ''] = text.split('.');
    const dollars = BigInt(whole);
    if (dollars > 999999999999n) fail('The supported maximum is $999,999,999,999.99.');
    const cents = Number((fraction + '00').slice(0, 2));
    const small = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    const tens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    const underThousand = value => {
      let n = value;
      const words = [];
      if (n >= 100) { words.push(small[Math.floor(n / 100)], 'hundred'); n %= 100; }
      if (n >= 20) { words.push(tens[Math.floor(n / 10)]); if (n % 10) words.push(small[n % 10]); }
      else if (n > 0 || words.length === 0) words.push(small[n]);
      return words.join(' ');
    };
    const integerWords = value => {
      if (value === 0n) return 'zero';
      let remaining = value;
      const scales = ['', 'thousand', 'million', 'billion'];
      const groups = [];
      let scale = 0;
      while (remaining > 0n) {
        const group = Number(remaining % 1000n);
        if (group) groups.unshift(`${underThousand(group)}${scales[scale] ? ` ${scales[scale]}` : ''}`);
        remaining /= 1000n;
        scale += 1;
      }
      return groups.join(' ');
    };
    const dollarWords = integerWords(dollars);
    const centWords = integerWords(BigInt(cents));
    return { amount: text, dollars: dollars.toString(), cents, dollarWords, centWords, checkStyle: `${dollarWords} ${dollars === 1n ? 'dollar' : 'dollars'} and ${String(cents).padStart(2, '0')}/100`, spokenStyle: `${dollarWords} ${dollars === 1n ? 'dollar' : 'dollars'} and ${centWords} ${cents === 1 ? 'cent' : 'cents'}` };
  }

  function calculateGmroi(raw) {
    const netSales = number(raw.netSales, 'Net sales');
    const cogs = number(raw.cogs, 'Cost of goods sold');
    const beginningInventory = number(raw.beginningInventory, 'Beginning inventory at cost');
    const endingInventory = number(raw.endingInventory, 'Ending inventory at cost');
    if (netSales < 0 || cogs < 0 || beginningInventory < 0 || endingInventory < 0) fail('Sales, COGS and inventory amounts cannot be negative.');
    const averageInventory = (beginningInventory + endingInventory) / 2;
    if (averageInventory <= 0) fail('Average inventory at cost must be greater than zero.');
    const grossMargin = netSales - cogs;
    const gmroi = grossMargin / averageInventory;
    return { netSales, cogs, beginningInventory, endingInventory, averageInventory, grossMargin, gmroi, gmroiPercent: gmroi * 100 };
  }

  function calculateButterConversion(raw) {
    const amount = number(raw.amount, 'Butter quantity');
    if (amount < 0) fail('Butter quantity cannot be negative.');
    const unit = String(raw.unit ?? 'sticks');
    const sticksPerUnit = { sticks: 1, cups: 2, tablespoons: 1 / 8, ounces: 1 / 4, grams: 1 / 113.4 };
    if (!Object.hasOwn(sticksPerUnit, unit)) fail('Choose sticks, US cups, tablespoons, weight ounces or grams.');
    const sticks = amount * sticksPerUnit[unit];
    return { amount, unit, sticks, cups: sticks / 2, tablespoons: sticks * 8, weightOunces: sticks * 4, grams: sticks * 113.4 };
  }

  function calculateBri(raw) {
    const waistCm = number(raw.waistCm, 'Waist circumference');
    const heightCm = number(raw.heightCm, 'Height');
    if (waistCm <= 0 || heightCm <= 0) fail('Waist circumference and height must be greater than zero.');
    const ratio = Math.pow(waistCm / (2 * Math.PI), 2) / Math.pow(0.5 * heightCm, 2);
    if (ratio >= 1) fail('These dimensions are outside the real-valued range of the BRI equation.');
    return { waistCm, heightCm, ratio, bri: 364.2 - 365.5 * Math.sqrt(1 - ratio) };
  }

  function calculateModularInverse(raw) {
    const aText = String(raw.a ?? '').trim();
    const modulusText = String(raw.modulus ?? '').trim();
    if (!/^[+-]?\d+$/.test(aText) || !/^\d+$/.test(modulusText)) fail('Enter integers for a and a positive modulus.');
    const a = BigInt(aText);
    const modulus = BigInt(modulusText);
    if (modulus <= 1n || modulus > 1000000000000n || (a < 0n ? -a : a) > 1000000000000n) fail('Use a modulus from 2 to 1,000,000,000,000 and |a| no greater than 1,000,000,000,000.');
    const egcd = (x, y) => {
      if (y === 0n) return [x, 1n, 0n];
      const [g, u, v] = egcd(y, x % y);
      return [g, v, u - (x / y) * v];
    };
    let [gcd, coefficient] = egcd(a, modulus);
    if (gcd < 0n) { gcd = -gcd; coefficient = -coefficient; }
    if (gcd !== 1n) fail(`No multiplicative inverse exists because gcd(a, modulus) = ${gcd}.`);
    const inverse = ((coefficient % modulus) + modulus) % modulus;
    return { a: a.toString(), modulus: modulus.toString(), gcd: gcd.toString(), inverse: inverse.toString(), verification: (((a % modulus + modulus) % modulus) * inverse % modulus).toString() };
  }

  function calculateGsd(raw) {
    const heightM = number(raw.heightM, 'Height above ground');
    const sensorWidthMm = number(raw.sensorWidthMm, 'Sensor width');
    const focalLengthMm = number(raw.focalLengthMm, 'Actual focal length');
    const imageWidthPx = number(raw.imageWidthPx, 'Image width in pixels');
    if (heightM <= 0 || sensorWidthMm <= 0 || focalLengthMm <= 0 || imageWidthPx <= 0) fail('Height, sensor width, focal length and image width must be greater than zero.');
    if (!Number.isInteger(imageWidthPx) || imageWidthPx > 100000000) fail('Image width must be a whole number up to 100,000,000 pixels.');
    const cmPerPixel = heightM * sensorWidthMm * 100 / (focalLengthMm * imageWidthPx);
    return { heightM, sensorWidthMm, focalLengthMm, imageWidthPx, cmPerPixel, mPerPixel: cmPerPixel / 100, inchesPerPixel: cmPerPixel / 2.54 };
  }

  function calculateImpulseMomentum(raw) {
    const mass = number(raw.mass, 'Mass');
    const initialVelocity = number(raw.initialVelocity, 'Initial velocity');
    const finalVelocity = number(raw.finalVelocity, 'Final velocity');
    if (mass <= 0) fail('Mass must be greater than zero.');
    const initialMomentum = mass * initialVelocity;
    const finalMomentum = mass * finalVelocity;
    const impulse = finalMomentum - initialMomentum;
    const timeText = String(raw.deltaTime ?? '').trim();
    let deltaTime = null;
    let averageForce = null;
    if (timeText) {
      deltaTime = number(timeText, 'Elapsed time');
      if (deltaTime <= 0) fail('Elapsed time must be greater than zero when supplied.');
      averageForce = impulse / deltaTime;
    }
    return { mass, initialVelocity, finalVelocity, initialMomentum, finalMomentum, impulse, deltaTime, averageForce };
  }

  function calculateOps(raw) {
    const count = (key, label) => wholeNumber(raw[key], label, 0, 10000000);
    const atBats = count('atBats', 'At-bats');
    const singles = count('singles', 'Singles');
    const doubles = count('doubles', 'Doubles');
    const triples = count('triples', 'Triples');
    const homeRuns = count('homeRuns', 'Home runs');
    const walks = count('walks', 'Walks');
    const hitByPitch = count('hitByPitch', 'Hit by pitch');
    const sacrificeFlies = count('sacrificeFlies', 'Sacrifice flies');
    if (atBats <= 0) fail('At-bats must be greater than zero to calculate slugging percentage.');
    const hits = singles + doubles + triples + homeRuns;
    if (hits > atBats) fail('Total hits cannot exceed at-bats.');
    const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
    const obpDenominator = atBats + walks + hitByPitch + sacrificeFlies;
    const onBasePercentage = (hits + walks + hitByPitch) / obpDenominator;
    const sluggingPercentage = totalBases / atBats;
    return { atBats, singles, doubles, triples, homeRuns, walks, hitByPitch, sacrificeFlies, hits, totalBases, onBasePercentage, sluggingPercentage, ops: onBasePercentage + sluggingPercentage };
  }

  function calculateCoinTossStreak(raw) {
    const tosses = wholeNumber(raw.tosses, 'Number of tosses', 0, 10000);
    const streak = wholeNumber(raw.streak, 'Target heads streak', 1, 100);
    const headsProbability = number(raw.headsProbability, 'Probability of heads');
    if (headsProbability < 0 || headsProbability > 1) fail('Probability of heads must be from 0 to 1.');
    if (streak > tosses) return { tosses, streak, headsProbability, probability: 0 };
    let states = Array(streak).fill(0);
    states[0] = 1;
    let hitProbability = 0;
    for (let toss = 0; toss < tosses; toss += 1) {
      const next = Array(streak).fill(0);
      for (let trailingHeads = 0; trailingHeads < streak; trailingHeads += 1) {
        const stateProbability = states[trailingHeads];
        next[0] += stateProbability * (1 - headsProbability);
        if (trailingHeads + 1 < streak) next[trailingHeads + 1] += stateProbability * headsProbability;
        else hitProbability += stateProbability * headsProbability;
      }
      states = next;
    }
    return { tosses, streak, headsProbability, probability: Math.max(0, Math.min(1, hitProbability)) };
  }

  const api = { calculateGdu, calculateConcreteTube, calculateCroreToMillion, calculateFlightEmissions, calculateAverageCollectionPeriod, calculateAbv, calculateBai, calculateDistributive, calculatePert, calculateTimeOfFlight, calculateEra, calculateFrequencyDistribution, calculateCricketTemperature, calculateCountersinkDepth, calculateInchPounds, calculateDollarWords, calculateGmroi, calculateButterConversion, calculateBri, calculateModularInverse, calculateGsd, calculateImpulseMomentum, calculateOps, calculateCoinTossStreak, format };

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
  const extendedRenderers = {
    'cricket-thermometer': () => { const r = calculateCricketTemperature({ chirps: value('chirps') }); renderSimple(output, 'Cricket chirp temperature estimate', `${format(r.fahrenheit)}°F (${format(r.celsius, 6)}°C), using the NOAA +40°F convention.`, [['15-second chirp count', r.chirps], ['NOAA rule', `${r.chirps} + 40 = ${r.fahrenheit}°F`], ['Converted temperature', `${format(r.celsius, 6)}°C`]]); },
    'countersink-depth': () => { const r = calculateCountersinkDepth({ majorDiameter: value('majorDiameter'), pilotDiameter: value('pilotDiameter'), angleDegrees: value('angleDegrees') }); renderSimple(output, 'Ideal countersink depth', `${format(r.depth)} ${value('lengthUnit')}.`, [['Countersink diameter', `${format(r.majorDiameter)} ${value('lengthUnit')}`], ['Pilot-hole diameter', `${format(r.pilotDiameter)} ${value('lengthUnit')}`], ['Included angle', `${format(r.angleDegrees)}°`], ['Ideal geometric depth', `${format(r.depth)} ${value('lengthUnit')}`]]); },
    'inch-foot-torque': () => { const r = calculateInchPounds(value('inchPounds')); renderSimple(output, 'Torque conversion', `${format(r.inchPounds)} lbf·in = ${format(r.footPounds)} lbf·ft.`, [['Input', `${format(r.inchPounds)} lbf·in`], ['Equivalent', `${format(r.footPounds)} lbf·ft`], ['Exact factor', '12 lbf·in = 1 lbf·ft']]); },
    'dollars-words': () => { const r = calculateDollarWords(value('amount')); renderSimple(output, 'USD amount in words', r.checkStyle, [['Check-style wording', r.checkStyle], ['Spoken wording', r.spokenStyle], ['Entered amount', `$${r.amount}`]]); },
    'gmroi': () => { const r = calculateGmroi({ netSales: value('netSales'), cogs: value('cogs'), beginningInventory: value('beginningInventory'), endingInventory: value('endingInventory') }); renderSimple(output, 'Gross margin return on inventory investment', `${format(r.gmroi, 8)} GMROI (${format(r.gmroiPercent, 6)}%).`, [['Gross margin dollars', format(r.grossMargin)], ['Average inventory at cost', format(r.averageInventory)], ['GMROI', `${format(r.gmroi, 8)}× or ${format(r.gmroiPercent, 6)}%`]]); },
    'butter-stick': () => { const r = calculateButterConversion({ amount: value('amount'), unit: value('unit') }); renderSimple(output, 'US butter measurement conversion', `${format(r.sticks)} stick(s) ≈ ${format(r.grams, 6)} g.`, [['Sticks', format(r.sticks)], ['US cups', format(r.cups)], ['Tablespoons', format(r.tablespoons)], ['Weight ounces', format(r.weightOunces)], ['Approximate grams', format(r.grams, 6)]]); },
    'bri': () => { const r = calculateBri({ waistCm: value('waistCm'), heightCm: value('heightCm') }); renderSimple(output, 'Body Roundness Index (BRI)', `${format(r.bri, 6)} index points. Educational index only; not a diagnosis or health assessment.`, [['Waist circumference', `${format(r.waistCm)} cm`], ['Height', `${format(r.heightCm)} cm`], ['BRI', `${format(r.bri, 6)} points`]]); },
    'modular-inverse': () => { const r = calculateModularInverse({ a: value('a'), modulus: value('modulus') }); renderSimple(output, 'Multiplicative inverse modulo m', `${r.inverse} is the inverse of ${r.a} modulo ${r.modulus}.`, [['a', r.a], ['Modulus m', r.modulus], ['Inverse x', r.inverse], ['Verification (a × x) mod m', r.verification]]); },
    'gsd': () => { const r = calculateGsd({ heightM: value('heightM'), sensorWidthMm: value('sensorWidthMm'), focalLengthMm: value('focalLengthMm'), imageWidthPx: value('imageWidthPx') }); renderSimple(output, 'Nominal ground sample distance', `${format(r.cmPerPixel, 8)} cm/pixel.`, [['Height above ground', `${format(r.heightM)} m`], ['Sensor width / focal length', `${format(r.sensorWidthMm)} mm / ${format(r.focalLengthMm)} mm`], ['Image width', `${format(r.imageWidthPx)} px`], ['GSD', `${format(r.cmPerPixel, 8)} cm/px (${format(r.inchesPerPixel, 8)} in/px)`]]); },
    'impulse-momentum': () => { const r = calculateImpulseMomentum({ mass: value('mass'), initialVelocity: value('initialVelocity'), finalVelocity: value('finalVelocity'), deltaTime: value('deltaTime') }); const rows = [['Initial momentum', `${format(r.initialMomentum)} kg·m/s`], ['Final momentum', `${format(r.finalMomentum)} kg·m/s`], ['Impulse / change in momentum', `${format(r.impulse)} N·s`]]; if (r.averageForce !== null) rows.push(['Average net force', `${format(r.averageForce)} N over ${format(r.deltaTime)} s`]); renderSimple(output, 'One-dimensional momentum and impulse', `${format(r.impulse)} N·s change in momentum${r.averageForce === null ? '' : `; average net force ${format(r.averageForce)} N`}.`, rows); },
    'ops': () => { const r = calculateOps({ atBats: value('atBats'), singles: value('singles'), doubles: value('doubles'), triples: value('triples'), homeRuns: value('homeRuns'), walks: value('walks'), hitByPitch: value('hitByPitch'), sacrificeFlies: value('sacrificeFlies') }); renderSimple(output, 'On-base plus slugging (OPS)', `${format(r.ops, 8)} OPS.`, [['Hits', `${r.hits} in ${r.atBats} at-bats`], ['On-base percentage (OBP)', format(r.onBasePercentage, 8)], ['Slugging percentage (SLG)', format(r.sluggingPercentage, 8)], ['OPS = OBP + SLG', format(r.ops, 8)]]); },
    'coin-toss-streak': () => { const r = calculateCoinTossStreak({ tosses: value('tosses'), streak: value('streak'), headsProbability: value('headsProbability') }); renderSimple(output, 'Probability of at least one heads streak', `${format(r.probability * 100, 8)}%`, [['Tosses', r.tosses], ['Consecutive heads target', r.streak], ['Heads probability per toss', `${format(r.headsProbability * 100, 6)}%`], ['At least one target run', `${format(r.probability * 100, 8)}%`]]); }
  };

    const run = {
      ...extendedRenderers,
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
