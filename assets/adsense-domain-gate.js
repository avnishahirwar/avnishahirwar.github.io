(function () {
  'use strict';
  // Ads remain disabled until a suitable certified CMP has been published and
  // verified by the publisher, and the production document explicitly opts in.
  var consentPlatformVerified = document.documentElement.dataset.fcCmpReady === 'true';
  var consentApiAvailable = typeof window.__tcfapi === 'function' || !!window.googlefc;
  if (!consentPlatformVerified || !consentApiAvailable) return;
  if (window.location.hostname.toLowerCase() !== 'friendlycalculator.in') return;
  var selector = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
  if (document.querySelector(selector)) return;
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7201974268016404';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
})();
