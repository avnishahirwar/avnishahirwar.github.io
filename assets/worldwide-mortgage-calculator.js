(function(root){'use strict';
const currencyPairs='AW:AWG AF:AFN AO:AOA AI:XCD AX:EUR AL:ALL AD:EUR AE:AED AR:ARS AM:AMD AS:USD TF:EUR AG:XCD AU:AUD AT:EUR AZ:AZN BI:BIF BE:EUR BJ:XOF BQ:USD BF:XOF BD:BDT BG:BGN BH:BHD BS:BSD BA:BAM BL:EUR BY:BYN BZ:BZD BM:BMD BO:BOB BR:BRL BB:BBD BN:BND BT:INR BV:NOK BW:BWP CF:XAF CA:CAD CC:AUD CH:CHF CL:CLP CN:CNY CI:XOF CM:XAF CD:CDF CG:XAF CK:NZD CO:COP KM:KMF CV:CVE CR:CRC CU:CUP CW:XCG CX:AUD KY:KYD CY:EUR CZ:CZK DE:EUR DJ:DJF DM:XCD DK:DKK DO:DOP DZ:DZD EC:USD EG:EGP ER:ERN EH:MAD ES:EUR EE:EUR ET:ETB FI:EUR FJ:FJD FK:FKP FR:EUR FO:DKK FM:USD GA:XAF GB:GBP GE:GEL GG:GBP GH:GHS GI:GIP GN:GNF GP:EUR GM:GMD GW:XOF GQ:XAF GR:EUR GD:XCD GL:DKK GT:GTQ GF:EUR GU:USD GY:GYD HK:HKD HM:AUD HN:HNL HR:EUR HT:HTG HU:HUF ID:IDR IM:GBP IN:INR IO:USD IE:EUR IR:IRR IQ:IQD IS:ISK IL:ILS IT:EUR JM:JMD JE:GBP JO:JOD JP:JPY KZ:KZT KE:KES KG:KGS KH:KHR KI:AUD KN:XCD KR:KRW KW:KWD LA:LAK LB:LBP LR:LRD LY:LYD LC:XCD LI:CHF LK:LKR LS:ZAR LT:EUR LU:EUR LV:EUR MO:MOP MF:EUR MA:MAD MC:EUR MD:MDL MG:MGA MV:MVR MX:MXN MH:USD MK:MKD ML:XOF MT:EUR MM:MMK ME:EUR MN:MNT MP:USD MZ:MZN MR:MRU MS:XCD MQ:EUR MU:MUR MW:MWK MY:MYR YT:EUR NA:ZAR NC:XPF NE:XOF NF:AUD NG:NGN NI:NIO NU:NZD NL:EUR NO:NOK NP:NPR NR:AUD NZ:NZD OM:OMR PK:PKR PA:PAB PN:NZD PE:PEN PH:PHP PW:USD PG:PGK PL:PLN PR:USD KP:KPW PT:EUR PY:PYG PS:ILS PF:XPF QA:QAR RE:EUR RO:RON RU:RUB RW:RWF SA:SAR SD:SDG SN:XOF SG:SGD GS:GBP SH:SHP SJ:NOK SB:SBD SL:SLE SV:USD SM:EUR SO:SOS PM:EUR RS:RSD SS:SSP ST:STN SR:SRD SK:EUR SI:EUR SE:SEK SZ:SZL SX:XCG SC:SCR SY:SYP TC:USD TD:XAF TG:XOF TH:THB TJ:TJS TK:NZD TM:TMT TL:USD TO:TOP TT:TTD TN:TND TR:TRY TV:AUD TW:TWD TZ:TZS UG:UGX UA:UAH UM:USD UY:UYU US:USD UZ:UZS VA:EUR VC:XCD VE:VES VG:USD VI:USD VN:VND VU:VUV WF:XPF WS:WST YE:YER ZA:ZAR ZM:ZMW ZW:USD XK:EUR';
const currencyByCountry=Object.fromEntries(currencyPairs.split(/\s+/).map(pair=>pair.split(':')));
// Prefer each market's domestic currency where CLDR lists a shared or foreign legal-tender currency first.
Object.assign(currencyByCountry,{BG:'EUR',BT:'BTN',LS:'LSL',NA:'NAD',ZW:'ZWG'});
function calculateWorldwideMortgage({homePrice,downPayment,annualInterestRate,termYears,annualPropertyTax=0,annualHomeInsurance=0,monthlyMaintenance=0}){
 const values={homePrice:Number(homePrice),downPayment:Number(downPayment),annualInterestRate:Number(annualInterestRate),termYears:Number(termYears),annualPropertyTax:Number(annualPropertyTax),annualHomeInsurance:Number(annualHomeInsurance),monthlyMaintenance:Number(monthlyMaintenance)};
 for(const [key,value] of Object.entries(values))if(!Number.isFinite(value))throw new TypeError(key+' must be a finite number.');
 if(values.homePrice<=0)throw new RangeError('Property price must be greater than zero.');
 if(values.downPayment<0||values.downPayment>=values.homePrice)throw new RangeError('Down payment must be at least zero and less than the property price.');
 if(values.annualInterestRate<0||values.annualInterestRate>100)throw new RangeError('Annual interest rate must be between 0% and 100%.');
 if(!Number.isInteger(values.termYears)||values.termYears<1||values.termYears>50)throw new RangeError('Mortgage term must be a whole number from 1 to 50 years.');
 if(values.annualPropertyTax<0||values.annualHomeInsurance<0||values.monthlyMaintenance<0)throw new RangeError('Property costs cannot be negative.');
 const principal=values.homePrice-values.downPayment,months=values.termYears*12,monthlyRate=values.annualInterestRate/1200;
 const monthlyPrincipalAndInterest=monthlyRate===0?principal/months:principal*monthlyRate/(1-Math.pow(1+monthlyRate,-months));
 const monthlyPropertyTax=values.annualPropertyTax/12,monthlyHomeInsurance=values.annualHomeInsurance/12;
 const monthlyHousingCost=monthlyPrincipalAndInterest+monthlyPropertyTax+monthlyHomeInsurance+values.monthlyMaintenance;
 return Object.freeze({principal,months,monthlyRate,monthlyPrincipalAndInterest,monthlyPropertyTax,monthlyHomeInsurance,monthlyMaintenance:values.monthlyMaintenance,monthlyHousingCost,totalPayments:monthlyPrincipalAndInterest*months,totalInterest:monthlyPrincipalAndInterest*months-principal,loanToValue:principal/values.homePrice*100,termYears:values.termYears});
}
const api=Object.freeze({currencyByCountry:Object.freeze(currencyByCountry),calculateWorldwideMortgage});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FCWorldwideMortgage=api;
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
const countrySelect=$('world-mortgage-country'),currencyInput=$('world-mortgage-currency'),form=$('world-mortgage-form'),result=$('world-mortgage-result'),error=$('world-mortgage-error'),schedule=$('world-mortgage-schedule');
const names=new Intl.DisplayNames(['en'],{type:'region'});
const codes=Object.keys(currencyByCountry).sort((a,b)=>names.of(a).localeCompare(names.of(b)));
for(const code of codes){const option=document.createElement('option');option.value=code;option.textContent=names.of(code)+' ('+code+')';countrySelect.appendChild(option);}
const formatter=()=>{const code=(currencyInput.value||'USD').trim().toUpperCase();return new Intl.NumberFormat(window.FCLocale?.getLocale?.()||navigator.language||'en',{style:'currency',currency:code,maximumFractionDigits:2});};
const selectedCountry=()=>codes.includes(countrySelect.value)?countrySelect.value:'US';
const setCurrencyForCountry=()=>{currencyInput.value=currencyByCountry[selectedCountry()]||'USD';};
countrySelect.addEventListener('change',setCurrencyForCountry);
const hash=new URLSearchParams(location.hash.replace(/^#/,''));
const requestedCountry=(hash.get('country')||'').trim().toLowerCase();
const countryAliases={'antigua and barbuda':'AG','bosnia and herzegovina':'BA','cabo verde':'CV','republic of the congo':'CG','democratic republic of the congo':'CD','myanmar':'MM','saint kitts and nevis':'KN','saint lucia':'LC','saint vincent and the grenadines':'VC','sao tome and principe':'ST','trinidad and tobago':'TT','turkey':'TR'};
const matching=countryAliases[requestedCountry]||codes.find(code=>names.of(code).toLowerCase()===requestedCountry);
const preferred=window.FCLocale?.getCountry?.();
countrySelect.value=matching|| (codes.includes(preferred)?preferred:'IN');
setCurrencyForCountry();
const currencyValid=()=>{try{formatter();return true;}catch(_){return false;}};
const money=n=>formatter().format(n);
function drawSchedule(data,principal){
 const rows=[],rate=data.monthlyRate,payment=data.monthlyPrincipalAndInterest;let balance=principal;
 for(let year=1;year<=data.termYears;year++){let principalPaid=0,interestPaid=0;for(let month=0;month<12;month++){const interest=balance*rate,paid=Math.min(balance,payment-interest);interestPaid+=interest;principalPaid+=paid;balance=Math.max(0,balance-paid);}rows.push({year,principalPaid,interestPaid,balance});}
 schedule.replaceChildren();const table=document.createElement('table');table.className='amortization-table';const head=document.createElement('thead'),hr=document.createElement('tr');
 for(const label of ['Year','Principal repaid','Interest paid','Remaining balance']){const th=document.createElement('th');th.textContent=label;hr.appendChild(th);}head.appendChild(hr);table.appendChild(head);
 const body=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');for(const value of [row.year,money(row.principalPaid),money(row.interestPaid),money(row.balance)]){const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);}body.appendChild(tr);}table.appendChild(body);schedule.appendChild(table);
}
form.addEventListener('submit',event=>{event.preventDefault();error.textContent='';result.replaceChildren();schedule.replaceChildren();try{
 if(!currencyValid())throw new RangeError('Enter a valid three-letter ISO 4217 currency code, such as USD, EUR, INR or JPY.');
 const data=calculateWorldwideMortgage({homePrice:$('world-home-price').value,downPayment:$('world-down-payment').value,annualInterestRate:$('world-interest-rate').value,termYears:$('world-term-years').value,annualPropertyTax:$('world-property-tax').value||0,annualHomeInsurance:$('world-home-insurance').value||0,monthlyMaintenance:$('world-monthly-maintenance').value||0});
 const summary=document.createElement('div');summary.className='summary-grid';
 const metrics=[['Estimated monthly housing cost',money(data.monthlyHousingCost)],['Monthly principal & interest',money(data.monthlyPrincipalAndInterest)],['Loan amount',money(data.principal)],['Loan-to-value',data.loanToValue.toFixed(2)+'%'],['Total interest over term',money(data.totalInterest)],['Total scheduled payments',money(data.totalPayments)]];
 for(const [label,value] of metrics){const card=document.createElement('div');card.className='metric';const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;card.append(small,strong);summary.appendChild(card);}
 result.appendChild(summary);const note=document.createElement('p');note.className='muted';note.textContent='Country: '+names.of(selectedCountry())+' · Currency: '+currencyInput.value.toUpperCase()+'. Currency changes the display only; the calculation uses the amounts and assumptions you enter.';result.appendChild(note);drawSchedule(data,data.principal);
 if(typeof window.gtag==='function')window.gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate_worldwide_mortgage'});
 }catch(e){error.textContent=e.message||'Check the entered values and try again.';}
});
})(typeof window!=='undefined'?window:globalThis);
