import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createWorker, issueToken, authorized, buildRequest, estimate } from '../worker/index.mjs';
const origin = 'https://iskandarzulkarnaien.github.io';
const spread = [{ card: 7, o: 'u' }, { card: 18, o: 'r' }, { card: 16, o: 'u' }];
const input = () => ({ question: 'Who betrayed us?', answer: 'PRIVATE brother coerced into betrayal', mode: 'fast', allowBestEffort: false, requestId: crypto.randomUUID() });
const generated = { status: 'ready', warning: '', candidates: [{ slots: spread, warning: 'Cannot identify which brother.' }] };
const usage = { input_tokens: 8000, input_tokens_details: { cached_tokens: 2000 }, output_tokens: 1000, output_tokens_details: { reasoning_tokens: 900 } };
function setup(provider) {
  const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../worker/migrations/0001_usage.sql', import.meta.url), 'utf8'));
  const env = { ALLOWED_ORIGIN: origin, SHARED_ACCESS_CODE: 'test-private-access-code', SESSION_SECRET: 'test-session-secret-at-least-32-characters', OPENAI_API_KEY: 'test-only-not-real', DB: { prepare(sql) {
    let params = []; const stmt = db.prepare(sql);
    return { bind(...args) { params = args; return this; }, async run() { return { meta: { changes: Number(stmt.run(...params).changes) } }; }, async first() { return stmt.get(...params) || null; } };
  } } };
  let calls = 0, lastRequest;
  const worker = createWorker(async (url, options) => {
    calls++; lastRequest = JSON.parse(options.body); assert.equal(url, 'https://api.openai.com/v1/responses');
    if (provider) return provider(url, options);
    return Response.json({ status: 'completed', service_tier: 'fast', usage, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(generated) }] }] });
  });
  const send = (path, value, token, requestOrigin = origin, method = value ? 'POST' : 'GET') => worker.fetch(new Request(`https://worker.test${path}`, { method, headers: { Origin: requestOrigin, 'CF-Connecting-IP': '192.0.2.1', ...(value ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(value ? { body: JSON.stringify(value) } : {}) }), env);
  const unlock = async () => (await (await send('/auth', { code: env.SHARED_ACCESS_CODE })).json()).token;
  return { db, env, send, unlock, get calls() { return calls; }, get lastRequest() { return lastRequest; } };
}
test('authentication rejects missing, wrong, expired, tampered and rotated access', async () => {
  const s = setup(); assert.equal((await s.send('/generate', input())).status, 401);
  assert.equal((await s.send('/auth', { code: 'wrong' })).status, 401);
  const token = await s.unlock();
  const req = token => new Request('https://worker.test', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(await authorized(req(token), s.env), true);
  const old = await issueToken(s.env, Date.now() - 8 * 86400000);
  assert.equal(await authorized(req(old.token), s.env), false);
  assert.equal(await authorized(req(token.slice(0, -2) + 'XY'), s.env), false);
  s.env.SHARED_ACCESS_CODE = 'rotated-private-access-code';
  assert.equal(await authorized(req(token), s.env), false); assert.equal(s.calls, 0); s.db.close();
});
test('origin and preflight enforced; private responses never cached', async () => {
  const s = setup(); const denied = await s.send('/auth', { code: s.env.SHARED_ACCESS_CODE }, null, 'https://evil.example');
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  const preflight = await s.send('/generate', null, null, origin, 'OPTIONS');
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(preflight.headers.get('Cache-Control'), 'no-store'); s.db.close();
});
test('code attempts limited across invocations using real SQL and salted identifiers', async () => {
  const s = setup();
  for (let i = 0; i < 20; i++) assert.equal((await s.send('/auth', { code: 'wrong' })).status, 401);
  assert.equal((await s.send('/auth', { code: s.env.SHARED_ACCESS_CODE })).status, 429);
  assert.ok(!JSON.stringify(s.db.prepare('SELECT * FROM auth_limits').all()).includes('192.0.2.1')); s.db.close();
});
test('fast requests omit explanations but preserve cheatsheet and reasoning settings', () => {
  const config = buildRequest(input(), {});
  assert.equal(config.store, false); assert.equal(config.service_tier, 'fast'); assert.equal(config.reasoning.effort, 'medium');
  assert.ok(!('explanation' in config.text.format.schema.properties.candidates.items.properties));
  assert.ok(config.instructions.includes('The World')); assert.ok(config.instructions.includes('Faithfulness is primary'));
  const prep = buildRequest({ ...input(), mode: 'preparation' }, {});
  assert.ok('explanation' in prep.text.format.schema.properties.candidates.items.properties); assert.equal(prep.service_tier, 'default');
});
test('generation validates, deduplicates and accounts for usage without campaign text', async () => {
  const s = setup(), token = await s.unlock(), data = input();
  const response = await s.send('/generate', data, token);
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).candidates[0].slots, spread);
  assert.equal((await s.send('/generate', data, token)).status, 429); assert.equal(s.calls, 1);
  const row = s.db.prepare('SELECT * FROM usage').get();
  assert.equal(row.status, 'completed'); assert.equal(row.reasoning_tokens, 900);
  assert.ok(Math.abs(row.estimated_usd - 0.0444) < 1e-10); assert.ok(!JSON.stringify(row).includes('PRIVATE'));
  const costs = await (await s.send('/usage', null, token)).json();
  assert.equal(costs.requests, 1); assert.equal(costs.unpriced, 0); assert.equal(costs.estimatedUSD, row.estimated_usd); s.db.close();
});
test('invalid inputs and missing ledger prevent paid calls', async () => {
  const s = setup(), token = await s.unlock();
  assert.equal((await s.send('/generate', { ...input(), answer: '' }, token)).status, 400);
  assert.equal((await s.send('/explain', { ...input(), slots: [spread[0], spread[0], spread[2]] }, token)).status, 400);
  s.env.DB = null; assert.equal((await s.send('/generate', input(), token)).status, 503); assert.equal(s.calls, 0); s.db.close();
});
test('configuration errors identify invalid bindings without leaking values or making paid calls', async () => {
  for (const [binding, bad, expected] of [
    ['DB', null, 'database binding'],
    ['OPENAI_API_KEY', ' ', 'OPENAI_API_KEY'],
    ['SHARED_ACCESS_CODE', ' ', 'SHARED_ACCESS_CODE'],
    ['SHARED_ACCESS_CODE', 's'.repeat(257), 'SHARED_ACCESS_CODE'],
    ['SESSION_SECRET', 'short-private', 'SESSION_SECRET'],
  ]) {
    const s = setup(); s.env[binding] = bad;
    const response = await s.send('/usage'); const value = await response.json();
    assert.equal(response.status, 503); assert.ok(value.error.includes(expected));
    assert.ok(!value.error.includes('short-private')); assert.equal(s.calls, 0); s.db.close();
  }
});
test('an owner-selected short codeword can authenticate', async () => {
  const s = setup(); s.env.SHARED_ACCESS_CODE = 'raven';
  const token = await s.unlock();
  assert.equal(typeof token, 'string');
  const response = await s.send('/usage', null, token);
  assert.equal(response.status, 200); assert.equal(s.calls, 0); s.db.close();
});
test('invalid generated cards rejected, accounted for and not retried', async () => {
  const s = setup(async () => Response.json({ status: 'completed', usage, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...generated, candidates: [{ slots: [spread[0], spread[0], spread[2]], warning: '' }] }) }] }] }));
  const token = await s.unlock(); assert.equal((await s.send('/generate', input(), token)).status, 502);
  assert.equal(s.calls, 1); assert.equal(s.db.prepare('SELECT status FROM usage').get().status, 'failed'); s.db.close();
});
test('clarification returns no suggestions and consumes exactly one accounted request', async () => {
  const s = setup(async () => Response.json({ status: 'completed', usage, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ status: 'clarification', warning: 'Is this oath binding?', candidates: [] }) }] }] }));
  const response = await s.send('/generate', input(), await s.unlock());
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).candidates, []);
  assert.equal(s.calls, 1); assert.equal(s.db.prepare('SELECT status FROM usage').get().status, 'completed'); s.db.close();
});
test('request bursts are bounded by an atomic SQL reservation', async () => {
  const s = setup(), token = await s.unlock();
  for (let i = 0; i < 10; i++) assert.equal((await s.send('/generate', input(), token)).status, 200);
  assert.equal((await s.send('/generate', input(), token)).status, 429); assert.equal(s.calls, 10); s.db.close();
});
test('oversized and non-JSON requests cannot trigger the provider', async () => {
  const s = setup(), token = await s.unlock();
  const request = new Request('https://worker.test/generate', { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: 'x'.repeat(48001) });
  assert.equal((await createWorker(() => { throw new Error('Should not be called'); }).fetch(request, s.env)).status, 413);
  const nonJSON = new Request('https://worker.test/generate', { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}` }, body: '{}' });
  assert.equal((await createWorker().fetch(nonJSON, s.env)).status, 415); assert.equal(s.calls, 0); s.db.close();
});
test('provider failure not retried, details not leaked and unpriced usage disclosed', async () => {
  const s = setup(async () => new Response('provider detail must not leak', { status: 429 })), token = await s.unlock();
  const response = await s.send('/generate', input(), token); assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('provider detail')); assert.equal(s.calls, 1);
  assert.equal((await (await s.send('/usage', null, token)).json()).unpriced, 1); s.db.close();
});
test('costs count reasoning within output once and reject unsupported pricing', () => {
  assert.equal(estimate({ input_tokens: 0, output_tokens: 1000, output_tokens_details: { reasoning_tokens: 900 } }, 'gpt-6.1-sol', 'default'), 0.01);
  assert.equal(estimate(usage, 'unknown', 'default'), null); assert.equal(estimate(usage, 'gpt-6.1-sol', 'ultrafast'), null);
  assert.equal(estimate({ input_tokens: 12000, output_tokens: 0, input_tokens_details: { cached_tokens: 4000, cache_write_tokens: 7000, cache_write_tokens_details: { ttl_30m_tokens: 3000, ttl_12h_tokens: 4000 } } }, 'gpt-6.1-sol', 'default'), 0.0299);
  assert.equal(estimate({ input_tokens: 1000, output_tokens: 0, input_tokens_details: { cache_write_tokens: 1000 } }, 'gpt-6.1-sol', 'default'), 0.0025);
});
test('explain receives edited spread and returns explanation without replacements', async () => {
  const explanation = { conveyed: 'Betrayal under pressure.', omissions: 'Which brother.', misleading: '', metaphor: '' };
  const s = setup(async () => Response.json({ status: 'completed', service_tier: 'default', usage, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ explanation, warning: '' }) }] }] }));
  const token = await s.unlock(), chosen = spread.map((v, i) => i === 0 ? { ...v, o: 'r' } : v);
  const response = await s.send('/explain', { ...input(), slots: chosen }, token);
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).explanation, explanation);
  assert.deepEqual(JSON.parse(s.lastRequest.input[0].content).selectedSpread, chosen);
  assert.equal(s.lastRequest.service_tier, 'default'); s.db.close();
});
