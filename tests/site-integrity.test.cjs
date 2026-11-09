const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)].map(m => m[1]);

function localFile(url, baseFile = 'index.html') {
  const parsed = new URL(url, 'https://friendlycalculator.in/' + baseFile);
  if (parsed.origin !== 'https://friendlycalculator.in') return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  let target = path.join(root, pathname.replace(/^\/+/, ''));
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  return target;
}

test('sitemap is valid XML-shaped content with unique canonical URLs', () => {
  assert.match(sitemap, /^<\?xml/);
  assert.ok(urls.length >= 20, 'Expected public site pages in sitemap');
  assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique');
});

test('every public sitemap page loads the AdSense publisher script exactly once', () => {
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const count = (html.match(/pagead2\\.googlesyndication\\.com\\/pagead\\/js\\/adsbygoogle\\.js/g) || []).length;
    if (count !== 1) failures.push(url + ' (found ' + count + ')');
  }
  assert.deepEqual(failures, [], 'AdSense loader must appear exactly once: ' + failures.join(', '));
});

test('every sitemap URL maps to a committed page', () => {
  const missing = urls.filter(url => {
    const file = localFile(url);
    return !file || !fs.existsSync(file);
  });
  assert.deepEqual(missing, [], 'Missing sitemap targets: ' + missing.join(', '));
});

test('every public sitemap page has a title, viewport and canonical URL', () => {
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!/<title>\s*[^<]+<\/title>/i.test(html)) failures.push(url + ' (title)');
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) failures.push(url + ' (viewport)');
    if (!/<link[^>]+rel=["']canonical["']/i.test(html)) failures.push(url + ' (canonical)');
  }
  assert.deepEqual(failures, [], 'Metadata issues: ' + failures.join(', '));
});

test('local links in public pages do not point to missing files', () => {
  const failures = [];
  for (const pageUrl of urls) {
    const pageFile = localFile(pageUrl);
    if (!pageFile || !fs.existsSync(pageFile)) continue;
    const html = fs.readFileSync(pageFile, 'utf8');
    const relativePage = path.relative(root, pageFile).split(path.sep).join('/');
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const ref = match[1].trim();
      if (!ref || /^(?:#|mailto:|tel:|javascript:|data:|https?:|\/\/)/i.test(ref)) continue;
      const target = localFile(ref, relativePage);
      if (target && !fs.existsSync(target)) failures.push(relativePage + ' -> ' + ref);
    }
  }
  assert.deepEqual(failures, [], 'Broken local links: ' + failures.join(', '));
});
