(()=>{'use strict';
const configs={
'crop-cost-profit':{title:'Crop Cost & Profit Calculator',fields:[
{id:'acres',label:'Cultivated area (acres)',def:2,min:0.01,max:500,step:0.1},
{id:'seed',label:'Seed cost (₹)',def:3000,min:0},{id:'fertilizer',label:'Fertilizer and crop-protection cost (₹)',def:8000,min:0},
{id:'labour',label:'Labour cost (₹)',def:12000,min:0},{id:'irrigation',label:'Irrigation and electricity cost (₹)',def:4000,min:0},
{id:'machinery',label:'Machinery and fuel cost (₹)',def:5000,min:0},{id:'other',label:'Other costs (₹)',def:2000,min:0},
{id:'yieldPerAcre',label:'Expected yield (quintals per acre)',def:18,min:0},{id:'price',label:'Expected sale price (₹ per quintal)',def:2200,min:0}],
slider:{key:'acres',min:0.1,max:50,step:0.1,label:'Cultivated area'},
run:v=>{const cost=v.seed+v.fertilizer+v.labour+v.irrigation+v.machinery+v.other, yieldTotal=v.acres*v.yieldPerAcre, revenue=yieldTotal*v.price, profit=revenue-cost;return {rows:[['Total cultivation cost',money(cost)],['Estimated total yield',quantity(yieldTotal)+' quintals'],['Estimated gross revenue',money(revenue)],['Estimated net profit / loss',money(profit)],['Cost per acre',money(cost/v.acres)],['Break-even sale price',money(yieldTotal?cost/yieldTotal:0)+' per quintal']],chart:[['Cost',cost],['Revenue',revenue],['Profit / loss',Math.max(0,profit)]]};}},
'kcc-interest':{title:'Kisan Credit Card Interest Calculator',fields:[
{id:'principal',label:'Outstanding KCC amount (₹)',def:100000,min:0,max:2000000,step:1000},
{id:'rate',label:'Annual interest rate entered by your bank (%)',def:7,min:0,max:50,step:0.1},
{id:'days',label:'Number of days outstanding',def:180,min:1,max:366,step:1}],
slider:{key:'principal',min:10000,max:1000000,step:10000,label:'Outstanding amount'},
run:v=>{const interest=v.principal*v.rate/100*v.days/365;return {rows:[['Estimated simple interest',money(interest)],['Principal plus estimated interest',money(v.principal+interest)],['Interest for 30 days (approx.)',money(v.principal*v.rate/100*30/365)]],chart:[['Principal',v.principal],['Interest',interest]]};}},
'livestock-profit':{title:'Livestock Cost & Profit Calculator',fields:[
{id:'animals',label:'Number of milch animals',def:4,min:1,max:500,step:1},
{id:'milk',label:'Milk per animal per day (litres)',def:8,min:0,max:100,step:0.1},
{id:'price',label:'Milk sale price (₹ per litre)',def:40,min:0,max:500,step:0.5},
{id:'days',label:'Working days in period',def:30,min:1,max:366,step:1},
{id:'feed',label:'Feed cost per animal per day (₹)',def:150,min:0},
{id:'vet',label:'Veterinary and medicine cost for period (₹)',def:1500,min:0},
{id:'labour',label:'Labour cost for period (₹)',def:3000,min:0},
{id:'other',label:'Other operating costs for period (₹)',def:1000,min:0}],
slider:{key:'animals',min:1,max:100,step:1,label:'Number of animals'},
run:v=>{const revenue=v.animals*v.milk*v.days*v.price,feed=v.animals*v.feed*v.days,cost=feed+v.vet+v.labour+v.other,profit=revenue-cost;return {rows:[['Estimated milk output',quantity(v.animals*v.milk*v.days)+' litres'],['Gross milk revenue',money(revenue)],['Total operating cost',money(cost)],['Estimated net operating surplus',money(profit)],['Feed cost',money(feed)]],chart:[['Revenue',revenue],['Operating cost',cost],['Surplus',Math.max(0,profit)]]};}},
'crop-yield-value':{title:'Crop Yield & Sale Value Calculator',fields:[
{id:'acres',label:'Harvested area (acres)',def:3,min:0.01,max:500,step:0.1},
{id:'yieldPerAcre',label:'Yield per acre (quintals)',def:20,min:0,max:500,step:0.1},
{id:'price',label:'Sale price (₹ per quintal)',def:2100,min:0,max:100000,step:1},
{id:'transport',label:'Transport and handling cost (₹)',def:2500,min:0},
{id:'market',label:'Market / weighing / other charges (₹)',def:1000,min:0}],
slider:{key:'yieldPerAcre',min:1,max:100,step:1,label:'Yield per acre'},
run:v=>{const total=v.acres*v.yieldPerAcre,gross=total*v.price,cost=v.transport+v.market;return {rows:[['Total harvested quantity',quantity(total)+' quintals'],['Gross sale value',money(gross)],['Transport and other charges',money(cost)],['Estimated net sale proceeds',money(gross-cost)],['Net value per quintal',money(total?(gross-cost)/total:0)]],chart:[['Gross sale value',gross],['Costs',cost],['Net proceeds',Math.max(0,gross-cost)]]};}},
'pm-kisan-checker':{title:'PM-KISAN Eligibility Checker',fields:[
{id:'land',label:'Does the farmer family hold cultivable land recorded in its name?',type:'select',def:'yes',options:[['yes','Yes'],['no','No'],['unknown','Not sure']]},
{id:'institutional',label:'Is the land held by an institutional landholder?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'government',label:'Is any family member in an excluded regular government service category?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'pension',label:'Does a family member receive a monthly pension of ₹10,000 or more (subject to scheme exceptions)?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'tax',label:'Did any family member pay income tax in the last assessment year?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'professional',label:'Is a family member a practising registered professional (such as doctor, lawyer, CA, engineer or architect)?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'newLand',label:'Was the land ownership acquired after 1 February 2019?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]}],
run:v=>{const hard=v.land==='no'||v.institutional==='yes'||v.government==='yes'||v.pension==='yes'||v.tax==='yes'||v.professional==='yes';const uncertain=Object.values(v).includes('unknown')||v.newLand==='yes';const status=hard?'One or more exclusion flags selected — likely not eligible under the standard screening rules.':uncertain?'Potential eligibility cannot be determined from these answers; official record verification is needed.':'The answers appear to meet the basic screening questions. This is not an approval or beneficiary confirmation.';return {rows:[['Screening result',status],['Annual scheme support shown on official portal','₹6,000 in three instalments'],['Next step','Complete eKYC and verify beneficiary status on PM-KISAN']],chart:[]};}},
'ayushman-checker':{title:'Ayushman Bharat Eligibility Checker',fields:[
{id:'age',label:'Applicant age (years)',def:35,min:0,max:120,step:1},
{id:'basis',label:'Which eligibility route may apply?',type:'select',def:'unknown',options:[['70plus','Senior citizen aged 70 or above'],['rural','Rural SECC deprivation / inclusion category'],['urban','Listed urban worker occupation category'],['unknown','Not sure / none of these']]}],
run:v=>{const senior=v.age>=70,listed=v.basis==='rural'||v.basis==='urban',match=senior||listed;return {rows:[['Initial screening',match?'A potential eligibility route is selected. Verify the household/person in the official beneficiary system.':'The information entered does not establish eligibility. Check the official beneficiary portal or helpline.'],['Coverage information','PM-JAY provides eligible families cashless hospital cover subject to current scheme rules.'],['Important','Age 70+ coverage is a separate senior-citizen route; other families are identified through notified criteria and records.']],chart:[]};}},
'apy-planner':{title:'Atal Pension Yojana Eligibility & Pension Planner',fields:[
{id:'citizen',label:'Are you an Indian citizen?',type:'select',def:'yes',options:[['yes','Yes'],['no','No']]},
{id:'age',label:'Age at enrolment (years)',def:25,min:1,max:100,step:1},
{id:'account',label:'Do you have a savings bank or post office savings account?',type:'select',def:'yes',options:[['yes','Yes'],['no','No']]},
{id:'taxpayer',label:'Are you an income-tax payer, or have you been one as of the application date?',type:'select',def:'no',options:[['no','No'],['yes','Yes']]}],
run:v=>{const eligible=v.citizen==='yes'&&v.age>=18&&v.age<=40&&v.account==='yes'&&v.taxpayer==='no';return {rows:[['Initial eligibility screen',eligible?'The answers meet the basic APY entry checks. Confirm account and application details with your bank or post office.':'One or more answers do not meet the standard APY entry checks.'],['Selected target pension',money(Number(v.pension||5000))+' per month from age 60'],['Contribution amount','Depends on enrolment age, pension slab and payment frequency. Use the official PFRDA contribution chart or ask the bank; no contribution amount is guessed here.']],chart:[]};}},
'pmay-checker':{title:'PMAY Eligibility Checker',fields:[
{id:'type',label:'Which housing programme applies?',type:'select',def:'urban',options:[['urban','PMAY-Urban 2.0'],['rural','PMAY-Gramin (rural)']]},
{id:'income',label:'Annual household income (₹)',def:300000,min:0,max:100000000,step:1000},
{id:'house',label:'Does the applicant/family own a pucca house anywhere in India?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'housingBenefit',label:'Has the family received a house under a government housing scheme in the last 20 years?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'family',label:'Is the applicant applying as an eligible household/family unit?',type:'select',def:'yes',options:[['yes','Yes'],['no','No'],['unknown','Not sure']]}],
run:v=>{if(v.type==='rural')return {rows:[['Screening result','PMAY-Gramin eligibility is based on rural beneficiary identification and official household lists; income alone cannot determine it.'],['Next step','Check the official PMAY-G / AwaasSoft beneficiary list with the Gram Panchayat or block office.']],chart:[]};const band=v.income<=300000?'EWS income band (up to ₹3 lakh)':v.income<=600000?'LIG income band (₹3–6 lakh)':v.income<=900000?'MIG income band (₹6–9 lakh)':'Above the standard PMAY-U 2.0 income ceiling';const uncertain=v.house==='unknown'||v.housingBenefit==='unknown'||v.family==='unknown';const ok=v.income<=900000&&v.house==='no'&&v.housingBenefit==='no'&&v.family==='yes';const status=uncertain?'One or more answers are unknown; official household and housing-benefit verification is needed.':ok?'The answers may fit a PMAY-U 2.0 screening route. Other vertical-specific and State/UT conditions still apply.':'The answers do not establish a PMAY-U 2.0 route. Review the current official rules and beneficiary process.';return {rows:[['Income-band screen',band],['Initial screening',status],['Other key condition','No pucca house anywhere in India and no government housing-scheme house benefit in the previous 20 years.'],['Important','States/UTs may have approved flexibility in EWS income criteria. This tool does not check official demand surveys, project lists or all exclusions.']],chart:[]};}},
'mudra-planner':{title:'MUDRA Loan Category & EMI Calculator',fields:[
{id:'amount',label:'Proposed loan amount (₹)',def:300000,min:1000,max:2000000,step:1000},
{id:'rate',label:'Annual interest rate quoted by lender (%)',def:12,min:0,max:50,step:0.1},
{id:'months',label:'Repayment tenure (months)',def:36,min:1,max:120,step:1},
{id:'tarunPaid',label:'For a loan above ₹10 lakh, have you successfully repaid a previous Tarun loan?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]}],
slider:{key:'amount',min:50000,max:2000000,step:25000,label:'Proposed loan amount'},
run:v=>{const i=v.rate/1200,n=v.months,emi=i===0?v.amount/n:v.amount*i/(1-Math.pow(1+i,-n));let band=v.amount<=50000?'Shishu (up to ₹50,000)':v.amount<=500000?'Kishore (above ₹50,000 to ₹5 lakh)':v.amount<=1000000?'Tarun (above ₹5 lakh to ₹10 lakh)':v.tarunPaid==='yes'?'Tarun Plus (above ₹10 lakh to ₹20 lakh; prior Tarun repayment condition applies)':'Above ₹10 lakh: Tarun Plus requires successful repayment of a previous Tarun loan.';return {rows:[['Indicative MUDRA category',band],['Estimated monthly EMI',money(emi)],['Estimated total repayment',money(emi*n)],['Estimated interest',money(emi*n-v.amount)],['Collateral note','The PMMY scheme is described as collateral-free; lender appraisal and terms still apply.']],chart:[['Principal',v.amount],['Estimated interest',Math.max(0,emi*n-v.amount)]]};}},
'ladli-behna-checker':{title:'MP Ladli Behna Eligibility Checker',fields:[
{id:'resident',label:'Is the applicant a local resident of Madhya Pradesh?',type:'select',def:'yes',options:[['yes','Yes'],['no','No']]},
{id:'ageRule',label:'Does the applicant meet the age / birth-date condition in the latest application notice?',type:'select',def:'unknown',options:[['yes','Yes'],['no','No'],['unknown','Not sure']]},
{id:'marital',label:'Marital status',type:'select',def:'married',options:[['married','Married'],['widow','Widow'],['divorced','Divorced'],['abandoned','Abandoned / deserted'],['unmarried','Unmarried']]},
{id:'income',label:'Combined annual family income (₹)',def:150000,min:0,max:100000000,step:1000},
{id:'tax',label:'Did any family member file an income-tax return because of taxable income in the previous year?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'government',label:'Is any family member a regular / permanent / contract government employee or pensioner?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]},
{id:'elected',label:'Does any family member fall under the listed elected representative / board or corporation office exclusions?',type:'select',def:'no',options:[['no','No'],['yes','Yes'],['unknown','Not sure']]}],
run:v=>{const married=['married','widow','divorced','abandoned'].includes(v.marital),uncertain=v.ageRule==='unknown'||v.tax==='unknown'||v.government==='unknown'||v.elected==='unknown',ok=v.resident==='yes'&&v.ageRule==='yes'&&married&&v.income<=250000&&v.tax==='no'&&v.government==='no'&&v.elected==='no';const status=uncertain?'One or more answers need confirmation against the latest official application notice.':ok?'The answers appear to meet the main screening conditions published in the official FAQ. Final approval depends on government verification.':'One or more answers fall outside the published screening conditions; review the current official FAQ and application notice.';return {rows:[['Initial screening',status],['Family income condition','Combined annual family income must not exceed ₹2.5 lakh under the published FAQ.'],['Benefit amount','Check the current official portal or application notice; benefit amounts and conditions may be revised.'],['Next step','Check application status, Samagra e-KYC and the applicant’s own Aadhaar-linked DBT-enabled bank account.']],chart:[]};}},
'job-change-salary':{title:'Job Change Take-home Salary Calculator',fields:[
{id:'current',label:'Current monthly take-home pay (₹)',def:45000,min:0},
{id:'ctc',label:'New annual CTC (₹)',def:900000,min:0},
{id:'variable',label:'Variable / performance pay share of CTC (%)',def:10,min:0,max:100,step:0.5},
{id:'pf',label:'Estimated employee PF per month (₹)',def:1800,min:0},
{id:'pt',label:'Professional tax per month (₹)',def:200,min:0},
{id:'tds',label:'Estimated TDS per month (₹)',def:2500,min:0},
{id:'other',label:'Other monthly deductions (₹)',def:0,min:0}],
slider:{key:'ctc',min:200000,max:5000000,step:50000,label:'New annual CTC'},
run:v=>{const fixed=v.ctc*(1-v.variable/100)/12,net=fixed-v.pf-v.pt-v.tds-v.other,delta=net-v.current;return {rows:[['New fixed monthly gross estimate',money(fixed)],['New estimated monthly take-home',money(net)],['Current monthly take-home',money(v.current)],['Estimated monthly difference',money(delta)],['Variable pay excluded from monthly take-home',money(v.ctc*v.variable/100)],['Estimated annual take-home (12 months)',money(net*12)]],chart:[['Current take-home',v.current],['New estimated take-home',Math.max(0,net)]]};}},
'first-job-salary':{title:'First Job Salary & In-hand Pay Calculator',fields:[
{id:'gross',label:'Monthly gross fixed salary (₹)',def:30000,min:0,max:1000000,step:100},
{id:'pf',label:'Employee PF deduction per month (₹)',def:1800,min:0},
{id:'pt',label:'Professional tax per month (₹)',def:200,min:0},
{id:'tds',label:'Estimated TDS per month (₹)',def:0,min:0},
{id:'other',label:'Other deductions per month (₹)',def:0,min:0},
{id:'bonus',label:'Annual variable pay / bonus (₹)',def:0,min:0}],
slider:{key:'gross',min:10000,max:200000,step:1000,label:'Monthly gross salary'},
run:v=>{const deductions=v.pf+v.pt+v.tds+v.other,net=v.gross-deductions;return {rows:[['Monthly gross fixed salary',money(v.gross)],['Total monthly deductions',money(deductions)],['Estimated monthly in-hand salary',money(net)],['Estimated annual fixed in-hand pay',money(net*12)],['Annual variable pay / bonus (separate)',money(v.bonus)],['Estimated annual total after stated deductions',money(net*12+v.bonus)]],chart:[['Gross fixed salary',v.gross],['Estimated in-hand',Math.max(0,net)],['Deductions',deductions]]};}}
};
configs['fd-rd-sip']={title:'FD vs RD vs SIP Comparison Calculator',fields:[
{id:'fdPrincipal',label:'One-time FD deposit (₹)',def:100000,min:0,max:100000000,step:1000},
{id:'fdRate',label:'Assumed annual FD rate (%)',def:7,min:0,max:30,step:0.1},
{id:'rdMonthly',label:'Monthly RD deposit (₹)',def:5000,min:0,max:10000000,step:100},
{id:'rdRate',label:'Assumed annual RD rate (%)',def:6.5,min:0,max:30,step:0.1},
{id:'sipMonthly',label:'Monthly SIP contribution (₹)',def:5000,min:0,max:10000000,step:100},
{id:'sipRate',label:'Assumed annual SIP return (%)',def:10,min:0,max:40,step:0.1},
{id:'years',label:'Common comparison period (years)',def:5,min:1,max:50,step:1}],
slider:{key:'sipMonthly',min:500,max:100000,step:500,label:'Monthly contribution'},
run:v=>{const n=Math.round(v.years*12),fd=v.fdPrincipal*Math.pow(1+v.fdRate/400,4*v.years),rdRate=v.rdRate/1200,sipRate=v.sipRate/1200,rd=rdRate===0?v.rdMonthly*n:v.rdMonthly*(Math.pow(1+rdRate,n)-1)/rdRate,sip=sipRate===0?v.sipMonthly*n:v.sipMonthly*(Math.pow(1+sipRate,n)-1)/sipRate;return {rows:[['Estimated FD maturity (quarterly compounding)',money(fd)],['Estimated RD maturity (monthly deposits)',money(rd)],['Illustrative SIP future value',money(sip)],['Total RD contributions',money(v.rdMonthly*n)],['Total SIP contributions',money(v.sipMonthly*n)]],chart:[['FD maturity',fd],['RD maturity',rd],['SIP illustration',sip]]};}};
const root=document.querySelector('[data-rural-tool]');if(!root)return;
const key=root.dataset.ruralTool,c=configs[key];if(!c)return;
const form=document.getElementById('ruralForm'),out=document.getElementById('ruralResult'),chart=document.getElementById('ruralChart'),sliderHost=document.getElementById('scenarioHost');
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const quantity=n=>Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
form.innerHTML=c.fields.map(f=>{if(f.type==='select')return '<label class="field"><span>'+esc(f.label)+'</span><select id="'+f.id+'">'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===f.def?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';return '<label class="field"><span>'+esc(f.label)+'</span><input id="'+f.id+'" type="number" inputmode="decimal" value="'+f.def+'" min="'+(f.min??0)+'" '+(f.max!=null?'max="'+f.max+'"':'')+' step="'+(f.step||'any')+'" required></label>';}).join('');
function values(){return Object.fromEntries(c.fields.map(f=>[f.id,f.type==='select'?document.getElementById(f.id).value:Number(document.getElementById(f.id).value)]));}
function run(){const v=values();if(c.fields.some(f=>f.type!=='select'&&(!Number.isFinite(v[f.id])||v[f.id]<(f.min??0)||(f.max!=null&&v[f.id]>f.max)))){out.textContent='Please check the entered values and allowed ranges.';chart.replaceChildren();return;}
const result=c.run(v);out.replaceChildren();result.rows.forEach(([label,value])=>{const card=document.createElement('div');card.className='result-row';const l=document.createElement('span');l.textContent=label;const val=document.createElement('strong');val.textContent=value;card.append(l,val);out.append(card);});
chart.replaceChildren();if(result.chart?.length){const max=Math.max(1,...result.chart.map(x=>Math.max(0,x[1])));result.chart.forEach(([label,value])=>{const row=document.createElement('div');row.className='chart-row';const caption=document.createElement('div');caption.className='chart-caption';caption.textContent=label+' · '+money(value);const track=document.createElement('div');track.className='chart-track';const bar=document.createElement('div');bar.className='chart-bar';bar.style.width=Math.max(1,Math.min(100,value/max*100))+'%';track.append(bar);row.append(caption,track);chart.append(row);});}}
form.addEventListener('input',run);form.addEventListener('submit',e=>{e.preventDefault();run();});
if(c.slider){const f=c.fields.find(x=>x.id===c.slider.key);const input=document.getElementById(c.slider.key);const wrap=document.createElement('label');wrap.className='scenario';const text=document.createElement('span');text.textContent='What-if: '+c.slider.label;const range=document.createElement('input');range.type='range';range.min=c.slider.min;range.max=c.slider.max;range.step=c.slider.step;range.value=Math.max(c.slider.min,Math.min(c.slider.max,Number(input.value)));const value=document.createElement('output');value.textContent=range.value;range.addEventListener('input',()=>{input.value=range.value;value.textContent=range.value;run();});input.addEventListener('input',()=>{const n=Number(input.value);if(Number.isFinite(n)&&n>=c.slider.min&&n<=c.slider.max){range.value=n;value.textContent=n;}});wrap.append(text,range,value);sliderHost.append(wrap);}
run();
const print=document.getElementById('printResult');if(print)print.addEventListener('click',()=>window.print());
const png=document.getElementById('imageResult');if(png)png.addEventListener('click',()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=720;const ctx=canvas.getContext('2d');ctx.fillStyle='#f4f6f8';ctx.fillRect(0,0,1200,720);ctx.fillStyle='#101c2c';ctx.font='bold 42px Arial';ctx.fillText('Friendly Calculator',64,78);ctx.font='bold 30px Arial';ctx.fillText(c.title,64,140);ctx.font='22px Arial';ctx.fillStyle='#526273';ctx.fillText('Illustrative result · '+new Date().toLocaleDateString('en-IN'),64,180);let y=245;[...out.querySelectorAll('.result-row')].forEach(card=>{ctx.fillStyle='#fff';ctx.fillRect(64,y-34,1072,66);ctx.fillStyle='#334155';ctx.font='20px Arial';ctx.fillText(card.querySelector('span').textContent.slice(0,65),88,y);ctx.fillStyle='#101c2c';ctx.font='bold 20px Arial';ctx.textAlign='right';ctx.fillText(card.querySelector('strong').textContent.slice(0,45),1108,y);ctx.textAlign='left';y+=78;});ctx.fillStyle='#526273';ctx.font='16px Arial';ctx.fillText('Check assumptions and official rules before relying on this estimate.',64,680);canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=key+'-result.png';a.click();URL.revokeObjectURL(a.href);},'image/png');});
const embed=document.getElementById('embedCode');if(embed){const url='https://friendlycalculator.in'+location.pathname+'?embed=1';embed.value='<iframe src="'+url+'" title="'+c.title+' by Friendly Calculator" loading="lazy" width="100%" height="760" style="border:0"></iframe>\n<p>Powered by <a href="https://friendlycalculator.in/" rel="noopener">Friendly Calculator</a></p>';}
const copy=document.getElementById('copyEmbed');if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(embed.value);copy.textContent='Embed code copied';}catch(_){copy.textContent='Select and copy the code above';}});
})();