(function (root) {
  'use strict';

  const chocolateMgPerGram = {
    cocoaPowder: 28.5,
    baking: 15.5,
    dark: 5.6,
    milk: 2.3,
    cocoaHulls: 9,
    white: 0.04
  };

  function number(value) {
    if (value === '' || value === null || value === undefined) return NaN;
    return Number(value);
  }

  function validPositive(value, maximum) {
    return Number.isFinite(value) && value > 0 && (!maximum || value <= maximum);
  }

  function result(rows, warnings) {
    return { rows, warnings: warnings || [] };
  }

  function invalid(message) {
    return { rows: [], warnings: [], error: message };
  }

  function parseISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function iso(date) {
    return date.toISOString().slice(0, 10);
  }

  function localDateISO() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function addDays(date, days) {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function addMonths(date, months) {
    const day = date.getUTCDate();
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
    const finalDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(day, finalDay));
    return first;
  }

  function poundsToKg(lb) {
    return lb / 2.2046226218;
  }

  function sheepGestation(v) {
    const mating = parseISODate(v.matingDate);
    if (!mating) return invalid('Enter a valid recorded mating/service date.');
    return result([
      { label: 'Estimated lambing date (147-day average)', value: iso(addDays(mating, 147)), unit: '' },
      { label: 'Illustrative lambing window begins (144 days)', value: iso(addDays(mating, 144)), unit: '' },
      { label: 'Illustrative lambing window ends (151 days)', value: iso(addDays(mating, 151)), unit: '' }
    ], [
      'This is a planning estimate, not an exact due date or pregnancy confirmation. Sheep gestation varies by breed and individual; mating dates may be uncertain when rams run with a flock.',
      'Contact a veterinarian for health concerns or unusual pregnancy/lambing signs.'
    ]);
  }

  function dogAge(v) {
    const age = number(v.ageYears);
    if (!validPositive(age, 16) || age < 1) return invalid('Enter a dog age from 1 through 16 years.');
    let human;
    let method;
    if (v.method === 'methylation') {
      human = 16 * Math.log(age) + 31;
      method = 'DNA-methylation research estimate';
    } else {
      human = age <= 2 ? 15 + 9 * (age - 1) : 24 + 5 * (age - 2);
      method = 'Approximate medium-dog chart rule';
    }
    return result([{ label: 'Approximate human-age equivalent (' + method + ')', value: human.toFixed(1), unit: 'human years' }], [
      'This is a rough comparison, not a biological measurement, diagnosis, or care recommendation. The logarithmic research equation was derived from Labradors and should not be assumed to fit every breed.',
      'Dogs age nonlinearly. Breed, size, health and lifestyle affect life stage; ask a veterinarian about an individual dog.'
    ]);
  }

  function dogNutrition(v) {
    const weight = number(v.weightKg);
    if (!validPositive(weight, 150)) return invalid(v.status === 'weightLoss' ? 'Enter the veterinarian-assessed target weight in kilograms.' : 'Enter a dog weight from 0 to 150 kg.');
    const rer = 70 * Math.pow(weight, 0.75);
    const factors = {
      neutered: [1.4, 1.6, 'Neutered adult'],
      intact: [1.6, 1.8, 'Intact adult'],
      inactive: [1.0, 1.2, 'Inactive or obesity-prone adult'],
      weightLoss: [1.0, 1.0, 'Weight-management starting estimate using target weight']
    };
    const factor = factors[v.status];
    if (!factor) return invalid('Choose a supported adult life-stage category.');
    const low = rer * factor[0];
    const high = rer * factor[1];
    const rows = [
      { label: 'Resting energy requirement (RER)', value: rer.toFixed(0), unit: 'kcal/day' },
      { label: factor[2] + ' daily energy estimate', value: low === high ? low.toFixed(0) : low.toFixed(0) + '–' + high.toFixed(0), unit: 'kcal/day' }
    ];
    const energyPer100g = number(v.foodKcalPer100g);
    if (Number.isFinite(energyPer100g) && energyPer100g > 0) {
      rows.push({ label: 'Food amount at the estimated daily energy range', value: (low / energyPer100g * 100).toFixed(0) + (low === high ? '' : '–' + (high / energyPer100g * 100).toFixed(0)), unit: 'g/day (using entered kcal/100 g)' });
    }
    return result(rows, [
      'RER = 70 × body weight (kg)^0.75; daily energy uses an AAHA life-stage multiplier. These are starting estimates for healthy adult dogs, not feeding instructions or a complete diet plan.',
      'For weight management, enter only a target weight assessed with a veterinarian. Growth, pregnancy/lactation, work, illness and other special needs are not covered. Actual calorie needs can differ substantially; monitor body condition and consult a veterinarian.',
      'Food grams are arithmetic based on the energy density you entered; they do not establish nutritional adequacy and exclude treats unless you account for them.'
    ]);
  }

  function dogChocolate(v) {
    const weight = number(v.weightKg);
    const amount = number(v.amountG);
    const concentration = chocolateMgPerGram[v.chocolateType];
    if (!validPositive(weight, 150) || !validPositive(amount, 100000) || !Number.isFinite(concentration)) return invalid('Enter a valid dog weight, chocolate amount, and product type.');
    const mg = amount * concentration;
    const mgPerKg = mg / weight;
    let band = 'Below the approximate 20 mg/kg mild-sign reference band; this does NOT mean safe.';
    if (mgPerKg >= 60) band = 'At or above the approximate 60 mg/kg seizure-effect reference band.';
    else if (mgPerKg >= 40) band = 'At or above the approximate 40 mg/kg cardiotoxic-effect level; the cited range is about 40–50 mg/kg.';
    else if (mgPerKg >= 20) band = 'At or above the approximate 20 mg/kg mild-sign reference level.';
    return result([
      { label: 'Estimated methylxanthines (theobromine + caffeine)', value: mg.toFixed(1), unit: 'mg' },
      { label: 'Estimated exposure per body weight', value: mgPerKg.toFixed(2), unit: 'mg/kg' },
      { label: 'Approximate reference-band context', value: band, unit: '' }
    ], [
      'Call a veterinarian, emergency veterinary hospital, or animal poison-control service promptly for any suspected chocolate ingestion. Do not delay care to use this estimate; never use a result to rule out poisoning or declare a dose safe.',
      'Generic methylxanthine concentrations vary by brand and product. Fat/sugar, pancreatitis risk, mixed ingredients, and other toxins are not assessed. Treatment decisions belong to a veterinarian.'
    ]);
  }

  function dogHeatCycle(v) {
    const start = parseISODate(v.lastHeatStart);
    const today = parseISODate(v.today || localDateISO());
    if (!start || !today) return invalid('Enter valid calendar dates.');
    if (start.getTime() > today.getTime()) return invalid('The last heat start date cannot be in the future.');
    const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return result([
      { label: 'Days since the recorded start of the last heat', value: elapsed, unit: 'days' },
      { label: 'Illustrative population interval (5–11 months after the recorded date)', value: iso(addMonths(start, 5)) + ' to ' + iso(addMonths(start, 11)), unit: '' }
    ], [
      'The 5–11 month interval is a broad reference, not a prediction for this dog. Cycle timing and stage lengths vary; calendar dates cannot identify ovulation, fertility, pregnancy, or a safe mating date.',
      'Do not use this estimate to prevent pregnancy or schedule breeding/spaying. Ask a veterinarian for individual advice or concerning signs.'
    ]);
  }

  function vetDose(v, concentrationMgPerMl, productLabel) {
    const weight = number(v.weightKg);
    const dose = number(v.prescribedMgKg);
    if (!validPositive(weight, 200) || !validPositive(dose, 1000)) return invalid('Enter the measured weight and the positive mg/kg dose exactly as prescribed by the veterinarian.');
    const mg = weight * dose;
    const rows = [{ label: 'Calculated amount for the prescribed dose', value: mg.toFixed(3), unit: 'mg' }];
    const concentration = concentrationMgPerMl === null ? number(v.concentrationMgMl) : concentrationMgPerMl;
    if (Number.isFinite(concentration) && concentration > 0) {
      rows.push({ label: 'Calculated volume for the entered/selected product concentration', value: (mg / concentration).toFixed(3), unit: 'mL' });
    }
    return result(rows, [
      'Arithmetic only: this tool does not select, recommend, validate, or change a dose or schedule. Use only the exact dose prescribed for this animal and verify the dispensed product label, concentration, route, and jurisdiction with the veterinarian/pharmacist.',
      productLabel,
      'If a dose was given incorrectly, an extra dose was taken, or adverse signs occur, contact a veterinarian or emergency veterinary service immediately. Do not use this page to diagnose or treat an overdose.'
    ]);
  }

  function dogMetacam(v) {
    return vetDose(v, 1.5, 'The volume conversion is restricted to the U.S. 1.5 mg/mL oral-suspension concentration cited below. Do not use it for another strength, formulation, route, or a cat.');
  }

  function dogRaisin(v) {
    const weight = number(v.weightKg);
    const count = v.count === '' || v.count === undefined ? 0 : number(v.count);
    const mass = v.massG === '' || v.massG === undefined ? 0 : number(v.massG);
    if (!validPositive(weight, 150) || !Number.isFinite(count) || count < 0 || count > 100000 || !Number.isFinite(mass) || mass < 0 || mass > 100000) return invalid('Enter a valid dog weight and non-negative exposure amounts.');
    const rows = [];
    if (count > 0) rows.push({ label: 'Reported fruit pieces per body weight', value: (count / weight).toFixed(2), unit: 'pieces/kg (exposure context only)' });
    if (mass > 0) rows.push({ label: 'Reported mass per body weight', value: (mass / weight).toFixed(2), unit: 'g/kg (exposure context only)' });
    if (!rows.length) return invalid('Enter the reported number of raisins/grapes or the measured mass.');
    return result(rows, [
      'There is no established safe amount or reliable toxic-dose threshold. This result is not a risk score and cannot rule out kidney injury. Contact a veterinarian or animal poison-control service immediately for any grape/raisin ingestion, even if the dog seems well.',
      'Do not induce vomiting or give treatment unless a veterinarian directs you to do so.'
    ]);
  }

  function dogWater(v) {
    const weight = number(v.weightKg);
    if (!validPositive(weight, 70) || weight < 2) return invalid('For this reference equation, enter a dog weight from 2 through 70 kg.');
    const amount = v.method === 'power' ? 132 * Math.pow(weight, 0.75) : 30 * weight + 70;
    const method = v.method === 'power' ? '132 × body weight (kg)^0.75' : '30 × body weight (kg) + 70';
    return result([{ label: 'Estimated maintenance fluid reference (' + method + ')', value: amount.toFixed(0), unit: 'mL/24 h' }], [
      'This is a clinical maintenance-fluid planning estimate, not a validated target for how much water a dog should voluntarily drink. Do not restrict water or administer fluids based on this number.',
      'Diet moisture, activity, environment and health affect drinking. A sudden change in drinking, illness, vomiting/diarrhea, or concern about hydration warrants veterinary advice.'
    ]);
  }

  function tramadol(v) {
    const weight = number(v.weightKg);
    const dose = number(v.prescribedMgKg);
    if (!validPositive(weight, 200) || !validPositive(dose, 1000)) return invalid('Enter the measured weight and the positive mg/kg dose exactly as prescribed by the veterinarian.');
    const mg = weight * dose;
    const rows = [{ label: 'Calculated amount for the veterinarian-prescribed dose', value: mg.toFixed(3), unit: 'mg per administration' }];
    const concentration = number(v.concentrationMgMl);
    if (Number.isFinite(concentration) && concentration > 0) rows.push({ label: 'Calculated liquid volume from the entered concentration', value: (mg / concentration).toFixed(3), unit: 'mL per administration' });
    return result(rows, [
      'This is arithmetic only. Tramadol use in dogs is veterinarian-directed/off-label; this page does not recommend a dose, interval, product, or treatment. Use the exact prescription and dispensed product label.',
      'For suspected extra/incorrect dosing, unusual sleepiness, agitation, tremors, poor coordination, seizures, or other concerning signs, contact a veterinarian or emergency service immediately.'
    ]);
  }

  function catAge(v) {
    const age = number(v.ageYears);
    if (!validPositive(age, 35) || age < 1) return invalid('Enter a cat age from 1 through 35 years.');
    const international = age <= 2 ? 15 + 9 * (age - 1) : 24 + 4 * (age - 2);
    const cornell = age <= 2 ? 16 + 5 * (age - 1) : 21 + 4 * (age - 2);
    const rows = v.method === 'cornell'
      ? [{ label: 'Approximate human-age equivalent (Cornell convention)', value: cornell.toFixed(1), unit: 'human years' }]
      : [{ label: 'Approximate human-age equivalent (International Cat Care convention)', value: international.toFixed(1), unit: 'human years' }];
    return result(rows, [
      'Human-age equivalents are rough educational comparisons, not exact biological ages, health assessments, or lifespan predictions. Veterinary references use different conventions; this page identifies which chart it applies.',
      'A veterinarian should assess an individual cat’s life stage, health and care needs.'
    ]);
  }

  function catCalories(v) {
    const weight = number(v.weightKg);
    if (!validPositive(weight, 30)) return invalid('Enter a cat weight from 0 to 30 kg.');
    const factors = { intact: 1.4, neutered: 1.2, obesityProne: 1.0 };
    if (!Object.prototype.hasOwnProperty.call(factors, v.status)) return invalid('Choose a supported healthy adult category.');
    const rer = 70 * Math.pow(weight, 0.75);
    const mer = rer * factors[v.status];
    return result([
      { label: 'Resting energy requirement (RER)', value: rer.toFixed(0), unit: 'kcal/day' },
      { label: 'Estimated daily energy requirement (MER)', value: mer.toFixed(0), unit: 'kcal/day' }
    ], [
      'RER = 70 × body weight (kg)^0.75; the selected healthy-adult maintenance factor comes from veterinary nutrition guidance. This is a starting estimate, not a feeding prescription.',
      'Do not use this estimate as a weight-loss plan or for kittens, pregnancy/lactation, illness, recovery, or other special needs. Individual calorie needs vary; consult a veterinarian and monitor body condition.'
    ]);
  }

  function catMetacam(v) {
    return vetDose(v, 5, 'The volume conversion is restricted to the U.S. 5 mg/mL feline injectable product. The U.S. feline label is for a one-time pre-surgical subcutaneous dose; repeat dosing and oral feline Metacam are not approved in the United States. This page does not supply that dose or authorize administration.');
  }

  function dryMatter(v) {
    const asFed = number(v.asFedMass);
    const dried = number(v.dryMass);
    const unit = ['g', 'kg', 'lb', 'oz'].includes(v.massUnit) ? v.massUnit : null;
    if (!validPositive(asFed, 100000000) || !Number.isFinite(dried) || dried < 0 || dried > asFed || !unit) {
      return invalid('Enter positive net as-fed mass, non-negative dry mass no greater than the as-fed mass, and one supported unit for both.');
    }
    const dryPercent = dried / asFed * 100;
    return result([
      { label: 'Net as-fed sample mass', value: asFed.toFixed(3), unit },
      { label: 'Net dried sample mass', value: dried.toFixed(3), unit },
      { label: 'Dry matter content', value: dryPercent.toFixed(2), unit: '% of original mass' },
      { label: 'Moisture by difference (not a direct water measurement)', value: (100 - dryPercent).toFixed(2), unit: '%' }
    ], [
      'Feed/forage sample arithmetic only. This does not calculate a ration, nutrient concentration, feed intake, or feeding recommendation.',
      'Use net sample masses, exclude container tare, choose the same mass unit for both, and follow an appropriate drying method. In some feeds, drying can remove volatile substances as well as water, so moisture by difference is not necessarily the true water content.',
      'For consequential feed decisions, use a validated sampling and laboratory method.'
    ]);
  }

  function feedConversion(v) {
    const feed = number(v.feedMassKg);
    const start = number(v.startWeightKg);
    const end = number(v.endWeightKg);
    const bases = { asFed: 'as-fed', dryMatter: 'dry-matter' };
    const basis = bases[v.feedBasis];
    if (!validPositive(feed, 1000000) || !validPositive(start, 1000000) || !validPositive(end, 1000000) || !basis) {
      return invalid('Enter positive feed mass and starting/ending liveweights in kilograms, and select a feed basis.');
    }
    const gain = end - start;
    if (gain <= 0) return invalid('Ending liveweight must exceed starting liveweight; a conventional positive-gain FCR is undefined for zero or negative gain.');
    return result([
      { label: 'Liveweight gain during the selected period', value: gain.toFixed(3), unit: 'kg' },
      { label: 'Feed conversion ratio (' + basis + ' basis)', value: (feed / gain).toFixed(2), unit: 'kg ' + basis + ' feed/kg liveweight gain' }
    ], [
      'Descriptive ratio only, not a target, benchmark, ration assessment, or feed recommendation. Comparisons require the same species, production boundary, period, and feed basis.',
      'Feed consumed and liveweight change must describe the same animal or defined group over the same period. This simple calculation does not adjust for feed wastage, mortality, natural feed, or weighing variation.'
    ]);
  }

  function livestockFenceCost(v) {
    const length = number(v.fenceLength);
    const rate = number(v.installedRatePerUnit);
    const gateCount = number(v.gateCount);
    const gateCost = number(v.gateCost);
    const otherCosts = number(v.otherCosts);
    const contingencyPct = number(v.contingencyPct);
    const lengthUnit = { ft: 'ft', m: 'm' }[v.lengthUnit];
    const currency = String(v.currencyCode || '').trim().toUpperCase();
    if (!validPositive(length, 10000000) || !lengthUnit || !Number.isFinite(rate) || rate < 0 || rate > 1000000 ||
        !Number.isInteger(gateCount) || gateCount < 0 || gateCount > 100000 || !Number.isFinite(gateCost) || gateCost < 0 || gateCost > 100000000 ||
        !Number.isFinite(otherCosts) || otherCosts < 0 || otherCosts > 1000000000000 || !Number.isFinite(contingencyPct) || contingencyPct < 0 || contingencyPct > 100 ||
        !/^[A-Z]{3}$/.test(currency)) {
      return invalid('Enter a positive fence length, supported unit, non-negative project costs, whole-number gate count, contingency from 0–100%, and a 3-letter currency code.');
    }
    const fenceCost = length * rate;
    const gatesTotal = gateCount * gateCost;
    const subtotal = fenceCost + gatesTotal + otherCosts;
    const contingency = subtotal * contingencyPct / 100;
    return result([
      { label: 'Fence-run estimate (length × installed rate)', value: fenceCost.toFixed(2), unit: currency },
      { label: 'Separate gate estimate', value: gatesTotal.toFixed(2), unit: currency },
      { label: 'Other entered project costs', value: otherCosts.toFixed(2), unit: currency },
      { label: 'Entered contingency (' + contingencyPct.toFixed(2) + '%)', value: contingency.toFixed(2), unit: currency },
      { label: 'Estimated total project cost', value: (subtotal + contingency).toFixed(2), unit: currency }
    ], [
      'This is arithmetic from your own entered rate and costs, not a market-price forecast, contractor quote, or guarantee. Use the same currency for every cost input.',
      'The installed per-length rate excludes separately entered gates and other costs. If your quote already includes them, enter zero in those separate fields to avoid double-counting.',
      'Fence type, livestock, terrain, layout, local requirements, material availability, labor, gates, and site conditions affect actual cost. Verify local design, utility locations, and current supplier/contractor quotes before building.'
    ]);
  }

  function birdAge(v) {
    const hatch = parseISODate(v.hatchDate);
    const today = parseISODate(v.today || localDateISO());
    if (!hatch || !today) return invalid('Enter valid hatch and current dates.');
    if (hatch.getTime() > today.getTime()) return invalid('The hatch date cannot be in the future.');
    let years = today.getUTCFullYear() - hatch.getUTCFullYear();
    let anchor = addMonths(hatch, years * 12);
    if (anchor.getTime() > today.getTime()) {
      years -= 1;
      anchor = addMonths(hatch, years * 12);
    }
    let months = (today.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + today.getUTCMonth() - anchor.getUTCMonth();
    let monthAnchor = addMonths(anchor, months);
    if (monthAnchor.getTime() > today.getTime()) {
      months -= 1;
      monthAnchor = addMonths(anchor, months);
    }
    const days = Math.floor((today.getTime() - monthAnchor.getTime()) / 86400000);
    return result([{ label: 'Chronological age since the entered hatch date', value: years + ' years, ' + months + ' months, ' + days + ' days', unit: '' }], [
      'This tool calculates calendar age only. It does not convert bird age to human years, estimate health or life expectancy, or determine a bird’s life stage. Species differ greatly; consult an avian veterinarian for individual health questions.'
    ]);
  }

  function dogSizeQuiz(v) {
    const answers = { q1: 'serial', q2: 'varies', q3: 'vet' };
    const keys = Object.keys(answers);
    const score = keys.reduce((sum, key) => sum + (v[key] === answers[key] ? 1 : 0), 0);
    return result([{ label: 'Score', value: score + ' / ' + keys.length, unit: 'correct answers' }], [
      'Educational quiz only. Growth charts depend on age, measured weight, sex and an estimated adult-size group; mixed-breed and giant-breed predictions can be uncertain. A veterinarian can assess unusual growth.'
    ]);
  }

  function catAgeQuiz(v) {
    const answers = { q1: '24', q2: 'differ' };
    const keys = Object.keys(answers);
    const score = keys.reduce((sum, key) => sum + (v[key] === answers[key] ? 1 : 0), 0);
    return result([{ label: 'Score', value: score + ' / ' + keys.length, unit: 'correct answers' }], [
      'Educational quiz only. The result uses the named International Cat Care age-chart convention. Other reputable veterinary references publish a different early-life comparison, so neither answer is an exact biological conversion.'
    ]);
  }

  const calculators = {
    'sheep-gestation': sheepGestation,
    'dog-age': dogAge,
    'dog-nutrition': dogNutrition,
    'dog-chocolate-toxicity': dogChocolate,
    'dog-heat-cycle': dogHeatCycle,
    'metacam-dogs': dogMetacam,
    'dog-raisin-toxicity': dogRaisin,
    'dog-water-intake': dogWater,
    'tramadol-dogs': tramadol,
    'cat-age': catAge,
    'cat-calorie': catCalories,
    'metacam-cats': catMetacam,
    'dry-matter': dryMatter,
    'feed-conversion-ratio': feedConversion,
    'livestock-fence-cost': livestockFenceCost,
    'bird-age': birdAge,
    'quiz-dog-size': dogSizeQuiz,
    'quiz-cat-age': catAgeQuiz
  };

  function calculate(id, values) {
    const calculator = calculators[id];
    return calculator ? calculator(values || {}) : invalid('This calculator is unavailable.');
  }

  const api = { calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FCBiology = api;

  if (typeof document !== 'undefined') {
    const initialize = () => {
      const form = document.querySelector('[data-biology-form]');
      if (!form) return;
      const output = document.getElementById('biology-output');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries());
        const calculated = calculate(form.dataset.biologyForm, values);
        output.replaceChildren();
        output.hidden = false;
        if (calculated.error) {
          const error = document.createElement('p');
          error.className = 'error';
          error.textContent = calculated.error;
          output.appendChild(error);
          return;
        }
        const table = document.createElement('table');
        const body = document.createElement('tbody');
        calculated.rows.forEach((row) => {
          const tr = document.createElement('tr');
          const th = document.createElement('th');
          const td = document.createElement('td');
          th.textContent = row.label;
          td.textContent = row.unit ? row.value + ' ' + row.unit : String(row.value);
          tr.append(th, td);
          body.appendChild(tr);
        });
        table.appendChild(body);
        output.appendChild(table);
        if (calculated.warnings.length) {
          const list = document.createElement('ul');
          list.className = 'notices';
          calculated.warnings.forEach((message) => {
            const item = document.createElement('li');
            item.textContent = message;
            list.appendChild(item);
          });
          output.appendChild(list);
        }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
  }
})(typeof window !== 'undefined' ? window : globalThis);
