# DM Preparation — implementation and owner setup

The agreed product requirements are in [DM_PREPARATION_REQUIREMENTS.md](DM_PREPARATION_REQUIREMENTS.md).
Local test results and pending live checks are recorded in
[DM_PREPARATION_VERIFICATION.md](DM_PREPARATION_VERIFICATION.md).

## Current implementation

The local application includes the DM Preparation tab, separate local draft,
versioned private JSON files, original-versus-edited spreads, and self-contained
player links. The Worker implements shared-code authentication, seven-day signed
access tokens, revocation on code rotation, origin checks, structured generation,
separate explanations of exact chosen spreads, and D1 usage accounting.

The Worker is deployed and configured, and the local frontend now points to its
public URL. Frontend publication and the first real authenticated generation
test are the next steps. Loading/importing a file, editing, sharing, and ordinary
tarot use do not need the backend. No campaign text or API credential belongs in
Git or D1.

## Development

Use Node 24 or later for development; the ordinary HTML app requires no Node
installation. Wrangler and Playwright are development-only dependencies. An older
system Node can continue to open/serve the HTML, but is insufficient for the full
development toolchain. CI already uses Node 24.

```sh
npm ci --ignore-scripts
npm run sync
npm test
npx playwright install chromium
npm run test:browser
npm run worker:check
```

`src/preparation-core.js` contains validation/codecs shared with the Worker.
`src/preparation-ui.js` contains the new browser UI. `npm run sync` embeds both
into authoritative `index.html` and copies its unchanged card data into
`worker/cards.json`. The existing application is not extracted or rewritten.
Tests assert synchronization and the baseline card-data hash. The initial
whole-HTML hash check intentionally becomes a card-data check for this approved
feature; the original publication evidence remains in `VERIFICATION.md`.

`tests/worker.test.mjs` uses actual in-memory SQLite with the D1 SQL migration and
mocked provider responses. Browser preparation tests use mocked API responses;
they do not establish real AI fidelity, account/model availability, or latency.

## Owner setup (not required for the DM)

Use the owner's existing accounts; do not create a temporary preview account.
Do not paste API keys or shared codes into chat, source files, or shell history.

1. Create/sign in to Cloudflare and enable an OpenAI API project with billing.
   A dedicated project/key makes app costs easier to attribute. Configure the
   desired provider-side spend limit in the OpenAI dashboard.
2. Run `npm run worker:login`, completing the browser authorization. This requests
   account/user read access, Worker/script write access and D1 write access, with
   credentials encrypted using the OS credential manager. Then inspect
   `npx wrangler whoami`. Wrangler may warn about other missing scopes: those are
   deliberately omitted; do not expand access unless a necessary command fails.
   If multiple Cloudflare accounts are available, explicitly
   choose the owner's intended account before creating resources.
3. The owner's usage database was created and migrated on 2026-10-22. The
   checked-in configuration references that existing database; do not create it
   again. For a separate installation in another account, create a usage database:

   ```sh
   npx wrangler d1 create ashen-veil-tarocchi-usage --config worker/wrangler.jsonc
   ```

   In that separate installation, update the account/database IDs in
   `worker/wrangler.jsonc`. Those IDs are public configuration, not credentials.
4. Apply the schema:

   ```sh
   npx wrangler d1 migrations apply DB --remote --config worker/wrangler.jsonc
   ```

5. The owner's Worker is now deployed at
   `https://ashen-veil-tarocchi-api.ashen-veil-tarocchi.workers.dev` in a locked
   state until configured. All three required secrets were confirmed present on
   2026-10-22. `SESSION_SECRET` was generated and securely uploaded; the owner
   entered `OPENAI_API_KEY` and `SHARED_ACCESS_CODE` directly in the dashboard.
   Do not recreate existing secrets as part of ordinary setup.

   For dashboard entry, select the Worker, then **Settings → Variables and
   Secrets → Add**, select type **Secret**, enter the exact binding name and
   value, and deploy the change. Do not select plaintext Text for credentials.
   Alternatively, enter each secret into Wrangler's interactive prompt:

   ```sh
   npx wrangler secret put OPENAI_API_KEY --config worker/wrangler.jsonc
   npx wrangler secret put SHARED_ACCESS_CODE --config worker/wrangler.jsonc
   npx wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
   ```

   Choose any nonempty access codeword (up to 256 characters), as requested by the
   owner. No password manager or minimum length is required for this shared code.
   Use a separate randomly generated session secret of at least 32 characters.
   The DM only receives the
   shared access code. Changing it invalidates every previously issued token.
6. For a new installation or code update, run `npm run worker:deploy`. Record its actual HTTPS URL. Verify origin
   rejection, unlock, authenticated usage, and generation before connecting it.
7. Set that verified URL in `src/preparation-ui.js` (`API_URL`), run `npm run sync`,
   then run the full checks. Publish through the existing Pages workflow only
   after checking that the artifact still contains only `index.html`.
8. Open the published site and verify real unlock/generation/explanation, a
   player-safe reading link in a separate browser context, and private JSON
   restoration. Record the deployed commit, URLs, results, and timing evidence.

Optional CLI privacy setting: `WRANGLER_SEND_METRICS=false`. Application Worker
observability is disabled; never add logs containing campaign text or secrets.
For local Worker development, use an ignored `worker/.dev.vars` file and local D1;
allow a localhost origin explicitly in private development configuration. Do not
allow `Origin: null` in production merely to enable paid generation from file URLs.

## Cost and request behavior

Initial, **unbenchmarked** configuration: `gpt-6.1-sol`, medium reasoning for both
modes, Standard processing for Preparation and Fast processing for Fast mode.
Only the owner can change models/effort/tier in Worker configuration. Supported
price entries are explicit in `worker/index.mjs`; update and test them when
changing pricing/model configuration. No model fallback or retry is automatic.

The UTC calendar-month estimate uses input, cached input, cache writes (including
30-minute/12-hour rates), output, and returned processing tier. Reasoning is part
of output tokens and is not charged twice. Unsupported/inconsistent accounting
is reported as unpriced. A pending record is reserved before each paid call;
duplicate IDs and more than ten submissions per minute are rejected. This abuse
control is not a substitute for provider spending controls. D1 also holds
short-lived salted network identifiers for unlock-attempt limiting; it stores no
raw IP addresses or access codes. Expired buckets are removed on subsequent
unlock attempts.

The client shows a continuing status after ten seconds. The backend allows up to
120 seconds for a provider request before reporting failure; it never silently
retries. A network interruption can leave a pending/unpriced record even when
OpenAI performed work, so the display is an estimate, not an invoice. A single
logical request ID prevents duplicate concurrent provider calls through this
service; it does not guarantee exactly-once billing across unrelated requests.

OpenAI requests use `store:false`. This disables response storage for application
retrieval; it is not a claim of zero provider-side retention. Campaign input must
still be sent to OpenAI for generation. Share links contain only whitelisted
player fields and are readable by anyone who has the link.

## Live evaluation still required

Measure complete-result latency (including authentication check and accounting),
not merely first token. Check the actual Worker CPU allowance on the free plan.
The free plan has a small CPU allowance; waiting for AI/network responses is a
separate wall-clock measurement. A local build cannot prove production limits.

Use several fictional questions representing:

- A directly representable theme (a false authority must fall).
- A coercion/betrayal answer whose precise person's identity cannot be encoded.
- Missing context that warrants one useful clarification.
- An answer that contradicts likely cheatsheet implications.
- A precise location/date that needs explicit omission warnings.
- The same cases with best-effort enabled and after manual edits.

Compare Preparation and Fast outputs against the existing positional meanings.
Record limitations, misleading readings, number of candidates, token cost and
full-result latency. Require a real usability/fidelity review before adopting
lower reasoning or a smaller model. Ten seconds is the initial target; no timing
claim is established by the mock suite.

## Sources checked during implementation (2026-10-21)

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI prompt caching and accounting](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Sol model settings and pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/)
