# Friendly Calculator

Friendly Calculator is a static, browser-first collection of online calculators and explanatory pages. The public site is served from this repository with GitHub Pages and the custom domain configured in `CNAME`.

**Official live website:** [Friendly Calculator](https://friendlycalculator.in/)

## Use the source code

The original application source code in this repository is available under the MIT License in [`LICENSE`](LICENSE). You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of that software, subject to the license notice and terms.

**The software license does not cover the website's editorial articles, educational explanations, or other written content.** Original educational content expressly covered by the site's [Content Licence](https://friendlycalculator.in/calculator/content-license.html) is licensed separately under CC BY 4.0. Logos, trademarks, brand illustrations, third-party assets, datasets, fonts, and other externally licensed works are not granted under the MIT License; check their individual notices and terms before reuse.

## Project structure

- `index.html`, `calculators/`, `calculator/`, `blog/`, and language/country folders contain static pages.
- `assets/` contains application scripts, styles, images, and other resources.
- `scripts/` contains catalogue, locale, sitemap, and SEO maintenance tools.
- `tests/` contains Node.js regression and content checks.
- `.github/workflows/` contains automated checks and sitemap maintenance workflows.

The site is primarily static HTML, CSS, and JavaScript; there is no root-level package manager build step. GitHub Pages publishes the repository files.

## Checks

Use a current Node.js release to run the regression tests:

```sh
node --test tests/*.test.cjs
```

Some test suites depend on live catalogue totals and country-specific calculation fixtures; read failure details and verify those against the current pages rather than assuming every historical assertion matches the present catalogue.

## Contributions

Before proposing changes, review the relevant calculator's assumptions, formula, source notes, language edition, and test coverage. Do not commit API credentials, private keys, personal data, or unapproved third-party materials. The MIT License for source code does not change the separate licenses for written content, brand assets, or third-party works.
