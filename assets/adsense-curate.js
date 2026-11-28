/* Friendly Calculator indexability policy.
 * One browser-rendered policy for root /calculators/<slug>.html routes.
 * Explicit static index directives are authoritative for non-allowlisted pages.
 */
(() => {
  'use strict';

  const KEEP = new Set([
    "emi-calculator",
    "loan-emi-calculator",
    "home-loan-emi-calculator",
    "car-loan-calculator",
    "home-loan-eligibility-calculator",
    "personal-loan-eligibility-calculator",
    "loan-prepayment-calculator",
    "loan-comparison-calculator",
    "mortgage-calculator",
    "gst-calculator",
    "gst-input-tax-credit-calculator",
    "reverse-charge-gst-calculator",
    "gst-on-rent-calculator",
    "gst-late-fee-calculator",
    "gst-interest-calculator",
    "income-tax-calculator",
    "tds-calculator",
    "hra-calculator",
    "gratuity-calculator",
    "salary-calculator",
    "salary-hike-calculator",
    "ctc-salary-calculator",
    "bonus-calculator",
    "advance-tax-calculator",
    "professional-tax-calculator",
    "capital-gains-tax-calculator",
    "leave-encashment-calculator",
    "freelancer-tax-calculator",
    "sip-calculator",
    "lumpsum-calculator",
    "fd-calculator",
    "rd-calculator",
    "ppf-calculator",
    "swp-calculator",
    "cagr-calculator",
    "401k-calculator",
    "percentage-calculator",
    "simple-interest-calculator",
    "compound-interest-calculator",
    "discount-calculator",
    "tip-calculator",
    "sales-tax-calculator",
    "profit-loss-calculator",
    "currency-converter-calculator",
    "basic-calculator",
    "graphing-calculator",
    "fraction-calculator",
    "unit-converter",
    "bmi-calculator",
    "age-calculator",
    "kvp-calculator",
    "national-insurance-calculator",
    "rmd-calculator-required-minimum-distributions",
    "sip-5000-monthly-calculator",
    "gst-qst-calculator-canada",
    "insurance-premium-calculator",
    "nps-calculator",
    "minutes-to-hours-calculator",
    "scientific-calculator",
    "step-up-sip-calculator",
    "date-difference-calculator",
    "percentage-error-calculator",
    "loan-amount-from-emi-calculator",
    "time-to-reach-savings-goal-calculator",
    "savings-rate-calculator",
    "land-unit-converter-calculator",
    "brokerage-calculator",
    "fraction-to-percent-calculator",
    "mudra-loan-category-emi-calculator",
    "kcc-interest-calculator",
    "fd-rd-sip-comparison-calculator",
    "canada-gst-hst-calculator",
    "passive-income-calculator",
    "superannuation-calculator",
    "vat-calculator",
    "binary-converter"
  ]);

  const path = String(window.location && window.location.pathname || '');
  const match = path.match(/^[/]calculators[/]([a-z0-9-]+)[.]html$/i);
  if (!match || !document.head) return;

  const shouldForceIndex = KEEP.has(match[1].toLowerCase());
  const robotsMetas = Array.from(document.querySelectorAll(
    'meta[name="robots" i], meta[name="googlebot" i], meta[name="bingbot" i]'
  ));
  const genericRobots = robotsMetas.find(meta =>
    String(meta.getAttribute('name') || '').toLowerCase() === 'robots'
  );

  const tokens = String(genericRobots && genericRobots.getAttribute('content') || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const hasNoindex = tokens.some(value => /^(?:noindex|none)$/i.test(value));
  const hasIndex = tokens.some(value => /^index$/i.test(value));

  // Preserve deliberate static indexability for substantive pages. The
  // allowlist can promote selected pages, while explicit static noindex stays
  // in place everywhere else.
  const shouldIndex = shouldForceIndex || (!hasNoindex && hasIndex);

  const normalize = meta => {
    const preserved = String(meta.getAttribute('content') || '')
      .split(',')
      .map(value => value.trim())
      .filter(value => value && !/^(?:index|noindex|follow|nofollow|none)$/i.test(value));
    meta.setAttribute('content', [
      shouldIndex ? 'index' : 'noindex',
      'follow',
      ...preserved
    ].join(','));
  };

  if (!genericRobots) {
    const generic = document.createElement('meta');
    generic.setAttribute('name', 'robots');
    generic.setAttribute('content', shouldIndex ? 'index,follow' : 'noindex,follow');
    document.head.appendChild(generic);
    robotsMetas.push(generic);
  }

  robotsMetas.forEach(normalize);
})();
