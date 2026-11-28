/* Friendly Calculator curated index policy.
 * This is an explicit, local allowlist: no network calls and no remote configuration.
 * Only root /calculators/<slug>.html routes are affected.
 */
(() => {
  'use strict';

  const KEEP = new Set([
    "gst-calculator",
    "rd-calculator",
    "compound-interest-calculator",
    "income-tax-calculator",
    "mortgage-calculator",
    "sip-calculator",
    "gratuity-calculator",
    "percentage-calculator",
    "ppf-calculator",
    "kvp-calculator",
    "national-insurance-calculator",
    "rmd-calculator-required-minimum-distributions",
    "sip-5000-monthly-calculator",
    "gst-qst-calculator-canada",
    "insurance-premium-calculator",
    "nps-calculator",
    "professional-tax-calculator",
    "profit-loss-calculator",
    "ctc-salary-calculator",
    "401k-calculator",
    "minutes-to-hours-calculator",
    "scientific-calculator",
    "basic-calculator",
    "home-loan-emi-calculator",
    "step-up-sip-calculator",
    "hra-calculator",
    "date-difference-calculator",
    "percentage-error-calculator",
    "loan-amount-from-emi-calculator",
    "time-to-reach-savings-goal-calculator",
    "savings-rate-calculator",
    "land-unit-converter-calculator",
    "currency-converter-calculator",
    "fraction-calculator",
    "simple-interest-calculator",
    "brokerage-calculator",
    "graphing-calculator",
    "fraction-to-percent-calculator",
    "loan-comparison-calculator",
    "mudra-loan-category-emi-calculator",
    "kcc-interest-calculator",
    "fd-rd-sip-comparison-calculator",
    "canada-gst-hst-calculator",
    "passive-income-calculator",
    "age-calculator",
    "bmi-calculator",
    "discount-calculator",
    "unit-converter",
    "superannuation-calculator",
    "vat-calculator",
    "binary-converter",
    "loan-emi-calculator"
  ]);

  const match = String(window.location && window.location.pathname || '')
    .match(/^\\/calculators\\/([a-z0-9-]+)\\.html$/i);

  if (!match || !document.head) return;

  const slug = match[1].toLowerCase();
  const shouldIndex = KEEP.has(slug);
  const robotsMetas = Array.from(document.querySelectorAll(
    'meta[name="robots" i], meta[name="googlebot" i], meta[name="bingbot" i]'
  ));

  const updateMeta = (meta, indexable) => {
    const preserved = String(meta.getAttribute('content') || '')
      .split(',')
      .map(value => value.trim())
      .filter(value => value && !/^(?:index|noindex|follow|nofollow|none)$/i.test(value));
    meta.setAttribute('content', [
      indexable ? 'index' : 'noindex',
      'follow',
      ...preserved
    ].join(','));
  };

  // Always provide a generic robots directive. Crawler-specific tags are
  // supplemental and must not be the only source of the page's index policy.
  const hasGenericRobots = robotsMetas.some(meta =>
    String(meta.getAttribute('name') || '').toLowerCase() === 'robots'
  );
  if (!hasGenericRobots) {
    const generic = document.createElement('meta');
    generic.setAttribute('name', 'robots');
    generic.setAttribute('content', shouldIndex ? 'index,follow' : 'noindex,follow');
    document.head.appendChild(generic);
    robotsMetas.push(generic);
  }

  robotsMetas.forEach(meta => updateMeta(meta, shouldIndex));
})();
