#!/usr/bin/env node
'use strict';
// Adds a Hindi guide section (सूत्र, उदाहरण, FAQ, संबंधित लिंक) to Hindi calculator pages.
// Idempotent. Numbers are computed with the same maths as the English guide script.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const S = '<!--fc-guide-hi:start-->', E = '<!--fc-guide-hi:end-->';
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const emi = (p, a, n) => { const r = a / 1200; return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); };
function stepUp(m, stepPct, annual, years) {
  let bal = 0, inv = 0; const st = stepPct / 100, mr = Math.pow(1 + annual / 100, 1 / 12) - 1, months = Math.round(years * 12);
  for (let i = 0; i < months; i++) { const c = m * Math.pow(1 + st, Math.floor(i / 12)); inv += c; bal = (bal + c) * (1 + mr); }
  return { bal, inv };
}
const { project401k } = require(path.join(root, 'assets/country-calculators.js'));

const loanE = emi(500000, 12, 36), su = stepUp(5000, 10, 12, 15), flat = stepUp(5000, 0, 12, 15);
const k = project401k({ currentBalance: 10000, annualSalary: 75000, employeeContributionPercent: 6, employerMatchPercent: 50, employerMatchCapPercent: 6, annualReturnPercent: 6, salaryGrowthPercent: 2, years: 20 });
const tax = 250 * 8.25 / 100;

const pages = [
  {
    file: 'hi/calculators/personal-loan-emi-calculator.html',
    h2: 'पर्सनल लोन EMI: सूत्र, उदाहरण और ध्यान रखने वाली बातें',
    formula: 'EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1). यहाँ P लोन की राशि है, r मासिक ब्याज दर (वार्षिक दर ÷ 12) और n मासिक किस्तों की संख्या है। कुल ब्याज = EMI × n − P।',
    example: '₹5,00,000 के पर्सनल लोन पर 12% सालाना ब्याज और 36 महीने की अवधि में मासिक दर 1% बनती है। घटते शेष (reducing balance) वाले सूत्र से EMI लगभग <strong>' + inr(loanE) + '</strong>, कुल भुगतान लगभग ' + inr0(loanE * 36) + ' और कुल ब्याज लगभग ' + inr0(loanE * 36 - 500000) + ' आता है। प्रोसेसिंग फीस और बीमा इसमें शामिल नहीं हैं।',
    mistakes: ['सिर्फ़ EMI देखकर दो ऑफ़र की तुलना करना, कुल ब्याज और फीस न देखना।', 'प्रोसेसिंग फीस, GST और प्रीपेमेंट/फोरक्लोज़र शुल्क को भूल जाना।', 'EMI घटाने के लिए बिना सोचे लंबी अवधि चुन लेना, जिससे कुल ब्याज बढ़ता है।', 'फ्लैट रेट और घटते शेष वाली दर को एक जैसा मान लेना।'],
    faqs: [['पर्सनल लोन की EMI कैसे निकालते हैं?', 'ऊपर दिए घटते शेष वाले सूत्र से। हर महीने ब्याज बचे हुए मूलधन पर लगता है और किस्त बराबर रहती है।'], ['क्या कम अवधि चुनने से पैसे बचते हैं?', 'आमतौर पर हाँ। EMI ज़्यादा होती है, पर ब्याज कम महीनों के लिए देना पड़ता है, इसलिए कुल ब्याज घटता है।'], ['क्या यह बैंक का ऑफ़र है?', 'नहीं, यह सिर्फ़ गणितीय अनुमान है। पात्रता, दर और अंतिम किस्त-तालिका बैंक या NBFC तय करता है।']],
    related: ['loan-emi-calculator', 'home-loan-emi-calculator', 'credit-card-emi-calculator', 'business-loan-emi-calculator', 'emi-affordability-calculator']
  },
  {
    file: 'hi/calculators/step-up-sip-calculator.html',
    h2: 'स्टेप-अप SIP: गणना कैसे होती है और एक उदाहरण',
    formula: 'साल k की मासिक किस्त = शुरुआती SIP × (1 + स्टेप-अप)^(k − 1)। बैलेंस हर महीने प्रभावी मासिक दर (1 + वार्षिक रिटर्न)^(1/12) − 1 से बढ़ता है और हर किस्त महीने की शुरुआत में जोड़ी जाती है।',
    example: '₹5,000 की मासिक SIP, हर साल 10% बढ़ोतरी और 12% अनुमानित सालाना रिटर्न पर 15 साल में कुल निवेश लगभग ' + inr0(su.inv) + ' और अनुमानित मूल्य लगभग <strong>' + inr0(su.bal) + '</strong> आता है। उसी मान्यता पर बिना स्टेप-अप की ₹5,000 SIP में ' + inr0(flat.inv) + ' निवेश होता है और मूल्य लगभग ' + inr0(flat.bal) + ' बनता है। ये आँकड़े सिर्फ़ उदाहरण हैं, रिटर्न की गारंटी नहीं।',
    mistakes: ['अनुमानित रिटर्न को पक्का भविष्यवाणी मान लेना।', 'ऐसा स्टेप-अप चुनना जो आय न बढ़ने पर निभाना मुश्किल हो।', 'फंड खर्च, एग्ज़िट लोड और टैक्स को नज़रअंदाज़ करना, जो यहाँ शामिल नहीं हैं।'],
    faqs: [['स्टेप-अप SIP क्या है?', 'ऐसी SIP जिसकी मासिक राशि तय प्रतिशत से, आमतौर पर हर साल, बढ़ती है।'], ['स्टेप-अप से फ़ायदा क्यों होता है?', 'बाद के सालों में किस्त बड़ी होती है, इसलिए कुल निवेश ज़्यादा होता है और अंतिम राशि आमतौर पर फ्लैट SIP से अधिक रहती है।'], ['क्या नतीजे गारंटीशुदा हैं?', 'नहीं। बाज़ार से जुड़े निवेश में रिटर्न तय नहीं होता; यह टूल एक स्थिर अनुमानित दर मानता है।']],
    related: ['sip-calculator', 'lumpsum-calculator', 'fd-calculator', 'inflation-calculator']
  },
  {
    file: 'hi/calculators/sales-tax-calculator.html',
    h2: 'सेल्स टैक्स: सूत्र, उदाहरण और आम गलतियाँ',
    formula: 'सेल्स टैक्स = कीमत × दर ÷ 100, और कुल = कीमत + सेल्स टैक्स। टैक्स-सहित कुल से टैक्स-पूर्व कीमत निकालने के लिए: कीमत = कुल ÷ (1 + दर ÷ 100)।',
    example: '250.00 की वस्तु पर 8.25% सेल्स टैक्स लगे तो टैक्स ' + tax.toFixed(2) + ' बनता है और कुल ' + (250 + tax).toFixed(2) + ' होता है। उल्टा हिसाब लगाएँ तो ' + (250 + tax).toFixed(2) + ' के कुल पर टैक्स-पूर्व कीमत 250.00 निकलती है।',
    mistakes: ['सिर्फ़ राज्य की दर लेना जबकि स्थानीय दरें भी लगती हों।', 'हर वस्तु को टैक्स योग्य मान लेना; कई जगह कुछ चीज़ें या सेवाएँ छूट में होती हैं।', 'डिस्काउंट के बाद की कीमत पर दर लगाना, जबकि नियम मूल कीमत पर टैक्स लगाने का हो सकता है।'],
    faqs: [['सेल्स टैक्स कैसे निकालें?', 'कीमत को दर (दशमलव में, जैसे 8.25% के लिए 0.0825) से गुणा करें और नतीजा कीमत में जोड़ दें।'], ['क्या हर जगह सेल्स टैक्स एक जैसा है?', 'नहीं। दरें और छूट राज्य, काउंटी, शहर और देश के हिसाब से अलग होती हैं।'], ['क्या यह टूल मेरे इलाके की दर खुद ढूँढता है?', 'नहीं। आप जो दर इस्तेमाल करना चाहते हैं वही दर डालें और संबंधित कर प्राधिकरण से पुष्टि कर लें।']],
    related: ['gst-calculator', 'tip-calculator', 'percentage-calculator']
  },
  {
    file: 'hi/calculators/401k-calculator.html',
    h2: '401(k) ग्रोथ: उदाहरण और नतीजा कैसे पढ़ें',
    formula: 'हर साल: कर्मचारी का योगदान = वेतन × आपका योगदान %; नियोक्ता मैच = वेतन × min(आपका %, मैच सीमा %) × मैच %। बैलेंस अनुमानित सालाना रिटर्न से बढ़ता है, योगदान साल के अंत में जुड़ता है और फिर वेतन वृद्धि दर से बढ़ता है।',
    example: 'डिफ़ॉल्ट मानों पर यानी $10,000 शुरुआती बैलेंस, $75,000 वेतन, 6% आपका योगदान, वेतन के 6% तक पर 50% नियोक्ता मैच, 6% सालाना रिटर्न और 2% वेतन वृद्धि के साथ 20 साल में अनुमानित बैलेंस लगभग <strong>' + usd(k.endingBalance) + '</strong> आता है। इसमें आपका योगदान लगभग ' + usd(k.employeeContributions) + ' और नियोक्ता मैच लगभग ' + usd(k.employerContributions) + ' है। यह सिर्फ़ एक उदाहरण है, पूर्वानुमान नहीं।',
    mistakes: ['पूरा नियोक्ता मैच पाने जितना योगदान न करना।', 'ऊँचे रिटर्न का अनुमान डालकर नतीजे को पक्का मान लेना।', 'यह भूल जाना कि फीस, टैक्स, वेस्टिंग नियम और IRS की योगदान सीमा यहाँ शामिल नहीं हैं।'],
    faqs: [['401(k) मैच क्या होता है?', 'आपके अपने योगदान के आधार पर नियोक्ता जो रकम आपके 401(k) में जोड़ता है, प्लान की तय सीमा तक।'], ['क्या यह टैक्स और योगदान सीमा को जोड़ता है?', 'नहीं। मौजूदा IRS सीमाएँ और अपने प्लान के नियम देखें; इस अनुमान में टैक्स, फीस, वेस्टिंग और निकासी शामिल नहीं हैं।'], ['योगदान थोड़ा बढ़ाने से फ़र्क क्यों पड़ता है?', 'योगदान पर चक्रवृद्धि लगती है, इसलिए अतिरिक्त साल और अतिरिक्त प्रतिशत अंतिम बैलेंस को काफ़ी बदल सकते हैं।']],
    related: ['compound-interest-calculator', 'inflation-calculator', 'sip-calculator']
  }
];

const label = { 'loan-emi-calculator': 'लोन EMI कैलकुलेटर', 'home-loan-emi-calculator': 'होम लोन EMI कैलकुलेटर', 'credit-card-emi-calculator': 'क्रेडिट कार्ड EMI कैलकुलेटर', 'business-loan-emi-calculator': 'बिज़नेस लोन EMI कैलकुलेटर', 'emi-affordability-calculator': 'EMI अफ़ोर्डेबिलिटी कैलकुलेटर', 'sip-calculator': 'SIP कैलकुलेटर', 'lumpsum-calculator': 'लम्पसम कैलकुलेटर', 'fd-calculator': 'FD कैलकुलेटर', 'inflation-calculator': 'महँगाई कैलकुलेटर', 'gst-calculator': 'GST कैलकुलेटर', 'tip-calculator': 'टिप कैलकुलेटर', 'percentage-calculator': 'प्रतिशत कैलकुलेटर', 'compound-interest-calculator': 'चक्रवृद्धि ब्याज कैलकुलेटर' };

for (const p of pages) {
  const file = path.join(root, p.file);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(S + '[\\s\\S]*?' + E), '');
  const links = p.related.filter((s) => fs.existsSync(path.join(root, 'hi/calculators', s + '.html')))
    .map((s) => '<a href="/hi/calculators/' + s + '.html">' + label[s] + '</a>');
  const style = 'background:#fff;border:1px solid #e0e5ea;border-radius:14px;padding:22px;margin:18px 0';
  const block = S + '<section id="fc-guide-hi" lang="hi" style="' + style + '"><h2>' + esc(p.h2) + '</h2>' +
    '<h3>सूत्र</h3><p>' + p.formula + '</p><h3>हल किया हुआ उदाहरण</h3><p>' + p.example + '</p>' +
    '<h3>आम गलतियाँ</h3><ul>' + p.mistakes.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>' +
    '<h3>अक्सर पूछे जाने वाले सवाल</h3>' + p.faqs.map(([q, a]) => '<details><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('') +
    (links.length ? '<h3>संबंधित कैलकुलेटर</h3><p>' + links.join(' · ') + '</p>' : '') +
    '<p style="color:#596b7c;font-size:.9rem">यह सिर्फ़ शैक्षिक अनुमान है, वित्तीय, कर या कानूनी सलाह नहीं। दरें और नियम संबंधित ऋणदाता, कर प्राधिकरण या प्लान प्रदाता से जाँच लें।</p></section>' + E;
  const aside = html.indexOf('<aside class="fc-review-note"');
  const end = aside >= 0 ? aside : html.indexOf('</main>');
  if (end < 0) throw new Error('No insertion point: ' + p.file);
  fs.writeFileSync(file, html.slice(0, end) + block + html.slice(end));
  console.log('Hindi guide added: ' + p.file + ' (' + links.length + ' related links)');
}
