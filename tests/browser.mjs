import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const source = new URL('../index.html', import.meta.url);
const html = await readFile(source, 'utf8');
const cards = JSON.parse(html.match(/const CARDS=(\[[\s\S]*?\]);\s*const POSITIONS/)[1]);
const output = new URL('../test-results/', import.meta.url);
await mkdir(output, { recursive: true });
const positions = ['light', 'shadow', 'dusk'];
const key = 'vesperTarocchi_v1';
const external = process.env.BASE_URL;
let server;
if (!external) {
  server = createServer((req, res) => {
    if (req.url === '/ashen-veil-tarocchi/' || req.url === '/ashen-veil-tarocchi/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else { res.writeHead(404); res.end(); }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
}

const targets = external ? [['live', external]] : [
  ['file', source.href],
  ['http', `http://127.0.0.1:${server.address().port}/ashen-veil-tarocchi/`],
];
let browser;
let passed = 0;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  for (const [origin, url] of targets) {
    for (const width of [1440, 938, 680]) {
      const context = await browser.newContext({ viewport: { width, height: 1060 } });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      const resources = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('requestfailed', req => errors.push(`${req.url()}: ${req.failure()?.errorText}`));
      page.on('response', res => { if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`); });
      await context.route('**/*', route => {
        const req = route.request();
        if (req.isNavigationRequest() && req.resourceType() === 'document') return route.continue();
        resources.push(req.url());
        return route.abort();
      });
      const tag = `${origin}-${width}`;
      const shot = async name => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => getComputedStyle(document.getElementById('toast')).opacity === '0');
        await page.screenshot({ path: fileURLToPath(new URL(`${tag}-${name}.png`, output)), fullPage: true });
      };
      const text = selector => page.locator(selector).textContent();
      const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
      const blur = () => page.locator('#readingView h2').click();
      const bounds = async selector => page.locator(selector).boundingBox();
      const near = (a, b) => assert.ok(Math.abs(a - b) < 2, `${a} should align with ${b}`);
      async function noOverflow() {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: horizontal overflow`);
      }
      async function readingLayout() {
        const [l, s, d, summary] = await Promise.all([
          bounds('.spread-slot.light'), bounds('.spread-slot.shadow'),
          bounds('.spread-slot.dusk'), bounds('.summary-card'),
        ]);
        if (width > 1060) {
          near(l.y, s.y); near(s.y, d.y);
          assert.ok(summary.y > d.y); near(summary.x, l.x);
          near(summary.width, d.x + d.width - l.x);
        } else if (width > 720) {
          near(l.y, s.y); near(l.x, d.x); near(s.x, summary.x);
          near(d.y, summary.y); near(d.height, summary.height);
          assert.ok(d.y > l.y);
        } else {
          near(l.x, s.x); near(s.x, d.x); near(d.x, summary.x);
          assert.ok(l.y < s.y && s.y < d.y && d.y < summary.y);
        }
        await noOverflow();
      }
      async function reference(card, o) {
        assert.ok((await text('#refTitle')).includes(cards[card].name));
        assert.equal(await text('#refCore'), cards[card].core);
        assert.equal(await text('#refAsk'), cards[card].ask);
        assert.equal(await text('#traits .trait:nth-child(1) p'), cards[card].u);
        assert.equal(await text('#traits .trait:nth-child(2) p'), cards[card].r);
        for (const pos of positions) {
          const meanings = page.locator(`.position.${pos} .position-meaning`);
          assert.equal(await meanings.nth(0).locator('p').textContent(), cards[card][pos].u);
          assert.equal(await meanings.nth(1).locator('p').textContent(), cards[card][pos].r);
          assert.ok(!(await meanings.nth(o === 'u' ? 0 : 1).getAttribute('class')).includes('secondary'));
          assert.ok((await meanings.nth(o === 'u' ? 1 : 0).getAttribute('class')).includes('secondary'));
        }
      }
      async function setSpread(ids, orientations, question) {
        await page.locator('#readingTab').click();
        await page.locator('#clearBtn').click();
        for (let i = 0; i < 3; i++) {
          await page.locator(`#pick${i}`).selectOption(String(ids[i]));
          await page.locator(`[data-slot="${i}"] [data-o="${orientations[i]}"]`).click();
        }
        await page.locator('#question').fill(question);
        await blur();
        for (let i = 0; i < 3; i++) {
          const meaning = cards[ids[i]][positions[i]][orientations[i]];
          assert.equal(await text(`[data-slot="${i}"] .result-box p`), meaning);
          assert.equal(await text(`[data-slot="${i}"] .slot-contemplation p`), cards[ids[i]].ask);
          assert.equal(await text(`.summary-entry.${positions[i]} .summary-description`), meaning);
          assert.ok((await text(`.summary-entry.${positions[i]} .summary-arcana`)).includes(cards[ids[i]].name));
          assert.ok((await text(`.summary-entry.${positions[i]} .summary-arcana`)).endsWith(orientations[i] === 'r' ? '↓' : '↑'));
        }
        await readingLayout();
      }

      try {
        const response = await page.goto(url);
        if (origin !== 'file') {
          assert.equal(response.status(), 200);
          assert.equal(await response.text(), html, 'Hosted HTML must match the authoritative file');
        }
        assert.equal(await page.title(), "Vesper's Tarocchi · Ashen Veil");
        assert.equal(await page.locator('.arcana-link').count(), 22);
        assert.equal(await page.locator('.spread-slot').count(), 3);
        assert.equal(await page.locator('#pick0 option').count(), 23);

        // Compact question, expanded focus/text, and compact again after clearing.
        assert.equal(await page.locator('#question').evaluate(e => e.style.height), '34px');
        await page.locator('#question').focus();
        assert.equal(await page.locator('.question-card').getAttribute('class'), 'question-card expanded');
        assert.ok(parseInt(await page.locator('#question').evaluate(e => e.style.height)) >= 67);
        await page.locator('#question').fill('A question'); await blur();
        assert.ok((await page.locator('.question-card').getAttribute('class')).includes('expanded'));
        await page.locator('#question').fill(''); await blur();
        assert.equal(await page.locator('#question').evaluate(e => e.style.height), '34px');

        await page.locator('#referenceTab').click();
        await page.locator('#index [data-card="13"]').click();
        await reference(13, 'u');
        const [l, s, d, q] = await Promise.all([
          bounds('.position.light'), bounds('.position.shadow'), bounds('.position.dusk'), bounds('.cue'),
        ]);
        if (width > 1060) { near(l.y, s.y); near(s.y, d.y); assert.ok(q.y > l.y); }
        else if (width > 720) { near(l.y, s.y); near(l.x, d.x); near(s.x, q.x); near(d.y, q.y); near(d.height, q.height); }
        else { near(l.x, s.x); near(s.x, d.x); assert.ok(l.y < s.y && s.y < d.y && d.y < q.y); }
        const spacing = await page.locator('.position.light .position-meaning').first().evaluate(e => {
          const s = getComputedStyle(e); return [s.paddingTop, s.paddingBottom];
        });
        assert.deepEqual(spacing, ['11px', '12px']);
        if (width > 720) assert.ok(await page.locator('.side-foot').isVisible());
        await noOverflow(); await shot('reference-death');
        await page.locator('#index [data-card="18"]').click();
        await page.locator('#refR').click(); await reference(18, 'r');
        assert.ok((await page.locator('#traits .trait').first().getAttribute('class')).includes('secondary'));
        await shot('reference-moon-reversed');

        for (const term of ['justice', 'control', 'xviii', 'hidden illusion is beginning to unravel']) {
          await page.locator('#search').fill(term);
          const expected = cards.filter(c => [c.name,
            ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][c.num],
            c.num, c.core, c.u, c.r, c.ask, ...positions.flatMap(p => [c[p].u, c[p].r])].join(' ').toLowerCase().includes(term));
          assert.equal(await page.locator('.arcana-link').count(), expected.length);
        }
        await page.locator('#search').fill('');
        assert.equal(await page.locator('.arcana-link').count(), 22);
        await page.locator('#search').press('Escape');

        // Use real key events and verify editable fields retain typed shortcuts.
        await page.locator('#refTitle').click();
        await page.keyboard.press('/');
        assert.equal(await page.locator('#search').evaluate(e => e === document.activeElement), true);
        for (const key of ['j','k','u','r','1','2','3','/']) await page.locator('#search').press(key);
        assert.equal(await page.locator('#search').inputValue(), 'jkur123/');
        assert.equal((await saved()).selected, 18);
        await page.locator('#search').fill(''); await page.locator('#search').press('Escape');
        await page.keyboard.press('j'); assert.equal((await saved()).selected, 19);
        await page.keyboard.press('k'); assert.equal((await saved()).selected, 18);
        await page.keyboard.press('u'); assert.equal((await saved()).refOrientation, 'u');
        await page.keyboard.press('r'); assert.equal((await saved()).refOrientation, 'r');

        await setSpread([7,18,16], ['u','u','u'], 'What must I understand about this vineyard before we act?');
        await shot('reading-vineyard');
        await setSpread([14,6,4], ['u','r','u'], 'What should I understand before accepting this blood?');
        // Match the supplied blood-offering image's active Shadow position.
        await page.locator('[data-slot="1"] .slot-position').click();
        await shot('reading-blood-offering');
        const spread = (await saved()).slots;
        await page.locator('[data-slot="1"] .detail-link').click();
        await reference(6, 'r');
        assert.ok(await page.locator('.position.shadow.focused').isVisible());
        await page.locator('#backToReading').click();
        assert.deepEqual((await saved()).slots, spread);
        assert.equal((await saved()).activeSlot, 1);
        const before = await saved(); await page.reload();
        assert.deepEqual(await saved(), before);
        assert.equal(await page.locator('#question').inputValue(), before.question);

        await blur();
        for (const [hotkey, slot] of [['1',0], ['2',1], ['3',2]]) {
          await page.keyboard.press(hotkey); assert.equal((await saved()).activeSlot, slot);
        }
        await page.keyboard.press('r'); assert.equal((await saved()).slots[2].o, 'r');
        await page.keyboard.press('u'); assert.equal((await saved()).slots[2].o, 'u');
        await page.locator('#question').fill('');
        for (const key of ['j','k','u','r','1','2','3','/']) await page.locator('#question').press(key);
        assert.equal(await page.locator('#question').inputValue(), 'jkur123/');
        assert.deepEqual((await saved()).slots, spread);
        await page.locator('#question').press('Escape');
        assert.equal(await page.locator('#question').evaluate(e => e === document.activeElement), false);

        await page.locator('#pick0').selectOption('6');
        assert.deepEqual((await saved()).slots.map(s => s.card), [6,14,4]);
        assert.deepEqual((await saved()).slots.map(s => s.o), ['u','r','u']);
        for (let i = 0; i < 10; i++) {
          await page.locator('#drawBtn').click();
          const drawn = (await saved()).slots;
          assert.equal(new Set(drawn.map(s => s.card)).size, 3);
          assert.ok(drawn.every(s => Number.isInteger(s.card) && s.card >= 0 && s.card < 22 && ['u','r'].includes(s.o)));
        }
        await page.locator('#clearBtn').click(); await blur();
        assert.deepEqual((await saved()).slots, Array.from({ length: 3 }, () => ({ card: null, o: 'u' })));
        assert.equal(await page.locator('#question').inputValue(), '');
        assert.equal(await page.locator('#question').evaluate(e => e.style.height), '34px');
        await noOverflow();
        assert.deepEqual(resources, [], 'The app must not request scripts, assets or APIs');
        assert.deepEqual(errors, [], 'No console errors, failed requests or HTTP failures');
        console.log(`PASS ${tag}: reference, reading, search, shortcuts, persistence, layout, zero subresources/errors`);
        passed++;
      } catch (error) {
        await shot('failure').catch(() => {});
        throw new Error(`${tag}: ${error.message}`, { cause: error });
      } finally { await context.close(); }
    }
  }
  console.log(`${passed} browser scenarios passed. Screenshots: test-results/`);
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
