const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'supabase/functions/calculator-api/index.ts'), 'utf8');
const management = fs.readFileSync(path.join(root, 'supabase/functions/api-management/index.ts'), 'utf8');
const customer = fs.readFileSync(path.join(root, 'calculator/dashboard.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'calculator/admin.html'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'calculator/api.html'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261111040104_customer_api_quota_management.sql'), 'utf8');

const calculators = [
  'gst', 'emi', 'fd', 'discount', 'profit-loss', 'income-tax', 'salary-tds',
  'bmi', 'epf', 'savings-interest', 'salary', 'inflation', 'fuel-cost', 'age',
  'electricity', 'sip', 'ppf', 'ctc-salary', 'hra', 'basic'
];

test('calculator API implements every published calculator route', () => {
  for (const slug of calculators) {
    assert.ok(api.includes('calculator === "' + slug + '"'), 'Missing API calculator: ' + slug);
    assert.ok(docs.includes('<code>' + slug + '</code>'), 'Missing API documentation row: ' + slug);
  }
  assert.match(api, /case|Unsupported calculator/);
});

test('calculator API validates API keys and uses server-side quota reservation', () => {
  assert.match(api, /x-api-key/);
  assert.match(api, /key_hash/);
  assert.match(api, /cryptoSafeEqual/);
  assert.match(api, /reserve_api_request/);
  assert.match(api, /finalize_api_request/);
  assert.match(api, /INVALID_API_KEY/);
  assert.match(api, /INVALID_INPUT/);
});

test('API key management verifies Supabase users and admin app metadata', () => {
  assert.match(management, /auth\.getUser\(token\)/);
  assert.match(management, /app_metadata\?\.role === "admin"/);
  assert.match(management, /crypto\.getRandomValues/);
  assert.match(management, /crypto\.subtle\.digest/);
  assert.match(management, /\.eq\("owner_id", auth\.user\.id\)/);
  assert.match(management, /admin-set-access/);
  assert.match(management, /admin-set-key-limit/);
});

test('customer dashboard uses server-side key management rather than direct table writes', () => {
  assert.match(customer, /functions\/v1\/api-management/);
  assert.match(customer, /manage\('create-key'/);
  assert.match(customer, /manage\('revoke-key'/);
  assert.doesNotMatch(customer, /\/rest\/v1\/api_keys|\/rest\/v1\/api_usage/);
  assert.match(customer, /quotaRemaining/);
  assert.match(customer, /usageChart/);
  assert.match(customer, /performance\.now\(\)/);
});

test('admin dashboard manages API customer access and keys through authenticated server actions', () => {
  assert.match(admin, /admin-dashboard/);
  assert.match(admin, /admin-set-access/);
  assert.match(admin, /admin-set-key-limit/);
  assert.match(admin, /admin-revoke-key/);
  assert.doesNotMatch(admin, /\/rest\/v1\/api_keys|\/rest\/v1\/api_usage/);
  assert.match(admin, /customersBody/);
});

test('API docs provide cURL, JavaScript and Python examples and explain quota behaviour', () => {
  assert.match(docs, /curlExample/);
  assert.match(docs, /jsExample/);
  assert.match(docs, /pythonExample/);
  assert.match(docs, /x-api-key/);
  assert.match(docs, /Monthly quota/);
  assert.match(docs, /Try API/);
});

test('quota reservation is serialized per key and RPC functions are service-role only', () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /status_code not in \(403, 429\)/);
  assert.match(migration, /revoke all on function public\.reserve_api_request[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.reserve_api_request[\s\S]*to service_role/i);
  assert.match(migration, /api_customer_access enable row level security/i);
});
