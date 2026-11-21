const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const middlewareSource = fs.readFileSync(
  path.join(__dirname, '..', 'functions', '_middleware.js'),
  'utf8',
);
const middlewareModule = import(
  `data:text/javascript;base64,${Buffer.from(middlewareSource).toString('base64')}`,
);

async function invokeMiddleware(requestUrl) {
  const { onRequest } = await middlewareModule;
  let nextCalls = 0;
  const nextResponse = new Response('served by Pages', { status: 200 });
  const response = await onRequest({
    request: new Request(requestUrl),
    next: async () => {
      nextCalls += 1;
      return nextResponse;
    },
  });
  return { response, nextCalls };
}

test('redirects a Cloudflare preview hostname to production and preserves path/query', async () => {
  const { response, nextCalls } = await invokeMiddleware(
    'https://feature-branch.friendly-calculator.pages.dev/hi/calculator?amount=42&unit=kg',
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get('location'),
    'https://friendlycalculator.in/hi/calculator?amount=42&unit=kg',
  );
  assert.equal(nextCalls, 0);
});

test('redirects the Cloudflare Pages project root hostname', async () => {
  const { response, nextCalls } = await invokeMiddleware(
    'https://friendly-calculator.pages.dev/?campaign=preview',
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://friendlycalculator.in/?campaign=preview');
  assert.equal(nextCalls, 0);
});

test('leaves canonical and www production hosts to the normal Pages pipeline', async (t) => {
  for (const host of ['friendlycalculator.in', 'www.friendlycalculator.in']) {
    await t.test(host, async () => {
      const { response, nextCalls } = await invokeMiddleware(`https://${host}/calculator`);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'served by Pages');
      assert.equal(nextCalls, 1);
    });
  }
});

test('does not redirect lookalike domains outside the exact pages.dev suffix', async () => {
  const { response, nextCalls } = await invokeMiddleware(
    'https://friendly-calculator.pages.dev.attacker.example/path',
  );

  assert.equal(response.status, 200);
  assert.equal(nextCalls, 1);
});
