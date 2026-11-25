#!/usr/bin/env node
'use strict';
// Quality batch 01: adds calculators that do not already exist in the catalogue.
// Each tool has its own formula, interpretation note and FAQ. Worked examples are
// computed from the default inputs so the published example always matches the maths.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const DOMAIN = {
  finance: {app: 'FinanceApplication', label: 'Finance', note: 'This tool is educational and informational. It is not tax, investment, lending, accounting, legal or professional advice. Rates, fees, taxes and product terms differ by provider and country, so confirm the figures with the relevant institution before acting.'},
  health: {app: 'HealthApplication', label: 'Health', note: 'This tool gives general informational estimates only. It is not medical advice, a diagnosis or a treatment plan. Individual needs vary with age, health conditions, medicines and activity, so speak with a qualified health professional before changing diet, training or medication.'},
  science: {app: 'EducationalApplication', label: 'Science', note: 'This tool uses idealised textbook formulas for learning and quick estimates. Real systems include friction, losses, tolerances and measurement error. Do not use it as the only basis for safety-critical or regulated engineering design.'},
  math: {app: 'EducationalApplication', label: 'Mathematics', note: 'This tool applies standard textbook formulas to the values you enter. Check units and rounding, and confirm important results with a second method.'},
  business: {app: 'BusinessApplication', label: 'Business', note: 'This tool provides planning estimates from the figures you enter. Definitions vary between companies and accounting standards, so align the inputs with your own policies and verify results with a qualified accountant or adviser before making decisions.'},
  agri: {app: 'BusinessApplication', label: 'Agriculture', note: 'This tool gives planning estimates. Actual requirements depend on soil tests, crop variety, season, local recommendations and input quality. Follow advice from your local agricultural extension service before purchasing inputs.'}
};

const tools = [
  // ---------------- Finance ----------------
  {slug:'loan-amount-from-emi-calculator',name:'Loan Amount from EMI Calculator',desc:'Work out how large a loan you can afford from the monthly EMI you can pay, the interest rate and the tenure.',domain:'finance',section:'loans-credit',
   fields:[['emi','Affordable monthly EMI','25000'],['rate','Annual interest rate (%)','9'],['years','Loan tenure (years)','15']],guard:'v.rate',guardMsg:'Enter an interest rate above zero.',
   calc:'v.i=v.rate/1200;v.n=v.years*12;v.p=v.emi*(1-Math.pow(1+v.i,-v.n))/v.i;',
   formula:'Loan amount = EMI × (1 − (1 + r)^−n) ÷ r, where r is the monthly rate (annual rate ÷ 12 ÷ 100) and n is the number of monthly instalments.',
   rows:[['Loan amount you can service','v.p'],['Total of all EMIs','v.emi*v.n'],['Total interest paid','v.emi*v.n-v.p']],
   interpret:'Start from what your monthly budget allows rather than from the property or vehicle price. Lenders also apply income, credit-score and obligation limits, so the amount shown is a ceiling for planning, not an approval.',
   faq:[['Does a longer tenure raise the loan amount I can afford?','Yes. A longer tenure lowers the EMI for the same loan, so the same EMI supports a larger principal. The trade-off is much more total interest.'],['Are processing fees included?','No. Fees, insurance and taxes are separate costs that reduce the amount actually available to spend.']]},
  {slug:'late-payment-interest-calculator',name:'Late Payment Interest Calculator',desc:'Estimate simple interest charged on an overdue invoice or bill from the amount, annual rate and days late.',domain:'finance',section:'loans-credit',
   fields:[['p','Overdue amount','100000'],['rate','Annual late-payment rate (%)','18'],['days','Days overdue','45']],guard:'1',
   calc:'v.int=v.p*v.rate/100*v.days/365;',
   formula:'Late interest = overdue amount × annual rate ÷ 100 × days overdue ÷ 365.',
   rows:[['Late-payment interest','v.int'],['Total now due','v.p+v.int'],['Interest per day','v.p*v.rate/100/365']],
   interpret:'Use this to compare the cost of paying late against the cost of borrowing elsewhere. Contracts and local law may set different day-count rules, grace periods or compounding.',
   faq:[['Is the interest simple or compound?','This calculator uses simple interest on the overdue amount. Some contracts compound monthly, which gives a slightly higher figure.'],['Which day-count basis is used?','A 365-day year. Some agreements use 360 days, which increases the interest a little.']]},
  {slug:'forex-spread-cost-calculator',name:'Forex Spread Cost Calculator',desc:'See the hidden cost of a currency conversion by comparing the mid-market rate with a rate that includes the provider spread.',domain:'finance',section:'home-travel',
   fields:[['amount','Foreign currency amount to buy','1000'],['mid','Mid-market rate (local currency per unit)','83.2'],['spread','Provider spread (%)','1.5']],guard:'1',
   calc:'v.cm=v.amount*v.mid;v.cs=v.amount*v.mid*(1+v.spread/100);',
   formula:'Cost with spread = amount × mid-market rate × (1 + spread ÷ 100). Hidden cost = cost with spread − cost at mid-market.',
   rows:[['Cost at mid-market rate','v.cm'],['Cost including spread','v.cs'],['Hidden spread cost','v.cs-v.cm'],['Effective rate you pay','v.mid*(1+v.spread/100)']],
   interpret:'Compare providers on the effective rate, not only on the stated fee. Add any fixed transfer fee separately to the total.',
   faq:[['Where do I find the mid-market rate?','Use a reputable market-rate source at the time of the transaction. Rates move during the day.'],['Do card or bank charges apply on top?','They may. Enter only the spread here and add fixed fees afterwards.']]},
  {slug:'earnings-yield-calculator',name:'Earnings Yield Calculator',desc:'Calculate a share earnings yield and the matching price-to-earnings ratio from earnings per share and market price.',domain:'finance',section:'savings-investments',
   fields:[['eps','Earnings per share','45'],['price','Share price','900']],guard:'(v.price*v.eps)',guardMsg:'Enter a share price and earnings per share above zero.',
   formula:'Earnings yield (%) = earnings per share ÷ share price × 100. Price-to-earnings ratio = share price ÷ earnings per share.',
   rows:[['Earnings yield (%)','v.eps/v.price*100'],['Price-to-earnings ratio','v.price/v.eps']],
   interpret:'Earnings yield is the inverse of the P/E ratio and makes a share easy to compare with the yield on a bond or deposit. It uses accounting earnings, which can include one-off items.',
   faq:[['Is a higher earnings yield always better?','Not necessarily. A high yield can signal risk or falling earnings, while a low yield can reflect expected growth.'],['Which EPS should I use?','Use trailing twelve-month EPS for history or forecast EPS for expectations, and say which you used when comparing.']]},
  {slug:'savings-rate-calculator',name:'Savings Rate Calculator',desc:'Find the share of your income you save each month and how much that adds up to over a year.',domain:'finance',section:'savings-investments',
   fields:[['income','Monthly take-home income','80000'],['spend','Monthly spending','52000']],guard:'v.income',guardMsg:'Enter an income above zero.',
   calc:'v.save=Math.max(0,v.income-v.spend);',
   formula:'Savings rate (%) = (income − spending) ÷ income × 100. Annual savings = monthly savings × 12.',
   rows:[['Monthly savings','v.save'],['Savings rate (%)','v.save/v.income*100'],['Annual savings','v.save*12']],
   interpret:'Savings rate is a stronger planning signal than any single investment return because it is fully in your control. Use the same definition of income each month so trends are comparable.',
   faq:[['What if my spending is higher than income?','The calculator shows zero savings. Review recurring costs or raise income before planning investments.'],['Should I use gross or take-home income?','Take-home income is simpler. If you use gross income, state that so the rate is not compared against a take-home figure.']]},
  {slug:'gordon-growth-model-calculator',name:'Gordon Growth Model Calculator',desc:'Estimate the intrinsic value of a dividend-paying share from next year’s dividend, required return and growth rate.',domain:'finance',section:'savings-investments',
   fields:[['d1','Expected dividend next year per share','12'],['r','Required return (%)','11'],['g','Long-term dividend growth (%)','6']],guard:'(v.r-v.g)',guardMsg:'The required return must be higher than the growth rate.',
   formula:'Value per share = D1 ÷ (r − g), where D1 is next year’s dividend, r is the required return and g is the constant growth rate (both as decimals).',
   rows:[['Estimated value per share','v.d1/((v.r-v.g)/100)'],['Implied dividend yield (%)','v.d1/(v.d1/((v.r-v.g)/100))*100']],
   interpret:'The result is very sensitive to the gap between required return and growth. A small change in either input moves the value a lot, so test a range before relying on one number.',
   faq:[['When does this model work poorly?','For companies that pay no dividends, have unstable payouts or grow faster than the economy indefinitely.'],['What happens as growth approaches the required return?','The value rises sharply and eventually becomes meaningless, which is why the model requires the required return to exceed growth.']]},
  {slug:'annuity-due-future-value-calculator',name:'Annuity Due Future Value Calculator',desc:'Compare the future value of regular deposits made at the start of each month with deposits made at month end.',domain:'finance',section:'savings-investments',
   fields:[['pmt','Monthly deposit','5000'],['rate','Annual return (%)','8'],['years','Number of years','10']],guard:'v.rate',guardMsg:'Enter a return above zero.',
   calc:'v.i=v.rate/1200;v.n=v.years*12;v.ord=v.pmt*(Math.pow(1+v.i,v.n)-1)/v.i;v.due=v.ord*(1+v.i);',
   formula:'Future value of an ordinary annuity = P × ((1 + i)^n − 1) ÷ i. For an annuity due, multiply by (1 + i) because each deposit earns one extra period.',
   rows:[['Future value, deposits at start of month','v.due'],['Future value, deposits at end of month','v.ord'],['Benefit of depositing early','v.due-v.ord'],['Total deposited','v.pmt*v.n']],
   interpret:'Depositing at the start of the period always gives a slightly higher balance, but the gap is small compared with the effect of the return rate and the number of years.',
   faq:[['Is the return guaranteed?','No. The figure assumes a constant return that real investments rarely deliver.'],['Are taxes and charges included?','No. Subtract fund costs and taxes separately to estimate the net outcome.']]},
  {slug:'price-to-rent-ratio-calculator',name:'Price-to-Rent Ratio Calculator',desc:'Compare the price of a home with a year of comparable rent to judge whether buying or renting looks more expensive.',domain:'finance',section:'savings-investments',
   fields:[['price','Property price','7500000'],['rent','Monthly rent for a similar home','25000']],guard:'v.rent',guardMsg:'Enter a monthly rent above zero.',
   formula:'Price-to-rent ratio = property price ÷ (monthly rent × 12). Gross rental yield = annual rent ÷ price × 100.',
   rows:[['Price-to-rent ratio','v.price/(v.rent*12)'],['Gross rental yield (%)','v.rent*12/v.price*100'],['Years of rent equal to price','v.price/(v.rent*12)']],
   interpret:'A high ratio suggests renting is cheaper relative to buying, a low ratio suggests the opposite. It ignores maintenance, taxes, loan interest, appreciation and your time horizon.',
   faq:[['What ratio counts as high?','There is no universal line. Compare the ratio with other neighbourhoods and with your own city history.'],['Is this a buy-or-rent decision tool?','It is a quick screen only. A full comparison needs financing costs, taxes and expected stay length.']]},
  {slug:'pro-rata-salary-calculator',name:'Pro-Rata Salary Calculator',desc:'Calculate pay for a part month from the monthly salary, days worked and the number of days in the pay period.',domain:'finance',section:'tax-payroll',
   fields:[['salary','Monthly salary','75000'],['worked','Days worked or paid','18'],['period','Days in the pay period','30']],guard:'v.period',guardMsg:'Enter the days in the pay period.',
   formula:'Pro-rata pay = monthly salary × days worked ÷ days in the pay period.',
   rows:[['Pro-rata pay','v.salary*v.worked/v.period'],['Amount not paid','v.salary-v.salary*v.worked/v.period'],['Pay per day','v.salary/v.period']],
   interpret:'Employers differ on whether to divide by calendar days, working days or a fixed 30 days. Use the method in your contract or policy so the result matches your payslip.',
   faq:[['Which days should I count?','Use the day basis in your employment contract. Calendar days, working days and a fixed 30-day month all give different answers.'],['Does this include deductions?','No. It is gross pay before tax, provident fund or other deductions.']]},
  {slug:'stock-average-down-calculator',name:'Stock Average Down Calculator',desc:'Find your new average cost per share after a second purchase and the price needed to get back to break-even.',domain:'finance',section:'savings-investments',
   fields:[['s1','Shares bought first','100'],['p1','First purchase price','250'],['s2','Shares bought second','50'],['p2','Second purchase price','200']],guard:'(v.s1+v.s2)',guardMsg:'Enter at least one share.',
   calc:'v.cost=v.s1*v.p1+v.s2*v.p2;v.sh=v.s1+v.s2;',
   formula:'Average cost = (shares1 × price1 + shares2 × price2) ÷ (shares1 + shares2).',
   rows:[['Average cost per share','v.cost/v.sh'],['Total invested','v.cost'],['Total shares held','v.sh'],['Fall in break-even versus first price (%)','(v.p1-v.cost/v.sh)/v.p1*100']],
   interpret:'Averaging down lowers the break-even price but also increases the money exposed to one share. Decide the maximum position size before buying more.',
   faq:[['Do brokerage fees matter?','Yes. Add fees to the invested amount for a precise average cost.'],['Is averaging down a good strategy?','Only if your reason to own the share is unchanged. Buying more of a falling share can increase losses.']]},
  {slug:'stock-break-even-price-after-fees-calculator',name:'Stock Break-Even Price After Fees Calculator',desc:'Calculate the selling price needed to recover your purchase cost after buy and sell charges.',domain:'finance',section:'savings-investments',
   fields:[['price','Purchase price per share','500'],['shares','Number of shares','100'],['buyfee','Buy-side charges (%)','0.1'],['sellfee','Sell-side charges (%)','0.1']],guard:'(1-v.sellfee/100)',guardMsg:'Sell-side charges must be below 100%.',
   calc:'v.be=v.price*(1+v.buyfee/100)/(1-v.sellfee/100);',
   formula:'Break-even sell price = purchase price × (1 + buy charges %) ÷ (1 − sell charges %).',
   rows:[['Break-even sell price','v.be'],['Rise needed from purchase price (%)','(v.be/v.price-1)*100'],['Total cost of buying','v.price*v.shares*(1+v.buyfee/100)']],
   interpret:'Charges as a percentage of trade value are small for long-term holders but add up for frequent traders. Flat fees per order should be added to the total cost separately.',
   faq:[['Are taxes included?','Only if you fold them into the charge percentages. Capital-gains tax is not calculated here.'],['Why is the rise needed slightly above total charges?','Because the sell-side charge is applied to the sale value, not to the purchase price.']]},
  {slug:'time-to-reach-savings-goal-calculator',name:'Time to Reach Savings Goal Calculator',desc:'Estimate how many months it takes to reach a savings target from a starting balance, monthly deposits and an assumed return.',domain:'finance',section:'savings-investments',
   fields:[['goal','Savings goal','1000000'],['start','Current savings','100000'],['pmt','Monthly deposit','15000'],['rate','Annual return (%)','7']],guard:'v.rate',guardMsg:'Enter a return above zero.',
   calc:'v.i=v.rate/1200;v.k=v.pmt/v.i;v.n=Math.max(0,Math.log((v.goal+v.k)/(v.start+v.k))/Math.log(1+v.i));',
   formula:'Months n = ln((goal + P ÷ i) ÷ (start + P ÷ i)) ÷ ln(1 + i), where P is the monthly deposit and i the monthly return.',
   rows:[['Months to reach goal','v.n'],['Years to reach goal','v.n/12'],['Total deposits made','v.pmt*v.n'],['Growth from returns','Math.max(0,v.goal-v.start-v.pmt*v.n)']],
   interpret:'Raising the monthly deposit usually shortens the timeline more reliably than hoping for a higher return. If the goal is already met, the result is zero months.',
   faq:[['Does inflation change the answer?','Yes. If the goal is in today’s money, use a return after inflation or increase the target each year.'],['Is the return guaranteed?','No. Use a conservative rate and recalculate periodically.']]},
  {slug:'inflation-adjusted-salary-calculator',name:'Inflation-Adjusted Salary Calculator',desc:'See what salary you would need in future to keep the same purchasing power as your salary today.',domain:'finance',section:'career-salary',
   fields:[['salary','Current annual salary','600000'],['infl','Expected inflation (% per year)','6'],['years','Years ahead','10']],guard:'1',
   calc:'v.need=v.salary*Math.pow(1+v.infl/100,v.years);',
   formula:'Required future salary = current salary × (1 + inflation ÷ 100)^years.',
   rows:[['Salary needed to match today’s purchasing power','v.need'],['Increase needed','v.need-v.salary'],['Average rise needed per year (%)','v.infl']],
   interpret:'Any pay rise below inflation is a real pay cut. Use the result as a floor when negotiating or planning long-term income.',
   faq:[['Which inflation rate should I use?','Use a figure that reflects your own spending pattern. Official headline inflation may differ from your personal inflation.'],['Does this include promotions?','No. It only maintains purchasing power and does not model real career growth.']]},
  {slug:'purchasing-power-of-money-calculator',name:'Purchasing Power of Money Calculator',desc:'Estimate what a sum of money will be worth in today’s terms after years of inflation.',domain:'finance',section:'savings-investments',
   fields:[['amt','Amount of money','100000'],['infl','Expected inflation (% per year)','6'],['years','Years from now','15']],guard:'1',
   calc:'v.pv=v.amt/Math.pow(1+v.infl/100,v.years);',
   formula:'Value in today’s money = amount ÷ (1 + inflation ÷ 100)^years.',
   rows:[['Value in today’s money','v.pv'],['Purchasing power lost','v.amt-v.pv'],['Share of purchasing power lost (%)','(v.amt-v.pv)/v.amt*100']],
   interpret:'Cash that earns less than inflation loses real value every year. Compare the result with the after-tax return on deposits or investments.',
   faq:[['Is inflation constant in real life?','No. It changes year to year, so this is an estimate under a constant assumption.'],['Can this be used backwards in time?','Not directly. For past periods use actual historical price indices.']]},
  {slug:'declining-balance-depreciation-calculator',name:'Declining Balance Depreciation Calculator',desc:'Calculate depreciation and book value for a chosen year using the double-declining balance method.',domain:'finance',section:'business-operations',
   fields:[['cost','Asset cost','1000000'],['salvage','Salvage value','100000'],['life','Useful life (years)','8'],['year','Year to calculate','3']],guard:'(v.life-1)',guardMsg:'Useful life must be more than one year.',
   calc:'v.rt=2/v.life;v.start=v.cost*Math.pow(1-v.rt,v.year-1);v.dep=Math.min(v.start*v.rt,Math.max(0,v.start-v.salvage));',
   formula:'Double-declining rate = 2 ÷ useful life. Depreciation in a year = opening book value × rate, never taking book value below salvage value.',
   rows:[['Depreciation rate (%)','v.rt*100'],['Opening book value','v.start'],['Depreciation for the year','v.dep'],['Closing book value','v.start-v.dep']],
   interpret:'This method charges more depreciation in early years. Tax rules in many countries prescribe their own methods and rates, so use this for accounting estimates only.',
   faq:[['Why does depreciation stop at salvage value?','An asset is not depreciated below its estimated salvage value, so the charge is capped.'],['How is this different from straight-line?','Straight-line charges the same amount each year, while declining balance front-loads the charge.']]},
  {slug:'units-of-production-depreciation-calculator',name:'Units of Production Depreciation Calculator',desc:'Calculate depreciation per unit and for the period for machinery whose wear depends on output rather than time.',domain:'finance',section:'business-operations',
   fields:[['cost','Asset cost','800000'],['salvage','Salvage value','80000'],['total','Total expected units over life','100000'],['used','Units produced this period','12500']],guard:'v.total',guardMsg:'Enter the total expected units.',
   calc:'v.pu=(v.cost-v.salvage)/v.total;',
   formula:'Depreciation per unit = (cost − salvage value) ÷ total expected units. Period depreciation = depreciation per unit × units produced.',
   rows:[['Depreciation per unit','v.pu'],['Depreciation for the period','v.pu*v.used'],['Share of life used (%)','v.used/v.total*100']],
   interpret:'This method matches the cost of equipment to how much it is actually used, which suits machines with variable output.',
   faq:[['When is this method suitable?','When wear follows usage, for example vehicles measured in kilometres or machines measured in output.'],['What if actual life differs from the estimate?','Revise the expected units and adjust future depreciation prospectively.']]},
  // ---------------- Health ----------------
  {slug:'bmi-prime-calculator',name:'BMI Prime Calculator',desc:'Calculate BMI and BMI Prime, the ratio of your BMI to the upper limit of the commonly used healthy range.',domain:'health',section:'health-family',
   fields:[['w','Weight (kg)','70'],['h','Height (cm)','172']],guard:'v.h',guardMsg:'Enter a height above zero.',
   calc:'v.bmi=v.w/Math.pow(v.h/100,2);',
   formula:'BMI = weight (kg) ÷ height (m)². BMI Prime = BMI ÷ 25.',
   rows:[['BMI','v.bmi'],['BMI Prime','v.bmi/25'],['Weight at BMI 25 (kg)','25*Math.pow(v.h/100,2)']],
   interpret:'A BMI Prime below 1.0 means a BMI under 25. BMI does not distinguish muscle from fat and is not reliable for athletes, older adults, children or pregnancy.',
   faq:[['Is BMI Prime a diagnosis?','No. It is a screening ratio that must be interpreted by a health professional alongside other measurements.'],['Does it apply to children?','No. Children and teenagers use age- and sex-specific percentiles.']]},
  {slug:'lean-body-mass-from-body-fat-calculator',name:'Lean Body Mass from Body Fat Calculator',desc:'Split body weight into fat mass and lean mass using a measured or estimated body fat percentage.',domain:'health',section:'health-family',
   fields:[['w','Body weight (kg)','70'],['bf','Body fat (%)','20']],guard:'1',
   calc:'v.fat=v.w*v.bf/100;',
   formula:'Fat mass = weight × body fat % ÷ 100. Lean body mass = weight − fat mass.',
   rows:[['Fat mass (kg)','v.fat'],['Lean body mass (kg)','v.w-v.fat'],['Lean mass share (%)','100-v.bf']],
   interpret:'Body fat estimates from scales, calipers or scans can differ by several percentage points, so track the same method over time.',
   faq:[['How accurate is the result?','It is only as accurate as your body fat measurement, which varies by device and hydration.'],['Is lean mass the same as muscle mass?','No. Lean mass also includes water, bone and organs.']]},
  {slug:'fiber-intake-from-calories-calculator',name:'Fiber Intake from Calories Calculator',desc:'Estimate a daily dietary fiber target from your calorie intake using the common 14 g per 1,000 kcal guideline.',domain:'health',section:'health-family',
   fields:[['kcal','Daily calorie intake (kcal)','2000']],guard:'1',
   formula:'Fiber target (g) = daily calories ÷ 1,000 × 14.',
   rows:[['Suggested fiber (g per day)','v.kcal/1000*14'],['Suggested fiber per meal if 3 meals (g)','v.kcal/1000*14/3']],
   interpret:'Raise fiber gradually and drink enough water to limit bloating. Needs differ for people with digestive conditions.',
   faq:[['Where does 14 g per 1,000 kcal come from?','It is a widely used dietary guideline for adults, based on intake linked with lower cardiovascular risk.'],['Does this replace advice from a dietitian?','No. Individual needs and medical conditions can change the target.']]},
  {slug:'katch-mcardle-bmr-calculator',name:'Katch-McArdle BMR Calculator',desc:'Estimate basal metabolic rate and daily calorie needs from lean body mass using the Katch-McArdle formula.',domain:'health',section:'health-family',
   fields:[['w','Body weight (kg)','70'],['bf','Body fat (%)','20'],['act','Activity multiplier (1.2 to 1.9)','1.55']],guard:'1',
   calc:'v.lbm=v.w*(1-v.bf/100);v.bmr=370+21.6*v.lbm;',
   formula:'Lean body mass = weight × (1 − body fat ÷ 100). BMR = 370 + 21.6 × lean body mass (kg). Daily needs = BMR × activity multiplier.',
   rows:[['Lean body mass (kg)','v.lbm'],['Basal metabolic rate (kcal/day)','v.bmr'],['Estimated daily energy need (kcal)','v.bmr*v.act']],
   interpret:'This formula uses lean mass, so it can suit muscular people better than formulas based only on weight. All BMR formulas are estimates with real-world error.',
   faq:[['What activity multiplier should I use?','About 1.2 for little exercise, 1.55 for moderate exercise and 1.9 for very hard training or physical work.'],['Is this a diet plan?','No. It is an estimate of energy use, not advice to eat a specific amount.']]},
  {slug:'ideal-body-weight-devine-calculator',name:'Ideal Body Weight (Devine) Calculator',desc:'Estimate ideal body weight with the Devine formula from height, using a base of 50 kg for men or 45.5 kg for women.',domain:'health',section:'health-family',
   fields:[['h','Height (cm)','172'],['base','Base weight at 5 ft (kg): 50 men, 45.5 women','50']],guard:'1',
   calc:'v.over=Math.max(0,v.h/2.54-60);v.ibw=v.base+2.3*v.over;',
   formula:'Ideal body weight = base weight + 2.3 kg × inches of height above 5 feet (60 inches).',
   rows:[['Inches above 5 feet','v.over'],['Estimated ideal body weight (kg)','v.ibw']],
   interpret:'The Devine formula was created for drug dosing, not as a target for individuals. Healthy weight ranges are wide and depend on build, age and health.',
   faq:[['Why do I enter a base weight?','The formula uses 50 kg for men and 45.5 kg for women. Enter the value that applies.'],['Should I aim for this number?','Treat it as a rough reference only and discuss goals with a health professional.']]},
  // ---------------- Science & engineering ----------------
  {slug:'centripetal-force-calculator',name:'Centripetal Force Calculator',desc:'Calculate the force, acceleration and g-force needed to keep an object moving in a circle.',domain:'science',section:'energy-sustainability',
   fields:[['m','Mass (kg)','1200'],['v','Speed (m/s)','15'],['r','Radius of the circle (m)','50']],guard:'v.r',guardMsg:'Enter a radius above zero.',
   calc:'v.a=v.v*v.v/v.r;',
   formula:'Centripetal acceleration a = v² ÷ r. Centripetal force F = m × v² ÷ r.',
   rows:[['Centripetal force (N)','v.m*v.a'],['Centripetal acceleration (m/s²)','v.a'],['Acceleration in g','v.a/9.80665']],
   interpret:'Doubling speed quadruples the force needed, which is why sharp bends at high speed are demanding on tyres or structures.',
   faq:[['What provides the force on a car in a bend?','Friction between tyres and road, plus any banking of the road.'],['Is centripetal force a separate force?','No. It is the net inward force that comes from tension, friction, gravity or another real force.']]},
  {slug:'coulombs-law-force-calculator',name:'Coulomb’s Law Force Calculator',desc:'Calculate the electrostatic force between two point charges from their charges and separation distance.',domain:'science',section:'energy-sustainability',
   fields:[['q1','Charge 1 (coulombs)','0.000002'],['q2','Charge 2 (coulombs)','0.000003'],['r','Distance (m)','0.05']],guard:'v.r',guardMsg:'Enter a distance above zero.',digits:4,
   formula:'F = k × q1 × q2 ÷ r², where k = 8.9875 × 10⁹ N·m²/C². Enter charge magnitudes; like charges repel and unlike charges attract.',
   rows:[['Force magnitude (N)','8.9875517923e9*v.q1*v.q2/(v.r*v.r)']],
   interpret:'The force falls with the square of distance, so doubling the separation cuts it to a quarter. This applies to point charges in a vacuum or air.',
   faq:[['How do I know whether the force attracts or repels?','Like charges repel and opposite charges attract. The calculator reports magnitude only.'],['What changes in a material instead of air?','The force is reduced by the material’s relative permittivity.']]},
  {slug:'rc-time-constant-calculator',name:'RC Time Constant Calculator',desc:'Calculate the time constant, settling time and cut-off frequency of a resistor-capacitor circuit.',domain:'science',section:'energy-sustainability',
   fields:[['r','Resistance (ohms)','10000'],['c','Capacitance (µF)','100']],guard:'(v.r*v.c)',guardMsg:'Enter resistance and capacitance above zero.',digits:4,
   calc:'v.tau=v.r*v.c*1e-6;',
   formula:'Time constant τ = R × C. The capacitor reaches about 99% of its final charge after 5τ. Cut-off frequency f = 1 ÷ (2π × R × C).',
   rows:[['Time constant (seconds)','v.tau'],['Time to about 99% charge (seconds)','5*v.tau'],['Cut-off frequency (Hz)','1/(2*Math.PI*v.tau)']],
   interpret:'After one time constant a charging capacitor reaches about 63% of the supply voltage. Component tolerances can shift real timings noticeably.',
   faq:[['Why is capacitance entered in microfarads?','Microfarads are the common unit for timing and filter capacitors. The calculator converts to farads internally.'],['What is the cut-off frequency used for?','It marks where an RC low-pass or high-pass filter passes about 70.7% of the signal amplitude.']]},
  {slug:'lc-resonant-frequency-calculator',name:'LC Resonant Frequency Calculator',desc:'Calculate the resonant frequency of an inductor-capacitor circuit from inductance and capacitance.',domain:'science',section:'energy-sustainability',
   fields:[['l','Inductance (mH)','10'],['c','Capacitance (µF)','100']],guard:'(v.l*v.c)',guardMsg:'Enter inductance and capacitance above zero.',digits:3,
   calc:'v.f=1/(2*Math.PI*Math.sqrt(v.l*1e-3*v.c*1e-6));',
   formula:'Resonant frequency f = 1 ÷ (2π × √(L × C)), with L in henries and C in farads.',
   rows:[['Resonant frequency (Hz)','v.f'],['Resonant frequency (kHz)','v.f/1000'],['Period (milliseconds)','1000/v.f']],
   interpret:'Real components have resistance and tolerance, so measured resonance and damping will differ from the ideal value.',
   faq:[['What happens at resonance?','Inductive and capacitive reactance cancel, so a series circuit has minimum impedance and a parallel circuit has maximum impedance.'],['How do I tune the frequency?','Increase either L or C to lower the frequency, or decrease them to raise it.']]},
  {slug:'sound-level-decibel-difference-calculator',name:'Sound Level and Decibel Difference Calculator',desc:'Convert two sound intensities to decibel levels and find the difference between them.',domain:'science',section:'energy-sustainability',
   fields:[['i1','Intensity 1 (W/m²)','0.000001'],['i2','Intensity 2 (W/m²)','0.0001']],guard:'(v.i1*v.i2)',guardMsg:'Enter intensities above zero.',
   formula:'Sound level L = 10 × log₁₀(I ÷ I₀) with I₀ = 10⁻¹² W/m². Difference = 10 × log₁₀(I₂ ÷ I₁).',
   rows:[['Level of sound 1 (dB)','10*Math.log10(v.i1/1e-12)'],['Level of sound 2 (dB)','10*Math.log10(v.i2/1e-12)'],['Difference (dB)','10*Math.log10(v.i2/v.i1)']],
   interpret:'Every 10 dB step is a tenfold change in intensity, although perceived loudness grows more slowly. Long exposure to high levels can damage hearing.',
   faq:[['Why use a logarithmic scale?','The ear responds to a huge range of intensities, so a log scale keeps the numbers manageable.'],['Is the difference the same as adding levels?','No. Combining two sources requires adding intensities first, not decibel values.']]},
  {slug:'snells-law-refraction-calculator',name:'Snell’s Law Refraction Calculator',desc:'Find the angle of refraction when light passes between two media with different refractive indices.',domain:'science',section:'energy-sustainability',
   fields:[['n1','Refractive index of first medium','1'],['n2','Refractive index of second medium','1.5'],['a1','Angle of incidence (degrees)','30']],guard:'v.n2',guardMsg:'Enter a refractive index above zero.',
   calc:'v.s=Math.min(1,v.n1*Math.sin(v.a1*Math.PI/180)/v.n2);',
   formula:'n₁ sin θ₁ = n₂ sin θ₂, so θ₂ = arcsin(n₁ sin θ₁ ÷ n₂). If the right-hand side exceeds 1, total internal reflection occurs and no refracted ray exists.',
   rows:[['Angle of refraction (degrees)','Math.asin(v.s)*180/Math.PI'],['sin θ₂ (capped at 1)','v.s'],['Speed of light in second medium relative to first','v.n1/v.n2']],
   interpret:'Light bends toward the normal when entering a denser medium. A result of 90° with sin θ₂ equal to 1 means the ray would be totally internally reflected instead.',
   faq:[['What is total internal reflection?','When light travels from a denser to a less dense medium above the critical angle, it reflects back rather than refracting.'],['Do refractive indices change with colour?','Yes. Dispersion means each wavelength has a slightly different index.']]},
  {slug:'thin-lens-equation-calculator',name:'Thin Lens Equation Calculator',desc:'Calculate the image distance and magnification of a converging lens from object distance and focal length.',domain:'science',section:'energy-sustainability',
   fields:[['u','Object distance (cm)','30'],['f','Focal length (cm)','10']],guard:'(v.u-v.f)',guardMsg:'The object must be farther than the focal length for a real image.',
   calc:'v.di=v.f*v.u/(v.u-v.f);',
   formula:'1 ÷ f = 1 ÷ u + 1 ÷ v, so image distance v = f × u ÷ (u − f). Magnification m = −v ÷ u.',
   rows:[['Image distance (cm)','v.di'],['Magnification','-v.di/v.u'],['Image height as a multiple of object height','Math.abs(v.di/v.u)']],
   interpret:'A negative magnification means the image is inverted. For objects inside the focal length a converging lens makes a virtual, upright image, which this tool does not model.',
   faq:[['Why must the object be beyond the focal length?','Inside the focal length the image is virtual and the formula gives a negative image distance.'],['Does this work for thick lenses?','No. It assumes a thin lens with negligible thickness.']]},
  {slug:'wind-turbine-power-output-calculator',name:'Wind Turbine Power Output Calculator',desc:'Estimate the power available from wind using rotor diameter, wind speed, air density and an efficiency coefficient.',domain:'science',section:'energy-sustainability',
   fields:[['d','Rotor diameter (m)','10'],['v','Wind speed (m/s)','8'],['rho','Air density (kg/m³)','1.225'],['cp','Power coefficient (0 to 0.59)','0.35']],guard:'1',
   calc:'v.area=Math.PI/4*v.d*v.d;',
   formula:'Power = ½ × air density × swept area × wind speed³ × power coefficient. The theoretical maximum coefficient is about 0.593 (Betz limit).',
   rows:[['Swept area (m²)','v.area'],['Wind power in the swept area (W)','0.5*v.rho*v.area*Math.pow(v.v,3)'],['Estimated electrical output (W)','0.5*v.rho*v.area*Math.pow(v.v,3)*v.cp'],['Estimated electrical output (kW)','0.5*v.rho*v.area*Math.pow(v.v,3)*v.cp/1000']],
   interpret:'Power rises with the cube of wind speed, so a site with slightly stronger wind produces far more energy. Real output also depends on cut-in speed, gearbox and generator losses.',
   faq:[['What is a realistic power coefficient?','Small modern turbines often reach about 0.30 to 0.45 in good conditions.'],['Is this annual energy production?','No. It is instantaneous power at one wind speed, not yearly output.']]},
  {slug:'led-resistor-calculator',name:'LED Resistor Calculator',desc:'Choose a current-limiting resistor for an LED from the supply voltage, LED forward voltage and desired current.',domain:'science',section:'energy-sustainability',
   fields:[['vs','Supply voltage (V)','9'],['vf','LED forward voltage (V)','2'],['i','Desired current (mA)','20']],guard:'(v.vs-v.vf)',guardMsg:'Supply voltage must exceed the LED forward voltage.',
   calc:'v.r=(v.vs-v.vf)/(v.i/1000);',
   formula:'Resistor R = (supply voltage − LED forward voltage) ÷ current. Resistor power P = I² × R.',
   rows:[['Required resistance (ohms)','v.r'],['Power dissipated in resistor (W)','Math.pow(v.i/1000,2)*v.r'],['Power drawn from supply (W)','v.vs*v.i/1000']],
   interpret:'Round up to the next standard resistor value and choose a power rating at least twice the dissipated power. Check the LED datasheet for maximum current.',
   faq:[['Why round up the resistance?','A slightly higher resistor gives slightly lower current, which is safer for the LED.'],['Can I run several LEDs in series?','Yes. Add their forward voltages together before subtracting from the supply.']]},
  {slug:'battery-life-calculator',name:'Battery Life Calculator',desc:'Estimate how long a battery will run a load from its capacity, the load current and an efficiency factor.',domain:'science',section:'energy-sustainability',
   fields:[['cap','Battery capacity (mAh)','5000'],['load','Average load current (mA)','250'],['eff','Usable capacity and efficiency (%)','85']],guard:'v.load',guardMsg:'Enter a load current above zero.',
   calc:'v.h=v.cap*v.eff/100/v.load;',
   formula:'Runtime (hours) = battery capacity × usable efficiency ÷ 100 ÷ load current.',
   rows:[['Estimated runtime (hours)','v.h'],['Estimated runtime (days)','v.h/24'],['Usable capacity (mAh)','v.cap*v.eff/100']],
   interpret:'Temperature, discharge rate and battery age all reduce real capacity. Use the average load rather than the peak load for a realistic result.',
   faq:[['Why is usable capacity lower than rated capacity?','Conversion losses, cut-off voltage and ageing mean you cannot draw the full rated capacity.'],['Can I use this for a car battery?','It works for any battery if you enter capacity and load in the same units, but starter batteries are not designed for deep discharge.']]},
  {slug:'arithmetic-series-sum-calculator',name:'Arithmetic Series Sum Calculator',desc:'Find the nth term and the sum of an arithmetic series from the first term, common difference and number of terms.',domain:'math',section:'math-statistics',
   fields:[['a','First term','5'],['d','Common difference','3'],['n','Number of terms','20']],guard:'v.n',guardMsg:'Enter a number of terms above zero.',
   formula:'nth term = a + (n − 1)d. Sum = n ÷ 2 × (2a + (n − 1)d).',
   rows:[['nth term','v.a+(v.n-1)*v.d'],['Sum of the series','v.n/2*(2*v.a+(v.n-1)*v.d)'],['Average of the terms','(v.a+(v.a+(v.n-1)*v.d))/2']],
   interpret:'The sum equals the number of terms times the average of the first and last term. This calculator takes non-negative values only.',
   faq:[['What if the difference is negative?','The series decreases. Enter positive values here and subtract manually, as this tool accepts non-negative inputs only.'],['How is this used in practice?','For regular savings that rise by a fixed amount, staircase pay scales and evenly spaced schedules.']]},
  {slug:'geometric-series-sum-calculator',name:'Geometric Series Sum Calculator',desc:'Find the nth term and the sum of a geometric series from the first term, common ratio and number of terms.',domain:'math',section:'math-statistics',
   fields:[['a','First term','3'],['r','Common ratio','2'],['n','Number of terms','10']],guard:'v.n',guardMsg:'Enter a number of terms above zero.',
   formula:'nth term = a × r^(n − 1). Sum = a × (1 − r^n) ÷ (1 − r) for r ≠ 1, and a × n when r = 1.',
   rows:[['nth term','v.a*Math.pow(v.r,v.n-1)'],['Sum of the series','v.r===1?v.a*v.n:v.a*(1-Math.pow(v.r,v.n))/(1-v.r)']],
   interpret:'A ratio above 1 grows quickly, while a ratio between 0 and 1 shrinks toward a finite limit as terms increase.',
   faq:[['What is the sum of an infinite geometric series?','It equals a ÷ (1 − r) when the ratio is between 0 and 1. This tool sums a finite number of terms.'],['Where does this appear in finance?','In compound growth, repeated discounting and loan schedules.']]},
  {slug:'percentage-error-calculator',name:'Percentage Error Calculator',desc:'Compare a measured value with the true value to find absolute error and percentage error.',domain:'math',section:'math-statistics',
   fields:[['m','Measured value','9.6'],['t','True or accepted value','9.81']],guard:'v.t',guardMsg:'Enter a true value above zero.',
   formula:'Absolute error = |measured − true|. Percentage error = |measured − true| ÷ true × 100.',
   rows:[['Absolute error','Math.abs(v.m-v.t)'],['Percentage error (%)','Math.abs(v.m-v.t)/v.t*100'],['Measured as a share of true value (%)','v.m/v.t*100']],
   interpret:'Percentage error shows how large a mistake is relative to the size of the thing measured, which makes errors from different experiments comparable.',
   faq:[['Is percentage error the same as percentage difference?','No. Percentage error compares against a known true value, while percentage difference compares two values with no reference.'],['Can percentage error be negative?','This version reports the absolute value. Some courses keep the sign to show over- or under-estimation.']]},
  // ---------------- Engineering & construction ----------------
  {slug:'pipe-flow-rate-calculator',name:'Pipe Flow Rate Calculator',desc:'Calculate volume flow rate from pipe inner diameter and flow velocity.',domain:'science',section:'geometry-construction',
   fields:[['d','Inner diameter (mm)','100'],['v','Flow velocity (m/s)','2']],guard:'1',digits:4,
   calc:'v.area=Math.PI/4*Math.pow(v.d/1000,2);v.q=v.area*v.v;',
   formula:'Flow area A = π ÷ 4 × d². Flow rate Q = A × velocity.',
   rows:[['Cross-sectional area (m²)','v.area'],['Flow rate (m³/s)','v.q'],['Flow rate (litres per second)','v.q*1000'],['Flow rate (m³/hour)','v.q*3600']],
   interpret:'Water in building pipes is often designed for velocities around 1 to 3 m/s to limit noise and wear. Friction loss and pressure are not calculated here.',
   faq:[['Does this include pressure drop?','No. Pressure loss depends on length, roughness and fittings and needs a separate calculation.'],['Should I use inner or outer diameter?','Use the inner diameter, because it sets the actual flow area.']]},
  {slug:'simply-supported-beam-udl-calculator',name:'Simply Supported Beam with UDL Calculator',desc:'Calculate maximum bending moment, support reactions and midspan deflection for a simply supported beam under a uniform load.',domain:'science',section:'geometry-construction',
   fields:[['w','Uniform load (kN/m)','12'],['l','Span (m)','6'],['e','Modulus of elasticity (GPa)','200'],['i','Second moment of area (cm⁴)','8000']],guard:'(v.e*v.i)',guardMsg:'Enter E and I above zero.',
   calc:'v.defl=5*v.w*1000*Math.pow(v.l,4)/(384*v.e*1e9*v.i*1e-8)*1000;',
   formula:'Maximum moment M = wL² ÷ 8. Each reaction R = wL ÷ 2. Midspan deflection δ = 5wL⁴ ÷ (384 E I).',
   rows:[['Maximum bending moment (kN·m)','v.w*v.l*v.l/8'],['Support reaction at each end (kN)','v.w*v.l/2'],['Total load (kN)','v.w*v.l'],['Midspan deflection (mm)','v.defl'],['Span-to-deflection ratio','v.l*1000/v.defl']],
   interpret:'Codes commonly limit deflection to a fraction of the span, such as span ÷ 250 or span ÷ 360 depending on use. Include self-weight and load factors as your design code requires.',
   faq:[['Is this a structural design tool?','No. It uses idealised formulas for learning and quick checks. A licensed engineer must verify real designs.'],['What units must I use?','Load in kN/m, span in m, E in GPa and I in cm⁴. The calculator converts internally.']]},
  {slug:'specific-heat-energy-calculator',name:'Specific Heat Energy Calculator',desc:'Calculate the heat energy needed to change the temperature of a mass using its specific heat capacity.',domain:'science',section:'energy-sustainability',
   fields:[['m','Mass (kg)','2'],['c','Specific heat capacity (J/kg·K)','4186'],['dt','Temperature change (K or °C)','40']],guard:'1',
   calc:'v.q=v.m*v.c*v.dt;',
   formula:'Heat energy Q = m × c × ΔT.',
   rows:[['Heat energy (joules)','v.q'],['Heat energy (kilojoules)','v.q/1000'],['Heat energy (kWh)','v.q/3600000']],
   interpret:'Water is about 4,186 J/kg·K. The kWh figure shows why heating water electrically has a measurable cost. Heat losses to surroundings make real use higher.',
   faq:[['Does this include phase change?','No. Melting or boiling needs latent heat in addition to this formula.'],['Is a temperature change in °C the same as in K?','Yes. A change of 1 °C equals a change of 1 K.']]},
  {slug:'wire-resistance-calculator',name:'Wire Resistance Calculator',desc:'Calculate wire resistance and voltage drop from material resistivity, length, cross-sectional area and current.',domain:'science',section:'geometry-construction',
   fields:[['rho','Resistivity (ohm metres)','0.0000000168'],['l','Wire length (m)','50'],['a','Cross-sectional area (mm²)','2.5'],['i','Current (A)','10']],guard:'v.a',guardMsg:'Enter a cross-sectional area above zero.',digits:4,
   calc:'v.r=v.rho*v.l/(v.a*1e-6);',
   formula:'Resistance R = ρ × L ÷ A, with area in square metres. Voltage drop = I × R.',
   rows:[['Wire resistance (ohms)','v.r'],['Voltage drop (V)','v.i*v.r'],['Power lost as heat (W)','v.i*v.i*v.r']],
   interpret:'The default is copper at about 20 °C (1.68 × 10⁻⁸ Ω·m). Resistance rises with temperature, and for a two-wire circuit you should use the total round-trip length.',
   faq:[['What is the resistivity of aluminium?','About 2.65 × 10⁻⁸ Ω·m at 20 °C, higher than copper.'],['Should length be one way or both ways?','Use the full conductor length in the circuit, which is twice the cable run for a two-wire supply.']]},
  {slug:'gear-ratio-output-speed-calculator',name:'Gear Ratio and Output Speed Calculator',desc:'Find the gear ratio, output speed and ideal torque multiplier of a simple two-gear drive.',domain:'science',section:'geometry-construction',
   fields:[['driver','Teeth on driver gear','20'],['driven','Teeth on driven gear','60'],['rpm','Input speed (rpm)','1500']],guard:'(v.driver*v.driven)',guardMsg:'Enter tooth counts above zero.',
   formula:'Gear ratio = driven teeth ÷ driver teeth. Output speed = input speed ÷ ratio. Ideal output torque = input torque × ratio (ignoring losses).',
   rows:[['Gear ratio','v.driven/v.driver'],['Output speed (rpm)','v.rpm*v.driver/v.driven'],['Ideal torque multiplier','v.driven/v.driver']],
   interpret:'A ratio above 1 reduces speed and increases torque. Real gear sets lose some power to friction, so measured torque is slightly lower.',
   faq:[['Does the direction reverse?','Yes, meshing external gears turn in opposite directions. An idler gear restores direction without changing the ratio.'],['How do I handle several gear stages?','Multiply the ratios of each stage together.']]},
  // ---------------- Business ----------------
  {slug:'days-sales-outstanding-calculator',name:'Days Sales Outstanding Calculator',desc:'Measure how many days it takes on average to collect payment from credit sales.',domain:'business',section:'business-operations',
   fields:[['ar','Accounts receivable','800000'],['rev','Credit sales in the period','6000000'],['days','Days in the period','365']],guard:'v.rev',guardMsg:'Enter credit sales above zero.',
   formula:'DSO = accounts receivable ÷ credit sales × days in the period.',
   rows:[['Days sales outstanding','v.ar/v.rev*v.days'],['Receivables as a share of sales (%)','v.ar/v.rev*100']],
   interpret:'A rising DSO means customers pay more slowly and cash is tied up. Compare DSO with your stated payment terms and with the same period in earlier years.',
   faq:[['Should I use total sales or credit sales?','Use credit sales when you can. Using total sales understates DSO if many customers pay in cash.'],['What is a good DSO?','It depends on industry and payment terms. A DSO well above your terms suggests collection problems.']]},
  // ---------------- Agriculture ----------------
  {slug:'seed-rate-calculator',name:'Seed Rate Calculator',desc:'Calculate the seed quantity needed for a field from area, target plant population, seed count per kilogram and germination rate.',domain:'agri',section:'agriculture-rural',
   fields:[['area','Field area (hectares)','2'],['pop','Target plants per m²','40'],['spk','Seeds per kilogram','28000'],['germ','Germination rate (%)','90']],guard:'(v.germ*v.spk)',guardMsg:'Enter germination and seeds per kilogram above zero.',
   calc:'v.seeds=v.area*10000*v.pop/(v.germ/100);',
   formula:'Seeds needed = area (m²) × target plants per m² ÷ germination rate. Seed weight = seeds needed ÷ seeds per kilogram.',
   rows:[['Total seeds needed','v.seeds'],['Seed quantity (kg)','v.seeds/v.spk'],['Seed per hectare (kg)','v.seeds/v.spk/v.area']],
   interpret:'Add a margin for seedling loss from pests, weather or poor soil contact. Use the seed count per kilogram printed on your seed lot, because it changes with variety and size.',
   faq:[['Where do I find the germination rate?','It is shown on the seed packet or test certificate. Old seed usually germinates less well.'],['Does this include a safety margin?','No. Add extra seed if your conditions are difficult.']]},
  {slug:'crop-yield-per-hectare-calculator',name:'Crop Yield per Hectare Calculator',desc:'Convert total harvested weight and field area into yield per hectare in kilograms, quintals and tonnes.',domain:'agri',section:'agriculture-rural',
   fields:[['prod','Total production (kg)','5400'],['area','Cultivated area (hectares)','1.5']],guard:'v.area',guardMsg:'Enter an area above zero.',
   formula:'Yield per hectare = total production ÷ area in hectares.',
   rows:[['Yield (kg per hectare)','v.prod/v.area'],['Yield (quintals per hectare)','v.prod/v.area/100'],['Yield (tonnes per hectare)','v.prod/v.area/1000']],
   interpret:'Compare yield with district averages and with your own earlier seasons to judge the effect of seed, fertiliser or water changes. Use the same moisture basis each time.',
   faq:[['How many square metres are in a hectare?','One hectare is 10,000 square metres.'],['Should production be measured wet or dry?','Use the same basis each season, usually the standard moisture level used when selling the crop.']]},
  {slug:'livestock-stocking-rate-calculator',name:'Livestock Stocking Rate Calculator',desc:'Calculate animals per hectare and the grazing area available to each animal.',domain:'agri',section:'agriculture-rural',
   fields:[['animals','Number of animals','35'],['area','Grazing area (hectares)','12']],guard:'(v.animals*v.area)',guardMsg:'Enter animals and area above zero.',
   formula:'Stocking rate = number of animals ÷ grazing area. Area per animal = grazing area ÷ number of animals.',
   rows:[['Animals per hectare','v.animals/v.area'],['Hectares per animal','v.area/v.animals'],['Square metres per animal','v.area*10000/v.animals']],
   interpret:'Suitable stocking rates depend on pasture growth, rainfall, animal size and supplementary feed. Adjust the number of animals seasonally rather than using one fixed figure all year.',
   faq:[['Are all animals counted equally?','No. Cattle, sheep and goats use different amounts of forage, so convert to animal units if you keep mixed stock.'],['What if the pasture is poor?','Use a lower stocking rate or provide supplementary feed to avoid overgrazing.']]}
];

// ---------------------------------------------------------------- helpers
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = (n, d) => new Intl.NumberFormat('en-IN', {maximumFractionDigits: d}).format(n);

function evalTool(t) {
  const v = {};
  for (const [k, , val] of t.fields) v[k] = Number(val);
  // eslint-disable-next-line no-new-func
  new Function('v', t.calc || '')(v);
  const guard = new Function('v', 'return (' + (t.guard || '1') + ');')(v);
  if (!(guard > 0)) throw new Error(t.slug + ': default inputs violate the guard');
  const out = t.rows.map(([label, expr]) => {
    const value = new Function('v', 'return (' + expr + ');')(v);
    if (!Number.isFinite(value)) throw new Error(t.slug + ': row "' + label + '" is not finite with default inputs');
    return [label, value];
  });
  return {v, out};
}

function exampleText(t) {
  const {out} = evalTool(t);
  const d = t.digits || 2;
  const inputs = t.fields.map(([, label, val]) => label.replace(/\s*\(.*?\)\s*$/, '').replace(/:.*$/, '') + ' ' + fmt(Number(val), 6)).join(', ');
  const results = out.map(([l, val]) => l + ' = ' + fmt(val, d)).join('; ');
  return 'With ' + inputs + ', the calculator gives: ' + results + '.';
}

function page(t) {
  const dom = DOMAIN[t.domain];
  const url = 'https://friendlycalculator.in/calculators/' + t.slug + '.html';
  const d = t.digits || 2;
  const fields = t.fields.map(([k, l, val]) => '<label>' + esc(l) + '<input name="' + k + '" type="number" min="0" step="any" value="' + val + '" required></label>').join('');
  const assigns = t.fields.map(([k]) => 'v.' + k + '=Number(fd.get(\'' + k + '\'));').join('');
  const rowsJs = t.rows.map(([l, e]) => '[' + JSON.stringify(l) + ',v=>' + e + ']').join(',');
  const guard = t.guard || '1';
  const guardMsg = t.guardMsg || 'Enter valid values.';
  const faq = t.faq.map(([q, a]) => '<details><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('');
  const ld = {'@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, applicationCategory: dom.app, operatingSystem: 'Any', isAccessibleForFree: true, url, description: t.desc};
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(t.name) + ' | Friendly Calculator</title>'
    + '<meta name="description" content="' + esc(t.desc) + ' Free calculator with formula, worked example and limitations.">'
    + '<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + url + '">'
    + '<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">'
    + '<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="' + esc(t.name) + ' | Friendly Calculator"><meta property="og:description" content="' + esc(t.desc) + '"><meta property="og:url" content="' + url + '">'
    + '<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta property="og:image:alt" content="Friendly Calculator — ' + esc(t.name) + '">'
    + '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(t.name) + ' | Friendly Calculator"><meta name="twitter:description" content="' + esc(t.desc) + '"><meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png">'
    + '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>'
    + '<style>body{margin:0;background:#f5f7f9;color:#172638;font:16px/1.7 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{width:min(920px,92%);margin:auto}.hero{padding:30px 0 10px}.hero h1{font-size:clamp(1.9rem,5vw,2.8rem);line-height:1.12}.muted{color:#596b7c}.panel,.content{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:20px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.grid label{display:grid;gap:6px;font-weight:700}.grid input{padding:11px;border:1px solid #b8c5d0;border-radius:8px;font:inherit}.grid button{grid-column:1/-1;padding:12px;background:#174d72;color:#fff;border:0;border-radius:8px;font-weight:750;font:inherit;cursor:pointer}.result{margin-top:16px;padding:14px;background:#edf3f7;border-radius:10px}details{border-top:1px solid #e3e9ee;padding:8px 0}summary{cursor:pointer;font-weight:700}@media(max-width:620px){.grid{grid-template-columns:1fr}}</style></head>'
    + '<body><header class="fc-global-header"><div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="Friendly Calculator home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav class="fc-global-links" aria-label="Primary navigation"><a href="/">Home</a><a href="/calculator/finance-calculators.html">Finance</a><a href="/calculator/everyday-calculators.html">Everyday</a><a href="/calculator/site-directory.html">All Calculators</a></nav></div></header>'
    + '<main class="wrap"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/calculator/site-directory.html">All calculators</a> / ' + esc(t.name) + '</nav>'
    + '<section class="hero"><p class="muted">FRIENDLY CALCULATOR · ' + esc(dom.label.toUpperCase()) + '</p><h1>' + esc(t.name) + '</h1><p class="muted">' + esc(t.desc) + '</p></section>'
    + '<section class="panel"><h2>Enter your values</h2><form id="calcForm" class="grid">' + fields + '<button type="submit">Calculate</button></form><div id="result" class="result" hidden aria-live="polite"></div></section>'
    + '<section class="content"><h2>Formula and methodology</h2><p>' + esc(t.formula) + '</p><h2>Worked example</h2><p>' + esc(exampleText(t)) + '</p><h2>How to read the result</h2><p>' + esc(t.interpret) + '</p></section>'
    + '<section class="content"><h2>Frequently asked questions</h2>' + faq + '</section>'
    + '<section class="content"><h2>Assumptions and limitations</h2><p>' + esc(dom.note) + '</p><p><a href="/calculator/site-directory.html">Browse all calculators</a> · <a href="/calculator/methodology.html">Calculation methodology</a> · <a href="/developers/">Developer guide</a> · <a href="/embed/">Free Embed Builder</a></p></section></main>'
    + '<footer class="fc-global-footer"><div class="fc-global-footer-inner"><a href="/calculator/about.html">About</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/contact.html">Contact</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/site-directory.html">All pages</a></div></footer>'
    + '<script>(()=>{const f=document.getElementById(\'calcForm\'),o=document.getElementById(\'result\'),rows=[' + rowsJs + '];f.addEventListener(\'submit\',e=>{e.preventDefault();const fd=new FormData(f),v={};' + assigns
    + 'if(Object.values(v).some(x=>!Number.isFinite(x)||x<0)){o.textContent=\'Enter valid non-negative values.\';o.hidden=false;return;}'
    + 'try{' + (t.calc || '') + 'const g=(' + guard + ');if(!(g>0))throw Error(' + JSON.stringify(guardMsg) + ');'
    + 'o.innerHTML=\'<h3>Your result</h3>\'+rows.map(([l,fn])=>\'<p><strong>\'+l+\':</strong> \'+new Intl.NumberFormat(\'en-IN\',{maximumFractionDigits:' + d + '}).format(fn(v))+\'</p>\').join(\'\');o.hidden=false;}catch(err){o.textContent=err.message;o.hidden=false;}});})();</script>'
    + '<script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script></body></html>';
}

// ---------------------------------------------------------------- run
const callDir = path.join(root, 'calculators');
const added = [];
const skipped = [];
for (const t of tools) {
  const file = path.join(callDir, t.slug + '.html');
  if (fs.existsSync(file)) { skipped.push(t.slug); continue; }
  fs.writeFileSync(file, page(t));
  added.push(t);
}

// Follow the repository pipeline: pages go in calculators/, search-index entries go in the
// additions file (merged by scripts/merge-search-index.cjs), and the directory, sitemaps and
// count surfaces are regenerated by their own scripts.
const ap = path.join(root, 'assets/calculator-search-index-additions.json');
const additions = JSON.parse(fs.readFileSync(ap, 'utf8'));
const catName = {finance: 'Finance', health: 'Health', science: 'Physics', math: 'Mathematics, Numbers & Statistics', business: 'Business', agri: 'Agriculture & Rural Finance'};
for (const t of added) {
  const url = '/calculators/' + t.slug + '.html';
  if (!additions.some(x => x.url === url)) additions.push({name: t.name, url, category: catName[t.domain], keywords: (t.name + ' ' + t.desc).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), description: t.desc});
}
fs.writeFileSync(ap, JSON.stringify(additions, null, 2) + '\n');

console.log('Added ' + added.length + ' calculators; skipped ' + skipped.length + (skipped.length ? ' (' + skipped.join(', ') + ')' : '') + '.');
