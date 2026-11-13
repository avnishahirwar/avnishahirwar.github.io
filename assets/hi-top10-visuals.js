(() => {
  "use strict";
  const configs = {
    "/hi/calculators/loan-emi-calculator.html": {title:"परिणाम का दृश्य सारांश", rows:[["मासिक EMI","#emi"],["कुल ब्याज","#interest"],["कुल भुगतान","#total"]]},
    "/hi/calculators/home-loan-emi-calculator.html": {title:"होम लोन परिणाम का दृश्य सारांश", rows:[["मासिक EMI","#emi"],["कुल ब्याज","#interest"],["कुल भुगतान","#total"]]},
    "/hi/calculators/car-loan-calculator.html": {title:"कार लोन परिणाम का दृश्य सारांश", table:"#extraResult"},
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