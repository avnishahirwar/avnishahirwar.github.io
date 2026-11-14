const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'supabase/functions/calculator-api/index.ts'), 'utf8');
const management = fs.readFileSync(path.join(root, 'supabase/functions/api-management/index.ts'), 'utf8');
const customer = fs.readFileSync(path.join(root, 'calculator/dashboard.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'calculator/admin.html'), 'utf8');
const secondaryAdmin = fs.readFileSync(path.join(root, 'avnish-ai/admin.html'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'calculator/api.html'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261111040834_customer_api_quota_management.sql'), 'utf8');
const legacyMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261111041646_grandfather_existing_api_keys.sql'), 'utf8');
const guardMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261111041933_guard_customer_api_key_mutations.sql'), 'utf8');
const revokeMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261111042639_revoke_direct_api_table_access.sql'), 'utf8');

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

test('customer, admin and documentation browser scripts are syntactically valid JavaScript', () => {
  for (const [name, html] of [['customer dashboard', customer], ['admin dashboard', admin], ['secondary admin dashboard', secondaryAdmin], ['API docs', docs]]) {
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(match => match[1].trim())
      .filter(code => code && !code.startsWith('{') && !/application\/ld\+json/i.test(code));
    assert.ok(scripts.length > 0, name + ' should contain a browser script');
    for (const code of scripts) assert.doesNotThrow(() => new vm.Script(code), name + ' script should parse');
  }
});

test('legacy key access is preserved without granting access to newly generated keys', () => {
  assert.match(legacyMigration, /legacy_access boolean not null default false/i);
  assert.ok(legacyMigration.includes("legacy_access = true"));
  assert.ok(legacyMigration.includes("created_at < timestamptz"));
  assert.ok(legacyMigration.includes("v_plan_code := 'legacy'"));
  assert.match(management, /legacy_access/);
  assert.match(management, /plan_code: "legacy"/);
});

test('secondary admin interface also uses server-side API management', () => {
  assert.match(secondaryAdmin, /functions\/v1\/api-management/);
  assert.match(secondaryAdmin, /admin-dashboard/);
  assert.match(secondaryAdmin, /admin-revoke-key/);
  assert.doesNotMatch(secondaryAdmin, /\/rest\/v1\/api_keys|\/rest\/v1\/api_usage/);
});

test('customer key mutations cannot elevate scopes or rate limits', () => {
  assert.match(guardMigration, /new\.rate_limit_per_minute := 60/);
  assert.match(guardMigration, /new\.legacy_access := false/);
  assert.match(guardMigration, /API key security fields can only be changed by an administrator/);
  assert.match(guardMigration, /old\.revoked_at is not null/);
});

test('browser roles cannot directly access API key hashes or usage history', () => {
  assert.match(revokeMigration, /revoke all privileges on table public\.api_keys from anon, authenticated/i);
  assert.match(revokeMigration, /revoke all privileges on table public\.api_usage from anon, authenticated/i);
});

test('published OpenAPI specification matches the implemented calculator API', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'api/openapi.json'), 'utf8'));
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.paths['/calculator-api'].post.security.some(s => s.ApiKeyAuth));
  assert.equal(spec.components.securitySchemes.ApiKeyAuth.name, 'x-api-key');
  const documented = spec.paths['/calculator-api'].post.requestBody.content['application/json'].schema.oneOf
    .map(item => item.properties.calculator.const).sort();
  assert.deepEqual(documented, calculators.slice().sort());
  assert.ok(spec.paths['/calculator-api'].post.responses['429']);
});
