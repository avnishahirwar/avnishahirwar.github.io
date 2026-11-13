(() => {
  "use strict";
  const locale = document.documentElement.lang || "en";
  const i18n = {
    hi:{widget:"वेतन TDS की गणना",fields:{income:"वार्षिक कर योग्य आय (₹)",regime:"कर व्यवस्था",residency:"धारा 87A रिबेट पात्रता",paid:"पहले से जमा TDS / टैक्स (₹)",months:"शेष वेतन महीने (1–12)"},options:{new:"नई व्यवस्था — कर वर्ष 2026–27",old:"पुरानी व्यवस्था — 60 वर्ष से कम आयु",resident:"निवासी व्यक्ति",nonresident:"अनिवासी / पात्र नहीं"},button:"मासिक TDS निकालें",reset:"रीसेट",metric:"विवरण",amount:"अनुमान",result:"आपका अनुमानित TDS",error:"आय और पहले से जमा टैक्स के लिए 0 से 50 करोड़ तक मान तथा 1–12 पूर्णांक वेतन महीने दर्ज करें।",rows:["कर योग्य आय","रिबेट से पहले टैक्स","धारा 87A रिबेट (यदि पात्र)","स्वास्थ्य एवं शिक्षा उपकर (4%)","उपकर सहित अनुमानित वार्षिक टैक्स","पहले से जमा टैक्स","अनुमानित शेष टैक्स","अनुमानित मासिक TDS"],note:"यह 2026–27 के लिए सरल अनुमान है। कटौतियाँ, छूट, अधिभार, विशेष दर वाली आय और नियोक्ता के payroll नियम पूरी तरह शामिल नहीं हैं।"},
    es:{widget:"Calcula el TDS salarial",fields:{income:"Ingresos imponibles anuales (₹)",regime:"Régimen fiscal",residency:"Elegibilidad para la rebaja de la sección 87A",paid:"TDS / impuesto ya pagado (₹)",months:"Meses de nómina restantes (1–12)"},options:{new:"Nuevo régimen — año fiscal 2026–27",old:"Régimen anterior — persona menor de 60 años",resident:"Persona residente",nonresident:"No residente / no elegible"},button:"Calcular TDS mensual",reset:"Restablecer",metric:"Concepto",amount:"Estimación",result:"Tu estimación de TDS",error:"Introduce ingresos e impuestos pagados entre 0 y 500 millones, y entre 1 y 12 meses enteros.",rows:["Ingresos imponibles","Impuesto antes de la rebaja","Rebaja de la sección 87A (si corresponde)","Cese de salud y educación (4%)","Impuesto anual estimado con cese","Impuesto ya pagado","Saldo estimado","TDS mensual indicativo"],note:"Estimación simplificada para 2026–27. No incluye por completo deducciones, exenciones, recargo, ingresos a tipos especiales ni reglas específicas de nómina."},
    fr:{widget:"Calculer le TDS sur salaire",fields:{income:"Revenu annuel imposable (₹)",regime:"Régime fiscal",residency:"Éligibilité à la réduction de l’article 87A",paid:"TDS / impôt déjà payé (₹)",months:"Mois de paie restants (1–12)"},options:{new:"Nouveau régime — année fiscale 2026–27",old:"Ancien régime — personne de moins de 60 ans",resident:"Personne résidente",nonresident:"Non-résident / non éligible"},button:"Calculer le TDS mensuel",reset:"Réinitialiser",metric:"Élément",amount:"Estimation",result:"Votre estimation de TDS",error:"Saisissez des revenus et impôts déjà payés entre 0 et 500 millions, ainsi qu’un nombre entier de 1 à 12 mois.",rows:["Revenu imposable","Impôt avant réduction","Réduction de l’article 87A (si éligible)","Contribution santé et éducation (4 %)","Impôt annuel estimé, contribution incluse","Impôt déjà payé","Solde estimé","TDS mensuel indicatif"],note:"Estimation simplifiée pour 2026–27. Les déductions, exonérations, surtaxes, revenus à taux spécial et règles de paie propres à l’employeur ne sont pas entièrement pris en compte."},
    pt:{widget:"Calcular TDS salarial",fields:{income:"Renda tributável anual (₹)",regime:"Regime tributário",residency:"Elegibilidade ao abatimento da seção 87A",paid:"TDS / imposto já pago (₹)",months:"Meses de folha restantes (1–12)"},options:{new:"Novo regime — ano fiscal 2026–27",old:"Regime antigo — pessoa com menos de 60 anos",resident:"Pessoa residente",nonresident:"Não residente / não elegível"},button:"Calcular TDS mensal",reset:"Redefinir",metric:"Item",amount:"Estimativa",result:"Sua estimativa de TDS",error:"Informe renda e imposto já pago entre 0 e 500 milhões e um número inteiro de 1 a 12 meses.",rows:["Renda tributável","Imposto antes do abatimento","Abatimento da seção 87A (se elegível)","Cess de saúde e educação (4%)","Imposto anual estimado com cess","Imposto já pago","Saldo estimado","TDS mensal indicativo"],note:"Estimativa simplificada para 2026–27. Deduções, isenções, sobretaxa, renda com alíquota especial e regras específicas da folha não são totalmente consideradas."},
    ar:{widget:"حساب ضريبة TDS على الراتب",fields:{income:"الدخل السنوي الخاضع للضريبة (₹)",regime:"النظام الضريبي",residency:"أهلية خصم المادة 87A",paid:"ضريبة TDS / الضريبة المدفوعة مسبقاً (₹)",months:"أشهر الرواتب المتبقية (1–12)"},options:{new:"النظام الجديد — السنة الضريبية 2026–27",old:"النظام القديم — فرد دون 60 عاماً",resident:"فرد مقيم",nonresident:"غير مقيم / غير مؤهل"},button:"احسب TDS الشهري",reset:"إعادة ضبط",metric:"البند",amount:"التقدير",result:"تقدير TDS الخاص بك",error:"أدخل دخلاً وضريبة مدفوعة مسبقاً بين 0 و500 مليون، وعدداً صحيحاً من 1 إلى 12 شهراً.",rows:["الدخل الخاضع للضريبة","الضريبة قبل الخصم","خصم المادة 87A (عند الأهلية)","ضريبة الصحة والتعليم (4%)","الضريبة السنوية المقدرة مع الضريبة الإضافية","الضريبة المدفوعة مسبقاً","الرصيد المقدر","TDS الشهري الإرشادي"],note:"تقدير مبسط للسنة 2026–27. لا يشمل بالكامل الخصومات والإعفاءات والرسوم الإضافية والدخل ذي المعدلات الخاصة وقواعد الرواتب الخاصة بصاحب العمل."},
    id:{widget:"Hitung TDS gaji",fields:{income:"Penghasilan kena pajak tahunan (₹)",regime:"Rezim pajak",residency:"Kelayakan potongan Pasal 87A",paid:"TDS / pajak yang sudah dibayar (₹)",months:"Bulan penggajian tersisa (1–12)"},options:{new:"Rezim baru — tahun pajak 2026–27",old:"Rezim lama — individu di bawah 60 tahun",resident:"Individu residen",nonresident:"Nonresiden / tidak memenuhi syarat"},button:"Hitung TDS bulanan",reset:"Atur ulang",metric:"Komponen",amount:"Perkiraan",result:"Perkiraan TDS Anda",error:"Masukkan penghasilan dan pajak yang sudah dibayar antara 0 dan 500 juta, serta 1–12 bulan dalam bilangan bulat.",rows:["Penghasilan kena pajak","Pajak sebelum potongan","Potongan Pasal 87A (jika memenuhi syarat)","Pajak kesehatan dan pendidikan (4%)","Perkiraan pajak tahunan termasuk cess","Pajak yang sudah dibayar","Perkiraan sisa pajak","Perkiraan TDS bulanan"],note:"Perkiraan sederhana untuk 2026–27. Pengurangan, pembebasan, surcharge, penghasilan dengan tarif khusus, dan aturan payroll pemberi kerja tidak dihitung sepenuhnya."},
    bn:{widget:"বেতনের TDS হিসাব করুন",fields:{income:"বার্ষিক করযোগ্য আয় (₹)",regime:"কর ব্যবস্থা",residency:"ধারা 87A রিবেটের যোগ্যতা",paid:"আগে জমা TDS / কর (₹)",months:"বাকি বেতন মাস (1–12)"},options:{new:"নতুন ব্যবস্থা — করবর্ষ 2026–27",old:"পুরোনো ব্যবস্থা — 60 বছরের কম ব্যক্তি",resident:"নিবাসী ব্যক্তি",nonresident:"অনিবাসী / যোগ্য নন"},button:"মাসিক TDS হিসাব করুন",reset:"রিসেট",metric:"বিবরণ",amount:"অনুমান",result:"আপনার TDS অনুমান",error:"আয় ও আগে জমা কর 0 থেকে 500 মিলিয়নের মধ্যে এবং 1–12 পূর্ণসংখ্যা বেতন মাস লিখুন।",rows:["করযোগ্য আয়","রিবেটের আগে কর","ধারা 87A রিবেট (যোগ্য হলে)","স্বাস্থ্য ও শিক্ষা উপকর (4%)","উপকরসহ আনুমানিক বার্ষিক কর","আগে জমা কর","আনুমানিক বাকি কর","আনুমানিক মাসিক TDS"],note:"2026–27 সালের জন্য সরল অনুমান। সব ছাড়, অব্যাহতি, সারচার্জ, বিশেষ হারের আয় এবং নিয়োগকর্তার payroll নিয়ম সম্পূর্ণভাবে অন্তর্ভুক্ত নয়।"},
    ta:{widget:"சம்பள TDS கணக்கிடுங்கள்",fields:{income:"ஆண்டு வரிக்குட்பட்ட வருமானம் (₹)",regime:"வரி முறை",residency:"பிரிவு 87A தள்ளுபடி தகுதி",paid:"ஏற்கனவே செலுத்திய TDS / வரி (₹)",months:"மீதமுள்ள ஊதிய மாதங்கள் (1–12)"},options:{new:"புதிய முறை — வரி ஆண்டு 2026–27",old:"பழைய முறை — 60 வயதிற்குக் குறைந்தவர்",resident:"குடியுரிமை பெற்ற நபர்",nonresident:"குடியுரிமை அற்றவர் / தகுதியற்றவர்"},button:"மாத TDS கணக்கிடு",reset:"மீட்டமை",metric:"விவரம்",amount:"மதிப்பீடு",result:"உங்கள் TDS மதிப்பீடு",error:"வருமானம் மற்றும் ஏற்கனவே செலுத்திய வரிக்கு 0 முதல் 500 மில்லியன் வரை மதிப்பையும், 1–12 முழு ஊதிய மாதங்களையும் உள்ளிடுங்கள்.",rows:["வரிக்குட்பட்ட வருமானம்","தள்ளுபடிக்கு முன் வரி","பிரிவு 87A தள்ளுபடி (தகுதி இருந்தால்)","சுகாதார மற்றும் கல்வி செஸ் (4%)","செஸ் உட்பட மதிப்பிடப்பட்ட ஆண்டு வரி","ஏற்கனவே செலுத்திய வரி","மதிப்பிடப்பட்ட மீதித் தொகை","மதிப்பிடப்பட்ட மாத TDS"],note:"2026–27க்கான எளிய மதிப்பீடு. கழிவுகள், விலக்குகள், கூடுதல் வரி, சிறப்பு விகித வருமானம் மற்றும் நிறுவன ஊதிய விதிகள் முழுமையாகக் கணக்கிடப்படவில்லை."}
  };
  const t=i18n[locale];
  const root=document.querySelector("[data-tds-calculator]");
  if(!t||!root||root.dataset.ready==="true")return;
  root.dataset.ready="true";
  const money=n=>"₹"+Number(n).toLocaleString(({hi:"hi-IN",bn:"bn-IN",ta:"ta-IN",ar:"ar-IN",en:"en-IN"})[locale]||locale,{maximumFractionDigits:2});
  const panel=document.createElement("div");panel.className="tds-widget";
  const heading=document.createElement("h2");heading.textContent=t.widget;
  const form=document.createElement("form");form.id="tds-local-form";
  const fields=[
    {id:"income",type:"number",label:t.fields.income,value:900000,min:0,max:500000000,step:1},
    {id:"regime",type:"select",label:t.fields.regime,options:[["new",t.options.new],["old",t.options.old]]},
    {id:"residency",type:"select",label:t.fields.residency,options:[["resident",t.options.resident],["nonresident",t.options.nonresident]]},
    {id:"paid",type:"number",label:t.fields.paid,value:0,min:0,max:500000000,step:1},
    {id:"months",type:"number",label:t.fields.months,value:6,min:1,max:12,step:1}
  ];
  fields.forEach(field=>{
    const label=document.createElement("label");label.className="field";label.htmlFor=field.id;label.textContent=field.label;
    const input=document.createElement(field.type==="select"?"select":"input");input.id=field.id;input.name=field.id;
    if(field.type==="select"){field.options.forEach(([value,text])=>{const option=document.createElement("option");option.value=value;option.textContent=text;input.append(option);});}
    else{input.type="number";input.value=field.value;input.min=field.min;input.max=field.max;input.step=field.step;input.required=true;}
    label.append(input);form.append(label);
  });
  const actions=document.createElement("div");actions.className="actions";
  const submit=document.createElement("button");submit.type="submit";submit.className="btn";submit.textContent=t.button;
  const reset=document.createElement("button");reset.type="reset";reset.className="btn alt";reset.textContent=t.reset;
  actions.append(submit,reset);form.append(actions);
  const error=document.createElement("p");error.className="error";error.setAttribute("role","alert");error.setAttribute("aria-live","polite");
  const result=document.createElement("div");result.className="tds-result";result.setAttribute("aria-live","polite");
  panel.append(heading,form,error,result);root.append(panel);
  const calculate=()=>{
    const income=Number(form.elements.income.value),paid=Number(form.elements.paid.value),months=Number(form.elements.months.value),regime=form.elements.regime.value,residency=form.elements.residency.value;
    if(!Number.isFinite(income)||income<0||income>500000000||!Number.isFinite(paid)||paid<0||paid>500000000||!Number.isInteger(months)||months<1||months>12){error.textContent=t.error;result.replaceChildren();return;}
    const newRegime=regime==="new";
    const slabs=newRegime?[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]]:[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]];
    let previous=0,tax=0;
    for(const [cap,rate] of slabs){tax+=Math.max(0,Math.min(income,cap)-previous)*rate;previous=cap;if(income<=cap)break;}
    const eligible=residency==="resident";
    let rebate=0;
    if(eligible&&newRegime){rebate=income<=1200000?Math.min(tax,60000):Math.max(0,tax-(income-1200000));}
    else if(eligible&&income<=500000){rebate=Math.min(tax,12500);}
    const afterRebate=Math.max(0,tax-rebate),cess=afterRebate*.04,annual=afterRebate+cess,balance=Math.max(0,annual-paid),monthly=balance/months;
    const values=[income,tax,rebate,cess,annual,paid,balance,monthly];
    result.replaceChildren();
    const title=document.createElement("h3");title.textContent=t.result;result.append(title);
    const table=document.createElement("table");table.className="tds-table";table.setAttribute("aria-label",t.result);
    const head=document.createElement("thead"),headRow=document.createElement("tr");
    [t.metric,t.amount].forEach(text=>{const th=document.createElement("th");th.textContent=text;headRow.append(th);});head.append(headRow);table.append(head);
    const body=document.createElement("tbody");
    t.rows.forEach((label,i)=>{const tr=document.createElement("tr"),th=document.createElement("th"),td=document.createElement("td");th.scope="row";th.textContent=label;td.textContent=money(values[i]);tr.append(th,td);body.append(tr);});
    table.append(body);result.append(table);
    const note=document.createElement("p");note.className="small";note.textContent=t.note;result.append(note);
    if(typeof gtag==="function")gtag("event","calculator_used",{calculator_page:location.pathname,calculator_action:"calculate"});
    error.textContent="";
  };
  form.addEventListener("submit",e=>{e.preventDefault();calculate();});
  form.addEventListener("reset",()=>setTimeout(calculate,0));
  calculate();
})();