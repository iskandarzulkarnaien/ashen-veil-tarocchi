import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const bytes = readFileSync(new URL('../index.html', import.meta.url));
const html = bytes.toString('utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'The inline application script must exist');
new vm.Script(script); // Parse the entire application, including DOM event wiring.
const cards = JSON.parse(script.match(/const CARDS=(\[[\s\S]*?\]);\s*const POSITIONS/)[1]);
const key = 'vesperTarocchi_v1';

// Execute the application's own state/search/assignment code. Rendering is
// stubbed here; actual DOM, keyboard, network and layout checks are in browser.mjs.
function app(saved = null) {
  const storage = new Map(saved === null ? [] : [[key, saved]]);
  const elements = new Map();
  const context = vm.createContext({
    localStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
    },
    document: { getElementById: id => {
      if (!elements.has(id)) elements.set(id, {
        value: '', classList: { toggle() {} }, setAttribute() {},
      });
      return elements.get(id);
    } },
  });
  const end = script.indexOf("$('backToReading').addEventListener");
  assert.ok(end > 0, 'Find the boundary before DOM startup');
  vm.runInContext(script.slice(0, end) + `
    renderReading = () => {}; renderIndex = () => {};
    renderReference = () => {}; showToast = () => {};
    function resizeQuestion() {}
  `, context);
  return {
    run: code => vm.runInContext(code, context),
    value: code => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, context)),
    storage,
  };
}

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }

check('authoritative HTML is byte-for-byte unchanged and valid JavaScript', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6');
});

check('22 ordered, unique Arcana with every required meaning and question', () => {
  assert.equal(cards.length, 22);
  assert.equal(new Set(cards.map(c => c.name)).size, 22);
  cards.forEach((c, i) => {
    assert.equal(c.num, i);
    for (const field of ['name', 'core', 'u', 'r', 'ask']) {
      assert.ok(typeof c[field] === 'string' && c[field].trim(), `${i}.${field}`);
    }
    for (const position of ['light', 'shadow', 'dusk']) {
      for (const o of ['u', 'r']) assert.ok(c[position][o]?.trim(), `${i}.${position}.${o}`);
    }
  });
});

check('search covers names, roman numerals, keywords and interpretation text', () => {
  const a = app();
  for (const [card, term] of [[11, 'justice'], [21, 'xxi'], [4, 'control'],
    [18, 'hidden illusion is beginning to unravel']]) {
    assert.equal(a.run(`matches(CARDS[${card}], ${JSON.stringify(term)})`), true);
  }
  assert.equal(a.run("CARDS.filter(c => matches(c, '')).length"), 22);
  assert.equal(a.run("CARDS.filter(c => matches(c, 'no-such-arcana')).length"), 0);
});

check('duplicate selection swaps cards while preserving slot orientations', () => {
  const a = app();
  a.run("assign(0, 7); assign(1, 18); orientSlot(1, 'r'); assign(0, 18)");
  assert.deepEqual(a.value('state.slots'), [
    { card: 18, o: 'u' }, { card: 7, o: 'r' }, { card: null, o: 'u' },
  ]);
  a.run('assign(2, 18)');
  assert.deepEqual(a.value('state.slots.map(s => s.card)'), [null, 7, 18]);
});

check('100 random draws produce three distinct valid cards and orientations', () => {
  const a = app();
  for (let i = 0; i < 100; i++) {
    a.run('drawThree()');
    const slots = a.value('state.slots');
    assert.equal(new Set(slots.map(s => s.card)).size, 3);
    assert.ok(slots.every(s => Number.isInteger(s.card) && s.card >= 0 && s.card < 22
      && ['u', 'r'].includes(s.o)));
  }
});

check('saved schema preserves reading, reference selection, orientation and question', () => {
  const a = app();
  a.run(`assign(0, 14); assign(1, 6); assign(2, 4); orientSlot(1, 'r');
    state.question = 'What should I understand before accepting this blood?';
    state.mode = 'reference'; state.refOrientation = 'r'; persist()`);
  const saved = a.storage.get(key);
  assert.deepEqual(Object.keys(JSON.parse(saved)).sort(),
    ['mode', 'selected', 'refOrientation', 'activeSlot', 'slots', 'question'].sort());
  assert.deepEqual(app(saved).value('state'), a.value('state'));
});

check('malformed saved data falls back safely and invalid slot values normalize', () => {
  assert.equal(app('{broken').run('state.selected'), 13);
  const a = app(JSON.stringify({ selected: 99, mode: 'unknown', activeSlot: 9,
    slots: [{ card: -1, o: 'x' }, null, { card: 21, o: 'r' }] }));
  assert.equal(a.run('state.selected'), 13);
  assert.equal(a.run('state.mode'), 'reading');
  assert.equal(a.run('state.activeSlot'), 2);
  assert.deepEqual(a.value('state.slots'), [
    { card: null, o: 'u' }, { card: null, o: 'u' }, { card: 21, o: 'r' },
  ]);
});

check('clear resets the spread and question in storage', () => {
  const a = app();
  a.run("drawThree(); state.question = 'A question'; clearReading()");
  assert.deepEqual(a.value('state.slots'), Array.from({ length: 3 }, () => ({ card: null, o: 'u' })));
  assert.equal(JSON.parse(a.storage.get(key)).question, '');
});

check('rendered text escaping protects HTML metacharacters', () => {
  assert.equal(app().run(`escapeHtml(${JSON.stringify('<script>"&\'</script>')})`),
    '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});

console.log(`${passed} validation checks passed; browser verification is separate.`);
