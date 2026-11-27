#!/usr/bin/env python3
"""Adds hand-written guide sections (method, worked example with computed numbers,
mistakes, background, FAQs + FAQPage JSON-LD) to the weaker high-value calculators.
Idempotent: re-running replaces the section. Usage: python3 scripts/add-calculator-guides.py"""
import html, json, math, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
inr = lambda x: '₹' + format(int(round(x)), ',')

def inr_ind(x):
    s = str(int(round(x)))
    if len(s) <= 3: return '₹' + s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:]); head = head[:-2]
    if head: parts.insert(0, head)
    return '₹' + ','.join(parts + [tail])

pages = {}

# ---------- Lumpsum ----------
P, r, n = 100000, 12, 10
fv = P * (1 + r / 100) ** n
pages['lumpsum-calculator'] = dict(
 title='Lumpsum Calculator',
 sections=[
 ('How a lumpsum investment grows', [
  f'A lumpsum is a single deposit made today and left alone. There are no monthly instalments, so the whole result comes from one thing: compounding. Each year the interest or return is added to the balance, and the next year’s return is earned on that larger balance. The formula this calculator uses is <code>Future value = P × (1 + r)<sup>n</sup></code>, where P is the amount invested, r is the expected annual return as a decimal and n is the number of years.',
  f'Take {inr_ind(P)} invested at an assumed {r}% a year for {n} years. The multiplier is 1.12<sup>{n}</sup> = {1.12**n:.4f}, so the maturity value is {inr_ind(fv)} and the gain is {inr_ind(fv-P)}. More than half of that gain arrives in the last four years, which is why starting early matters far more than choosing a slightly higher rate.']),
 ('A quick mental check: the rule of 72', [
  f'Divide 72 by the annual return to estimate how many years it takes money to double. At 12% that is about 6 years, and the exact figure is {math.log(2)/math.log(1.12):.1f} years. At 6% it is about 12 years. If the calculator shows a result that contradicts this rule by a wide margin, re-check that you entered the rate as a yearly percentage and the period in years.']),
 ('Lumpsum versus SIP', [
  'A lumpsum puts the full amount to work from day one, which gives it the highest ending value when markets rise steadily. A SIP spreads the same money over months, which lowers the risk of investing everything just before a fall. If you already hold the money, the real choice is between investing it at once and staggering it over 6 to 12 months; if you earn a salary, a SIP is the natural fit. Use the SIP calculator on this site to compare both on your numbers.']),
 ('Common mistakes', [
  'Treating an assumed return as a promise: equity funds do not earn a fixed rate and a fixed deposit does, so the same formula means different things for each.',
  'Ignoring tax and inflation: a 12% nominal return with 6% inflation is roughly a 5.7% real return, because (1.12 ÷ 1.06) − 1 ≈ 5.7%.',
  'Mixing up months and years: entering 120 in the years box gives an absurd answer.']),
 ],
 faqs=[
  ('What is the formula for a lumpsum calculation?', 'Future value = P × (1 + r)^n, where P is the principal, r the annual rate as a decimal and n the number of years. For compounding more often than yearly, use r/m and n × m.'),
  ('Is the result guaranteed?', 'No. It is a projection from the rate you type. Fixed deposits and small-savings schemes have declared rates; market-linked investments do not.'),
  (f'How much will {inr_ind(P)} become in {n} years at {r}%?', f'About {inr_ind(fv)}, a gain of {inr_ind(fv-P)}.'),
  ('Does this include tax?', 'No. Taxes on gains depend on the instrument and your holding period, so subtract them separately.'),
 ])

# ---------- CAGR ----------
s0, s1, yrs = 100000, 250000, 5
cagr = ((s1 / s0) ** (1 / yrs) - 1) * 100
pages['cagr-calculator'] = dict(
 title='CAGR Calculator',
 sections=[
 ('What CAGR tells you', [
  'Compound annual growth rate is the single yearly rate that would take a starting value to an ending value over a given number of years if growth were perfectly smooth. Real investments never grow smoothly, so CAGR is a summary, not a record of what happened in any single year. Its strength is that it lets you compare two investments held for different lengths of time on the same scale.',
  'The formula is <code>CAGR = (Ending value ÷ Starting value)<sup>1/n</sup> − 1</code>. The same expression works for revenue, a user base, a population or a portfolio.']),
 ('Worked example', [
  f'An investment grows from {inr_ind(s0)} to {inr_ind(s1)} in {yrs} years. The ratio is {s1/s0:.1f}, and raising it to the power 1/{yrs} gives {(s1/s0)**(1/yrs):.4f}. Subtracting 1 leaves a CAGR of {cagr:.2f}% a year. Check it by compounding forward: {inr_ind(s0)} × 1.2011<sup>5</sup> ≈ {inr_ind(s0*(1+cagr/100)**5)}.',
  f'Notice that the absolute return is 150%, but dividing 150% by {yrs} would suggest 30% a year, which is wrong. Simple division ignores compounding and overstates the yearly rate.']),
 ('CAGR versus XIRR and absolute return', [
  'Use CAGR when there is exactly one amount in and one amount out. If you invested in instalments, as with a SIP, the money was not invested for the same number of years, so CAGR misleads and XIRR is the right measure. Absolute return is just (end − start) ÷ start and says nothing about time.']),
 ('Limits to remember', [
  'Two investments can share a CAGR yet have very different paths; one may have fallen 40% on the way.',
  'The start and end dates change the answer, so a CAGR quoted over a market peak or trough can be flattering or harsh.',
  'A negative CAGR is valid: if the value falls from 100 to 80 in 2 years the CAGR is about −10.6%.']),
 ],
 faqs=[
  ('How do I calculate CAGR manually?', 'Divide the ending value by the starting value, raise the result to the power 1/years, then subtract 1 and multiply by 100.'),
  ('Can CAGR be negative?', 'Yes. If the ending value is lower than the starting value, the CAGR is negative.'),
  ('Is CAGR the same as average annual return?', 'No. The arithmetic average of yearly returns is higher than CAGR whenever returns vary, because of volatility drag.'),
  ('Can I use months?', 'Yes. Enter the period as a fraction of a year, for example 18 months is 1.5.'),
 ])

# ---------- Salary hike ----------
old, new = 600000, 690000
hike = (new - old) / old * 100
real = ((1 + hike / 100) / 1.06 - 1) * 100
pages['salary-hike-calculator'] = dict(
 title='Salary Hike Calculator',
 sections=[
 ('Working out a hike properly', [
  'A salary hike is the percentage change between your old and new pay. The formula is <code>Hike % = (New − Old) ÷ Old × 100</code>, and the reverse, when an employer offers a percentage, is <code>New = Old × (1 + Hike ÷ 100)</code>. Always compare like with like: either the annual CTC on both sides, or the monthly in-hand pay on both sides.',
  f'Example: moving from {inr_ind(old)} to {inr_ind(new)} a year is a hike of {inr_ind(new-old)}, which is {hike:.1f}% of the old figure. Monthly, that is {inr_ind(old/12)} rising to {inr_ind(new/12)} in CTC terms.']),
 ('Adjust for inflation to see the real raise', [
  f'If prices rise 6% in the same year, a 15% hike is not a 15% improvement in what you can buy. The real hike is (1.15 ÷ 1.06) − 1 = {real:.2f}%. A hike lower than inflation is a pay cut in real terms even though the number on the payslip goes up.']),
 ('Why in-hand pay rises by less than CTC', [
  'CTC includes items that are not paid monthly, such as employer provident fund contribution, gratuity, insurance and any variable pay. When CTC rises, the tax slab effect and statutory deductions mean take-home usually rises by a smaller percentage. For a clean comparison, ask for the new salary structure and compare the fixed monthly credit.']),
 ('Using the number in a negotiation', [
  'Switching employers commonly involves asking for a larger percentage than an internal appraisal. Work out the figure that keeps your real pay growing, add the value of benefits that are changing, and keep the final CTC figure in writing before you resign.']),
 ],
 faqs=[
  ('How do I calculate salary hike percentage?', '(New salary − old salary) ÷ old salary × 100.'),
  (f'What is the hike from {inr_ind(old)} to {inr_ind(new)}?', f'{hike:.1f}%.'),
  ('Should I compare CTC or in-hand salary?', 'Compare the same measure on both sides. If you can, compare both, since the gap between them changes with the structure.'),
  ('What is a good hike?', 'One that beats inflation and reflects your market value; there is no universal figure, so check the role’s market pay.'),
 ])

# ---------- SWP ----------
Pc, ann, W = 1000000, 8, 10000
i = ann / 100 / 12
months = -math.log(1 - Pc * i / W) / math.log(1 + i)
bal5 = Pc * (1 + i) ** 60 - W * (((1 + i) ** 60 - 1) / i)
pages['swp-calculator'] = dict(
 title='SWP Calculator',
 sections=[
 ('What a systematic withdrawal plan does', [
  'A systematic withdrawal plan takes a fixed amount out of an investment at regular intervals, usually every month, while the rest stays invested and keeps earning. It is the mirror image of a SIP and is commonly used to create a steady income from a corpus, for example in retirement.',
  'With monthly rate i = annual rate ÷ 12, the balance after n withdrawals of W is <code>Balance = P(1 + i)<sup>n</sup> − W × [(1 + i)<sup>n</sup> − 1] ÷ i</code>. The number of months the money lasts is <code>n = −ln(1 − P·i ÷ W) ÷ ln(1 + i)</code>, which only exists when W is larger than the monthly return P·i.']),
 ('Worked example', [
  f'Start with {inr_ind(Pc)} earning an assumed {ann}% a year, and withdraw {inr_ind(W)} every month. The monthly return is {inr_ind(Pc*i)}, so the withdrawal is larger than the growth and the corpus slowly shrinks. After 5 years the balance is {inr_ind(bal5)}, and the money lasts about {months:.0f} months, or {months/12:.1f} years.',
  f'If the withdrawal is cut to {inr_ind(Pc*i)} or less, the corpus never falls: it only pays out the return. That figure, the sustainable withdrawal, is the key number for anyone planning retirement income.']),
 ('Choosing a withdrawal rate', [
  'A rate that looks small, 4% to 6% of the starting corpus a year, tends to last longer; rates near or above the expected return drain the corpus. Costs, tax on the gains portion of each withdrawal and rising expenses all shorten the life of the money, so test the calculator at a lower return than you hope for.']),
 ('Things people overlook', [
  'Each withdrawal sells units, and the gain portion is taxable according to the fund type and holding period.',
  'Expenses rise with inflation, so a fixed withdrawal loses buying power; some plans step the amount up each year.',
  'Poor returns in the first few years hurt far more than the same returns later, because withdrawals shrink the base that has to recover.']),
 ],
 faqs=[
  ('What does SWP stand for?', 'Systematic Withdrawal Plan: a fixed sum withdrawn from an investment at set intervals.'),
  ('How long will my corpus last?', f'It depends on the return and the withdrawal. For {inr_ind(Pc)} at {ann}% with {inr_ind(W)} a month, about {months/12:.1f} years.'),
  ('Is SWP income guaranteed?', 'No. The return is an assumption; if actual returns are lower the corpus will run down sooner.'),
  ('SWP or fixed deposit interest payout?', 'A deposit pays a declared interest and leaves the principal intact; an SWP can pay more but depends on market returns and may reduce the principal.'),
 ])

# ---------- Home loan eligibility ----------
inc, emi_ex, foir, rate, tenure = 80000, 10000, 0.5, 8.5, 20
afford = inc * foir - emi_ex
mi = rate / 1200; nn = tenure * 12
factor = ((1 + mi) ** nn - 1) / (mi * (1 + mi) ** nn)
loan = afford * factor
pages['home-loan-eligibility-calculator'] = dict(
 title='Home Loan Eligibility Calculator',
 sections=[
 ('How lenders decide the loan amount', [
  'Banks mostly look at how much of your monthly income can safely go to repayments. This share, often called the fixed obligation to income ratio, is commonly set in the range of 40% to 55% of net monthly income, with the exact figure varying by lender and income level. Your existing EMIs count towards it, so each credit card or car loan EMI reduces what is left for the home loan.',
  'The calculation has two steps. First, <code>Affordable EMI = Net monthly income × FOIR − existing EMIs</code>. Second, convert that EMI into a loan with <code>Loan = EMI × [(1 + i)<sup>n</sup> − 1] ÷ [i × (1 + i)<sup>n</sup>]</code>, where i is the monthly interest rate and n is the number of monthly instalments.']),
 ('Worked example', [
  f'Net monthly income {inr_ind(inc)}, existing EMIs {inr_ind(emi_ex)}, FOIR 50%, interest {rate}% and tenure {tenure} years. The affordable EMI is {inr_ind(inc)} × 0.5 − {inr_ind(emi_ex)} = {inr_ind(afford)}. With i = {mi:.5f} and n = {nn}, the factor is {factor:.2f}, so the eligible loan is about {inr_ind(loan)}.',
  f'Raising the tenure to 25 years lifts the factor, and with it the eligible amount, but the interest you pay over the loan rises sharply. A lower rate has a similar effect: a one point drop in rate can add several lakh rupees of eligibility without extending the term.']),
 ('Other factors that change the answer', [
  'Credit score: many lenders prefer a score of around 750 or above for their best rates; a lower score can reduce the amount or raise the rate.',
  'Loan-to-value limits: RBI rules cap the loan at 90% of property value up to ₹30 lakh, 80% between ₹30 lakh and ₹75 lakh, and 75% above ₹75 lakh, so you must fund the rest as a down payment.',
  'Age and job type: salaried and self-employed applicants are assessed differently, and the tenure usually cannot run past retirement age.',
  'Co-applicants: adding an earning spouse adds income and usually raises eligibility.']),
 ('How to improve your eligibility', [
  'Close small loans and clear card balances before applying; reduce existing EMIs; add a co-applicant; choose a longer tenure and plan prepayments; and check your credit report for errors. Remember that eligibility is the most a bank may lend, not what you should borrow: a comfortable EMI is one that leaves room for savings and emergencies.']),
 ],
 faqs=[
  ('How is home loan eligibility calculated?', 'Lenders take a share of your net monthly income, subtract existing EMIs to get an affordable EMI, and convert it into a loan amount for the chosen rate and tenure.'),
  ('What is FOIR?', 'Fixed obligation to income ratio: the percentage of monthly income committed to fixed repayments.'),
  ('Does a co-applicant increase eligibility?', 'Usually yes, because the combined income is considered.'),
  ('Is the result an approval?', 'No. It is an estimate. The lender’s own policy, credit report and property valuation decide the sanction.'),
 ])

# ---------- Gratuity ----------
sal, yrs_g = 50000, 12
grat = sal * 15 * yrs_g / 26
pages['gratuity-calculator'] = dict(
 title='Gratuity Calculator',
 sections=[
 ('The gratuity formula', [
  'For employees covered by the Payment of Gratuity Act, 1972, gratuity is a lump sum paid by the employer in recognition of long service. The usual formula is <code>Gratuity = Last drawn monthly salary × 15 ÷ 26 × Years of service</code>. Last drawn salary here means basic pay plus dearness allowance; other allowances are generally left out. The factor 15 ÷ 26 reflects 15 days’ pay for each completed year, with a month counted as 26 working days.',
  f'Example: basic plus DA of {inr_ind(sal)} and {yrs_g} years of service gives {inr_ind(sal)} × 15 ÷ 26 × {yrs_g} = {inr_ind(grat)}.']),
 ('Who is eligible', [
  'Normally an employee must complete five years of continuous service with the organisation. The five-year condition does not apply when service ends because of death or disability. A period of service of more than six months in the last year is generally rounded up to a full year, so 10 years and 7 months counts as 11 years, while 10 years and 5 months stays at 10.',
  'The Act applies to establishments with ten or more employees, though many employers outside its scope also pay gratuity under their own policy.']),
 ('Tax treatment and the cap', [
  'The Act sets a ceiling on the amount payable, and the tax exemption for government and private employees is likewise limited; both limits have been revised over time, so check the current figures before relying on them. Gratuity above the exempt amount is added to income and taxed at your slab.',
  'Employers not covered by the Act use a slightly different formula, based on half a month’s salary for each completed year, with salary taken as an average of the last ten months.']),
 ('Practical tips', [
  'Check that your payslip shows a proper basic and DA split, because a low basic keeps gratuity small.',
  'Keep service records: continuous service can include approved leave and certain breaks, and disputes are easier to settle with documents.',
  'Apply in writing; the Act sets a time limit for the employer to pay and attaches interest for delay.']),
 ],
 faqs=[
  ('What is the gratuity formula?', 'Last drawn salary (basic + DA) × 15 ÷ 26 × completed years of service.'),
  ('Is gratuity payable before five years?', 'Generally no, except on death or disability.'),
  ('What counts as salary for gratuity?', 'Basic pay and dearness allowance. Other allowances are usually excluded.'),
  ('Is gratuity taxable?', 'Part of it may be exempt up to a legal limit; the excess is taxed as salary income.'),
 ])

# ---------- Simple interest ----------
Ps, Rs, Ts = 50000, 8, 3
si = Ps * Rs * Ts / 100
ci = Ps * (1 + Rs / 100) ** Ts - Ps
pages['simple-interest-calculator'] = dict(
 title='Simple Interest Calculator',
 sections=[
 ('What simple interest means', [
  'Simple interest is charged only on the original sum, never on interest already earned. The formula is <code>SI = P × R × T ÷ 100</code>, and the total repayable is <code>A = P + SI</code>, where R is the yearly rate in percent and T is time in years. Because the interest stays the same every year, the total grows in a straight line.',
  f'Example: {inr_ind(Ps)} at {Rs}% for {Ts} years. SI = {Ps:,} × {Rs} × {Ts} ÷ 100 = {inr_ind(si)}, so the amount is {inr_ind(Ps+si)}.']),
 ('Simple versus compound', [
  f'With annual compounding the same deposit earns {inr_ind(ci)} instead of {inr_ind(si)}, a difference of {inr_ind(ci-si)} in only three years. The gap widens every year, which is why long-term savings favour compounding while short-term, fixed-charge loans such as some vehicle or gold loans are quoted on simple interest.']),
 ('Converting time units', [
  'If time is in months, divide by 12, so 9 months is 0.75 years. If it is in days, divide by 365. Entering months as years is the most common error and inflates the answer twelve-fold.']),
 ('Where simple interest is used', [
  'Short-term personal lending between individuals, some bond coupons, treasury-bill style discounting and many school-level problems. Most bank deposits and loans actually compound, so when comparing offers, ask whether the quoted rate is simple or compounded and how often.']),
 ],
 faqs=[
  ('What is the simple interest formula?', 'SI = P × R × T ÷ 100.'),
  (f'What is the simple interest on {inr_ind(Ps)} at {Rs}% for {Ts} years?', f'{inr_ind(si)}.'),
  ('How do I find the rate or time instead?', 'Rearrange: R = SI × 100 ÷ (P × T) and T = SI × 100 ÷ (P × R).'),
  ('Is simple interest better for the borrower?', 'For the same stated rate, yes, since interest does not compound; but check whether the quoted rate is comparable.'),
 ])

def build(slug, d):
    out = ['<section class="content" id="guide">', f'<h2>Guide to the {html.escape(d["title"])}: method, example and FAQs</h2>']
    for h, paras in d['sections']:
        out.append(f'<h3>{html.escape(h)}</h3>')
        if h.startswith(('Common mistakes', 'Limits to remember', 'Other factors', 'Practical tips', 'Things people overlook')):
            out.append('<ul>' + ''.join(f'<li>{p}</li>' for p in paras) + '</ul>')
        else:
            out.extend(f'<p>{p}</p>' for p in paras)
    out.append('<h3>Frequently asked questions</h3>')
    for q, a in d['faqs']:
        out.append(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>')
    out.append('<p class="muted">Results are estimates for planning, not financial, tax or legal advice. Verify rules and rates with the lender, employer or official source before deciding.</p>')
    out.append('</section>')
    return '\n'.join(out)

sec_re = re.compile(r'\n?<section class="content" id="guide">[\s\S]*?</section>')
ld_re = re.compile(r'<script type="application/ld\+json" id="guide-faq">[\s\S]*?</script>')
for slug, d in pages.items():
    path = os.path.join(ROOT, 'calculators', slug + '.html')
    s = open(path, encoding='utf8').read()
    s = sec_re.sub('', s); s = ld_re.sub('', s)
    block = '\n' + build(slug, d) + '\n'
    if '</main>' not in s: print('skip', slug); continue
    s = s.replace('</main>', block + '</main>', 1)
    has_faq = 'FAQPage' in s
    if not has_faq:
        ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub('<[^>]+>', '', a)}} for q, a in d['faqs']]}
        s = s.replace('</head>', '<script type="application/ld+json" id="guide-faq">' + json.dumps(ld, ensure_ascii=False) + '</script></head>', 1)
    open(path, 'w', encoding='utf8').write(s)
    words = len(re.sub(r'<[^>]+>', ' ', build(slug, d)).split())
    print(slug, words, 'words added', 'faq-ld' if not has_faq else 'existing FAQPage kept')
