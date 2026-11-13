(() => {
  "use strict";
  const locale=document.documentElement.lang||"en";
  const i18n={
    hi:{widget:"चक्रवृद्धि ब्याज की गणना",fields:{principal:"प्रारंभिक मूलधन (₹)",rate:"वार्षिक ब्याज दर (%)",years:"समय अवधि (वर्ष)",frequency:"चक्रवृद्धि की आवृत्ति"},frequency:{1:"वार्षिक",2:"छमाही",4:"तिमाही",12:"मासिक",365:"दैनिक (365 दिन)"},button:"चक्रवृद्धि ब्याज निकालें",reset:"रीसेट",result:"आपका अनुमानित परिणाम",metric:"विवरण",value:"अनुमान",rows:["प्रारंभिक मूलधन","वार्षिक ब्याज दर","चक्रवृद्धि आवृत्ति","कुल चक्रवृद्धि अवधियाँ","अंतिम राशि","अर्जित ब्याज"],invalid:"मूलधन शून्य से अधिक, ब्याज दर 0–100% और अवधि 0 से अधिक तथा 100 वर्ष तक दर्ज करें।",tooLarge:"चुनी गई अवधि इस गणना की समर्थित सीमा से अधिक है।",overflow:"परिणाम समर्थित संख्यात्मक सीमा से बाहर है। कम मान दर्ज करें।",note:"यह अनुमान स्थिर वार्षिक दर और अवधि के दौरान कोई अतिरिक्त जमा या निकासी न होने की धारणा पर आधारित है।"},
    es:{widget:"Calcular interés compuesto",fields:{principal:"Capital inicial (₹)",rate:"Tasa de interés anual (%)",years:"Periodo (años)",frequency:"Frecuencia de capitalización"},frequency:{1:"Anual",2:"Semestral",4:"Trimestral",12:"Mensual",365:"Diaria (365 días)"},button:"Calcular interés compuesto",reset:"Restablecer",result:"Tu resultado estimado",metric:"Concepto",value:"Estimación",rows:["Capital inicial","Tasa anual","Frecuencia de capitalización","Periodos totales de capitalización","Importe final","Intereses generados"],invalid:"Introduce un capital mayor que cero, una tasa de 0–100% y un periodo superior a cero y de hasta 100 años.",tooLarge:"El periodo seleccionado supera el límite admitido para este cálculo.",overflow:"El resultado supera el rango numérico admitido. Prueba con valores menores.",note:"La estimación supone una tasa anual constante y que no hay depósitos ni retiradas adicionales durante el periodo."},
    fr:{widget:"Calculer les intérêts composés",fields:{principal:"Capital initial (₹)",rate:"Taux d’intérêt annuel (%)",years:"Durée (années)",frequency:"Fréquence de capitalisation"},frequency:{1:"Annuelle",2:"Semestrielle",4:"Trimestrielle",12:"Mensuelle",365:"Quotidienne (365 jours)"},button:"Calculer les intérêts composés",reset:"Réinitialiser",result:"Votre résultat estimé",metric:"Élément",value:"Estimation",rows:["Capital initial","Taux annuel","Fréquence de capitalisation","Nombre total de périodes","Montant final","Intérêts générés"],invalid:"Saisissez un capital supérieur à zéro, un taux de 0 à 100 % et une durée supérieure à zéro, jusqu’à 100 ans.",tooLarge:"La durée sélectionnée dépasse la limite prise en charge par ce calcul.",overflow:"Le résultat dépasse la plage numérique prise en charge. Essayez des valeurs plus faibles.",note:"Cette estimation suppose un taux annuel fixe et aucun dépôt ni retrait supplémentaire pendant la période."},
    pt:{widget:"Calcular juros compostos",fields:{principal:"Capital inicial (₹)",rate:"Taxa de juros anual (%)",years:"Período (anos)",frequency:"Frequência de capitalização"},frequency:{1:"Anual",2:"Semestral",4:"Trimestral",12:"Mensal",365:"Diária (365 dias)"},button:"Calcular juros compostos",reset:"Redefinir",result:"Seu resultado estimado",metric:"Item",value:"Estimativa",rows:["Capital inicial","Taxa anual","Frequência de capitalização","Total de períodos de capitalização","Valor final","Juros acumulados"],invalid:"Informe um capital maior que zero, taxa de 0–100% e período maior que zero e de até 100 anos.",tooLarge:"O período selecionado ultrapassa o limite aceito por este cálculo.",overflow:"O resultado está fora do intervalo numérico aceito. Tente valores menores.",note:"A estimativa pressupõe uma taxa anual constante e nenhuma contribuição ou retirada adicional durante o período."},
    ar:{widget:"حساب الفائدة المركبة",fields:{principal:"رأس المال الأولي (₹)",rate:"معدل الفائدة السنوي (%)",years:"الفترة (بالسنوات)",frequency:"وتيرة إضافة الفائدة"},frequency:{1:"سنوية",2:"نصف سنوية",4:"ربع سنوية",12:"شهرية",365:"يومية (365 يوماً)"},button:"احسب الفائدة المركبة",reset:"إعادة ضبط",result:"النتيجة المقدرة",metric:"البند",value:"التقدير",rows:["رأس المال الأولي","معدل الفائدة السنوي","وتيرة إضافة الفائدة","إجمالي فترات الإضافة","المبلغ النهائي","الفائدة المكتسبة"],invalid:"أدخل رأس مال أكبر من صفر ومعدل فائدة بين 0 و100% وفترة أكبر من صفر وحتى 100 سنة.",tooLarge:"الفترة المحددة تتجاوز الحد المدعوم لهذا الحساب.",overflow:"النتيجة خارج النطاق العددي المدعوم. جرّب قيماً أصغر.",note:"يعتمد هذا التقدير على معدل سنوي ثابت وعدم وجود إيداعات أو سحوبات إضافية خلال الفترة."},
    id:{widget:"Hitung bunga majemuk",fields:{principal:"Modal awal (₹)",rate:"Suku bunga tahunan (%)",years:"Jangka waktu (tahun)",frequency:"Frekuensi penggandaan"},frequency:{1:"Tahunan",2:"Semesteran",4:"Triwulanan",12:"Bulanan",365:"Harian (365 hari)"},button:"Hitung bunga majemuk",reset:"Atur ulang",result:"Perkiraan hasil Anda",metric:"Komponen",value:"Perkiraan",rows:["Modal awal","Suku bunga tahunan","Frekuensi penggandaan","Total periode penggandaan","Jumlah akhir","Bunga yang diperoleh"],invalid:"Masukkan modal lebih dari nol, suku bunga 0–100%, dan periode lebih dari nol hingga 100 tahun.",tooLarge:"Periode yang dipilih melebihi batas yang didukung kalkulasi ini.",overflow:"Hasil berada di luar rentang angka yang didukung. Coba nilai yang lebih kecil.",note:"Perkiraan ini mengasumsikan suku bunga tahunan tetap dan tidak ada setoran atau penarikan tambahan selama periode."},
    bn:{widget:"চক্রবৃদ্ধি সুদ হিসাব করুন",fields:{principal:"প্রাথমিক মূলধন (₹)",rate:"বার্ষিক সুদের হার (%)",years:"সময়কাল (বছর)",frequency:"চক্রবৃদ্ধির ঘনত্ব"},frequency:{1:"বার্ষিক",2:"অর্ধবার্ষিক",4:"ত্রৈমাসিক",12:"মাসিক",365:"দৈনিক (365 দিন)"},button:"চক্রবৃদ্ধি সুদ হিসাব করুন",reset:"রিসেট",result:"আপনার আনুমানিক ফলাফল",metric:"বিবরণ",value:"অনুমান",rows:["প্রাথমিক মূলধন","বার্ষিক সুদের হার","চক্রবৃদ্ধির ঘনত্ব","মোট চক্রবৃদ্ধি সময়","শেষের পরিমাণ","অর্জিত সুদ"],invalid:"শূন্যের বেশি মূলধন, 0–100% সুদের হার এবং শূন্যের বেশি ও 100 বছর পর্যন্ত সময় লিখুন।",tooLarge:"নির্বাচিত সময় এই গণনার সমর্থিত সীমা ছাড়িয়ে গেছে।",overflow:"ফলাফল সমর্থিত সংখ্যার সীমার বাইরে। ছোট মান দিয়ে চেষ্টা করুন।",note:"এই অনুমানে স্থির বার্ষিক সুদের হার এবং সময়কালে অতিরিক্ত জমা বা উত্তোলন না থাকার কথা ধরা হয়েছে।"},
    ta:{widget:"கூட்டு வட்டியைக் கணக்கிடுங்கள்",fields:{principal:"தொடக்க அசல் தொகை (₹)",rate:"ஆண்டு வட்டி விகிதம் (%)",years:"காலம் (ஆண்டுகள்)",frequency:"வட்டி சேர்க்கும் அடிக்கடி"},frequency:{1:"ஆண்டு தோறும்",2:"அரை ஆண்டுக்கு ஒருமுறை",4:"காலாண்டுக்கு ஒருமுறை",12:"மாதந்தோறும்",365:"தினசரி (365 நாட்கள்)"},button:"கூட்டு வட்டியைக் கணக்கிடு",reset:"மீட்டமை",result:"மதிப்பிடப்பட்ட முடிவு",metric:"விவரம்",value:"மதிப்பீடு",rows:["தொடக்க அசல் தொகை","ஆண்டு வட்டி விகிதம்","வட்டி சேர்க்கும் அடிக்கடி","மொத்த வட்டி காலங்கள்","இறுதித் தொகை","ஈட்டிய வட்டி"],invalid:"பூஜ்ஜியத்தை விட அதிகமான அசல், 0–100% வட்டி மற்றும் பூஜ்ஜியத்தை விட அதிகமாகவும் 100 ஆண்டுகள் வரை உள்ள காலத்தையும் உள்ளிடுங்கள்.",tooLarge:"தேர்ந்தெடுத்த காலம் இந்தக் கணக்கீட்டின் ஆதரவு வரம்பை மீறுகிறது.",overflow:"முடிவு ஆதரிக்கப்படும் எண் வரம்பிற்கு வெளியே உள்ளது. குறைந்த மதிப்புகளை முயற்சிக்கவும்.",note:"இந்த மதிப்பீடு நிலையான ஆண்டு வட்டியையும் காலப்பகுதியில் கூடுதல் வைப்பு அல்லது பணம் எடுத்தல் இல்லாததையும் கருதுகிறது."}
  };
  const t=i18n[locale],root=document.querySelector("[data-compound-calculator]");
  if(!t||!root||root.dataset.ready==="true")return;
  root.dataset.ready="true";
  const numberLocale=({hi:"hi-IN",bn:"bn-IN",ta:"ta-IN",ar:"ar-IN",en:"en-IN"})[locale]||locale;
  const money=n=>"₹"+Number(n).toLocaleString(numberLocale,{maximumFractionDigits:2});
  const number=n=>Number(n).toLocaleString(numberLocale,{maximumFractionDigits:2});
  const panel=document.createElement("div");panel.className="compound-widget";
  const heading=document.createElement("h2");heading.textContent=t.widget;
  const form=document.createElement("form");form.id="compound-local-form";
  const fields=[
    {id:"principal",label:t.fields.principal,value:100000,min:0.01,max:500000000,step:0.01},
    {id:"rate",label:t.fields.rate,value:8,min:0,max:100,step:0.01},
    {id:"years",label:t.fields.years,value:5,min:0.01,max:100,step:0.25}
  ];
  fields.forEach(field=>{const label=document.createElement("label");label.className="field";label.htmlFor=field.id;label.textContent=field.label;const input=document.createElement("input");input.id=field.id;input.name=field.id;input.type="number";input.value=field.value;input.min=field.min;input.max=field.max;input.step=field.step;input.required=true;label.append(input);form.append(label);});
  const freqLabel=document.createElement("label");freqLabel.className="field";freqLabel.htmlFor="frequency";freqLabel.textContent=t.fields.frequency;
  const frequency=document.createElement("select");frequency.id="frequency";frequency.name="frequency";
  [1,2,4,12,365].forEach(n=>{const o=document.createElement("option");o.value=String(n);o.textContent=t.frequency[n];if(n===4)o.selected=true;frequency.append(o);});freqLabel.append(frequency);form.append(freqLabel);
  const actions=document.createElement("div");actions.className="actions";
  const submit=document.createElement("button");submit.type="submit";submit.className="btn";submit.textContent=t.button;
  const reset=document.createElement("button");reset.type="reset";reset.className="btn alt";reset.textContent=t.reset;
  actions.append(submit,reset);form.append(actions);
  const error=document.createElement("p");error.className="error";error.setAttribute("role","alert");error.setAttribute("aria-live","polite");
  const result=document.createElement("div");result.className="compound-result";result.setAttribute("aria-live","polite");
  panel.append(heading,form,error,result);root.append(panel);
  const calculate=()=>{
    const p=Number(form.elements.principal.value),rate=Number(form.elements.rate.value),years=Number(form.elements.years.value),n=Number(form.elements.frequency.value);
    if(!Number.isFinite(p)||p<=0||p>500000000||!Number.isFinite(rate)||rate<0||rate>100||!Number.isFinite(years)||years<=0||years>100||![1,2,4,12,365].includes(n)){error.textContent=t.invalid;result.replaceChildren();return;}
    const periods=n*years;
    if(!Number.isFinite(periods)||periods>36500){error.textContent=t.tooLarge;result.replaceChildren();return;}
    const amount=p*Math.pow(1+(rate/100)/n,periods);
    if(!Number.isFinite(amount)){error.textContent=t.overflow;result.replaceChildren();return;}
    const values=[money(p),number(rate)+"%",t.frequency[n],number(periods),money(amount),money(amount-p)];
    result.replaceChildren();
    const title=document.createElement("h3");title.textContent=t.result;result.append(title);
    const table=document.createElement("table");table.className="compound-table";table.setAttribute("aria-label",t.result);
    const head=document.createElement("thead"),trh=document.createElement("tr");
    [t.metric,t.value].forEach(x=>{const th=document.createElement("th");th.textContent=x;trh.append(th);});head.append(trh);table.append(head);
    const body=document.createElement("tbody");
    t.rows.forEach((label,i)=>{const tr=document.createElement("tr"),th=document.createElement("th"),td=document.createElement("td");th.scope="row";th.textContent=label;td.textContent=values[i];tr.append(th,td);body.append(tr);});
    table.append(body);result.append(table);
    const note=document.createElement("p");note.className="small";note.textContent=t.note;result.append(note);
    if(typeof gtag==="function")gtag("event","calculator_used",{calculator_page:location.pathname,calculator_action:"calculate"});
    error.textContent="";
  };
  form.addEventListener("submit",e=>{e.preventDefault();calculate();});
  form.addEventListener("reset",()=>setTimeout(calculate,0));
  calculate();
})();