(function (root) {
  'use strict';

  function parseDate(value) {
    var match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function addCalendarDays(value, days) {
    var date = parseDate(value);
    if (!date || !Number.isSafeInteger(days) || days < 0 || days > 100000) return '';
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function weekday(value) {
    var date = parseDate(value);
    if (!date) return '';
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()];
  }

  function formatDate(value) {
    var date = parseDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  function wireCalculator(doc) {
    var form = doc.getElementById('calc');
    var button = doc.getElementById('go');
    var output = doc.getElementById('out');
    if (!form || !button || !output) return;

    var days = Number(form.getAttribute('data-date-offset'));
    var input = form.querySelector('input[name="startDate"]');
    var reset = doc.getElementById('reset');
    if (!Number.isSafeInteger(days) || days < 1 || !input) return;

    function clearOutput() {
      output.textContent = '';
      output.style.display = 'none';
    }

    function calculate() {
      var start = input.value;
      var target = addCalendarDays(start, days);
      output.textContent = '';
      output.style.display = 'block';

      if (!target) {
        output.textContent = 'Enter a valid calendar date to continue.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      input.removeAttribute('aria-invalid');
      var result = doc.createElement('div');
      var heading = doc.createElement('strong');
      heading.textContent = days + ' days after ' + formatDate(start) + ' is ' + formatDate(target) + '.';
      var exact = doc.createElement('p');
      exact.textContent = 'Target date: ' + target + ' (' + weekday(target) + ').';
      var method = doc.createElement('p');
      method.textContent = 'Calculation: ' + start + ' + ' + days + ' calendar days = ' + target + '.';
      result.appendChild(heading);
      result.appendChild(exact);
      result.appendChild(method);
      output.appendChild(result);
    }

    button.addEventListener('click', calculate);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      calculate();
    });
    input.addEventListener('change', function () {
      input.removeAttribute('aria-invalid');
      clearOutput();
    });
    if (reset) reset.addEventListener('click', function () {
      input.value = '';
      input.removeAttribute('aria-invalid');
      clearOutput();
    });
  }

  var api = {
    parseDate: parseDate,
    addCalendarDays: addCalendarDays,
    weekday: weekday,
    formatDate: formatDate,
    wireCalculator: wireCalculator
  };
  root.FCDateOffsetCalculator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') wireCalculator(document);
})(typeof window !== 'undefined' ? window : globalThis);
