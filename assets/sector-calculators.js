(function (root) {
  'use strict';
  const definitions = {
    oee: {
      title: 'Overall Equipment Effectiveness (OEE) Calculator',
      intro: 'Estimate manufacturing OEE from availability, performance and quality using production-shift data.',
      fields: [
        ['planned','Planned production time','minutes'],['downtime','Unplanned downtime','minutes'],
        ['cycle','Ideal cycle time per unit','seconds'],['total','Total units produced','units'],['good','Good units produced','units']
      ],
      calculate(v) {
        positive(v.planned,'Planned production time'); nonnegative(v.downtime,'Downtime'); positive(v.cycle,'Ideal cycle time');
        positive(v.total,'Total units'); nonnegative(v.good,'Good units');
        if(v.downtime>=v.planned) throw Error('Downtime must be less than planned production time.');
        if(v.good>v.total) throw Error('Good units cannot exceed total units.');
        const operating=v.planned-v.downtime, availability=operating/v.planned;
        const performance=(v.cycle*v.total)/(operating*60), quality=v.good/v.total;
        return {Availability:pct(availability),Performance:pct(performance),Quality:pct(quality),'Overall equipment effectiveness':pct(availability*performance*quality),note:performance>1?'Performance exceeds 100%; verify ideal cycle time and production counts.':'OEE = Availability × Performance × Quality.'};
      }
    },
    revpar: {
      title: 'Hotel RevPAR Calculator',
      intro: 'Calculate revenue per available room from room revenue and available room nights, with ADR and occupancy context.',
      fields: [['revenue','Room revenue for the period','currency'],['available','Available room nights','room nights'],['sold','Room nights sold','room nights']],
      calculate(v) {
        nonnegative(v.revenue,'Room revenue'); positive(v.available,'Available room nights'); nonnegative(v.sold,'Room nights sold');
        if(v.sold>v.available) throw Error('Room nights sold cannot exceed available room nights.');
        return {'RevPAR':money(v.revenue/v.available),'Average daily rate (ADR)':v.sold?money(v.revenue/v.sold):'Not available (no rooms sold)','Occupancy rate':pct(v.sold/v.available),note:'RevPAR = room revenue ÷ available room nights. Excludes non-room revenue unless included in the revenue input.'};
      }
    },
    foodcost: {
      title: 'Restaurant Food Cost Calculator',
      intro: 'Estimate food cost percentage and gross profit from ingredient cost and food sales for the same menu item or period.',
      fields: [['ingredient','Ingredient / food cost','currency'],['sales','Food sales revenue','currency']],
      calculate(v) {
        nonnegative(v.ingredient,'Ingredient cost'); positive(v.sales,'Food sales revenue');
        return {'Food cost percentage':pct(v.ingredient/v.sales),'Gross profit before other expenses':money(v.sales-v.ingredient),'Food cost amount':money(v.ingredient),note:'Food cost % = ingredient cost ÷ food sales × 100. Excludes labor, rent, tax, delivery fees and other operating expenses.'};
      }
    },
    freight: {
      title: 'Freight Cost Calculator',
      intro: 'Estimate chargeable freight weight using actual versus dimensional weight, then apply a carrier rate and fixed charges.',
      fields: [['actual','Actual shipment weight','kg'],['length','Package length','cm'],['width','Package width','cm'],['height','Package height','cm'],['divisor','Dimensional weight divisor','cm³/kg'],['rate','Rate per chargeable kg','currency'],['fixed','Fixed freight and handling charges','currency']],
      calculate(v) {
        positive(v.actual,'Actual weight'); positive(v.length,'Length'); positive(v.width,'Width'); positive(v.height,'Height'); positive(v.divisor,'Dimensional divisor'); nonnegative(v.rate,'Rate'); nonnegative(v.fixed,'Fixed charges');
        const dim=(v.length*v.width*v.height)/v.divisor, billable=Math.max(v.actual,dim);
        return {'Dimensional weight':num(dim)+' kg','Chargeable weight':num(billable)+' kg','Estimated freight cost':money(billable*v.rate+v.fixed),note:'Chargeable weight is the greater of actual and dimensional weight. Carrier divisors, rounding, minimum charges, taxes and surcharges vary; confirm the carrier tariff.'};
      }
    },
    shipping: {
      title: 'Shipping Cost Calculator',
      intro: 'Estimate a parcel shipping charge from a base fee, weight rate, fuel surcharge, handling and insurance.',
      fields: [['base','Base shipping charge','currency'],['weight','Billable package weight','kg'],['rate','Rate per kg','currency'],['fuel','Fuel surcharge','%'],['handling','Handling fee','currency'],['insurance','Insurance fee','currency']],
      calculate(v) {
        nonnegative(v.base,'Base charge'); nonnegative(v.weight,'Package weight'); nonnegative(v.rate,'Rate per kg'); nonnegative(v.fuel,'Fuel surcharge'); nonnegative(v.handling,'Handling fee'); nonnegative(v.insurance,'Insurance fee');
        const transport=v.base+v.weight*v.rate, surcharge=transport*v.fuel/100, total=transport+surcharge+v.handling+v.insurance;
        return {'Transport charge':money(transport),'Fuel surcharge':money(surcharge),'Handling and insurance':money(v.handling+v.insurance),'Estimated shipping total':money(total),note:'Fuel surcharge is applied to base plus weight charge. Carrier-specific taxes, remote-area fees, dimensional weight and minimums are not included.'};
      }
    },
    machine: {
      title: 'Machine Utilization Calculator',
      intro: 'Measure productive machine run time against scheduled time after planned maintenance is excluded.',
      fields: [['scheduled','Scheduled production time','hours'],['maintenance','Planned maintenance / excluded time','hours'],['run','Actual productive run time','hours']],
      calculate(v) {
        positive(v.scheduled,'Scheduled time'); nonnegative(v.maintenance,'Planned maintenance'); nonnegative(v.run,'Run time');
        if(v.maintenance>=v.scheduled) throw Error('Planned maintenance must be less than scheduled time.');
        const available=v.scheduled-v.maintenance;
        if(v.run>available) throw Error('Run time cannot exceed scheduled time after planned maintenance.');
        return {'Net available time':num(available)+' hours','Machine utilization':pct(v.run/available),'Idle time':num(available-v.run)+' hours',note:'Utilization = productive run time ÷ (scheduled time − planned maintenance). This is not the same as OEE.'};
      }
    },
    fabric: {
      title: 'Fabric Consumption Calculator',
      intro: 'Estimate fabric length for a production order using pattern area, fabric width, utilization efficiency and additional wastage.',
      fields: [['area','Pattern area per garment','m²'],['qty','Order quantity','garments'],['width','Usable fabric width','cm'],['efficiency','Marker / layout efficiency','%'],['waste','Additional wastage allowance','%']],
      calculate(v) {
        positive(v.area,'Pattern area'); positive(v.qty,'Order quantity'); positive(v.width,'Fabric width'); positive(v.efficiency,'Layout efficiency'); nonnegative(v.waste,'Wastage allowance');
        if(v.efficiency>100) throw Error('Layout efficiency cannot exceed 100%.');
        const base=(v.area*v.qty)/(v.width/100*(v.efficiency/100)), total=base*(1+v.waste/100);
        return {'Net fabric length before wastage':num(base)+' m','Additional wastage':num(total-base)+' m','Estimated fabric to plan':num(total)+' m',note:'Estimate assumes pattern area and usable width use compatible units. Real marker layout, selvedges, shrinkage, matching, defects and roll-end losses can change consumption.'};
      }
    }
  };
  function positive(n,label){if(!Number.isFinite(n)||n<=0)throw Error(label+' must be greater than zero.')}
  function nonnegative(n,label){if(!Number.isFinite(n)||n<0)throw Error(label+' cannot be negative.')}
  function num(n){return new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(n)}
  function pct(n){return num(n*100)+'%'}
  function money(n){return num(n)+' (same currency unit as input)'}
  function init(){
    const form=document.getElementById('calc-form'), output=document.getElementById('calc-result');
    if(!form||!output)return;
    const key=document.body.dataset.calculator, def=definitions[key];
    if(!def){output.textContent='Calculator configuration is unavailable.';return}
    form.innerHTML=def.fields.map(([id,label,unit])=>'<label>'+label+' ('+unit+')<input required type="number" min="0" step="any" id="'+id+'" inputmode="decimal"></label>').join('');
    document.getElementById('calc-run').addEventListener('click',()=>{
      const values={};
      for(const [id,label] of def.fields){
        const input=document.getElementById(id), value=input.valueAsNumber;
        if(input.value===''||!Number.isFinite(value)){output.textContent='Please enter a valid number for '+label+'.';return}
        values[id]=value;
      }
      try{
        const result=def.calculate(values);
        output.innerHTML='<h2>Estimated result</h2><dl>'+Object.entries(result).filter(([k])=>k!=='note').map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl><p>'+result.note+'</p>';
      }catch(error){output.textContent=error.message}
    });
  }
  const api={definitions};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root&&root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init);else init()}
})(typeof window!=='undefined'?window:globalThis);