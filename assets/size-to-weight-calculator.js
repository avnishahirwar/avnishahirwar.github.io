(function (global) {
  'use strict';

  const LENGTH_TO_METRES = Object.freeze({
    mm: 0.001,
    cm: 0.01,
    m: 1,
    in: 0.0254,
    ft: 0.3048
  });
  const STANDARD_GRAVITY = 9.80665;
  const KG_TO_LB = 2.2046226218487757;
  const N_TO_LBF = 0.22480894387096;

  function calculate(input) {
    const length = Number(input.length);
    const width = Number(input.width);
    const height = Number(input.height);
    const densityKgM3 = Number(input.densityKgM3);
    const unitFactor = LENGTH_TO_METRES[input.lengthUnit];

    if (!Number.isFinite(unitFactor)) {
      throw new RangeError('Choose a supported dimension unit.');
    }
    if (![length, width, height].every(Number.isFinite) || length <= 0 || width <= 0 || height <= 0) {
      throw new RangeError('Length, width and height must be finite values greater than zero.');
    }
    if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0) {
      throw new RangeError('Material density must be a finite value greater than zero.');
    }

    const lengthM = length * unitFactor;
    const widthM = width * unitFactor;
    const heightM = height * unitFactor;
    const volumeM3 = lengthM * widthM * heightM;
    const massKg = volumeM3 * densityKgM3;
    const weightN = massKg * STANDARD_GRAVITY;
    const values = [lengthM, widthM, heightM, volumeM3, massKg, weightN];
    if (!values.every(Number.isFinite) || volumeM3 <= 0 || massKg <= 0) {
      throw new RangeError('These values exceed the supported calculation range.');
    }

    return {
      lengthM,
      widthM,
      heightM,
      volumeM3,
      densityKgM3,
      massKg,
      massLb: massKg * KG_TO_LB,
      weightN,
      weightLbf: weightN * N_TO_LBF
    };
  }

  global.FriendlySizeToWeight = Object.freeze({ calculate });

  if (typeof document === 'undefined') return;
  const form = document.getElementById('sizeWeightForm');
  const output = document.getElementById('sizeWeightResult');
  if (!form || !output) return;

  const format = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const result = calculate({
        length: form.elements.lengthValue.value,
        width: form.elements.widthValue.value,
        height: form.elements.heightValue.value,
        lengthUnit: form.elements.lengthUnit.value,
        densityKgM3: form.elements.densityKgM3.value
      });
      const rows = [
        ['Rectangular volume', format(result.volumeM3) + ' m³'],
        ['Estimated mass', format(result.massKg) + ' kg (' + format(result.massLb) + ' lb)'],
        ['Equivalent weight force', format(result.weightN) + ' N (' + format(result.weightLbf) + ' lbf)']
      ];
      const table = document.createElement('table');
      for (const [label, value] of rows) {
        const row = document.createElement('tr');
        const heading = document.createElement('td');
        const answer = document.createElement('td');
        heading.textContent = label;
        answer.textContent = value;
        row.append(heading, answer);
        table.append(row);
      }
      output.replaceChildren(table);
      output.className = 'result';
      output.hidden = false;
      if (typeof global.gtag === 'function') {
        global.gtag('event', 'calculator_use', {
          calculator_name: 'Size to Weight Calculator (Rectangular Box)',
          calculator_page: global.location.pathname
        });
      }
    } catch (error) {
      output.className = 'result error';
      output.textContent = error.message || 'Please check the values and try again.';
      output.hidden = false;
    }
  });
})(window);
