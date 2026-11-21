(function () {
  'use strict';

  // Preview deployments and other hostnames must never load this publisher's ads.
  if (window.location.hostname.toLowerCase() !== 'friendlycalculator.in') return;

  var selector = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
  if (document.querySelector(selector)) return;

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7201974268016404';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
})();
