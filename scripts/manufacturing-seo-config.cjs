'use strict';

const site = 'https://friendlycalculator.in';
const hubPath = '/calculator/manufacturing-calculators.html';

const groups = [
  { key: 'production_quality', title: 'Production, CNC machining and quality', routes: [
    'takt-time-calculator.html', 'cycle-time-calculator.html', 'lead-time-calculator.html',
    'material-removal-rate-calculator.html', 'spindle-speed-calculator.html',
    'punch-force-calculator.html', 'countersink-depth-calculator.html',
    'pitch-diameter-calculator.html', 'thread-pitch-calculator.html',
    'true-position-calculator.html', 'rivet-size-calculator.html',
    'brinell-hardness-number-calculator.html', 'rockwell-hardness-conversion-calculator.html',
    'vickers-hardness-number-calculator.html', 'cobb-douglas-production-function-calculator.html'
  ]},
  { key: 'materials_industrial_physics', title: 'Materials, mass and plant engineering', routes: [
    'metal-weight-calculator.html', 'steel-weight-calculator.html',
    'size-to-weight-calculator-rectangular-box.html', 'density-to-mass-calculator.html',
    'density-to-weight-calculator.html', 'mass-to-density-calculator.html',
    'heat-capacity-calculator.html', 'pump-horsepower-calculator.html',
    '100-amp-wire-size-calculator.html', '24v-wire-size-calculator.html',
    'amp-to-wire-size-calculator.html', 'ideal-gas-law-calculator.html',
    'pipe-volume.html', 'concrete-calculator.html', 'paint-calculator.html'
  ]},
  { key: 'inventory_costing_operations', title: 'Inventory, costing and operations', routes: [
    'inventory-turnover-calculator.html', 'ending-inventory-calculator.html',
    'fifo-calculator-for-inventory.html', 'lifo-calculator-for-inventory.html',
    'direct-material-price-variance-calculator.html', 'labor-cost-calculator.html',
    'fte-calculator.html', 'gmroi-calculator.html', 'cogs-calculator.html',
    'cash-conversion-cycle-calculator.html', 'dimensional-weight-calculator.html',
    'pallet-calculator.html', 'roll-length-calculator.html', 'paper-weight-calculator.html',
    'paper-thickness-calculator.html'
  ]}
];

const seo = {
  'takt-time-calculator.html': ['Takt Time Calculator for Production Planning | Friendly Calculator', 'Calculate takt time from available production time and required demand. Use this manufacturing calculator to set the pace per unit for line balancing and capacity planning.'],
  'cycle-time-calculator.html': ['Cycle Time Calculator for Manufacturing | Friendly Calculator', 'Calculate manufacturing cycle time per unit from production time and output. Use the result to compare process pace, throughput and capacity assumptions.'],
  'lead-time-calculator.html': ['Manufacturing Lead Time Calculator | Friendly Calculator', 'Estimate manufacturing or order lead time from the stages and waiting periods in your process. Useful for production planning and supply-chain schedules.'],
  'material-removal-rate-calculator.html': ['Material Removal Rate Calculator for CNC | Friendly Calculator', 'Calculate CNC material removal rate from depth of cut, width of cut and feed rate. Use MRR to compare milling, turning and machining assumptions.'],
  'spindle-speed-calculator.html': ['Spindle Speed Calculator for CNC Machining | Friendly Calculator', 'Estimate spindle speed and feed rate for CNC milling or lathe work from tool, cutting and material inputs. Check units and machine limits before use.'],
  'punch-force-calculator.html': ['Punch Force Calculator for Sheet Metal | Friendly Calculator', 'Estimate the force needed for a punching operation from material strength, thickness, perimeter and process factors. Verify tooling and safety requirements.'],
  'countersink-depth-calculator.html': ['Countersink Depth Calculator for Machining | Friendly Calculator', 'Calculate countersink depth from the major diameter, pilot diameter and included angle for a machining or fabrication setup.'],
  'pitch-diameter-calculator.html': ['Pitch Diameter Calculator for Threads | Friendly Calculator', 'Calculate the pitch diameter of a threaded feature from thread dimensions. Use the result for preliminary thread and fit checks.'],
  'thread-pitch-calculator.html': ['Thread Pitch Calculator for Fasteners | Friendly Calculator', 'Calculate thread pitch from threads per inch or metric thread spacing. Use consistent units when checking fastener and machining specifications.'],
  'true-position-calculator.html': ['True Position Calculator for GD&T | Friendly Calculator', 'Calculate true position error from measured feature coordinates and the nominal location. Use it as a preliminary dimensional inspection aid.'],
  'rivet-size-calculator.html': ['Rivet Size Calculator for Fabrication | Friendly Calculator', 'Estimate rivet length and size from material stack-up and shop allowance. Confirm the result against the approved joint and rivet specification.'],
  'brinell-hardness-number-calculator.html': ['Brinell Hardness Number Calculator | Friendly Calculator', 'Calculate Brinell hardness from test load and indentation diameter. Use the result for preliminary material and quality checks, not certification.'],
  'rockwell-hardness-conversion-calculator.html': ['Rockwell Hardness Conversion Calculator | Friendly Calculator', 'Convert Rockwell hardness values between common scales using the published conversion assumptions. Verify against the applicable material standard.'],
  'vickers-hardness-number-calculator.html': ['Vickers Hardness Number Calculator | Friendly Calculator', 'Calculate Vickers hardness from test force and diagonal length. Use the result as an engineering estimate and verify the test method.'],
  'cobb-douglas-production-function-calculator.html': ['Cobb-Douglas Production Function Calculator | Friendly Calculator', 'Estimate output from labor, capital, productivity and elasticity assumptions with the Cobb-Douglas production function. Compare scenarios consistently.'],
  'metal-weight-calculator.html': ['Metal Weight Calculator for Plates and Sections | Friendly Calculator', 'Estimate metal weight from dimensions, quantity and material density. Use the result for preliminary fabrication, purchasing and material planning.'],
  'steel-weight-calculator.html': ['Steel Weight Calculator for Plates | Friendly Calculator', 'Calculate the estimated mass of rectangular steel plates from dimensions, quantity and density for fabrication, purchasing and load-planning work.'],
  'size-to-weight-calculator-rectangular-box.html': ['Size to Weight Calculator for Metal Blocks | Friendly Calculator', 'Estimate the mass of a rectangular block from its dimensions and material density. Useful for material planning, handling and shipping estimates.'],
  'density-to-mass-calculator.html': ['Density to Mass Calculator for Materials | Friendly Calculator', 'Calculate material mass from density and volume. Use consistent units for preliminary manufacturing, laboratory and inventory estimates.'],
  'density-to-weight-calculator.html': ['Density to Weight Calculator for Materials | Friendly Calculator', 'Convert material density and volume into an estimated weight for fabrication, shipping and plant handling calculations.'],
  'mass-to-density-calculator.html': ['Mass to Density Calculator for Materials | Friendly Calculator', 'Calculate material density from mass and volume. Use the result for preliminary identification, process and quality calculations.'],
  'heat-capacity-calculator.html': ['Heat Capacity Calculator for Process Engineering | Friendly Calculator', 'Calculate heat capacity from mass and specific heat capacity. Use the estimate for preliminary thermal and process-energy planning.'],
  'pump-horsepower-calculator.html': ['Pump Horsepower Calculator for Plant Systems | Friendly Calculator', 'Estimate pump horsepower from flow, head, efficiency and fluid assumptions. Verify final equipment selection with the pump curve and engineer.'],
  '100-amp-wire-size-calculator.html': ['100 Amp Wire Size Calculator | Friendly Calculator', 'Estimate a wire size for a 100 amp application from the selected assumptions. Check local code, temperature, installation method and qualified electrical guidance.'],
  '24v-wire-size-calculator.html': ['24V Wire Size Calculator for Control Systems | Friendly Calculator', 'Estimate voltage drop and wire size for a 24V circuit using length, current and conductor assumptions. Verify the final design against applicable code.'],
  'amp-to-wire-size-calculator.html': ['Amp to Wire Size Calculator for Electrical Planning | Friendly Calculator', 'Estimate a conductor size from current and installation assumptions. Treat the result as preliminary and verify it against local electrical code.'],
  'ideal-gas-law-calculator.html': ['Ideal Gas Law Calculator for Process Engineering | Friendly Calculator', 'Calculate pressure, volume, temperature or amount of gas with the ideal gas law. Use absolute units and validate assumptions for real process systems.'],
  'pipe-volume.html': ['Pipe Volume Calculator for Plant Piping | Friendly Calculator', 'Calculate internal pipe volume from length and diameter. Use the result for fluid inventory, filling, flushing and preliminary piping estimates.'],
  'concrete-calculator.html': ['Concrete Volume Calculator for Plant and Construction | Friendly Calculator', 'Estimate concrete volume and material quantity from slab dimensions and mix assumptions for facility and construction planning.'],
  'paint-calculator.html': ['Paint Quantity Calculator for Industrial Coating | Friendly Calculator', 'Estimate paint quantity from surface area, coverage and coats. Adjust for the product data sheet, overspray and the actual application method.'],
  'inventory-turnover-calculator.html': ['Inventory Turnover Calculator for Manufacturing | Friendly Calculator', 'Calculate inventory turnover and days inventory outstanding from COGS and average inventory to support material and working-capital planning.'],
  'ending-inventory-calculator.html': ['Ending Inventory Calculator for Operations | Friendly Calculator', 'Calculate ending inventory from beginning stock, purchases and cost of goods sold for a period-based operations or manufacturing review.'],
  'fifo-calculator-for-inventory.html': ['FIFO Inventory Calculator for Materials | Friendly Calculator', 'Calculate inventory cost and remaining stock under the first-in, first-out method using a transparent layer-based approach for materials and operations.'],
  'lifo-calculator-for-inventory.html': ['LIFO Inventory Calculator for Materials | Friendly Calculator', 'Calculate inventory cost and remaining stock under the last-in, first-out method using clear inventory layers and entered cost assumptions.'],
  'direct-material-price-variance-calculator.html': ['Direct Material Price Variance Calculator | Friendly Calculator', 'Calculate direct material price variance by comparing actual and standard purchase prices with the quantity purchased. Useful for manufacturing cost control.'],
  'labor-cost-calculator.html': ['Labor Cost Calculator for Production Planning | Friendly Calculator', 'Calculate labor cost from hours, pay rate and additional labor assumptions for a production, staffing or job-cost estimate.'],
  'fte-calculator.html': ['FTE Calculator for Manufacturing Workforce Planning | Friendly Calculator', 'Convert total work hours into full-time equivalent staffing for a consistent period. Use it to compare production workforce capacity scenarios.'],
  'gmroi-calculator.html': ['GMROI Calculator for Inventory Planning | Friendly Calculator', 'Calculate gross margin return on inventory investment from sales, COGS and average inventory cost to compare stock productivity.'],
  'cogs-calculator.html': ['COGS Calculator for Manufacturing and Business | Friendly Calculator', 'Calculate cost of goods sold from beginning inventory, purchases and ending inventory for a period-based product or manufacturing review.'],
  'cash-conversion-cycle-calculator.html': ['Cash Conversion Cycle Calculator for Operations | Friendly Calculator', 'Calculate the cash conversion cycle from inventory, receivables and payables days to review working capital tied up in operations.'],
  'dimensional-weight-calculator.html': ['Dimensional Weight Calculator for Shipping | Friendly Calculator', 'Calculate dimensional weight from package dimensions and the carrier divisor to compare billable shipping weight for finished goods and materials.'],
  'pallet-calculator.html': ['Pallet Loading Calculator for Packaging | Friendly Calculator', 'Estimate how many boxes fit on a pallet from box and pallet dimensions. Use the result for preliminary packaging and warehouse planning.'],
  'roll-length-calculator.html': ['Roll Length Calculator for Materials | Friendly Calculator', 'Estimate roll length from outside diameter, core diameter and material thickness for paper, film, sheet and other rolled materials.'],
  'paper-weight-calculator.html': ['Paper Batch Weight Calculator | Friendly Calculator', 'Estimate paper batch weight from sheet size, GSM and quantity for packaging, printing and material purchasing calculations.'],
  'paper-thickness-calculator.html': ['Paper Thickness Calculator for Materials | Friendly Calculator', 'Estimate paper thickness from basis weight and material assumptions for packaging, printing and converting work.']
};

const related = {
  production_quality: ['takt-time-calculator.html', 'cycle-time-calculator.html', 'material-removal-rate-calculator.html', 'spindle-speed-calculator.html'],
  materials_industrial_physics: ['metal-weight-calculator.html', 'steel-weight-calculator.html', 'density-to-mass-calculator.html', 'pipe-volume.html'],
  inventory_costing_operations: ['inventory-turnover-calculator.html', 'ending-inventory-calculator.html', 'direct-material-price-variance-calculator.html', 'labor-cost-calculator.html']
};

const routeToGroup = new Map();
for (const group of groups) for (const file of group.routes) routeToGroup.set(`/calculators/${file}`, group.key);

module.exports = { site, hubPath, groups, seo, related, routeToGroup };
