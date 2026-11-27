const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const articles = [
  {
    file: 'blog/daily/2026-11-27-uk-mortgage-overpayments.html',
    canonical: 'https://friendlycalculator.in/blog/daily/2026-11-27-uk-mortgage-overpayments.html',
    calculator: '/international/uk-mortgage-overpayment-calculator.html',
    source: 'moneyhelper.org.uk',
    sourceUrl: 'https://www.moneyhelper.org.uk/en/homes/buying-a-home/should-you-pay-off-your-mortgage-early',
    expected: ['£975.13', '£19,202.89', '45 months']
  },
  {
    file: 'blog/daily/2026-11-27-business-loan-emi.html',
    canonical: 'https://friendlycalculator.in/blog/daily/2026-11-27-business-loan-emi.html',
    calculator: '/calculators/business-loan-emi-calculator.html',
    source: 'rbi.org.in',
    sourceUrl: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12663',
    expected: ['₹33,214.31', '₹1,95,715.15', '₹68,308.95']
  }
];

function articleWordCount(html) {
  const match = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  assert.ok(match, 'article element must exist');
  const plain = match[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.split(' ').length : 0;
}

for (const item of articles) {
  test(item.file + ' has indexable metadata, a unique canonical and useful content', () => {
    const html = fs.readFileSync(path.join(root, item.file), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/i);
    assert.match(html, /<meta name="description" content="[^"]{100,160}"/i);
    assert.match(html, /<meta name="robots" content="index,follow/i);
    assert.ok(html.includes('<link rel="canonical" href="' + item.canonical + '">'));
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'exactly one H1');
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"datePublished":"2026-11-27"/);
    assert.match(html, /"dateModified":"2026-11-27"/);
    assert.match(html, /<meta name="author" content="Friendly Calculator Editorial Team"/);
    assert.ok(html.includes(item.calculator));
    assert.ok(html.includes(item.source));
    assert.ok(html.includes(item.sourceUrl), 'missing verified official source URL');
    assert.match(html, /<section class="faq"/);
    assert.match(html, /<time datetime="2026-11-27"/);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex/i);
    for (const value of item.expected) assert.ok(html.includes(value), 'missing worked-example value: ' + value);
    const words = articleWordCount(html);
    assert.ok(words >= 600 && words <= 1000, 'article word count was ' + words);
  });
}

test('blog index links to both daily articles and their calculators', () => {
  const html = fs.readFileSync(path.join(root, 'blog/index.html'), 'utf8');
  for (const item of articles) {
    assert.ok(html.includes('/' + item.file), 'missing article link: ' + item.file);
    assert.ok(html.includes(item.calculator), 'missing calculator link: ' + item.calculator);
  }
});
