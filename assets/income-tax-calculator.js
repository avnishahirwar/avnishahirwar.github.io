(() => {
  "use strict";
  const localDateString = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  const definitions = { "income tax calculator india": {title:"Income Tax Calculator (Tax Year 2026–27)",fields:[["grossSalary","Annual gross salary (₹)","number",1275000],["standardDeduction","Standard deduction (₹) — enter the amount for your selected regime","number",75000],["age","Age attained during the tax year (years)","number",35],["regime","Tax regime","select",["New regime — Tax Year 2026–27","Old regime — individual"]],["residency","Residential status","select",["Resident individual","Non-resident"]]],calc:v=>{
      if(!Number.isFinite(v.grossSalary)||v.grossSalary<0||v.grossSalary>500000000||!Number.isFinite(v.standardDeduction)||v.standardDeduction<0||v.standardDeduction>v.grossSalary||!Number.isInteger(v.age)||v.age<0||v.age>120)return [];
      const taxable=Math.max(0,v.grossSalary-v.standardDeduction),newRegime=v.regime.startsWith("New"),resident=v.residency==="Resident individual";
      const slabs=newRegime?[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]]:(resident&&v.age>=80?[[500000,0],[1000000,.20],[Infinity,.30]]:resident&&v.age>=60?[[300000,0],[500000,.05],[1000000,.20],[Infinity,.30]]:[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]]);
      const slabTax=income=>{let previous=0,total=0;for(const [cap,rate] of slabs){total+=Math.max(0,Math.min(income,cap)-previous)*rate;previous=cap;if(income<=cap)break;}return total;};
      const taxBeforeRebate=slabTax(taxable);let rebate=0;
      if(resident&&newRegime){rebate=taxable<=1200000?Math.min(taxBeforeRebate,60000):Math.min(taxBeforeRebate,Math.max(0,taxBeforeRebate-(taxable-1200000)));}
      else if(resident&&!newRegime&&taxable<=500000)rebate=Math.min(taxBeforeRebate,12500);
      const taxAfterRebate=Math.max(0,taxBeforeRebate-rebate);
      const surchargeBands=newRegime?[[5000000,.10],[10000000,.15],[20000000,.25],[50000000,.25]]:[[5000000,.10],[10000000,.15],[20000000,.25],[50000000,.37]];
      let surchargeRate=0,threshold=0,thresholdRate=0;
      for(const [limit,rate] of surchargeBands){if(taxable>limit){threshold=limit;thresholdRate=surchargeRate;surchargeRate=rate;}else break;}
      let surcharge=taxAfterRebate*surchargeRate,surchargeRelief=0;
      if(threshold>0){const baseline=slabTax(threshold)*(1+thresholdRate),maximum=baseline+(taxable-threshold),actual=taxAfterRebate+surcharge;if(actual>maximum){surchargeRelief=actual-maximum;surcharge=Math.max(0,surcharge-surchargeRelief);}}
      const cess=(taxAfterRebate+surcharge)*.04,total=taxAfterRebate+surcharge+cess;
      return [["Annual gross salary",v.grossSalary],["Standard deduction entered",v.standardDeduction],["Estimated taxable salary income",taxable],["Tax before rebate",taxBeforeRebate],["Section 87A rebate / marginal relief",rebate],["Surcharge rate",surchargeRate*100,"%"],["Surcharge after marginal relief",surcharge],["Marginal relief on surcharge",surchargeRelief],["Health and education cess (4%)",cess],["Estimated tax including surcharge and cess",total]];
    }} };

  const money = n => window.FCLocale?window.FCLocale.formatCurrency(n,window.FCLocale.getCurrency(),{maximumFractionDigits:2}):"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
  const formatResult = (value,unit) => typeof value==="string"?value:unit==="%"?(window.FCLocale?window.FCLocale.formatNumber(value,{minimumFractionDigits:2,maximumFractionDigits:2}):Number(value).toFixed(2))+"%":unit==="number"?(window.FCLocale?window.FCLocale.formatNumber(value,{minimumFractionDigits:2,maximumFractionDigits:2}):Number(value).toFixed(2)):unit==="L"?(window.FCLocale?window.FCLocale.formatNumber(value,{minimumFractionDigits:2,maximumFractionDigits:2}):Number(value).toFixed(2))+" L":money(value);
  function init(){
    const h1=document.querySelector("main h1, h1"); if(!h1)return;
    if(document.querySelector("[data-fc-native-calculator]"))return;
    const key=h1.textContent.trim().toLowerCase();
    const pageAliases={"/calculators/home-loan-emi-calculator.html":"loan emi calculator","/calculators/loan-to-value-calculator.html":"loan to value calculator","/calculators/cogs-calculator.html":"cogs calculator","/calculators/fd-calculator.html":"fixed deposit calculator","/calculators/epf-pf-calculator.html":"epf / pf calculator","/calculators/profit-loss-calculator.html":"profit & loss calculator","/calculators/income-tax-calculator.html":"income tax calculator india","/calculators/bmi-calculator.html":"bmi calculator"};
    const normalizedPath=location.pathname.replace(/\/+$/,"");
    const lookupKey=pageAliases[normalizedPath]||pageAliases[normalizedPath+".html"]||(key==="gst calculator india"?"gst calculator":key);
    const def=definitions[lookupKey]; if(!def)return;
    const existingPanel=document.getElementById("live-page-calculator");
    const panel=existingPanel||document.createElement("section"); panel.id="live-page-calculator";panel.className=existingPanel?existingPanel.className:"panel";panel.style.scrollMarginTop="100px";
    panel.replaceChildren();
    const heading=document.createElement("h2");heading.textContent="Use the "+def.title;panel.appendChild(heading);
    const form=document.createElement("form");form.noValidate=true;form.style.display="grid";form.style.gridTemplateColumns="repeat(auto-fit,minmax(210px,1fr))";form.style.gap="12px";
    def.fields.forEach(([id,label,type,initial])=>{const wrap=document.createElement("label");wrap.style.display="grid";wrap.style.gap="5px";wrap.style.fontWeight="600";wrap.textContent=label;wrap.dataset.fcLabelTemplate=label;let input;if(type==="select"){input=document.createElement("select");initial.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=id==="frequency"?({"1":"Annually (1 time/year)","2":"Semi-annually (2 times/year)","4":"Quarterly (4 times/year)","12":"Monthly (12 times/year)"}[v]||v):v;input.appendChild(o)})}else{input=document.createElement("input");input.type=type;input.step="any";input.value=initial}input.name=id;input.required=true;input.style.cssText="width:100%;padding:11px;border:1px solid #cbd5df;border-radius:8px;font:inherit";wrap.appendChild(input);form.appendChild(wrap)});
    const updateCurrencyLabels=()=>{const code=window.FCLocale?.getCurrency?.()||'INR';let symbol='₹';try{symbol=new Intl.NumberFormat(window.FCLocale?.getLocale?.()||'en-IN',{style:'currency',currency:code}).formatToParts(0).find(part=>part.type==='currency')?.value||symbol;}catch(_){}form.querySelectorAll('[data-fc-label-template]').forEach(label=>{const template=label.dataset.fcLabelTemplate||'';const textNode=[...label.childNodes].find(node=>node.nodeType===3);if(textNode&&template.includes('₹'))textNode.nodeValue=template.replace(/₹/g,symbol);});};
    updateCurrencyLabels();window.addEventListener('fc:localechange',updateCurrencyLabels);window.addEventListener('fc:locale-ready',updateCurrencyLabels);window.addEventListener('load',updateCurrencyLabels,{once:true});
    if(lookupKey==="income tax calculator india"){const regime=form.elements.regime,deduction=form.elements.standardDeduction;regime.addEventListener("change",()=>{deduction.value=regime.value.startsWith("New")?"75000":"50000";});}
    const button=document.createElement("button");button.type="submit";button.textContent="Calculate";button.className="btn";button.style.cssText="border:0;cursor:pointer;grid-column:1/-1";form.appendChild(button);
    const output=document.createElement("div");output.setAttribute("aria-live","polite");output.style.cssText="margin-top:16px;padding:14px;background:#edf3f7;border-radius:10px;display:none";let localeRefresh=false;const refreshForLocale=()=>{if(output.style.display!=="none"&&typeof form.requestSubmit==="function"){localeRefresh=true;try{form.requestSubmit();}finally{localeRefresh=false;}}};window.addEventListener("fc:localechange",refreshForLocale);window.addEventListener("fc:locale-ready",refreshForLocale);
    form.addEventListener("submit",e=>{e.preventDefault();const values={};for(const [id,,type] of def.fields){const el=form.elements[id];if(type==="date"){values[id]=el.value;if(!values[id]){output.textContent="Please enter both dates.";output.style.display="block";return}}else if(type==="select"){values[id]=el.value}else{const raw=el.value.trim();values[id]=Number(raw);if(!raw||!Number.isFinite(values[id])||values[id]<0){output.textContent="Please enter valid non-negative values in every field.";output.style.display="block";return}}}const positiveFields=["principal","monthly","mileage","days","hours","loan","value","area","qtyA","qtyB"];if(positiveFields.some(id=>id in values&&values[id]<=0)||(def.title==="Loan EMI Calculator"&&values.years<=0)||(def.title==="Fixed Deposit Calculator"&&values.years<=0)||(def.title==="EPF / PF Calculator"&&values.years<=0)||(lookupKey==="salary tds calculator"&&(values.months<1||values.months>12||!Number.isInteger(values.months)||values.income>500000000||values.paid>500000000))||(lookupKey==="gold loan calculator"&&values.months<=0)||(values.cost!==undefined&&values.cost<=0)||(lookupKey==="cogs calculator"&&values.closing>values.opening+values.purchases)||(values.height!==undefined&&(values.height<50||values.height>260))||(values.weight!==undefined&&(values.weight<2||values.weight>350))||(lookupKey==="income tax calculator india"&&(values.age>120||values.standardDeduction>values.grossSalary))||(values.rate!==undefined&&values.rate>100)||(["rateA","rateB","rateC","fdRate","rdRate","sipRate"].some(id=>id in values&&values[id]>100))||(lookupKey==="discount calculator"&&values.rate>100)){output.textContent="Please check the entered values and allowed ranges.";output.style.display="block";return}const rows=def.calc(values);if(!rows.length){output.textContent="Please check the dates and values.";output.style.display="block";return}output.replaceChildren();
      const table=document.createElement("table");table.className="fc-result-table";
      const caption=document.createElement("caption");caption.textContent="Calculation results";table.appendChild(caption);
      const thead=document.createElement("thead"),headRow=document.createElement("tr");
      ["Result","Value"].forEach(label=>{const th=document.createElement("th");th.scope="col";th.textContent=label;headRow.appendChild(th)});
      thead.appendChild(headRow);table.appendChild(thead);
      const tbody=document.createElement("tbody");
      rows.forEach(([label,value,suffix])=>{const tr=document.createElement("tr"),name=document.createElement("th"),val=document.createElement("td");name.scope="row";name.textContent=label;val.textContent=formatResult(value,suffix);tr.append(name,val);tbody.appendChild(tr)});
      table.appendChild(tbody);output.appendChild(table);
      const numeric=lookupKey==="fuel cost calculator"?[]:rows.filter(row=>typeof row[1]==="number"&&Number.isFinite(row[1])&&row[1]>=0&&!row[2]);if(lookupKey==="bmi calculator")numeric.push(...rows.filter(row=>row[2]==="number"&&typeof row[1]==="number"&&Number.isFinite(row[1])&&row[1]>=0));
      if(numeric.length>=1&&numeric.length<=12&&numeric.every(row=>!row[2])){
        const chart=document.createElement("section");chart.className="fc-result-chart";
        const title=document.createElement("h3");title.textContent=def.title==="BMI Calculator"?"BMI number visual (not a health classification)":"Result comparison chart";chart.appendChild(title);
        const note=document.createElement("p");note.textContent=def.title==="BMI Calculator"?"The marker shows only the calculated number on a neutral 0–50 scale. It does not indicate a diagnosis or adult category.":"Bars use a shared relative scale; compare values only within this calculation.";chart.appendChild(note);
        const max=def.title==="BMI Calculator"?50:Math.max(...numeric.map(row=>row[1]),1);
        numeric.forEach(([label,value])=>{const item=document.createElement("div");item.className="fc-chart-item";
          const top=document.createElement("div");top.className="fc-chart-label";const name=document.createElement("span"),amount=document.createElement("strong");name.textContent=label;amount.textContent=formatResult(value,rows.find(row=>row[0]===label)?.[2]);top.append(name,amount);
          const track=document.createElement("div");track.className="fc-chart-track";const bar=document.createElement("span");bar.className="fc-chart-bar";bar.style.width=Math.max(2,value/max*100)+"%";track.appendChild(bar);item.append(top,track);chart.appendChild(item)});
        output.appendChild(chart);
      }
      if(key==="age calculator"&&numeric.length===0){const match=String(rows[0]&&rows[0][1]||"").match(/(\d+) years, (\d+) months, (\d+) days/);if(match){const chart=document.createElement("section");chart.className="fc-result-chart";const title=document.createElement("h3");title.textContent="Age breakdown";chart.appendChild(title);[["Years",match[1]],["Months",match[2]],["Days",match[3]]].forEach(([label,value])=>{const item=document.createElement("div");item.className="fc-chart-item";const top=document.createElement("div");top.className="fc-chart-label";const name=document.createElement("span"),amount=document.createElement("strong");name.textContent=label;amount.textContent=value;top.append(name,amount);item.appendChild(top);chart.appendChild(item)});output.appendChild(chart)}}
      // Build a true month-by-month reducing-balance schedule for common EMI tools.
      // This supplements the result summary table; it does not replace calculator output.
      const amortizationKeys=new Set(["loan emi calculator","car loan calculator","bike loan calculator","education loan calculator","loan against property calculator"]);
      if(amortizationKeys.has(lookupKey)&&["principal","rate","years"].every(id=>id in values)){
        const months=Math.round(values.years*12),monthlyRate=values.rate/1200;let principalAmount=values.principal;if(lookupKey==="education loan calculator"&&Number.isFinite(values.months)&&values.months>0)principalAmount+=values.principal*values.rate/100*values.months/12;
        if(months>0&&months<=600&&principalAmount>0){
          const paymentRow=rows.find(row=>/monthly emi/i.test(row[0]));
          const regularPayment=paymentRow&&typeof paymentRow[1]==="number"?paymentRow[1]:(monthlyRate===0?principalAmount/months:principalAmount*monthlyRate*Math.pow(1+monthlyRate,months)/(Math.pow(1+monthlyRate,months)-1));
          let balance=principalAmount,totalInterest=0;
          const schedule=document.createElement("section");schedule.className="fc-amortization";
          schedule.style.cssText="margin-top:18px;padding:14px;background:#fff;border:1px solid #d9e2ea;border-radius:10px";
          const heading=document.createElement("h3");heading.textContent="Monthly loan amortization schedule";schedule.appendChild(heading);
          const intro=document.createElement("p");intro.textContent="Each row separates the monthly payment into principal and interest and shows the remaining loan balance. Assumes a constant rate and monthly payments.";schedule.appendChild(intro);
          const scroller=document.createElement("div");scroller.style.cssText="overflow:auto;max-height:460px;border:1px solid #e1e7ed;border-radius:8px";
          const scheduleTable=document.createElement("table");scheduleTable.className="fc-result-table";scheduleTable.style.cssText="width:100%;min-width:720px;border-collapse:collapse";
          const scheduleHead=document.createElement("thead"),scheduleHeadRow=document.createElement("tr");
          ["Payment","Opening balance","EMI","Principal","Interest","Closing balance"].forEach(label=>{const th=document.createElement("th");th.scope="col";th.textContent=label;th.style.cssText="position:sticky;top:0;background:#edf3f7;z-index:1;padding:9px;text-align:right";scheduleHeadRow.appendChild(th)});
          scheduleHead.appendChild(scheduleHeadRow);scheduleTable.appendChild(scheduleHead);
          const scheduleBody=document.createElement("tbody");
          const money=value=>window.FCLocale?window.FCLocale.formatCurrency(value,window.FCLocale.getCurrency(),{minimumFractionDigits:2,maximumFractionDigits:2}):"₹"+value.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
          for(let month=1;month<=months;month++){
            const opening=balance,interest=opening*monthlyRate,actualPayment=Math.min(regularPayment,opening+interest),principalPaid=Math.min(opening,Math.max(0,actualPayment-interest));
            balance=Math.max(0,opening-principalPaid);if(month===months||balance<0.005)balance=0;
            totalInterest+=interest;
            const tr=document.createElement("tr");
            [String(month),money(opening),money(actualPayment),money(principalPaid),money(interest),money(balance)].forEach((value,index)=>{const cell=document.createElement(index===0?"th":"td");if(index===0)cell.scope="row";cell.textContent=value;cell.style.cssText="padding:8px;border-bottom:1px solid #e7edf2;text-align:right;white-space:nowrap";tr.appendChild(cell)});
            scheduleBody.appendChild(tr);
          }
          scheduleTable.appendChild(scheduleBody);scroller.appendChild(scheduleTable);schedule.appendChild(scroller);
          const note=document.createElement("p");note.className="fc-muted";note.textContent="Illustrative schedule only. Lender fees, payment-date conventions, rate resets, prepayments and rounding policies may change the actual statement.";schedule.appendChild(note);
          output.appendChild(schedule);
        }
      }
      const solution=document.createElement("section");solution.className="fc-calculation-solution";solution.style.cssText="margin-top:18px;padding:14px;background:#fff;border:1px solid #d9e2ea;border-radius:10px";
      const solutionTitle=document.createElement("h3");solutionTitle.textContent="How this result was calculated";solution.appendChild(solutionTitle);
      const explanations={
        "loan emi calculator":"Monthly EMI uses the reducing-balance formula: P × r × (1+r)^n ÷ ((1+r)^n−1), where P is principal, r is monthly interest rate and n is the number of monthly payments. At 0% interest, principal is divided by the number of payments.",
        "fixed deposit calculator":"Maturity = principal × (1 + annual rate ÷ compounding periods)^(compounding periods × years). This assumes the entered rate and compounding frequency remain unchanged.",
        "sip calculator india":"The SIP estimate compounds regular monthly contributions at the assumed monthly rate. Contributions are treated as made at the beginning of each month; actual market returns are not fixed.",
        "epf / pf calculator":"This is a simplified monthly-contribution projection using the entered annual rate divided by 12. It models the entered employee contribution only and does not reproduce the EPFO passbook's exact monthly interest-credit rules.",
        "gst calculator":"For Add GST: GST = taxable value × rate ÷ 100; invoice total = taxable value + GST. For Remove GST: taxable value = inclusive amount × 100 ÷ (100 + rate); embedded GST = inclusive amount − taxable value. Intra-state supplies are shown as CGST and SGST (split equally, with rounding to paise); inter-state supplies are shown as IGST. The calculator does not decide the legally applicable rate or place of supply.",
        "income tax calculator india":"The estimate starts with annual gross salary, subtracts the standard deduction entered for the selected regime, applies the Tax Year 2026–27 ordinary slab schedule and resident-individual Section 87A rebate/marginal relief, then calculates applicable surcharge, surcharge marginal relief and 4% health and education cess. It is a salary-only estimate: it does not calculate other income heads, special-rate capital gains, HRA or other deductions/exemptions, TDS credits, or every return-specific adjustment. Verify the complete position with the Income Tax Department before filing.",
        "salary tds calculator":"The estimate applies the selected simplified new- or old-regime slab schedule, checks resident-individual eligibility before applying the Section 87A rebate (including new-regime marginal relief around ₹12 lakh), adds 4% cess, subtracts tax already paid, then divides the balance by 1–12 payroll months. Enter annual taxable income after eligible adjustments. The old-regime option assumes an individual below 60; deductions, exemptions, surcharge, special-rate income and employer-specific payroll rules are not calculated.",
        "bmi calculator":"BMI = weight in kilograms ÷ (height in metres × height in metres). This is a number-only screening calculation; it does not diagnose health. For people under 18, adult cut-offs must not be used.",
        "salary calculator":"Daily estimate = monthly salary ÷ working days. Hourly estimate = monthly salary ÷ (working days × working hours per day).",
        "savings account interest calculator":"Estimated interest = average balance × annual rate × days ÷ 365. This is a simple estimate; bank-specific daily balance and compounding rules may differ.",
        "inflation calculator":"Future cost = current amount × (1 + annual inflation rate)^years. This is a scenario based on a constant assumed rate, not a forecast.",
        "fuel cost calculator":"Fuel required = distance ÷ mileage. Estimated trip cost = fuel required × price per litre.",
        "discount calculator":"Discount amount = original price × discount percentage ÷ 100. Final price = original price − discount amount.",
        "age calculator":"The calculator compares the date of birth with the selected as-of date and subtracts calendar years, months and days, accounting for the length of each calendar month.",
        "electricity bill calculator":"Energy charges = units consumed × rate per unit. Estimated bill = energy charges + fixed charges + other charges entered.",
        "profit & loss calculator":"Profit or loss = selling price − cost price. Percentage = absolute profit/loss ÷ cost price × 100.",
        "home loan amortization schedule calculator":"The monthly EMI uses the reducing-balance formula. For each month, interest = opening balance × monthly rate; principal repaid = EMI − interest; closing balance = opening balance − principal repaid. The schedule assumes a constant rate and regular monthly payments; lender fees and rate resets are excluded.",
        "loan comparison calculator":"Each option is calculated using the reducing-balance EMI formula. Total repayment = EMI × number of monthly instalments; estimated interest = total repayment − principal. Compare the entered rates and tenures only; fees, insurance and lender-specific terms are not included.",
        "loan to value calculator":"Loan-to-value (LTV) = loan amount ÷ asset value × 100. Owner equity is shown as asset value − loan amount. Lenders may use their own valuation and eligibility rules.",
        "salary hike calculator":"Annual increase = current annual salary × hike percentage ÷ 100. Revised annual salary = current salary + annual increase; revised monthly gross is the revised annual amount ÷ 12. This does not estimate take-home pay or tax.",
        "commission calculator":"Commission = sales or transaction value × commission rate ÷ 100. The additional total is shown by adding the commission to the entered transaction value; actual contract terms may define who pays it.",
        "cogs calculator":"Cost of goods sold = opening inventory + net purchases − closing inventory. Inventory available for sale = opening inventory + net purchases. Enter values for the same accounting period and valuation basis.",
        "unit price comparison calculator":"Unit price = total package price ÷ quantity. The calculator compares the two unit prices and identifies the lower entered price per unit. Ensure both quantities use the same unit of measurement.",
        "property price per sq ft calculator":"Price per square foot = total property price ÷ area in square feet. Square metres are estimated by multiplying square feet by 0.092903. This is a simple comparison and excludes transaction costs and property-condition differences.",
        "cash flow calculator":"Net cash flow = total cash inflows − total cash outflows. Closing cash balance = opening cash balance + net cash flow. Cash-flow margin = net cash flow ÷ inflows × 100 when inflows are above zero.",
        "tip calculator":"Tip amount = bill amount × tip percentage ÷ 100. Total bill includes the tip; per-person amount = total bill ÷ number of people. Adjust the percentage and split count to match the bill arrangement.",
        "sales tax calculator":"Sales tax = pre-tax amount × entered tax rate ÷ 100. Total after tax = pre-tax amount + sales tax. This is a generic arithmetic tool; tax rates and rules vary by jurisdiction.",
        "credit card interest calculator":"Estimated simple interest = outstanding balance × annual percentage rate × days outstanding ÷ 365. Actual card interest may use daily balances, compounding, grace-period rules, fees and issuer-specific terms.",
        "car loan calculator":"The monthly EMI uses the reducing-balance formula with the amount financed, monthly interest rate and number of instalments. The estimate assumes a fixed rate and excludes insurance, registration, fees and lender-specific charges.",
        "bike loan calculator":"The monthly EMI uses the reducing-balance formula. Enter the amount financed after any down payment; the result excludes registration, insurance and lender fees.",
        "education loan calculator":"The calculator estimates simple interest during the entered moratorium months, adds it to the principal, then calculates a reducing-balance EMI over the repayment tenure. Actual disbursement, capitalisation and moratorium rules vary by lender and scheme.",
        "gold loan calculator":"The calculator supports a simple monthly-interest bullet structure or a reducing-balance EMI structure. Gold valuation, purity, loan-to-value limits, renewal fees and lender terms are not included.",
        "personal loan eligibility calculator":"Indicative EMI capacity = monthly net income × assumed FOIR limit − existing monthly obligations. The loan amount is the present value of that EMI stream at the entered rate and tenure. Lender eligibility rules differ.",
        "loan against property calculator":"The reducing-balance EMI formula estimates the instalment, total repayment and interest for the entered principal, rate and tenure. Property valuation, loan-to-value, fees and legal charges are excluded.",
        "mutual fund return calculator":"The lump-sum portion compounds monthly at the assumed monthly rate. Monthly contributions are treated as end-of-month payments and compounded for the remaining months. Market returns are variable; this is a scenario, not a forecast.",
        "debt snowball calculator":"The snowball method sorts debts by outstanding balance from smallest to largest. Interest rates are shown for reference but do not determine the order. This page does not calculate payoff dates or interest savings.",
        "emi vs lump sum calculator":"The EMI route includes the entered upfront payment, total loan instalments and one-time fee. The lump-sum route is the purchase price. Opportunity cost, inflation, tax and investment returns on retained cash are excluded.",
        "fd rd sip comparison calculator":"FD maturity uses quarterly compounding. RD and SIP estimates use end-of-month contributions compounded monthly at their separate assumed rates. Actual bank deposit rules, fund expenses, taxes and market returns may differ.",
        "permutation calculator":"nPr = n! ÷ (n − r)!. The implementation multiplies the r descending integers from n and requires whole-number inputs with 0 ≤ r ≤ n.",
        "combination calculator":"nCr = n! ÷ (r! × (n − r)!). The implementation uses the smaller of r and n−r to reduce intermediate arithmetic.",
        "probability calculator":"For equally likely outcomes, probability = favourable outcomes ÷ total outcomes. The percentage is this ratio multiplied by 100; weighted and dependent events are not modelled.",
        "prime number checker":"The number is tested for divisors from 2 up to its square root. A prime number is an integer greater than 1 with no other positive divisors.",
        "prime factorization calculator":"Trial division extracts each prime divisor and counts its multiplicity. The factors are displayed as a product, using exponents for repeated factors.",
        "factorial calculator":"The calculator multiplies all whole numbers from 1 through n. By convention, 0! = 1. Inputs are limited to 170 to avoid numeric overflow.",
        "modulo calculator":"The remainder is calculated using the JavaScript remainder operator (%). For negative values, this can differ from the mathematical modulo convention.",
        "rounding calculator":"Nearest uses Math.round; Floor uses Math.floor; Ceiling uses Math.ceil after scaling by 10 raised to the requested decimal-place count. Floating-point representation can affect edge cases.",
        "significant figures calculator":"The number is rounded using toPrecision with the requested significant-figure count. The scientific-notation display uses the same precision target.",
        "scientific notation converter":"The number is normalized with toExponential, then split into a coefficient and base-10 exponent. Zero is handled separately because its exponent is not unique.",
        "pythagoras calculator":"The hypotenuse is √(a²+b²). When a leg is missing, it is √(c²−a²), where c is the hypotenuse and must exceed the known leg.",
        "triangle area calculator":"The base-height method uses ½bh. Heron's formula uses √(s(s−a)(s−b)(s−c)) after checking the triangle inequality.",
        "triangle angle calculator":"The cosine rule calculates each angle from the three side lengths. Inputs must form a valid triangle; the final angle is calculated so the total is 180 degrees.",
        "circle area calculator":"Area = πr². When diameter is selected, it is divided by two to obtain the radius before applying the formula.",
        "circle circumference calculator":"Circumference = 2πr. When diameter is selected, circumference = πd.",
        "rectangle area calculator":"Area = length × width and perimeter = 2 × (length + width). Both dimensions must use the same unit.",
        "square area calculator":"Area = side²; perimeter = 4 × side; diagonal = side × √2.",
        "volume calculator":"The selected solid determines the formula: cube s³, cuboid lwh, cylinder πr²h, or sphere 4πr³/3. Only the dimensions used by the selected shape are required to be positive.",
        "surface area calculator":"The selected solid determines total surface area: cube 6s², cuboid 2(lw+lh+wh), cylinder 2πr(r+h), or sphere 4πr².",
        "perimeter calculator":"The selected shape determines the boundary formula: square 4s, rectangle 2(l+w), triangle a+b+c, or circle circumference 2πr.",
        "roman numeral converter":"The converter uses standard subtractive Roman numeral pairs from M down to I and supports whole numbers 1 through 3,999.",
        "binary converter":"The decimal integer is represented in base 2 using repeated powers of two; only non-negative safe integers are accepted.",
        "hex converter":"The decimal integer is represented in base 16 using digits 0–9 and A–F; only non-negative safe integers are accepted.",
        "octal converter":"The decimal integer is represented in base 8 using digits 0–7; only non-negative safe integers are accepted.",
        "decimal to fraction calculator":"The calculator searches denominators up to the selected maximum, chooses the closest numerator, and reduces the fraction by the greatest common divisor. The result may be approximate.",
        "mixed number calculator":"The absolute numerator is divided by the positive denominator to obtain a whole part and remainder. The fractional remainder is reduced by the greatest common divisor and the original sign is preserved.",
        "arithmetic progression calculator":"The last term is a+(n−1)d. The sum is n(a+last term)/2.",
        "geometric progression calculator":"The last term is ar^(n−1). For r≠1, the sum is a(r^n−1)/(r−1); for r=1, the sum is an.",
        "number to words indian format":"The integer is split into crore, lakh, thousand and final three-digit groups, then each group is converted into English words.",
        "long division calculator":"The decimal quotient is dividend ÷ divisor. For integer inputs, the whole-number quotient is truncated and the remainder is dividend minus divisor times that quotient.",
        "add days to date calculator":"The calculator parses the selected local calendar date and adds the entered whole number of calendar days. It does not skip weekends or holidays.",
        "subtract days from date calculator":"The calculator parses the selected local calendar date and subtracts the entered whole number of calendar days. It does not skip weekends or holidays.",
        "time zone converter":"Target local time = source time − source UTC offset + target UTC offset. The result is normalized to a 24-hour clock and a day-shift label; daylight-saving changes must be handled by entering the correct offsets.",
        "seconds to hours calculator":"Hours = seconds ÷ 3,600 and minutes = seconds ÷ 60.",
        "minutes to hours calculator":"Decimal hours = minutes ÷ 60. Whole hours use floor division; remaining minutes are the remainder after dividing by 60.",
        "overtime pay calculator":"Gross estimate = hourly rate × regular hours + hourly rate × overtime hours × entered multiplier. The calculator does not decide statutory entitlement or deductions.",
        "countdown calculator":"The selected target date is compared with the browser's current local calendar date. Positive values are days remaining; negative values mean the target date has passed.",
        "retirement date calculator":"The target date is calculated by advancing the birth-date year by the entered retirement age. Official service rules and policy-specific rounding are not modelled.",
        "pay day calculator":"Weekly and biweekly schedules add 7 or 14 calendar days. Monthly schedules advance one calendar month and clamp to the last valid day when necessary.",
        "steps to km calculator":"Estimated kilometres = step count × entered average step length in centimetres ÷ 100,000. Actual distance varies with stride and terrain."
      };
      const explanation=document.createElement("p");explanation.textContent=explanations[lookupKey]||"The displayed result is calculated from the input values and assumptions shown above. Check each assumption before relying on the estimate.";solution.appendChild(explanation);
      const steps=document.createElement("ol");rows.forEach(([label,value,suffix])=>{const li=document.createElement("li");li.textContent=label+": "+(formatResult(value,suffix));steps.appendChild(li)});solution.appendChild(steps);
      output.appendChild(solution);
      output.style.display="block";if(!localeRefresh&&typeof window.gtag==="function")window.gtag("event","calculator_used",{calculator_name:def.title,calculator_page:location.pathname})});
    panel.append(form,output);panel.removeAttribute("aria-busy");if(!existingPanel){const header=h1.closest("header");if(header&&header.parentNode)header.insertAdjacentElement("afterend",panel);else h1.insertAdjacentElement("afterend",panel);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();