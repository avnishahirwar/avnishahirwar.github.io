# Generated equation calculator template quality

## Changes

The shared generated-equation calculator engine now:
- Converts variable keys such as camelCase and underscore names into readable field and result labels.
- Allows individual pages to provide \`inputLabels\`, \`outputLabels\`, or \`variableLabels\` in \`FC_EQUATION_CONFIG\` without rewriting the shared engine.
- Leaves blank fields unset rather than converting them to zero.
- Validates finite numeric values and skips incomplete equations.
- Builds result tables with DOM nodes and \`textContent\`, not concatenated \`innerHTML\`.
- Restricts formula expressions to arithmetic syntax, declared right-hand-side variables and the supported Math/helper functions.
- Keeps the existing page structure, styles, header/footer, calculator routes and formula definitions unchanged.

## Verification

Run:

    node --check assets/generated-equation-calculator.js
    node --test tests/generated-equation-calculator.test.cjs

The test suite covers label humanization, custom labels, blank input handling, numeric calculation, result rendering, mathematical helpers and rejection of executable JavaScript syntax.

## Scope and release

This is a shared template code change. It does not rewrite page-specific calculator explanations or claim that every generated equation page is editorially complete. Those pages remain subject to the page-quality audit. No page is deleted, and this PR does not deploy production.
