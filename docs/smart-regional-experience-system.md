# Smart Regional Experience System (SRES)

Status: staged implementation; not production verified.

## Product objective
Deliver a privacy-conscious, auto-first regional experience across Friendly Calculator. The system must make sensible first-visit choices while keeping every preference understandable, reversible and user-controlled.

## Preference precedence
1. Explicit locale URL (for example, /hi/ or /de/) is authoritative for page language and SEO.
2. A visitor's saved manual preference is authoritative for the matching setting.
3. Browser/device locale preferences are used when no manual preference exists.
4. Safe site defaults are used when the browser does not expose a usable value.

Do not infer a user's country from IP or request GPS for display preferences. Do not silently change a manually selected preference.

## Regional dimensions
- Language: use the best supported browser language on the root homepage; preserve explicit localized routes. Unsupported translations must be clearly labelled rather than pretending translated content exists.
- Country and format: derive a country region from BCP 47 locale tags, including script subtags (for example, zh-Hant-TW); use Intl APIs for number and date formatting.
- Currency: choose a sensible display currency from a country-to-currency map. Display currency is formatting only; it must never imply conversion of calculator inputs or results. Any future conversion feature must disclose rate provider, timestamp, fees/rounding assumptions and source currency.
- Units: default to metric except customary-unit regions (US, Liberia and Myanmar); calculator-specific statutory or industry units take precedence where relevant. Preserve manual unit choice.
- Accessibility: honor prefers-reduced-motion, prefers-contrast and forced-colors. Keep keyboard focus visible, labels and accessible names clear, and user-selected accessibility preferences persistent.

## User controls
- Each setting must be independently changeable.
- Provide one action to return regional settings to automatic defaults.
- Reset must not clear unrelated accessibility, theme, text-size, favourites or calculator data.
- Clearly explain that country/format is distinct from website language and display currency does not perform conversion.

## Engineering requirements
- Keep detection and formatting in the shared global locale module; avoid duplicate per-page implementations.
- Expose stable read-only getters and explicit setters through window.FCLocale.
- Dispatch documented locale/unit change events when a setting changes.
- Handle localStorage denial, invalid values, missing Intl.Locale and missing browser language lists without throwing.
- Avoid geolocation, third-party fingerprinting and unnecessary network requests.
- Keep all current calculator formulas, URLs, canonical/hreflang behavior, header/footer, SEO calendar, analytics and payment configuration unchanged.

## QA acceptance criteria
- First visit with en-US, en-GB, hi-IN, fr-CA and zh-Hant-TW locale examples selects a sensible supported locale, country, currency, format and unit default.
- Saved manual choices survive reload and override browser defaults.
- Explicit locale URLs remain authoritative even if a saved language preference differs.
- Automatic reset clears only language/country/currency/format/units preference keys.
- Currency formatting is never described as currency conversion.
- Date and number formatting use Intl.NumberFormat and Intl.DateTimeFormat.
- Metric/customary defaults are covered by tests; explicit manual unit selection remains persistent.
- Reduced-motion, increased-contrast, forced-colors, keyboard navigation and screen-reader labels are checked in supported browsers.
- Run regression, locale coverage, mobile, cross-browser and Lighthouse checks before merge.
- Verify the production domain after deployment; a PR preview is not production verification.

## Current staged work
PR #805 contains automatic regional reset, accessibility media-query support, improved browser region detection (including script subtags), and tests for non-US customary-unit regions. It remains stacked on PR #730 and is not merged or deployed.
