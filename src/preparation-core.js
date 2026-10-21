/* Shared validation and codecs. Embedded into index.html by scripts/sync-runtime.mjs. */
(() => {
  'use strict';
  const fail = message => { throw new Error(message); };
  const text = (value, max, label = 'Text') => typeof value === 'string' && value.length <= max ? value : fail(`${label} is missing or too long.`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function slots(value) {
    if (!Array.isArray(value) || value.length !== 3) fail('A reading needs three cards.');
    const result = value.map(s => {
      if (!Number.isInteger(s?.card) || s.card < 0 || s.card > 21 || !['u', 'r'].includes(s.o)) fail('Invalid card or orientation.');
      return { card: s.card, o: s.o };
    });
    if (new Set(result.map(s => s.card)).size !== 3) fail('Cards must be distinct.');
    return result;
  }
  function explanation(value) {
    if (value === null) return null;
    if (!value || typeof value !== 'object') fail('Invalid explanation.');
    return Object.fromEntries(['conveyed', 'omissions', 'misleading', 'metaphor'].map(k => [k, text(value[k], 2500, k)]));
  }
  function result(value, mode) {
    if (!value || !['ready', 'clarification', 'unrepresentable'].includes(value.status)) fail('Invalid generation status.');
    const warning = text(value.warning, 600, 'Warning');
    const count = mode === 'fast' ? 1 : 3;
    if (!Array.isArray(value.candidates) || value.candidates.length !== (value.status === 'ready' ? count : 0)) fail('Unexpected number of suggestions.');
    if (value.status !== 'ready' && !warning.trim()) fail('A clarification or limitation must be described.');
    const candidates = value.candidates.map(c => ({
      slots: slots(c.slots), warning: text(c.warning, 600, 'Warning'),
      explanation: mode === 'fast' ? null : explanation(c.explanation),
    }));
    if (mode !== 'fast' && candidates.some(c => !c.explanation)) fail('Preparation suggestions need explanations.');
    if (new Set(candidates.map(c => JSON.stringify(c.slots))).size !== candidates.length) fail('Suggestions must differ.');
    return { status: value.status, warning, candidates };
  }
  function inputs(value) {
    if (!value || !['preparation', 'fast'].includes(value.mode) || typeof value.allowBestEffort !== 'boolean') fail('Invalid generation settings.');
    const question = text(value.question, 2000, 'Question');
    const answer = text(value.answer, 8000, 'Answer');
    return { question, answer, mode: value.mode, allowBestEffort: value.allowBestEffort };
  }
  const empty = () => ({ version: 1, question: '', answer: '', mode: 'preparation', allowBestEffort: false, generatedFor: null, status: 'empty', warning: '', candidates: [], selected: 0 });
  function preparation(value) {
    if (!value || value.version !== 1) fail('Unsupported preparation file version.');
    const current = inputs(value);
    const generatedFor = value.generatedFor === null ? null : inputs(value.generatedFor);
    if (!['empty', 'ready', 'clarification', 'unrepresentable'].includes(value.status)) fail('Invalid preparation status.');
    let candidates = [];
    if (value.status !== 'empty') {
      if (!generatedFor) fail('Missing original question and answer.');
      // Validate immutable suggestions independently from editable current spreads.
      const original = result({ status: value.status, warning: value.warning, candidates: value.candidates?.map(c => ({ ...c, slots: c.originalSlots, explanation: c.originalExplanation })) }, generatedFor.mode);
      candidates = original.candidates.map((c, i) => {
        const source = value.candidates[i];
        return { slots: slots(source.slots), originalSlots: c.slots, warning: c.warning,
          originalExplanation: c.explanation, explanation: explanation(source.explanation),
          explanationForSlots: source.explanationForSlots === null ? null : slots(source.explanationForSlots) };
      });
    } else if (!Array.isArray(value.candidates) || value.candidates.length || generatedFor !== null) fail('Invalid empty preparation.');
    if (!Number.isInteger(value.selected) || value.selected < 0 || value.selected >= Math.max(1, candidates.length)) fail('Invalid selected suggestion.');
    return { version: 1, ...current, generatedFor, status: value.status, warning: text(value.warning, 600), candidates, selected: value.selected };
  }
  function reading(value) {
    if (!value || value.v !== 1) fail('Unsupported reading link version.');
    return { v: 1, question: text(value.question, 2000, 'Question'), slots: slots(value.slots) };
  }
  function encodeReading(question, spread) {
    const payload = reading({ v: 1, question, slots: spread });
    return btoa(Array.from(new TextEncoder().encode(JSON.stringify(payload)), b => String.fromCharCode(b)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
  function decodeReading(encoded) {
    if (typeof encoded !== 'string' || encoded.length > 18000 || !/^[\w-]+$/.test(encoded)) fail('Invalid reading link.');
    try {
      const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
      return reading(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    } catch { fail('Invalid or unsupported reading link.'); }
  }
  function edit(candidate, index, card, o) {
    const next = slots(candidate.slots);
    if (!Number.isInteger(index) || index < 0 || index > 2) fail('Invalid position.');
    const other = next.findIndex((s, i) => i !== index && s.card === card);
    if (other !== -1) next[other].card = next[index].card;
    next[index] = { card, o };
    return slots(next);
  }
  globalThis.TarocchiPreparation = Object.freeze({ slots, explanation, result, inputs, empty, preparation, reading, encodeReading, decodeReading, edit, same });
})();
