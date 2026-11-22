from pathlib import Path
import re
from html import unescape

ROOT=Path(__file__).resolve().parents[1]
BLOG=ROOT/'blog'

def words(s):
    text=re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>',' ',s,flags=re.S)
    return len(re.findall(r"\b[\w₹’'-]+\b",unescape(text)))

def expand(path):
    s=path.read_text(encoding='utf-8')
    if 'id="editorial-review-checklist"' in s or words(s)>=900:
        return False
    title=re.search(r'<h1[^>]*>(.*?)</h1>',s,re.S)
    title=unescape(re.sub('<[^>]+>','',title.group(1))).strip() if title else path.stem.replace('-',' ').title()
    calc=re.search(r'<a href="(/calculators/[^"#]+)',s)
    calc_href=calc.group(1) if calc else '/calculator/methodology.html'
    section=f'''<section id="editorial-review-checklist"><h2>Review checklist for {title}</h2><p>A reliable way to use this guide is to treat the result as a documented estimate rather than a magic answer. First write the question in one sentence. Then list the inputs, their units, the date or period they describe, and the source of each important value. This small record makes it easier to notice when an input is stale, when two scenarios use different baselines, or when a result has been copied without its assumptions.</p><p>Next, run at least three cases. The base case should use the best-supported figures available. A cautious case should reflect a realistic downside such as a higher cost, lower output, slower payment, larger measurement or shorter useful period. A favourable case can show what would need to be true for the result to improve. Comparing the cases is more informative than reporting a single number with unnecessary decimal places.</p><p>When sharing the result, include the formula and the boundary of the calculation. Explain what is included and what is outside the model. A price estimate may exclude tax, delivery and fees. A production estimate may exclude downtime, rework and changeover. A health or finance estimate may not account for personal history, product terms or changing rules. The reader should be able to reproduce the arithmetic without guessing what the inputs meant.</p><ul><li>Check that every input uses the unit shown beside the field.</li><li>Keep the original baseline visible when calculating a change or rate.</li><li>Do not round intermediate values unless the real process rounds at that stage.</li><li>Compare the output with an official document, product specification or qualified professional when the decision is regulated or safety-critical.</li><li>Save the date and assumptions when the estimate will be used later.</li></ul><p>The <a href="{calc_href}">related calculator</a> is designed to make these scenarios quick to test in the browser. It does not receive a guarantee from a bank, employer, supplier, government department or clinician. If the calculator result conflicts with an official statement, check the definition and applicable rule first; do not simply choose the more convenient number. This guide is educational content from Friendly Calculator, and its purpose is to help visitors ask clearer questions and check their arithmetic.</p></section>'''
    s=s.replace('</main>',section+'</main>',1)
    path.write_text(s,encoding='utf-8')
    return True

changed=0
for p in sorted(BLOG.glob('*.html')):
    if p.name=='index.html': continue
    if expand(p): changed+=1
print('expanded',changed)
for p in sorted(BLOG.glob('*.html')):
    if p.name=='index.html': continue
    if words(p.read_text(encoding='utf-8'))<800: print('still_short',words(p.read_text(encoding='utf-8')),p.name)
