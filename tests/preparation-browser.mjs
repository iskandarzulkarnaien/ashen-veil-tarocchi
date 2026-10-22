import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import '../src/preparation-core.js';
const P = globalThis.TarocchiPreparation;
const source = new URL('../index.html', import.meta.url);
const html = await readFile(source, 'utf8');
const output = new URL('../test-results/', import.meta.url); await mkdir(output, { recursive: true });
const api = 'https://tarocchi-api.test';
const server = createServer((req, res) => {
  if (req.url?.split('#')[0] !== '/ashen-veil-tarocchi/') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html.replace(/const API_URL = '[^']*';/, () => `const API_URL = '${api}';`));
}).listen(0, '127.0.0.1');
await once(server, 'listening');
const spread = [{ card: 7, o: 'u' }, { card: 18, o: 'r' }, { card: 16, o: 'u' }];
const question = 'Whom can I trust? 🌙 <img src=x onerror=alert(1)>';
const answer = 'PRIVATE: the elder brother betrayed us under coercion.';
const fixture = { ...P.empty(), question, answer, mode: 'fast', generatedFor: { question, answer, mode: 'fast', allowBestEffort: false }, status: 'ready', candidates: [{ slots: spread, originalSlots: spread, warning: 'Cannot identify which brother.', originalExplanation: null, explanation: null, explanationForSlots: null }] };
const legacy = { mode: 'reading', selected: 13, refOrientation: 'u', activeSlot: 0, slots: [{ card: 14, o: 'u' }, { card: 6, o: 'r' }, { card: 4, o: 'u' }], question: 'My existing reading' };
const key = 'vesperTarocchi_v1', draftKey = 'vesperTarocchi_dm_v1';
let browser, passed = 0;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  for (const [kind, url] of [['file', source.href], ['http', `http://127.0.0.1:${server.address().port}/ashen-veil-tarocchi/`]]) {
    for (const width of [1440, 938, 680]) {
      const context = await browser.newContext({ viewport: { width, height: 1060 }, acceptDownloads: true });
      await context.addInitScript(({ key, legacy }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(legacy)); }, { key, legacy });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const errors = [], calls = [];
      let pending;
      const hold = (path, fail = false) => {
        let release;
        const wait = new Promise(resolve => { release = resolve; });
        pending = { path, wait, fail };
        return release;
      };
      page.on('pageerror', error => errors.push(error.message));
      await page.route(`${api}/**`, async route => {
        const path = new URL(route.request().url()).pathname;
        const body = route.request().postDataJSON(); calls.push({ path, body });
        const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
        if (path === pending?.path) {
          const held = pending; pending = null;
          await held.wait;
          if (held.fail) return route.fulfill({ headers, status: 503, json: { error: 'Test service unavailable. No automatic retry was made.' } });
        }
        if (path === '/auth') return body.code === 'wrong-code'
          ? route.fulfill({ headers, status: 401, json: { error: 'Incorrect access code.' } })
          : route.fulfill({ headers, json: { token: 'test-session', expires: Date.now() + 600000 } });
        if (path === '/usage') return route.fulfill({ headers, json: { month: '2026-10', estimatedUSD: 0.02, requests: 2, unpriced: 0 } });
        if (path === '/explain') return route.fulfill({ headers, json: { explanation: { conveyed: '<img src=x onerror=alert(1)> betrayal', omissions: 'Identity', misleading: '', metaphor: '' }, warning: '' } });
        if (path === '/generate') {
          const candidates = body.mode === 'fast' ? [{ slots: spread, warning: '' }] : [spread, [{ card: 4, o: 'u' }, { card: 6, o: 'r' }, { card: 14, o: 'u' }], [{ card: 13, o: 'u' }, { card: 15, o: 'r' }, { card: 21, o: 'u' }]].map(slots => ({ slots, warning: '', explanation: { conveyed: 'A supported message.', omissions: 'Identity.', misleading: '', metaphor: '' } }));
          return route.fulfill({ headers, json: { status: 'ready', warning: '', candidates } });
        }
        throw new Error(`Unexpected API path ${path}`);
      });
      const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      const draft = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), draftKey);
      const importFile = async value => page.locator('#dmFile').setInputFiles({ name: 'private-preparation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
      try {
        await page.goto(url);
        const original = await saved(); assert.deepEqual(original, legacy);
        // Shared previews isolate every old persistence path, even after reload.
        await page.goto(`${url}#reading=${P.encodeReading(question, spread)}`);
        assert.equal(await page.locator('#question').inputValue(), question);
        assert.deepEqual(await saved(), original);
        await page.locator('[data-slot="1"] [data-detail]').click();
        assert.ok((await page.locator('#refTitle').textContent()).includes('The Moon'));
        await page.locator('#refU').click(); assert.deepEqual(await saved(), original);
        await page.locator('#backToReading').click();
        await page.locator('#question').fill('Temporary edit');
        await page.locator('#pick0').selectOption('3');
        await page.locator('#drawBtn').click(); await page.locator('#clearBtn').click();
        assert.deepEqual(await saved(), original);
        await page.reload(); assert.equal(await page.locator('#question').inputValue(), question);
        assert.deepEqual(await saved(), original);
        await page.locator('#sharedReturn').click(); assert.deepEqual(await saved(), original);
        assert.equal(await page.locator('#question').inputValue(), original.question);
        await page.goto(`${url}#reading=${P.encodeReading(question, spread)}`);
        await page.locator('#sharedSave').click(); assert.deepEqual((await saved()).slots, spread);
        assert.equal((await saved()).question, question); assert.equal(new URL(page.url()).hash, '');
        const afterSave = await saved(); await page.goto(`${url}#reading=broken`);
        assert.deepEqual(await saved(), afterSave); assert.equal(await page.locator('#sharedReading').isVisible(), false);
        await page.goto(url);
        await page.locator('#dmTab').click();
        assert.equal(await page.locator('#dmWorkspace').isVisible(), false);
        assert.equal(await page.locator('#dmSave').isVisible(), false);
        assert.equal(await page.locator('#dmQuestion').isVisible(), false);
        assert.equal(await page.locator('#dmResults').textContent(), '');
        assert.equal(calls.length, 0);
        await page.screenshot({ path: fileURLToPath(new URL(`dm-locked-${kind}-${width}.png`, output)), fullPage: true });
        if (kind === 'http') {
          await page.locator('#dmCode').fill('wrong-code'); await page.locator('#dmUnlock').click();
          await page.waitForFunction(() => document.getElementById('dmMessage').textContent.includes('Incorrect'));
          assert.equal(await page.locator('#dmWorkspace').isVisible(), false);
          await page.locator('#dmCode').fill('test-private-code'); await page.locator('#dmUnlock').click();
          await page.waitForFunction(() => !document.getElementById('dmWorkspace').hidden);
        } else {
          // Simulate remembered authorization for offline file editing only.
          await page.evaluate(() => localStorage.setItem('vesperTarocchi_access_v1', JSON.stringify({ token: 'offline-test-session', expires: Date.now() + 600000 })));
          await page.reload(); await page.locator('#dmTab').click();
        }
        assert.equal(await page.locator('label').filter({ has: page.locator('#dmQuestion') }).textContent(), 'Vesper’s question to His Eminence');
        await importFile(fixture); await page.waitForFunction(() => document.getElementById('dmQuestion').value.includes('Whom'));
        assert.equal(await page.locator('#dmAnswer').inputValue(), answer);
        assert.equal(await page.locator('.dm-rank').count(), 1);
        assert.equal(await page.locator('.dm-explanation').count(), 0);
        await page.locator('[data-edit-card="0"]').selectOption('18');
        assert.deepEqual((await draft()).candidates[0].originalSlots, spread);
        assert.deepEqual((await draft()).candidates[0].slots.map(s => s.card), [18, 7, 16]);
        assert.ok((await page.locator('#dmResults').textContent()).includes('Manually edited'));
        await page.locator('#dmShare').click();
        const link = await page.locator('#dmLink').inputValue(), payload = P.decodeReading(new URL(link).hash.slice(9));
        assert.equal(payload.question, question); assert.deepEqual(payload.slots, (await draft()).candidates[0].slots);
        assert.ok(!JSON.stringify(payload).includes(answer));
        const downloadPromise = page.waitForEvent('download'); await page.locator('#dmSave').click();
        const download = await downloadPromise, privateFile = JSON.parse(await readFile(await download.path(), 'utf8'));
        assert.deepEqual(privateFile, await draft()); assert.equal(privateFile.answer, answer);
        const previous = await draft(); await importFile({ version: 99 });
        await page.waitForFunction(() => document.getElementById('dmMessage').textContent.includes('Could not load'));
        assert.deepEqual(await draft(), previous);
        await page.reload(); await page.locator('#dmTab').click(); assert.deepEqual(await draft(), previous);
        await page.locator('#dmQuestion').fill('Changed question');
        assert.equal(await page.locator('#dmShare').isDisabled(), true);
        await page.locator('#dmQuestion').fill(question);
        assert.deepEqual((await saved()).slots, spread);
        if (kind === 'http') {
          await page.clock.install();
          const releaseGeneration = hold('/generate');
          await page.locator('#dmGenerate').click();
          assert.equal(await page.locator('#dmGenerate').getAttribute('aria-busy'), 'true');
          assert.equal(await page.locator('#dmGenerate').isDisabled(), true);
          assert.ok((await page.locator('#dmGenerateStatus').textContent()).includes('Selecting your spread'));
          await page.clock.fastForward(11000);
          assert.ok((await page.locator('#dmGenerateStatus').textContent()).includes('Still waiting'));
          await page.screenshot({ path: fileURLToPath(new URL(`dm-generating-${width}.png`, output)), fullPage: true });
          releaseGeneration();
          await page.waitForFunction(() => document.getElementById('dmGenerateStatus').textContent.startsWith('Spread ready'));
          await page.waitForFunction(() => !document.getElementById('dmGenerate').disabled);
          assert.equal(await page.locator('#dmGenerate').getAttribute('aria-busy'), 'false');
          assert.equal(await page.locator('.dm-rank').count(), 1); assert.equal(await page.locator('.dm-explanation').count(), 0);
          assert.equal(calls.filter(c => c.path === '/generate').length, 1); assert.equal(calls.filter(c => c.path === '/explain').length, 0);
          await page.locator('[data-edit-o="0"]').selectOption('r');
          const exact = (await draft()).candidates[0].slots;
          const releaseExplanation = hold('/explain');
          await page.locator('#dmExplain').click();
          assert.equal(await page.locator('#dmExplain').getAttribute('aria-busy'), 'true');
          assert.equal(await page.locator('#dmExplain').isDisabled(), true);
          assert.ok((await page.locator('#dmExplainStatus').textContent()).includes('Preparing the explanation'));
          await page.clock.fastForward(11000);
          assert.ok((await page.locator('#dmExplainStatus').textContent()).includes('Still waiting'));
          const statusBox = await page.locator('#dmExplainStatus').boundingBox();
          assert.ok(statusBox.y >= 0 && statusBox.y + statusBox.height <= 1060, 'explanation feedback stays beside the clicked button in view');
          await page.screenshot({ path: fileURLToPath(new URL(`dm-explaining-${width}.png`, output)), fullPage: true });
          releaseExplanation();
          await page.waitForFunction(() => document.querySelector('.dm-explanation'));
          assert.equal(await page.locator('#dmExplainStatus').textContent(), 'Explanation ready.');
          assert.equal(await page.locator('#dmExplain').getAttribute('aria-busy'), 'false');
          assert.deepEqual(calls.find(c => c.path === '/explain').body.slots, exact);
          assert.equal(await page.locator('#dmResults img').count(), 0);
          assert.ok((await page.locator('.dm-explanation').textContent()).includes('<img'));
          const releaseFailure = hold('/explain', true);
          await page.locator('#dmExplain').click(); releaseFailure();
          await page.waitForFunction(() => document.getElementById('dmExplainStatus').textContent.startsWith('Failed:'));
          assert.equal(await page.locator('#dmExplain').isEnabled(), true);
          assert.deepEqual((await draft()).candidates[0].slots, exact);
          assert.equal(calls.filter(c => c.path === '/explain').length, 2);
          await page.locator('#dmMode').selectOption('preparation'); await page.locator('#dmGenerate').click();
          await page.waitForFunction(() => document.querySelectorAll('.dm-rank').length === 3);
          assert.equal(await page.locator('.dm-explanation').count(), 1);
          await page.locator('[data-candidate="2"]').click(); assert.equal((await draft()).selected, 2);
          const beforeFailure = await draft(), releaseGenerationFailure = hold('/generate', true);
          await page.locator('#dmGenerate').click(); releaseGenerationFailure();
          await page.waitForFunction(() => document.getElementById('dmGenerateStatus').textContent.startsWith('Failed:'));
          assert.equal(await page.locator('#dmGenerate').isEnabled(), true);
          assert.deepEqual(await draft(), beforeFailure);
          assert.equal(calls.filter(c => c.path === '/generate').length, 3);
          await page.screenshot({ path: fileURLToPath(new URL(`dm-ready-${width}.png`, output)), fullPage: true });
          await page.reload(); await page.locator('#dmTab').click();
          assert.equal(await page.locator('#dmUnlockForm').isVisible(), false);
          await page.clock.fastForward(600000);
          await page.waitForFunction(() => document.getElementById('dmWorkspace').hidden);
          assert.equal(await page.evaluate(() => localStorage.getItem('vesperTarocchi_access_v1')), null);
          assert.equal(await page.locator('#dmUsage').isVisible(), false);
          assert.deepEqual(await draft(), beforeFailure);
          assert.equal(await page.locator('#dmWorkspace').isVisible(), false);
          assert.equal(await page.locator('#dmResults').textContent(), '');
          await page.reload(); await page.locator('#dmTab').click();
          assert.equal(await page.locator('#dmWorkspace').isVisible(), false);
        } else {
          assert.equal(calls.length, 0);
          await page.locator('#dmLock').click();
          assert.equal(await page.locator('#dmWorkspace').isVisible(), false);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual(errors, []);
        await page.screenshot({ path: fileURLToPath(new URL(`dm-${kind}-${width}.png`, output)), fullPage: true });
        console.log(`PASS preparation ${kind}-${width}: temporary sharing, explicit save, private files, edits, persistence${kind === 'http' ? ', mocked generation/explain/access' : ''}`); passed++;
      } catch (error) {
        await page.screenshot({ path: fileURLToPath(new URL(`dm-failure-${kind}-${width}.png`, output)), fullPage: true }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
  }
  console.log(`${passed} preparation browser scenarios passed. Paid generation and latency are not tested by mocks.`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
