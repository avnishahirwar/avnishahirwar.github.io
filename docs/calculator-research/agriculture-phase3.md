# Agriculture calculator: Livestock Fence Cost

Research date: 18 November 2026. This is the next missing calculator in the attached list after Feed Conversion Ratio. Items between it and the next placeholder already have direct calculator routes and were skipped.

## Scope and formula

The title does not define a fence type, terrain, country, local price basis, or labor assumptions. Do not publish a universal cost-per-foot default. Instead, implement an estimate from the user's own installed cost quote per unit length, number and unit price of gates, other project costs, and an optional user-entered contingency percentage:

`estimated total = (fence length × user-entered installed cost per length + gate count × user-entered cost per gate + other project costs) × (1 + contingency percentage / 100)`.

Require the user to choose a length unit and enter costs in the same currency. The result is an estimate from their inputs, not a quote or market-price forecast.

## Evidence

The University of Missouri Extension's April 2026 pasture-fence budgeting guide compares selected fence designs, shows separate material/labor/tool categories, and provides a workbook for users to enter material costs, labor rates/hours, project size, and specifications. It stresses that farm fence projects vary and that its sample scenarios use a specific terrain and assumptions: [Pasture Fence Construction Budget](https://extension.missouri.edu/publications/g1193).

Iowa State University Extension explains that fence type and paddock shape affect materials and labor; its estimates use stated regional prices and labor assumptions, and exclude gates: [Estimated Costs for Livestock Fencing](https://www.extension.iastate.edu/agdm/livestock/html/b1-75.html).

USDA Natural Resources Conservation Service guidance says fence materials and construction method depend on livestock/access purpose and that labor depends on fence type: [Fence — Small Scale Solutions for Your Farm](https://www.nrcs.usda.gov/sites/default/files/2023-01/Fence-%20Small%20Scale%20Solutions%20for%20your%20Farm.pdf).

Worked arithmetic example: 100 m at 10 user-entered currency units per metre is 1,000; two gates at 50 each add 100; with no other costs or contingency, the estimate is 1,100 currency units. The example is arithmetic, not a price recommendation.
