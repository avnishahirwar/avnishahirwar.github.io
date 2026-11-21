'use strict';
const site = 'https://friendlycalculator.in';
const hubPath = '/calculator/industry-calculators.html';
const groups = [
  { key: 'production_quality', title: 'Production, process control and quality', routes: [
    'takt-time-calculator.html','cycle-time-calculator.html','lead-time-calculator.html','material-removal-rate-calculator.html','spindle-speed-calculator.html','punch-force-calculator.html','countersink-depth-calculator.html','pitch-diameter-calculator.html','thread-pitch-calculator.html','true-position-calculator.html','brinell-hardness-number-calculator.html','rockwell-hardness-conversion-calculator.html','vickers-hardness-number-calculator.html','process-capability-index-calculator.html','factor-of-safety-calculator.html','actual-yield-calculator.html','theoretical-yield-calculator.html'
  ]},
  { key: 'process_chemical', title: 'Process engineering, chemistry and fluids', routes: [
    'ideal-gas-law-calculator.html','ideal-gas-density-calculator.html','ideal-gas-pressure-calculator.html','ideal-gas-temperature-calculator.html','ideal-gas-volume-calculator.html','boyles-law-calculator.html','stp-calculator-standard-temperature-and-pressure.html','molar-mass-of-gas-calculator.html','residence-time-calculator.html','mixing-ratio-calculator.html','molarity-calculator.html','normality-calculator.html','concentration-calculator.html','chemical-oxygen-demand-calculator.html','partial-pressure-calculator.html','vapor-pressure-calculator.html','boiling-point-calculator.html','activation-energy-calculator.html','arrhenius-equation-calculator.html','combustion-analysis-calculator.html','afr-calculator-air-fuel-ratio.html','cv-flow-calculator.html','differential-pressure-calculator.html','hydraulic-pressure-calculator.html','open-channel-flow-calculator.html','isentropic-flow-calculator.html'
  ]},
  { key: 'plant_energy_utilities', title: 'Plant energy, electrical and utilities', routes: [
    'pump-horsepower-calculator.html','100-amp-wire-size-calculator.html','24v-wire-size-calculator.html','amp-to-wire-size-calculator.html','generator-power-calculator.html','power-converter.html','energy-conversion-calculator.html','thermal-efficiency-calculator.html','thermal-energy-calculator.html','thermal-conductivity-calculator.html','thermal-diffusivity-calculator.html','thermal-resistance-calculator.html','heat-capacity-calculator.html','electricity-bill-calculator.html','appliance-energy-cost-calculator.html','eui-calculator-energy-use-intensity.html','fire-flow-calculator.html','water-density-calculator.html','water-pressure-at-depth-calculator.html','pipe-volume.html','pressure-unit-conversion.html'
  ]},
  { key: 'materials_structural', title: 'Materials, metals and facility engineering', routes: [
    'metal-weight-calculator.html','steel-weight-calculator.html','size-to-weight-calculator-rectangular-box.html','density-to-mass-calculator.html','density-to-weight-calculator.html','mass-to-density-calculator.html','density-calculator.html','cube-density-calculator.html','sphere-density-calculator.html','volume-to-density-calculator.html','concrete-calculator.html','concrete-tube-calculator.html','concrete-column-calculator.html','concrete-cylinder-calculator.html','rebar-calculator.html','pipe-weight-calculator.html','insulation-calculator.html','paint-calculator.html','thermal-stress-calculator.html','concrete-stairs-calculator.html','asphalt-calculator.html','gravel-calculator.html','sand-calculator.html','brick-calculator.html','paver-calculator.html'
  ]},
  { key: 'inventory_logistics_cost', title: 'Inventory, costing, packaging and logistics', routes: [
    'inventory-turnover-calculator.html','ending-inventory-calculator.html','fifo-calculator-for-inventory.html','lifo-calculator-for-inventory.html','safety-stock-calculator.html','direct-material-price-variance-calculator.html','labor-cost-calculator.html','fte-calculator.html','gmroi-calculator.html','cogs-calculator.html','cash-conversion-cycle-calculator.html','dimensional-weight-calculator.html','pallet-calculator.html','roll-length-calculator.html','paper-weight-calculator.html','paper-thickness-calculator.html','board-foot-calculator.html',
  ].filter(Boolean)},
  { key: 'business_operations', title: 'Business operations and industrial finance', routes: [
    'cobb-douglas-production-function-calculator.html','cash-flow-calculator.html','operating-cash-flow-calculator.html','free-cash-flow-calculator.html','operating-cash-flow-ratio-calculator.html','cash-flow-to-debt-ratio-calculator.html','margin-of-safety-calculator.html','working-capital-calculator.html','markup-calculator.html','roi-calculator.html','payback-period-calculator.html'
  ].filter(Boolean)}
];
const routeToGroup = new Map();
for (const group of groups) for (const file of group.routes) routeToGroup.set(`/calculators/${file}`, group.key);
module.exports = { site, hubPath, groups, routeToGroup };
