const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '..', 'vercel.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

test('Vercel Git deployments are disabled; Cloudflare Pages remains the deployment host', () => {
  assert.equal(config.git?.deploymentEnabled, false);
});
