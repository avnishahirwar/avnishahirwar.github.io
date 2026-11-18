from pathlib import Path
import json, re, html, xml.etree.ElementTree as ET

ROOT=Path('/home/ubuntu/friendly-site')
OUT=ROOT/'calculators'
items=[
 ('astronomical-unit-calculator','Astronomical Unit Calculator','Astronomy & Space','astronomical unit au kilometres miles','Convert astronomical units into kilometres and miles.', [('Astronomical units','au')], "au*149597870.7", [('Kilometres','km','au*149597870.7'),('Miles','mi','au*149597870.7/1.609344')]),
 ('feet-and-inches-calculator','Feet and Inches Calculator','Converters, Data & Technology','feet inches length conversion','Convert feet and inches into total inches, centimetres and metres.', [('Feet','ft'),('Inches','in')], "ft*12+in", [('Total inches','in','ft*12+in'),('Centimetres','cm','(ft*12+in)*2.54'),('Metres','m','(ft*12+in)*0.0254')]),
 ('height-in-inches-calculator','Height in Inches Calculator','Health, Fitness & Family','height inches feet centimetres conversion','Convert a height in feet and inches into total inches and centimetres.', [('Feet','ft'),('Inches','in')], "ft*12+in", [('Total inches','in','ft*12+in'),('Centimetres','cm','(ft*12+in)*2.54')]),
 ('light-year-conversion-calculator','Light Year Conversion','Astronomy & Space','light year kilometres miles conversion','Convert light-years into kilometres, astronomical units and miles.', [('Light-years','ly')], "ly*9460730472580.8", [('Kilometres','km','ly*9460730472580.8'),('Astronomical units','au','ly*63241.077084')]),
 ('square-kilometers-to-acres-calculator','Square Kilometers to Acres Conversion','Geometry, Measurement & Construction','square kilometres acres area conversion','Convert square kilometres into acres and square metres.', [('Square kilometres','km2')], "km2*247.105381467", [('Acres','ac','km2*247.105381467'),('Square metres','m2','km2*1000000')]),
 ('cubic-feet-calculator','Cubic Feet Calculator','Geometry, Measurement & Construction','cubic feet volume conversion','Convert cubic feet into cubic metres, US gallons and litres.', [('Cubic feet','ft3')], "ft3*0.028316846592", [('Cubic metres','m3','ft3*0.028316846592'),('US gallons','gal','ft3*7.48051948'),('Litres','L','ft3*28.316846592')]),
 ('cubic-meter-calculator','Cubic Meter Calculator','Geometry, Measurement & Construction','cubic metre volume conversion','Convert cubic metres into cubic feet, litres and US gallons.', [('Cubic metres','m3')], "m3*35.31466672", [('Cubic feet','ft3','m3*35.31466672'),('Litres','L','m3*1000'),('US gallons','gal','m3*264.172052')]),
 ('binary-to-hexadecimal-converter','Binary to Hexadecimal Converter','Converters, Data & Technology','binary hexadecimal number base conversion','Convert a binary integer into hexadecimal.', [('Binary integer','value')], "parseInt(value,2)", [('Decimal value','decimal','parseInt(value,2)'),('Hexadecimal','hex','parseInt(value,2).toString(16).toUpperCase()')]),
 ('binary-to-octal-converter','Binary to Octal Converter','Converters, Data & Technology','binary octal number base conversion','Convert a binary integer into octal.', [('Binary integer','value')], "parseInt(value,2)", [('Decimal value','decimal','parseInt(value,2)'),('Octal','octal','parseInt(value,2).toString(8)')]),
 ('decimal-to-hexadecimal-converter','Decimal to Hexadecimal Converter','Converters, Data & Technology','decimal hexadecimal number base conversion','Convert a non-negative decimal integer into hexadecimal.', [('Decimal integer','value')], "Number(value)", [('Hexadecimal','hex','Number(value).toString(16).toUpperCase()'),('Binary','binary','Number(value).toString(2)')]),
 ('decimal-to-octal-converter','Decimal to Octal Converter','Converters, Data & Technology','decimal octal number base conversion','Convert a non-negative decimal integer into octal.', [('Decimal integer','value')], "Number(value)", [('Octal','octal','Number(value).toString(8)'),('Binary','binary','Number(value).toString(2)')]),
 ('byte-conversion-calculator','Byte Conversion Calculator','Converters, Data & Technology','bytes kilobytes megabytes gigabytes conversion','Convert bytes using decimal SI units and binary IEC units.', [('Bytes','bytes')], "Number(bytes)", [('Kilobytes (SI)','kb','bytes/1000'),('Megabytes (SI)','mb','bytes/1000000'),('Kibibytes','kib','bytes/1024'),('Mebibytes','mib','bytes/1048576')]),
 ('unix-time-converter','Unix Time Converter','Converters, Data & Technology','unix timestamp epoch time conversion','Convert a Unix timestamp in seconds into an ISO date.', [('Unix timestamp (seconds)','ts')], "Number(ts)", [('ISO date','iso','new Date(ts*1000).toISOString()'),('Milliseconds','ms','ts*1000')]),
 ('years-to-decades-calculator','Years to Decades Calculator','Everyday Life','years decades conversion','Convert years into decades.', [('Years','years')], "Number(years)", [('Decades','decades','years/10')]),
 ('force-converter','Force Converter','Converters, Data & Technology','force newtons pounds-force dynes conversion','Convert force between newtons, pound-force and dynes.', [('Newtons','n')], "n", [('Pound-force','lbf','n/4.4482216152605'),('Dynes','dyn','n*100000')]),
 ('torr-to-atm-conversion-calculator','Torr to atm Conversion','Converters, Data & Technology','torr atmosphere pressure conversion','Convert torr into standard atmospheres and pascals.', [('Torr','torr')], "Number(torr)", [('Atmospheres','atm','torr/760'),('Pascals','pa','torr*133.32236842105263')]),
 ('degrees-minutes-seconds-calculator','Degrees Minutes Seconds Calculator','Converters, Data & Technology','degrees minutes seconds angle conversion','Convert decimal degrees into degrees, minutes and seconds.', [('Decimal degrees','degrees')], "Number(degrees)", [('Degrees','d','Math.trunc(Math.abs(degrees))'),('Minutes','m','(Math.abs(degrees)%1)*60'),('Seconds','s','(((Math.abs(degrees)%1)*60)%1)*60')]),
 ('million-to-billion-converter','Million to Billion Converter','Converters, Data & Technology','million billion number conversion','Convert millions into billions.', [('Millions','millions')], "Number(millions)", [('Billions','billions','millions/1000')]),
 ('crore-to-lakh-converter','Crore to Lakh Converter','Converters, Data & Technology','crore lakh Indian number conversion','Convert Indian crores into lakhs.', [('Crores','crore')], "Number(crore)", [('Lakhs','lakh','crore*100')]),
 ('grams-to-ounces-calculator','Grams To Ounces Calculator','Converters, Data & Technology','grams ounces weight conversion','Convert grams into avoirdupois ounces and pounds.', [('Grams','grams')], "Number(grams)", [('Ounces','oz','grams/28.349523125'),('Pounds','lb','grams/453.59237')]),
 ('minutes-to-hours-converter','Minutes to Hours Converter','Everyday Life','minutes hours time conversion','Convert minutes into decimal hours and hours/minutes.', [('Minutes','minutes')], "Number(minutes)", [('Decimal hours','hours','minutes/60'),('Whole hours','h','Math.floor(minutes/60)'),('Remaining minutes','m','minutes%60')]),
]

def page(slug,name,cat,keywords,desc,fields,results):
    fid=''.join(c if c.isalnum() else '-' for c in slug)
    fs=''.join(f'<label class="fc-field">{html.escape(label)}<input name="{key}" type="number" step="any" min="0" required></label>' for label,key in fields)
    rs=json.dumps([(label,key,expr) for label,key,expr in results],ensure_ascii=False)
    script=f'''<script>(function(){{const f=document.getElementById('fcNewCalc'),o=document.getElementById('fcNewOutput'),results={rs};f.addEventListener('submit',e=>{{e.preventDefault();const d=Object.fromEntries(new FormData(f));try{{const scope={{}};for(const k in d)scope[k]=Number(d[k]);const rows=results.map(([label,key,expr])=>{{let value=Function(...Object.keys(scope),'return '+expr)(...Object.values(scope));return '<tr><th>'+label+'</th><td>'+((typeof value==='number'&&Number.isFinite(value))?value.toLocaleString(undefined,{{maximumFractionDigits:8}}):value)+'</td></tr>'}}).join('');o.innerHTML='<table>'+rows+'</table>';o.style.display='block'}}catch(err){{o.textContent='Please enter valid non-negative values.';o.style.display='block'}}}})}})();</script>'''
    url=f'/calculators/{slug}.html'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(name)} | Friendly Calculator</title><meta name="description" content="{html.escape(desc)}"><link rel="canonical" href="https://friendlycalculator.in{url}"><link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1"><style>:root{{--ink:#172638;--muted:#596b7c;--line:#e0e5ea;--paper:#f5f6f8}}*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}}.fc-wrap{{width:min(900px,92%);margin:auto}}.fc-hero{{padding:34px 0 12px}}.fc-hero h1{{font-size:clamp(1.9rem,5vw,2.7rem);line-height:1.15}}.fc-panel,.fc-content{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin:18px 0}}.fc-fields{{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}}.fc-field{{display:grid;gap:6px;font-weight:700}}.fc-field input{{padding:11px;border:1px solid #aebbc7;border-radius:8px;font:inherit}}button{{border:0;border-radius:8px;background:#101c2c;color:#fff;padding:12px 18px;font:inherit;font-weight:750;cursor:pointer;margin-top:15px}}.fc-output{{display:none;margin-top:17px;padding:16px;background:#edf3f7;border-radius:10px}}table{{width:100%;border-collapse:collapse}}th,td{{padding:9px;border-bottom:1px solid #d7e0e8;text-align:left}}td{{text-align:right;font-weight:700}}@media(max-width:620px){{.fc-fields{{grid-template-columns:1fr}}}}</style></head><body><main class="fc-wrap"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/calculator/site-directory.html">All Calculators</a> / {html.escape(name)}</nav><header class="fc-hero"><p>{html.escape(cat.upper())} · FREE ONLINE TOOL</p><h1>{html.escape(name)}</h1><p>{html.escape(desc)}</p></header><section class="fc-panel"><h2>Use the calculator</h2><form id="fcNewCalc" class="fc-fields">{fs}<div><button type="submit">Calculate</button></div></form><div id="fcNewOutput" class="fc-output" aria-live="polite"></div></section><section class="fc-content"><h2>How it works</h2><p>{html.escape(desc)} Results use standard definitions and the assumptions shown in the input labels.</p><h2>Limitations</h2><p>Check units and local conventions before using a result for a regulated, medical, legal, financial or safety-critical decision.</p></section></main><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>{script}</body></html>'''

idx=json.load(open(ROOT/'assets/calculator-search-index.json'))
existing={x['url'] for x in idx}
dirp=ROOT/'calculator/site-directory.html'
dirtext=dirp.read_text()
for slug,name,cat,keywords,desc,fields,_formula,results in items:
    url=f'/calculators/{slug}.html'
    if url in existing: continue
    (OUT/f'{slug}.html').write_text(page(slug,name,cat,keywords,desc,fields,results))
    idx.append({'name':name,'url':url,'category':cat,'keywords':keywords,'description':desc})
    card=f'<a class="card" href="{url}" data-search="{html.escape((name+" "+keywords+" "+desc).lower(),quote=True)}"><strong>{html.escape(name)}</strong><span>{html.escape(desc)}</span></a>'
    dirtext += card
json.dump(idx,open(ROOT/'assets/calculator-search-index.json','w'),ensure_ascii=False,indent=2)
dirp.write_text(dirtext)
# append English sitemap entries before closing urlset
smp=ROOT/'sitemap-en.xml'
st=smp.read_text()
root_smp=ROOT/'sitemap.xml'
root_st=root_smp.read_text()
for slug,name,*_ in items:
    u=f'https://friendlycalculator.in/calculators/{slug}.html'
    if u not in st: st=st.replace('</urlset>',f'<url><loc>{u}</loc><lastmod>2026-11-18</lastmod></url></urlset>')
    if u not in root_st: root_st=root_st.replace('</urlset>',f'<url><loc>{u}</loc><lastmod>2026-11-18</lastmod></url></urlset>')
smp.write_text(st)
root_smp.write_text(root_st)
print('generated',len(items))
