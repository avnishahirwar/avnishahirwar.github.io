(() => {
  "use strict";
  const definitions = {
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
    form.addEventListener("submit",e=>{e.preventDefault();const values={};for(const [id,,type] of def.fields){const el=form.elements[id];values[id]=type==="select"?el.value:(type==="date"?el.value:Number(el.value));if(type!=="date"&&type!=="select"&&(!Number.isFinite(values[id])||values[id]<0)){output.textContent="Please enter valid non-negative values.";output.style.display="block";return}}if((values.mileage===0)||(values.days===0)||(values.hours===0)||(values.years===0&&def.title==="Loan EMI Calculator")||(values.cost===0)||(values.rate>1000)){output.textContent="Please check the entered values.";output.style.display="block";return}const rows=def.calc(values);if(!rows.length){output.textContent="Please check the dates and values.";output.style.display="block";return}output.replaceChildren();
      const table=document.createElement("table");table.className="fc-result-table";
      const caption=document.createElement("caption");caption.textContent="Calculation results";table.appendChild(caption);
      const thead=document.createElement("thead"),headRow=document.createElement("tr");
      ["Result","Value"].forEach(label=>{const th=document.createElement("th");th.scope="col";th.textContent=label;headRow.appendChild(th)});
      thead.appendChild(headRow);table.appendChild(thead);
      const tbody=document.createElement("tbody");
      rows.forEach(([label,value,suffix])=>{const tr=document.createElement("tr"),name=document.createElement("th"),val=document.createElement("td");name.scope="row";name.textContent=label;val.textContent=typeof value==="string"?value:(suffix==="%"?Number(value).toFixed(2)+"%":money(value));tr.append(name,val);tbody.appendChild(tr)});
      table.appendChild(tbody);output.appendChild(table);
      const numeric=rows.filter(row=>typeof row[1]==="number"&&Number.isFinite(row[1])&&row[1]>=0);
      if(numeric.length>=2&&numeric.every(row=>!row[2])){
        const chart=document.createElement("section");chart.className="fc-result-chart";
        const title=document.createElement("h3");title.textContent="Visual comparison";chart.appendChild(title);
        const note=document.createElement("p");note.textContent="Bars use a shared relative scale to make the returned figures easier to scan.";chart.appendChild(note);
        const max=Math.max(...numeric.map(row=>row[1]),1);
        numeric.forEach(([label,value])=>{const item=document.createElement("div");item.className="fc-chart-item";
          const top=document.createElement("div");top.className="fc-chart-label";const name=document.createElement("span"),amount=document.createElement("strong");name.textContent=label;amount.textContent=money(value);top.append(name,amount);
          const track=document.createElement("div");track.className="fc-chart-track";const bar=document.createElement("span");bar.className="fc-chart-bar";bar.style.width=Math.max(2,value/max*100)+"%";track.appendChild(bar);item.append(top,track);chart.appendChild(item)});
        output.appendChild(chart);
      }
      output.style.display="block";if(typeof window.gtag==="function")window.gtag("event","calculator_use",{calculator_name:def.title,calculator_page:location.pathname})});
    panel.append(form,output);const header=h1.closest("header");if(header&&header.parentNode)header.insertAdjacentElement("afterend",panel);else h1.insertAdjacentElement("afterend",panel);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();