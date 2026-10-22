/* Plain browser UI; no runtime assets or dependencies. */
(() => {
  'use strict';
  const P = globalThis.TarocchiPreparation;
  const DRAFT = 'vesperTarocchi_dm_v1', ACCESS = 'vesperTarocchi_access_v1';
  // Public Worker address; credentials remain in Cloudflare secrets.
  const API_URL = 'https://ashen-veil-tarocchi-api.ashen-veil-tarocchi.workers.dev';
  const PUBLIC_SITE = 'https://iskandarzulkarnaien.github.io/ashen-veil-tarocchi/';
  const clone = value => JSON.parse(JSON.stringify(value));
  const style = document.createElement('style');
  style.textContent = `
    .tabs{flex-wrap:wrap}.btn:disabled{opacity:.45;cursor:default}
    .dm-panel,.shared-banner{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:18px;margin:16px 0}
    .shared-banner{border-color:var(--gold2)}.shared-banner[hidden]{display:none}
    .dm-panel h3{font:22px Georgia,serif;margin:0 0 14px}.dm-panel p{overflow-wrap:anywhere}
    .dm-field{display:block;margin:14px 0}.dm-field span{display:block;color:var(--gold2);font-size:12px;margin-bottom:6px}
    .dm-field textarea,.dm-field input,.dm-field select{width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:10px;min-width:0}
    .dm-field textarea{min-height:90px;resize:vertical}.dm-field textarea#dmAnswer{min-height:130px}
    .dm-check{display:block;margin:12px 0;color:var(--muted);font-size:12px}.dm-note{color:var(--muted);font-size:12px}
    .dm-warning{color:var(--gold);white-space:pre-wrap;overflow-wrap:anywhere}.dm-error{color:var(--dusk)}
    .dm-ranks{display:grid;gap:8px;margin:16px 0}.dm-rank{text-align:left;white-space:normal;width:100%;line-height:1.6}
    .dm-rank[aria-pressed=true]{border-color:var(--gold);background:#3b3027}
    .dm-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .dm-card{border:1px solid var(--border);border-top:2px solid var(--gold2);border-radius:9px;padding:14px;min-width:0}
    .dm-card h4{color:var(--gold);margin:0}.dm-card p{font:15px/1.5 Georgia,serif}
    .dm-card select{width:100%;min-width:0;background:var(--panel2);color:var(--text);border:1px solid var(--border2);border-radius:6px;padding:8px;margin-top:9px}
    .dm-explanation{border-top:1px solid var(--border);margin-top:18px;padding-top:8px}.dm-explanation dt{color:var(--gold2);font-size:12px;margin-top:10px}.dm-explanation dd{margin:4px 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}
    #dmLink{width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--border);padding:9px;margin-top:12px}
    @media(max-width:1060px){.dm-cards{grid-template-columns:1fr}}
  `;
  document.head.append(style);
  const tab = document.createElement('button');
  tab.id = 'dmTab'; tab.className = 'tab'; tab.type = 'button'; tab.role = 'tab';
  tab.setAttribute('aria-controls', 'dmView'); tab.setAttribute('aria-selected', 'false'); tab.textContent = 'DM Preparation';
  document.querySelector('.tabs').append(tab);
  const section = document.createElement('section');
  section.id = 'dmView'; section.className = 'view'; section.role = 'tabpanel'; section.setAttribute('aria-labelledby', 'dmTab');
  section.innerHTML = `
    <div class="read-head"><h2>DM Preparation</h2><div class="toolbar"><button class="btn" id="dmSave">Save preparation</button><button class="btn" id="dmLoad">Load preparation</button><input type="file" id="dmFile" accept=".json,application/json" hidden></div></div>
    <p class="dm-note">Private preparation for the DM. Only the question and selected spread are included in Vesper’s reading link.</p>
    <div class="dm-panel" id="dmAccess"><h3>DM access</h3>
      <p class="dm-note" id="dmSetup"></p>
      <form id="dmUnlockForm"><label class="dm-field"><span>Private access code</span><input type="password" id="dmCode" autocomplete="current-password" maxlength="256" required></label>
        <label class="dm-check"><input type="checkbox" id="dmRemember" checked> Remember access on this device</label><button class="btn gold" id="dmUnlock" type="submit">Unlock generation</button></form>
      <div class="toolbar"><button class="btn" id="dmLock" hidden>Lock</button><button class="btn" id="dmRefreshUsage" hidden>Refresh usage</button><span class="dm-note" id="dmUsage"></span></div>
    </div>
    <div class="dm-panel"><label class="dm-field"><span>Vesper’s question to her god</span><textarea id="dmQuestion" maxlength="2000"></textarea></label>
      <label class="dm-field"><span>The DM’s true answer — private</span><textarea id="dmAnswer" maxlength="8000"></textarea></label>
      <label class="dm-field"><span>Generation mode</span><select id="dmMode"><option value="preparation">Preparation — three ranked spreads with explanations</option><option value="fast">Fast — one spread, no explanations</option></select></label>
      <label class="dm-check"><input type="checkbox" id="dmBestEffort"> Allow the closest best-effort spread if the answer cannot be represented fully</label>
      <div class="toolbar"><button class="btn gold" id="dmGenerate">Suggest spreads</button><span class="dm-note" id="dmStale"></span></div>
    </div>
    <p id="dmMessage" role="status" aria-live="polite"></p><div id="dmResults"></div>`;
  document.querySelector('main').append(section);
  const banner = document.createElement('div');
  banner.id = 'sharedReading'; banner.className = 'shared-banner'; banner.hidden = true;
  banner.innerHTML = `<p>Shared reading preview. Your saved reading is preserved until you choose Save.</p><div class="toolbar"><button class="btn gold" id="sharedSave">Save this reading</button><button class="btn" id="sharedReturn">Return to my reading</button></div>`;
  document.querySelector('.topbar').after(banner);
  let draft = P.empty(), access = null, busy = false;
  try { const raw = localStorage.getItem(DRAFT); if (raw) draft = P.preparation(JSON.parse(raw)); } catch { showToast('Saved DM preparation could not be loaded. Import a valid file to recover it.'); }
  try { const raw = JSON.parse(localStorage.getItem(ACCESS) || 'null'); if (raw?.expires > Date.now() && typeof raw.token === 'string' && raw.token.length < 2000) access = raw; else localStorage.removeItem(ACCESS); } catch {}
  const message = (value, error = false) => { $('dmMessage').textContent = value; $('dmMessage').className = error ? 'dm-warning dm-error' : 'dm-warning'; };
  const active = () => draft.candidates[draft.selected];
  const currentInputs = () => P.inputs(draft);
  const stale = () => draft.generatedFor && !P.same(currentInputs(), draft.generatedFor);
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify(draft)); } catch { message('This browser could not save the draft. Use Save preparation to keep a private file.', true); } }
  function fillFields() { $('dmQuestion').value = draft.question; $('dmAnswer').value = draft.answer; $('dmMode').value = draft.mode; $('dmBestEffort').checked = draft.allowBestEffort; }
  function updateAccess() {
    if (access?.expires <= Date.now()) { access = null; try { localStorage.removeItem(ACCESS); } catch {} }
    $('dmSetup').textContent = !API_URL ? 'Generation is not connected yet. Saving, loading, editing and reading links work offline; the owner must connect the generation service.' : access ? 'Generation unlocked on this device.' : 'Enter the shared code supplied by the owner.';
    $('dmUnlockForm').hidden = !!access || !API_URL; $('dmLock').hidden = !access;
    $('dmRefreshUsage').hidden = !access; $('dmGenerate').disabled = busy || !access || !API_URL;
    $('dmGenerate').textContent = draft.mode === 'fast' ? 'Suggest one spread' : 'Suggest three spreads';
  }
  function render() {
    updateAccess();
    $('dmStale').textContent = stale() ? 'Inputs changed. Regenerate to match them.' : '';
    const c = active();
    if (!c) { $('dmResults').replaceChildren(); return; }
    const changed = !P.same(c.slots, c.originalSlots);
    const explained = c.explanation && P.same(c.slots, c.explanationForSlots);
    $('dmResults').innerHTML = `<div class="dm-ranks">${draft.candidates.map((item, i) => `<button class="btn dm-rank" data-candidate="${i}" aria-pressed="${i === draft.selected}" ${busy ? 'disabled' : ''}>${i + 1}. ${item.slots.map((s, j) => `${POSITIONS[j].name}: ${escapeHtml(CARDS[s.card].name)} ${s.o === 'r' ? '↓' : '↑'}`).join(' · ')}${!P.same(item.slots, item.originalSlots) ? ' — manually edited' : ''}</button>`).join('')}</div>
      <div class="dm-panel"><h3>${changed ? 'Manually edited spread' : 'Selected suggestion'}</h3>
      ${stale() ? '<p class="dm-warning">This spread belongs to the previous inputs. Regenerate before sharing or requesting an explanation.</p>' : ''}
      ${c.warning ? `<p class="dm-warning">${escapeHtml(c.warning)}</p>` : ''}
      <div class="dm-cards">${c.slots.map((s, i) => `<div class="dm-card"><h4>${POSITIONS[i].symbol} ${POSITIONS[i].name}</h4><div class="dm-note">${POSITIONS[i].question}</div>
        <select data-edit-card="${i}" aria-label="${POSITIONS[i].name} card" ${busy ? 'disabled' : ''}>${CARDS.map(card => `<option value="${card.num}" ${card.num === s.card ? 'selected' : ''}>${ROMAN[card.num]} — ${escapeHtml(card.name)}</option>`).join('')}</select>
        <select data-edit-o="${i}" aria-label="${POSITIONS[i].name} orientation" ${busy ? 'disabled' : ''}><option value="u" ${s.o === 'u' ? 'selected' : ''}>Upright</option><option value="r" ${s.o === 'r' ? 'selected' : ''}>Reversed</option></select>
        <p>${escapeHtml(CARDS[s.card][POSITIONS[i].key][s.o])}</p>${!P.same(s, c.originalSlots[i]) ? `<div class="dm-note">Manually edited. Original: ${escapeHtml(CARDS[c.originalSlots[i].card].name)} (${c.originalSlots[i].o === 'r' ? 'reversed' : 'upright'}).</div>` : ''}</div>`).join('')}</div>
      <div class="toolbar" style="margin-top:16px"><button class="btn gold" id="dmShare" ${busy || stale() ? 'disabled' : ''}>Copy reading link</button><button class="btn" id="dmExplain" ${busy || stale() || !access || !API_URL ? 'disabled' : ''}>Explain this spread</button></div>
      <p class="dm-note">The reading link contains Vesper’s question and this spread only. Explanations and the true answer stay private.</p>
      <input id="dmLink" aria-label="Vesper’s reading link" readonly hidden>
      ${c.explanation ? `<div class="dm-explanation">${!explained ? '<p class="dm-warning">Explanation describes an earlier version of this spread.</p>' : ''}<dl>${Object.entries(c.explanation).map(([k, v]) => `<dt>${({ conveyed: 'What it conveys', omissions: 'Details lost', misleading: 'Possible misinterpretation', metaphor: 'Metaphorical extension' })[k]}</dt><dd>${escapeHtml(v || 'None identified.')}</dd>`).join('')}</dl></div>` : ''}</div>`;
    $('dmResults').querySelectorAll('[data-candidate]').forEach(b => b.onclick = () => { draft.selected = Number(b.dataset.candidate); saveDraft(); render(); });
    $('dmResults').querySelectorAll('[data-edit-card], [data-edit-o]').forEach(el => el.onchange = () => {
      const i = Number(el.dataset.editCard ?? el.dataset.editO), old = active().slots[i];
      active().slots = P.edit(active(), i, el.dataset.editCard !== undefined ? Number(el.value) : old.card, el.dataset.editO !== undefined ? el.value : old.o);
      saveDraft(); render();
    });
    $('dmShare').onclick = async () => {
      const base = location.protocol === 'file:' ? PUBLIC_SITE : location.href.split('#')[0].split('?')[0];
      const link = `${base}#reading=${P.encodeReading(draft.question, active().slots)}`;
      $('dmLink').hidden = false; $('dmLink').value = link;
      try { await navigator.clipboard.writeText(link); showToast('Reading link copied'); } catch { $('dmLink').focus(); $('dmLink').select(); showToast('Select and copy the reading link'); }
    };
    $('dmExplain').onclick = () => generate(true);
  }
  function lock() { access = null; try { localStorage.removeItem(ACCESS); } catch {} $('dmUsage').textContent = ''; render(); }
  async function api(path, body, authenticated = true) {
    if (!API_URL) throw new Error('Generation service is not connected yet.');
    if (authenticated && (!access || access.expires <= Date.now())) { lock(); throw new Error('Access expired. Enter the code again.'); }
    let response;
    try { response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, { method: body ? 'POST' : 'GET', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated ? { Authorization: `Bearer ${access.token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new Error('Could not reach the generation service. No automatic retry was made.'); }
    const data = await response.json();
    if (response.status === 401 && authenticated) lock();
    if (!response.ok) throw new Error(data.error || 'The request failed. No automatic retry was made.');
    return data;
  }
  async function usage() {
    try { const data = await api('/usage'); $('dmUsage').textContent = `${data.month} (UTC): estimated $${data.estimatedUSD.toFixed(4)} · ${data.requests} requests${data.unpriced ? ` · ${data.unpriced} pending or unpriced` : ''}`; }
    catch (e) { $('dmUsage').textContent = e.message; }
  }
  function setBusy(value) {
    busy = value;
    for (const id of ['dmQuestion', 'dmAnswer', 'dmMode', 'dmBestEffort', 'dmLoad', 'dmSave', 'dmLock']) $(id).disabled = value;
    render();
  }
  async function generate(explain = false) {
    if (busy) return;
    const input = currentInputs();
    if (!input.question.trim() || !input.answer.trim()) { message('Enter both Vesper’s question and the DM’s true answer.', true); return; }
    const c = active();
    if (explain && (!c || stale())) return;
    setBusy(true); message(explain ? 'Explaining this spread…' : 'Selecting your spread…');
    const timer = setTimeout(() => message(explain ? 'Still preparing the explanation…' : 'Still selecting your spread…'), 10000);
    const start = performance.now();
    try {
      const data = await api(explain ? '/explain' : '/generate', { ...input, requestId: crypto.randomUUID(), ...(explain ? { slots: c.slots } : {}) });
      if (explain) { c.explanation = P.explanation(data.explanation); c.explanationForSlots = clone(c.slots); message(data.warning || 'Explanation ready.'); }
      else {
        const generated = P.result(data, input.mode);
        draft = { version: 1, ...input, generatedFor: input, status: generated.status, warning: generated.warning, selected: 0,
          candidates: generated.candidates.map(item => ({ ...item, originalSlots: clone(item.slots), originalExplanation: item.explanation, explanationForSlots: item.explanation ? clone(item.slots) : null })) };
        message(generated.warning || `Spread${input.mode === 'fast' ? '' : 's'} ready in ${((performance.now() - start) / 1000).toFixed(1)} seconds.`);
      }
      clearTimeout(timer);
      saveDraft(); if (data.accountingWarning) message(`${$('dmMessage').textContent} ${data.accountingWarning}`, true);
      void usage();
    } catch (e) { message(e.message, true); }
    finally { clearTimeout(timer); setBusy(false); }
  }
  $('dmUnlockForm').onsubmit = async e => {
    e.preventDefault(); $('dmUnlock').disabled = true;
    try { const data = await api('/auth', { code: $('dmCode').value }, false); access = { token: data.token, expires: data.expires }; $('dmCode').value = '';
      try { if ($('dmRemember').checked) localStorage.setItem(ACCESS, JSON.stringify(access)); else localStorage.removeItem(ACCESS); } catch {}
      render(); message('Generation unlocked.'); await usage();
    } catch (error) { message(error.message, true); } finally { $('dmUnlock').disabled = false; }
  };
  $('dmLock').onclick = lock; $('dmRefreshUsage').onclick = usage; $('dmGenerate').onclick = () => generate();
  for (const id of ['dmQuestion', 'dmAnswer', 'dmMode', 'dmBestEffort']) $(id).addEventListener('input', () => {
    draft.question = $('dmQuestion').value; draft.answer = $('dmAnswer').value; draft.mode = $('dmMode').value; draft.allowBestEffort = $('dmBestEffort').checked; saveDraft(); render();
  });
  $('dmSave').onclick = () => {
    const content = JSON.stringify(P.preparation(draft), null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tarocchi-private-preparation.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Private file saved. It includes the DM’s true answer; keep it for the DM.');
  };
  $('dmLoad').onclick = () => $('dmFile').click();
  $('dmFile').onchange = async () => {
    const file = $('dmFile').files[0]; if (!file) return;
    try { if (file.size > 1000000) throw new Error('Preparation file is too large.'); const loaded = P.preparation(JSON.parse(await file.text())); draft = loaded; fillFields(); saveDraft(); render(); message(draft.warning || 'Private preparation loaded without generation.'); }
    catch (e) { message(`Could not load preparation: ${e.message}`, true); }
    finally { $('dmFile').value = ''; }
  };
  tab.onclick = () => {
    for (const id of ['referenceView', 'readingView', 'referenceTab', 'readingTab']) { $(id).classList.remove('active'); if ($(id).role === 'tab') $(id).setAttribute('aria-selected', 'false'); }
    section.classList.add('active'); tab.classList.add('active'); tab.setAttribute('aria-selected', 'true'); render();
  };
  function clearReadingHash() { try { history.replaceState(null, '', location.href.split('#')[0]); } catch {} }
  function openShared() {
    if (!location.hash.startsWith('#reading=')) return;
    try {
      const shared = P.decodeReading(location.hash.slice(9));
      if (!temporaryReading) temporaryReading = clone(state);
      state = { ...state, question: shared.question, slots: shared.slots, activeSlot: 0 };
      $('question').value = state.question; resizeQuestion(); setMode('reading'); banner.hidden = false;
    } catch (e) { showToast(e.message); }
  }
  $('sharedSave').onclick = () => { temporaryReading = null; banner.hidden = true; clearReadingHash(); persist(); showToast('Shared reading saved'); };
  $('sharedReturn').onclick = () => {
    if (!temporaryReading) return;
    state = temporaryReading; temporaryReading = null; banner.hidden = true; clearReadingHash();
    $('question').value = state.question; resizeQuestion(); setMode(state.mode);
  };
  window.addEventListener('hashchange', openShared);
  fillFields(); render(); openShared();
})();
