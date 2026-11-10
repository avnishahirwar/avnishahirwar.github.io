(() => {
  "use strict";
  const definitions = {

    "income tax calculator india": {title:"Income Tax Calculator (Tax Year 2026–27)",fields:[["income","Annual taxable income before tax (₹)","number",1200000],["regime","Tax regime","select",["New regime — Tax Year 2026–27","Old regime — individual below 60"]]],calc:v=>{
      const slabs=v.regime.startsWith("New")?[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]]:[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]];
      let prev=0,tax=0;for(const [cap,rate] of slabs){const slice=Math.max(0,Math.min(v.income,cap)-prev);tax+=slice*rate;prev=cap;if(v.income<=cap)break;}
      let rebate=0;if(v.regime.startsWith("New")){rebate=v.income<=1200000?Math.min(tax,60000):Math.min(60000,tax,Math.max(0,tax-(v.income-1200000)));}else if(v.income<=500000){rebate=Math.min(tax,12500);}
      const after=Math.max(0,tax-rebate),cess=after*.04,total=after+cess;
      return [["Taxable income",v.income],["Tax before rebate",tax],["Indicative rebate",rebate],["Health & education cess (4%)",cess],["Estimated tax including cess",total]];
    }},
    "salary tds calculator": {title:"Salary TDS Calculator (indicative)",fields:[["income","Annual taxable income (₹)","number",900000],["paid","TDS / tax already paid (₹)","number",0],["months","Payroll months remaining","number",6]],calc:v=>{
      const slabs=[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]];
      let prev=0,tax=0;for(const [cap,rate] of slabs){tax+=Math.max(0,Math.min(v.income,cap)-prev)*rate;prev=cap;if(v.income<=cap)break;}
      const rebate=v.income<=1200000?Math.min(tax,60000):Math.min(60000,tax,Math.max(0,tax-(v.income-1200000))),annual=Math.max(0,(tax-rebate)*1.04),balance=Math.max(0,annual-v.paid);
      return [["Indicative annual tax incl. cess",annual],["Tax already paid",v.paid],["Estimated balance",balance],["Indicative monthly TDS",balance/v.months]];
    }},
    "bmi calculator": {title:"BMI Calculator",fields:[["height","Height (cm)","number",170],["weight","Weight (kg)","number",65]],calc:v=>{if(v.height<50||v.height>260||v.weight<2||v.weight>350)return [];return [["BMI (number only)",v.weight/Math.pow(v.height/100,2)],["Interpretation","BMI alone cannot assess health. For people under 18, adult categories do not apply; consult a qualified healthcare professional for age-specific interpretation."]];}},
    "epf / pf calculator": {title:"EPF / PF Calculator",fields:[["monthly","Monthly employee contribution (₹)","number",1800],["rate","Assumed annual interest rate (%)","number",8.25],["years","Saving period (years)","number",20]],calc:v=>{const n=Math.round(v.years*12),r=v.rate/1200,p=v.monthly;if(!n)return [];const total=r===0?p*n:p*(Math.pow(1+r,n)-1)/r;return [["Estimated contributions",p*n],["Illustrative accumulated value",total],["Illustrative interest",total-p*n]];}},
    "gst calculator": {title:"GST Calculator", fields:[["amount","Amount (₹)","number",10000],["rate","GST rate (%)","number",18],["mode","Calculation","select",["Add GST","Remove GST"]]], calc:v=>{const tax=v.mode==="Add GST"?v.amount*v.rate/100:v.amount*v.rate/(100+v.rate);return [["Base amount",v.mode==="Add GST"?v.amount:v.amount-tax],["GST amount",tax],["Total amount",v.mode==="Add GST"?v.amount+tax:v.amount]];}},
    "loan emi calculator": {title:"Loan EMI Calculator",fields:[["principal","Loan amount (₹)","number",500000],["rate","Annual interest rate (%)","number",9],["years","Tenure (years)","number",5]],calc:v=>{const n=v.years*12,r=v.rate/1200,p=v.principal;if(!n)return [];const emi=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);return [["Monthly EMI",emi],["Total repayment",emi*n],["Total interest",emi*n-p]];}},
    "fixed deposit calculator": {title:"Fixed Deposit Calculator",fields:[["principal","Deposit amount (₹)","number",100000],["rate","Annual interest rate (%)","number",7],["years","Tenure (years)","number",3],["frequency","Compounding per year","select",["1","2","4","12"]]],calc:v=>{const n=Number(v.frequency),m=v.principal*Math.pow(1+v.rate/(100*n),n*v.years);return [["Maturity value",m],["Estimated interest",m-v.principal]];}},
    "savings account interest calculator": {title:"Savings Interest Calculator",fields:[["principal","Average balance (₹)","number",50000],["rate","Annual interest rate (%)","number",3],["days","Number of days","number",365]],calc:v=>[["Estimated interest",v.principal*v.rate/100*v.days/365],["Balance plus interest",v.principal*(1+v.rate/100*v.days/365)]]},
    "salary calculator": {title:"Salary Calculator",fields:[["monthly","Monthly salary (₹)","number",30000],["days","Working days per month","number",26],["hours","Working hours per day","number",8]],calc:v=>[["Daily estimate",v.monthly/v.days],["Hourly estimate",v.monthly/(v.days*v.hours)]]},
    "inflation calculator": {title:"Inflation Calculator",fields:[["amount","Current amount (₹)","number",10000],["rate","Assumed annual inflation (%)","number",5],["years","Number of years","number",10]],calc:v=>[["Estimated future cost",v.amount*Math.pow(1+v.rate/100,v.years)],["Increase",v.amount*(Math.pow(1+v.rate/100,v.years)-1)]]},
    "fuel cost calculator": {title:"Fuel Cost Calculator",fields:[["distance","Distance (km)","number",100],["mileage","Vehicle mileage (km/l)","number",15],["price","Fuel price per litre (₹)","number",100]],calc:v=>{const litres=v.distance/v.mileage;return [["Fuel required (litres)",litres],["Estimated trip cost",litres*v.price]];}},
    "discount calculator": {title:"Discount Calculator",fields:[["amount","Original price (₹)","number",2000],["rate","Discount (%)","number",15]],calc:v=>{const save=v.amount*v.rate/100;return [["You save",save],["Final price",v.amount-save]];}},
    "age calculator": {title:"Age Calculator",fields:[["dob","Date of birth","date","2000-01-01"],["asof","Age on date","date",new Date().toISOString().slice(0,10)]],calc:v=>{const a=new Date(v.dob+"T00:00:00"),b=new Date(v.asof+"T00:00:00");if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||a>b)return [];let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}return [["Age",y+" years, "+m+" months, "+d+" days"]];}},
    "electricity bill calculator": {title:"Electricity Bill Calculator",fields:[["units","Units consumed (kWh)","number",200],["rate","Rate per unit (₹)","number",7],["fixed","Fixed charges (₹)","number",100],["other","Other charges (₹)","number",0]],calc:v=>[["Energy charges",v.units*v.rate],["Estimated bill",v.units*v.rate+v.fixed+v.other]]},
    "profit & loss calculator": {title:"Profit & Loss Calculator",fields:[["cost","Cost price (₹)","number",1000],["selling","Selling price (₹)","number",1250]],calc:v=>{const diff=v.selling-v.cost;return [[diff>=0?"Profit":"Loss",Math.abs(diff)],["Percentage on cost",v.cost?Math.abs(diff)/v.cost*100:0,"%"]];}}
  };
  const money = n => "₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
  function init(){
    const h1=document.querySelector("main h1, h1"); if(!h1)return;
    const key=h1.textContent.trim().toLowerCase(), def=definitions[key]; if(!def||document.getElementById("live-page-calculator"))return;
    const panel=document.createElement("section"); panel.id="live-page-calculator";panel.className="panel";
    const heading=document.createElement("h2");heading.textContent="Use the "+def.title;panel.appendChild(heading);
    const form=document.createElement("form");form.noValidate=true;form.style.display="grid";form.style.gridTemplateColumns="repeat(auto-fit,minmax(210px,1fr))";form.style.gap="12px";
    def.fields.forEach(([id,label,type,initial])=>{const wrap=document.createElement("label");wrap.style.display="grid";wrap.style.gap="5px";wrap.style.fontWeight="600";wrap.textContent=label;let input;if(type==="select"){input=document.createElement("select");initial.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;input.appendChild(o)})}else{input=document.createElement("input");input.type=type;input.step="any";input.value=initial}input.name=id;input.required=true;input.style.cssText="width:100%;padding:11px;border:1px solid #cbd5df;border-radius:8px;font:inherit";wrap.appendChild(input);form.appendChild(wrap)});
    const button=document.createElement("button");button.type="submit";button.textContent="Calculate";button.className="btn";button.style.cssText="border:0;cursor:pointer;grid-column:1/-1";form.appendChild(button);
    const output=document.createElement("div");output.setAttribute("aria-live","polite");output.style.cssText="margin-top:16px;padding:14px;background:#edf3f7;border-radius:10px;display:none";
    form.addEventListener("submit",e=>{e.preventDefault();const values={};for(const [id,,type] of def.fields){const el=form.elements[id];values[id]=type==="select"?el.value:(type==="date"?el.value:Number(el.value));if(type!=="date"&&type!=="select"&&(!Number.isFinite(values[id])||values[id]<0)){output.textContent="Please enter valid non-negative values.";output.style.display="block";return}}if((values.mileage===0)||(values.days===0)||(values.hours===0)||(values.years===0&&def.title==="Loan EMI Calculator")||(values.cost===0)||(values.months===0)||(values.height===0)||(values.rate>100)||(values.rate>1000)||(key==="discount calculator"&&values.rate>100)){output.textContent="Please check the entered values.";output.style.display="block";return}const rows=def.calc(values);if(!rows.length){output.textContent="Please check the dates and values.";output.style.display="block";return}output.replaceChildren();
      const table=document.createElement("table");table.className="fc-result-table";
      const caption=document.createElement("caption");caption.textContent="Calculation results";table.appendChild(caption);
      const thead=document.createElement("thead"),headRow=document.createElement("tr");
      ["Result","Value"].forEach(label=>{const th=document.createElement("th");th.scope="col";th.textContent=label;headRow.appendChild(th)});
      thead.appendChild(headRow);table.appendChild(thead);
      const tbody=document.createElement("tbody");
      rows.forEach(([label,value,suffix])=>{const tr=document.createElement("tr"),name=document.createElement("th"),val=document.createElement("td");name.scope="row";name.textContent=label;val.textContent=typeof value==="string"?value:(suffix==="%"?Number(value).toFixed(2)+"%":money(value));tr.append(name,val);tbody.appendChild(tr)});
      table.appendChild(tbody);output.appendChild(table);
      const numeric=rows.filter(row=>typeof row[1]==="number"&&Number.isFinite(row[1])&&row[1]>=0&&!row[2]);
      if(numeric.length>=1&&numeric.every(row=>!row[2])){
        const chart=document.createElement("section");chart.className="fc-result-chart";
        const title=document.createElement("h3");title.textContent=def.title==="BMI Calculator"?"BMI number visual (not a health classification)":"Result comparison chart";chart.appendChild(title);
        const note=document.createElement("p");note.textContent=def.title==="BMI Calculator"?"The marker shows only the calculated number on a neutral 0–50 scale. It does not indicate a diagnosis or adult category.":"Bars use a shared relative scale; compare values only within this calculation.";chart.appendChild(note);
        const max=def.title==="BMI Calculator"?50:Math.max(...numeric.map(row=>row[1]),1);
        numeric.forEach(([label,value])=>{const item=document.createElement("div");item.className="fc-chart-item";
          const top=document.createElement("div");top.className="fc-chart-label";const name=document.createElement("span"),amount=document.createElement("strong");name.textContent=label;amount.textContent=money(value);top.append(name,amount);
          const track=document.createElement("div");track.className="fc-chart-track";const bar=document.createElement("span");bar.className="fc-chart-bar";bar.style.width=Math.max(2,value/max*100)+"%";track.appendChild(bar);item.append(top,track);chart.appendChild(item)});
        output.appendChild(chart);
      }
      const solution=document.createElement("section");solution.className="fc-calculation-solution";solution.style.cssText="margin-top:18px;padding:14px;background:#fff;border:1px solid #d9e2ea;border-radius:10px";
      const solutionTitle=document.createElement("h3");solutionTitle.textContent="How this result was calculated";solution.appendChild(solutionTitle);
      const explanations={
        "loan emi calculator":"Monthly EMI uses the reducing-balance formula: P × r × (1+r)^n ÷ ((1+r)^n−1), where P is principal, r is monthly interest rate and n is the number of monthly payments. At 0% interest, principal is divided by the number of payments.",
        "fixed deposit calculator":"Maturity = principal × (1 + annual rate ÷ compounding periods)^(compounding periods × years). This assumes the entered rate and compounding frequency remain unchanged.",
        "sip calculator india":"The SIP estimate compounds regular monthly contributions at the assumed monthly rate. Contributions are treated as made at the beginning of each month; actual market returns are not fixed.",
        "epf / pf calculator":"This is a simplified monthly-contribution projection using the entered annual rate divided by 12. It models the entered employee contribution only and does not reproduce the EPFO passbook's exact monthly interest-credit rules.",
        "gst calculator":"For Add GST: GST = base amount × rate ÷ 100 and total = base + GST. For Remove GST: taxable value = inclusive amount ÷ (1 + rate ÷ 100), and GST is the difference.",
        "income tax calculator india":"The estimate applies configured slabs, the section 87A rebate including marginal relief around the ₹12 lakh new-regime threshold, and 4% cess. It does not model every exemption, deduction, surcharge, special-rate income or individual tax circumstance.",
        "salary tds calculator":"The tool estimates annual tax using configured new-regime slabs and section 87A marginal relief around ₹12 lakh, adds 4% cess, subtracts tax already paid, then divides the remaining estimate by payroll months. It is not a full payroll computation.",
        "bmi calculator":"BMI = weight in kilograms ÷ (height in metres × height in metres). This is a number-only screening calculation; it does not diagnose health. For people under 18, adult cut-offs must not be used.",
        "salary calculator":"Daily estimate = monthly salary ÷ working days. Hourly estimate = monthly salary ÷ (working days × working hours per day).",
        "savings account interest calculator":"Estimated interest = average balance × annual rate × days ÷ 365. This is a simple estimate; bank-specific daily balance and compounding rules may differ.",
        "inflation calculator":"Future cost = current amount × (1 + annual inflation rate)^years. This is a scenario based on a constant assumed rate, not a forecast.",
        "fuel cost calculator":"Fuel required = distance ÷ mileage. Estimated trip cost = fuel required × price per litre.",
        "discount calculator":"Discount amount = original price × discount percentage ÷ 100. Final price = original price − discount amount.",
        "age calculator":"The calculator compares the date of birth with the selected as-of date and subtracts calendar years, months and days, accounting for the length of each calendar month.",
        "electricity bill calculator":"Energy charges = units consumed × rate per unit. Estimated bill = energy charges + fixed charges + other charges entered.",
        "profit & loss calculator":"Profit or loss = selling price − cost price. Percentage = absolute profit/loss ÷ cost price × 100."
      };
      const explanation=document.createElement("p");explanation.textContent=explanations[key]||"The displayed result is calculated from the input values and assumptions shown above. Check each assumption before relying on the estimate.";solution.appendChild(explanation);
      const steps=document.createElement("ol");rows.forEach(([label,value,suffix])=>{const li=document.createElement("li");li.textContent=label+": "+(typeof value==="string"?value:(suffix==="%"?Number(value).toFixed(2)+"%":money(value)));steps.appendChild(li)});solution.appendChild(steps);
      output.appendChild(solution);
      output.style.display="block";if(typeof window.gtag==="function")window.gtag("event","calculator_used",{calculator_name:def.title,calculator_page:location.pathname})});
    panel.append(form,output);const header=h1.closest("header");if(header&&header.parentNode)header.insertAdjacentElement("afterend",panel);else h1.insertAdjacentElement("afterend",panel);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();