(() => {
  "use strict";
  const configs = {
    "/hi/calculators/loan-emi-calculator.html": {title:"परिणाम का दृश्य सारांश", rows:[["मासिक EMI","#emi"],["कुल ब्याज","#interest"],["कुल भुगतान","#total"]]},
    "/hi/calculators/home-loan-emi-calculator.html": {title:"होम लोन परिणाम का दृश्य सारांश", rows:[["मासिक EMI","#emi"],["कुल ब्याज","#interest"],["कुल भुगतान","#total"]]},
    "/hi/calculators/personal-loan-eligibility-calculator.html": {title:"पर्सनल लोन पात्रता का दृश्य सारांश", table:"#extraResult"},
    "/hi/calculators/sip-calculator.html": {title:"SIP परिणाम का दृश्य सारांश", rows:[["कुल निवेश","#invested"],["अनुमानित भविष्य मूल्य","#future"],["अनुमानित लाभ","#gain"]]},
    "/hi/calculators/fd-calculator.html": {title:"FD परिणाम का दृश्य सारांश", rows:[["जमा मूलधन","#base"],["अनुमानित ब्याज","#interest"],["मैच्योरिटी राशि","#maturity"]]},
    "/hi/calculators/rd-calculator.html": {title:"RD परिणाम का दृश्य सारांश", rows:[["कुल जमा","#invested"],["अनुमानित ब्याज","#interest"],["मैच्योरिटी राशि","#maturity"]]},
    "/hi/calculators/ppf-calculator.html": {title:"PPF परिणाम का दृश्य सारांश", rows:[["कुल योगदान","#invested"],["अनुमानित ब्याज","#earned"],["मैच्योरिटी राशि","#maturity"]]},
    "/hi/calculators/gst-calculator.html": {title:"GST परिणाम का दृश्य सारांश", rows:[["मूल कीमत","#base"],["GST राशि","#tax"],["GST सहित कुल कीमत","#total"]]},
    "/hi/calculators/income-tax-calculator.html": {title:"आयकर परिणाम का दृश्य सारांश", rows:[["रिबेट से पहले टैक्स","#tax-before"],["धारा 87A रिबेट","#rebate"],["अधिभार","#surcharge"],["उपकर","#cess"],["अनुमानित कुल टैक्स","#tax-total"]]}
  };
  const config=configs[location.pathname];
  if(!config||document.getElementById("hi-result-visual"))return;
  const host=document.querySelector("#extraResult")||document.querySelector(".results")||document.querySelector("#result")||document.querySelector("#tax-results");
  if(!host)return;
  const panel=document.createElement("section");panel.id="hi-result-visual";panel.className="panel hi-result-visual";panel.setAttribute("aria-live","polite");
  const h=document.createElement("h2");h.textContent=config.title;
  const note=document.createElement("p");note.className="muted";note.textContent="बार प्रत्येक परिणाम का तुलनात्मक दृश्य दिखाते हैं। वास्तविक भुगतान या कर की पुष्टि संबंधित बैंक अथवा आधिकारिक नियमों से करें।";
  const chart=document.createElement("div");chart.className="hi-result-bars";panel.append(h,note,chart);host.insertAdjacentElement("afterend",panel);
  const numberFrom=t=>{const m=String(t||"").replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN;};
  const collect=()=>{
    if(config.rows)return config.rows.map(([label,selector])=>{const n=document.querySelector(selector);return {label,value:n?n.textContent.trim():"",number:n?numberFrom(n.textContent):NaN};}).filter(x=>x.value&&x.value!=="—"&&Number.isFinite(x.number)&&x.number>=0);
    const table=document.querySelector(config.table);if(!table)return [];
    return [...table.querySelectorAll("tr,.result-row")].map(row=>{const c=[...row.querySelectorAll("th,td")];const label=c.length>=2?c[0].textContent.trim():(row.querySelector("span")?.textContent||"").trim();const value=c.length>=2?c[1].textContent.trim():(row.querySelector("strong")?.textContent||"").trim();return label&&value?{label,value,number:numberFrom(value)}:null;}).filter(x=>x&&Number.isFinite(x.number)&&x.number>=0).slice(0,6);
  };
  const draw=()=>{const rows=collect();chart.replaceChildren();panel.hidden=!rows.length;if(!rows.length)return;const max=Math.max(1,...rows.map(x=>x.number));rows.forEach(item=>{const row=document.createElement("div");row.className="hi-result-bar-row";const top=document.createElement("div");top.className="hi-result-bar-label";const label=document.createElement("span");label.textContent=item.label;const value=document.createElement("strong");value.textContent=item.value;top.append(label,value);const track=document.createElement("div");track.className="hi-result-bar-track";const bar=document.createElement("span");bar.className="hi-result-bar-fill";bar.style.width=Math.max(1,item.number/max*100)+"%";track.append(bar);row.append(top,track);chart.append(row);});};
  draw();const observer=new MutationObserver(draw);const targets=config.rows?config.rows.map(([,selector])=>document.querySelector(selector)).filter(Boolean):[host];targets.forEach(target=>observer.observe(target,{subtree:true,childList:true,characterData:true}));document.addEventListener("click",()=>setTimeout(draw,0));
})();

/* Detailed Hindi amortization schedules for EMI pages. */
(() => {
  const path=location.pathname;
  const configs={
    "/hi/calculators/loan-emi-calculator.html":{principal:"#principal",rate:"#rate",months:()=>Number(document.querySelector("#years")?.value||0)*12+Number(document.querySelector("#months")?.value||0),watch:["#emi","#interest","#total"]},
    "/hi/calculators/home-loan-emi-calculator.html":{principal:"#p",rate:"#rate",months:()=>Number(document.querySelector("#months")?.value||0),watch:["#emi","#interest","#total"]},
    "/hi/calculators/car-loan-calculator.html":{principal:"#principal",rate:"#rate",months:()=>Number(document.querySelector("#months")?.value||0),watch:["#extraResult"]}
  };
  const cfg=configs[path];if(!cfg)return;
  const anchor=()=>document.getElementById("hi-result-visual")||document.querySelector("#extraResult")||document.querySelector(".results");
  const section=document.createElement("section");section.id="hi-amortization-schedule";section.className="panel";
  const heading=document.createElement("h2");heading.textContent="महीने-दर-महीने EMI अमोर्टाइजेशन तालिका";
  const note=document.createElement("p");note.className="muted";note.textContent="यह तालिका स्थिर ब्याज दर और नियमित मासिक भुगतान मानकर मूलधन तथा ब्याज का विभाजन दिखाती है।";
  const holder=document.createElement("div");holder.style.cssText="overflow:auto;max-height:520px";
  section.append(heading,note,holder);
  const insert=()=>{const a=anchor();if(a&&!section.isConnected)a.insertAdjacentElement("afterend",section);};
  const money=n=>new Intl.NumberFormat("hi-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);
  const render=()=>{
    insert();
    const p=Number(document.querySelector(cfg.principal)?.value),annual=Number(document.querySelector(cfg.rate)?.value),n=cfg.months();
    if(!Number.isFinite(p)||p<=0||!Number.isFinite(annual)||annual<0||annual>100||!Number.isInteger(n)||n<1||n>600){section.hidden=true;return;}
    const r=annual/1200,emi=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    let balance=p,rows=[];
    for(let month=1;month<=n;month++){
      const opening=balance,interest=opening*r,principal=Math.min(opening,Math.max(0,emi-interest)),closing=Math.max(0,opening-principal);
      rows.push([month,opening,emi,interest,principal,closing]);balance=closing;
    }
    holder.replaceChildren();const table=document.createElement("table");table.className="tax-table";
    const caption=document.createElement("caption");caption.textContent="अनुमानित भुगतान अनुसूची";table.append(caption);
    const thead=document.createElement("thead"),hr=document.createElement("tr");
    ["महीना","शुरुआती बकाया","EMI","ब्याज","मूलधन","अंतिम बकाया"].forEach(x=>{const th=document.createElement("th");th.scope="col";th.textContent=x;hr.append(th);});thead.append(hr);table.append(thead);
    const tbody=document.createElement("tbody");rows.forEach(row=>{const tr=document.createElement("tr");row.forEach((v,i)=>{const cell=document.createElement(i===0?"th":"td");if(i===0)cell.scope="row";cell.textContent=i===0?String(v):money(v);tr.append(cell);});tbody.append(tr);});table.append(tbody);holder.append(table);section.hidden=false;
  };
  render();
  const observer=new MutationObserver(render);cfg.watch.map(x=>document.querySelector(x)).filter(Boolean).forEach(x=>observer.observe(x,{subtree:true,childList:true,characterData:true}));
  document.addEventListener("click",()=>setTimeout(render,0));
  document.querySelector("#extraForm")?.addEventListener("submit",()=>setTimeout(render,0));
})();

/* Year-by-year SIP growth table and chart using the same end-of-month assumption as the calculator. */
(() => {
  if(location.pathname!=="/hi/calculators/sip-calculator.html")return;
  const anchor=()=>document.getElementById("hi-result-visual")||document.querySelector(".results");
  const section=document.createElement("section");section.id="hi-sip-growth";section.className="panel";
  const heading=document.createElement("h2");heading.textContent="वर्ष-दर-वर्ष SIP ग्रोथ चार्ट";
  const note=document.createElement("p");note.className="muted";note.textContent="यह अनुमान हर महीने के अंत में समान निवेश और मासिक compounding मानता है; वास्तविक बाजार रिटर्न अलग हो सकता है।";
  const chart=document.createElement("div");chart.className="hi-result-bars";
  const holder=document.createElement("div");holder.style.cssText="overflow:auto;max-height:420px;margin-top:14px";
  section.append(heading,note,chart,holder);
  const a=anchor();if(a)a.insertAdjacentElement("afterend",section);
  const money=n=>new Intl.NumberFormat("hi-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
  const render=()=>{
    const p=Number(document.querySelector("#monthly")?.value),annual=Number(document.querySelector("#rate")?.value),years=Number(document.querySelector("#years")?.value);
    if(!Number.isFinite(p)||p<=0||!Number.isFinite(annual)||annual<0||annual>50||!Number.isInteger(years)||years<1||years>50){section.hidden=true;return;}
    const i=annual/1200;let value=0,invested=0,rows=[];
    for(let month=1;month<=years*12;month++){value=value*(1+i)+p;invested+=p;if(month%12===0){rows.push({year:month/12,invested,value,gain:value-invested});}}
    chart.replaceChildren();const max=Math.max(1,...rows.map(x=>x.value));
    rows.forEach(x=>{const row=document.createElement("div");row.className="hi-result-bar-row";const top=document.createElement("div");top.className="hi-result-bar-label";const label=document.createElement("span");label.textContent="वर्ष "+x.year;const val=document.createElement("strong");val.textContent=money(x.value);top.append(label,val);const track=document.createElement("div");track.className="hi-result-bar-track";const bar=document.createElement("span");bar.className="hi-result-bar-fill";bar.style.width=Math.max(1,x.value/max*100)+"%";track.append(bar);row.append(top,track);chart.append(row);});
    holder.replaceChildren();const table=document.createElement("table");table.className="tax-table";const caption=document.createElement("caption");caption.textContent="SIP की वार्षिक प्रगति";table.append(caption);
    const thead=document.createElement("thead"),trh=document.createElement("tr");["वर्ष","कुल निवेश","अनुमानित मूल्य","अनुमानित लाभ"].forEach(x=>{const th=document.createElement("th");th.scope="col";th.textContent=x;trh.append(th);});thead.append(trh);table.append(thead);
    const tbody=document.createElement("tbody");rows.forEach(x=>{const tr=document.createElement("tr");[String(x.year),money(x.invested),money(x.value),money(x.gain)].forEach((v,i)=>{const td=document.createElement(i===0?"th":"td");if(i===0)td.scope="row";td.textContent=v;tr.append(td);});tbody.append(tr);});table.append(tbody);holder.append(table);section.hidden=false;
  };
  render();["#monthly","#rate","#years"].forEach(sel=>document.querySelector(sel)?.addEventListener("input",render));document.addEventListener("click",()=>setTimeout(render,0));
})();

