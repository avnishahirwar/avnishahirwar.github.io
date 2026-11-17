(function(root){
  'use strict';
  const NA=6.02214076e23;
  const positive=(v,k)=>{if(!Number.isFinite(v[k])||v[k]<=0)throw new RangeError('Enter a positive finite value for '+k+'.');};
  const nonnegative=(v,k)=>{if(!Number.isFinite(v[k])||v[k]<0)throw new RangeError('Enter a non-negative finite value for '+k+'.');};
  const fmt=(n,d=6)=>Number(n).toPrecision(d);
  root.FriendlyChemistryCalculators={
    avogadro:v=>{positive(v,'moles');const n=v.moles*NA;return [['Avogadro constant',NA.toExponential(8)+' mol⁻¹'],['Number of particles',n.toExponential(8)]];},
    molarMassGas:v=>{for(const k of ['mass','temperature','pressure','volume'])positive(v,k);const m=v.mass*8.314462618*v.temperature/(v.pressure*v.volume);return [['Estimated molar mass',fmt(m)+' g/mol'],['Ideal-gas amount',fmt(v.pressure*v.volume/(8.314462618*v.temperature))+' mol']];},
    molesToAtoms:v=>{positive(v,'moles');if(!Number.isInteger(v.atomsPerMolecule)||v.atomsPerMolecule<1)throw new RangeError('Atoms per molecule must be a positive whole number.');const p=v.moles*NA;return [['Molecules or formula units',p.toExponential(8)],['Total atoms', (p*v.atomsPerMolecule).toExponential(8)]];},
    ppmToMolarity:v=>{for(const k of ['ppm','density','molarMass'])positive(v,k);const gl=v.ppm*v.density/1000,m=gl/v.molarMass;return [['Mass concentration',fmt(gl)+' g/L'],['Molarity',fmt(m)+' mol/L']];},
    residenceTime:v=>{for(const k of ['volume','flow'])positive(v,k);const min=v.volume/v.flow;return [['Residence time',fmt(min)+' min'],['Residence time',fmt(min/60)+' h']];},
    dilutionFactor:v=>{for(const k of ['stock','target','finalVolume'])positive(v,k);if(v.target>=v.stock)throw new RangeError('Target concentration must be lower than stock concentration for a dilution.');const df=v.stock/v.target,sv=v.finalVolume/df;return [['Dilution factor',fmt(df)],['Stock solution required',fmt(sv)+' mL'],['Diluent required',fmt(v.finalVolume-sv)+' mL']];},
    hendersonHasselbalch:v=>{for(const k of ['base','acid'])positive(v,k);if(!Number.isFinite(v.pKa))throw new RangeError('Enter a valid pKa.');const ratio=v.base/v.acid,pH=v.pKa+Math.log10(ratio);return [['Base-to-acid ratio',fmt(ratio)],['Estimated buffer pH',fmt(pH)]];},
    massPercent:v=>{for(const k of ['soluteMass','solventMass'])nonnegative(v,k);const total=v.soluteMass+v.solventMass;if(total<=0)throw new RangeError('Total solution mass must be greater than zero.');return [['Total solution mass',fmt(total)+' g'],['Mass percent (w/w)',fmt(v.soluteMass/total*100)+' %']];},
    percentageToMolarity:v=>{for(const k of ['percentWv','molarMass'])positive(v,k);const gl=v.percentWv*10;return [['Mass concentration',fmt(gl)+' g/L'],['Molarity',fmt(gl/v.molarMass)+' mol/L']];},
    ph:v=>{positive(v,'hydrogen');if(v.hydrogen>1)throw new RangeError('For this simplified concentration input, enter a value no greater than 1 mol/L.');return [['Calculated pH',fmt(-Math.log10(v.hydrogen))],['Hydrogen-ion concentration',v.hydrogen.toExponential(6)+' mol/L']];}
  };
})(globalThis);
