# Friendly Calculator feature expansion

## Scope
Add a wealth planning entry point for millionaire/billionaire users, a property-investment calculator and real-estate hub, an advertising landing page linked from the shared footer, a Top 10 reasons page/section, visual homepage feature cards, a shorter assistant greeting, and a privacy-aware daily device counter.

## Design
The existing Friendly Calculator navy/gold system is retained. The homepage visual section uses three asymmetric feature cards: a dark wealth-path card, a property snapshot card, and a Top 10 reasons card. Interactive pages remain static, browser-first and responsive.

## Structure
- `calculators/wealth-planner-calculator.html`: interactive wealth projection and visual progress bar.
- `calculator/wealth-calculators.html`: wealth hub linking existing and new tools.
- `calculators/property-investment-calculator.html`: rental yield, net cash flow and cash-on-cash calculator.
- `calculator/real-estate-calculators.html`: property and land calculator hub.
- `calculator/advertise.html`: advertising enquiry landing page.
- `calculator/why-friendly-calculator.html`: platform overview plus Top 10 reasons.
- `assets/site-shell.js`: shared footer Advertising link and daily device counter.
- `assets/friendly-ai-assistant.js`: concise greeting.
- `index.html` and `assets/site-shell.css`: visual feature section and counter styling.

The daily counter is intentionally labelled as this-browser/device activity; aggregate visitor analytics remain with the existing analytics setup and are not represented as a public global total.
