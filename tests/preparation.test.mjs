import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/preparation-core.js';
const P = globalThis.TarocchiPreparation;
const spread = [{ card: 7, o: 'u' }, { card: 18, o: 'r' }, { card: 16, o: 'u' }];
const example = () => ({ ...P.empty(), question: 'Qui ment ? 🌙', answer: 'PRIVATE ANSWER', mode: 'fast', generatedFor: { question: 'Qui ment ? 🌙', answer: 'PRIVATE ANSWER', mode: 'fast', allowBestEffort: false }, status: 'ready', candidates: [{ slots: structuredClone(spread), originalSlots: structuredClone(spread), warning: 'Cannot identify a specific person.', originalExplanation: null, explanation: null, explanationForSlots: null }] });
test('player links preserve Unicode and only player information', () => {
  const draft = example(), encoded = P.encodeReading(draft.question, draft.candidates[0].slots);
  assert.deepEqual(P.decodeReading(encoded), { v: 1, question: draft.question, slots: spread });
  assert.ok(!Buffer.from(encoded, 'base64url').toString().includes('PRIVATE ANSWER'));
  assert.deepEqual(Object.keys(P.reading({ v: 1, question: '', slots: spread, answer: 'secret', token: 'secret' })), ['v', 'question', 'slots']);
});
test('links reject malformed encodings, versions, duplicates and oversized questions', () => {
  for (const bad of ['', '!', 'a'.repeat(18001), Buffer.from('{"v":99}').toString('base64url')]) assert.throws(() => P.decodeReading(bad));
  assert.throws(() => P.encodeReading('', [spread[0], spread[0], spread[2]]));
  assert.throws(() => P.encodeReading('x'.repeat(2001), spread));
  assert.throws(() => P.slots([{ card: '7', o: 'u' }, ...spread.slice(1)]));
});
test('private JSON preserves manual edits and original suggestions; strips credentials/history', () => {
  const draft = example(); draft.candidates[0].slots = P.edit(draft.candidates[0], 0, 18, 'u');
  assert.deepEqual(draft.candidates[0].slots, [{ card: 18, o: 'u' }, { card: 7, o: 'r' }, { card: 16, o: 'u' }]);
  assert.deepEqual(draft.candidates[0].originalSlots, spread);
  assert.deepEqual(P.preparation(JSON.parse(JSON.stringify(draft))), draft);
  assert.deepEqual(P.preparation(P.empty()), P.empty());
  const loaded = P.preparation({ ...draft, token: 'SECRET', history: ['discard'], endpoint: 'https://evil.example' });
  assert.ok(!('token' in loaded) && !('history' in loaded) && !('endpoint' in loaded));
});
test('corrupt preparation originals and unsupported schemas are rejected', () => {
  assert.throws(() => P.preparation({ ...example(), version: 2 }));
  const draft = example(); draft.candidates[0].originalSlots[0].card = -1;
  assert.throws(() => P.preparation(draft));
  assert.throws(() => P.preparation({ ...P.empty(), candidates: [{}] }));
});
test('generation enforces clarification and distinct spread cardinality', () => {
  assert.deepEqual(P.result({ status: 'clarification', warning: 'Which oath?', candidates: [] }, 'fast').candidates, []);
  assert.throws(() => P.result({ status: 'unrepresentable', warning: '', candidates: [] }, 'fast'));
  assert.throws(() => P.result({ status: 'ready', warning: '', candidates: [{ slots: spread, warning: '' }] }, 'preparation'));
  assert.equal(P.result({ status: 'ready', warning: '', candidates: [{ slots: spread, warning: '' }] }, 'fast').candidates[0].explanation, null);
});
test('offline runtime matches feature sources and backend uses unchanged cards', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const embedded = html.match(/<script id="preparationRuntime">\n([\s\S]*?)\n<\/script>/)[1];
  const source = ['preparation-core.js', 'preparation-ui.js'].map(f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').trim()).join('\n');
  assert.equal(embedded, source);
  assert.equal(readFileSync(new URL('../worker/cards.json', import.meta.url), 'utf8').trim(), html.match(/const CARDS=(\[[\s\S]*?\]);\s*const POSITIONS/)[1]);
});
