# DM Preparation — local implementation verification

Date: 2026-10-21. This report covers local implementation, not a public release.

## Recorded requirements and source preservation

- Approved brief: `docs/DM_PREPARATION_REQUIREMENTS.md`, committed as `3dd8e31`
  before the implementation commit.
- Initial checkout was clean; `index.html` matched the original baseline SHA-256
  before edits: `e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6`.
- Approved feature changes HTML. The exact original embedded card-data bytes
  remain unchanged, SHA-256:
  `20e542aec45e3d66a6df8850eecce94370586284fe969c8a710c80c658e3a851`.
- All 22 ordered cards and all six positional meanings, keywords and contemplation
  questions are covered by that check. The original styling/renderer remain in
  place, with a third navigation tab and new feature-specific UI.
- The `vesperTarocchi_v1` schema remains unchanged; separate DM draft and remembered
  access keys do not extend or replace it. Ordinary offline use needs no backend.
- New frontend source is embedded inline for offline operation; no framework,
  remote assets, runtime dependencies, or license were introduced.

## Passing checks

Using project-local Node 24.22.0 for the full development suite:

- `npm test`: **28 checks passed** — 9 original behavior/data checks and 19 new
  core/backend tests.
- Backend tests use **actual in-memory SQLite and the real migration SQL** with
  mocked provider responses. Coverage includes missing/wrong/expired/tampered/
  rotated authorization, origins and preflight, unlock throttling, request
  deduplication/burst limits, malformed/oversized input, configuration failures,
  compact Fast requests, exact-spread explanations, clarification, invalid model
  output, provider failures without retries, token/tier/cache-write accounting,
  and excluding campaign text from stored usage rows.
- `npm run test:browser`: **12 scenarios passed**, comprising the 6 existing
  regression scenarios and 6 new preparation scenarios. Each suite covers direct
  file and HTTP repository-subpath use at **1440, 938, and 680 pixels**.
- Existing browser tests still cover reference/search, orientation emphasis,
  keyboard events, duplicate swaps, unique random draws, question sizing,
  full-card navigation, persistence, both half-window 2 × 2 grids, no horizontal
  overflow, and no unexpected subresources/errors.
- New browser scenarios cover versioned player links with Unicode/HTML-like text,
  temporary isolation through editing, random drawing, clearing, full-card
  navigation and reload, explicit saving and returning to the prior reading,
  malformed links, JSON download/import/recovery, original suggestions after
  edits, local draft persistence and stale-input detection.
- Mocked HTTP generation additionally covers shared-code unlock/remember/lock,
  monthly usage display, one-result Fast output without automatic explanations,
  a separate explanation request carrying the exact manually edited cards,
  three-result Preparation mode, selection, and escaped explanation output.
- `npm run worker:check`: **passed**, Wrangler 4.151.3. Dry-run bundle is about
  39.60 KiB (13.22 KiB gzip); no deployment or paid API call occurs in this check.
- `git diff --check`: passed.

Screenshots are in ignored `test-results/`. The 938-pixel reading capture was
visually compared with the supplied vineyard baseline; the grid and summary
placement remain intact. New DM captures were inspected at all three widths.
The previously documented system-font difference from supplied screenshots
persists; no font substitutions or baseline screenshot edits were made.

## Pending external setup and live evidence

- Cloudflare authentication and database setup were initially pending; see the
  verified 2026-10-22 checkpoint below.
- No OpenAI API credentials were found in the session environment. The owner
  indicated that both Cloudflare and OpenAI API account setup may be needed.
- The D1 resource ID is configured following the checkpoint below; frontend
  `API_URL` remains empty. OpenAI billing and Worker secrets are still required.
- No real model call has been made. Actual model access, semantic faithfulness,
  ten-second performance target, and production Worker CPU usage are unverified.
- No Worker or new Pages release has been published. The existing public site is
  the prior release; the new reading-link format requires publication of this
  implementation before links work there.
- Real generation, accounting, credential rotation and cross-browser player
  links must be checked after setup and again on the public release. Continue
  with `docs/DM_PREPARATION_SETUP.md`; do not treat mocked tests as that evidence.

## Cloudflare setup checkpoint — 2026-10-22

- Owner completed browser OAuth authorization. `wrangler whoami` confirmed the
  sole available Cloudflare account, ID `3d2cf90a75b27598dee32eb60547069d`.
- Login credentials are encrypted on disk, with the encryption key held in
  Windows Credential Manager. Authorized scopes are account/user read,
  Workers/script write, D1 write, and Wrangler's automatic offline refresh scope.
  Unrelated service scopes were deliberately omitted.
- D1 database `ashen-veil-tarocchi-usage` was created in APAC, ID
  `ba28d4f4-c21f-4749-9b5c-b18906e53366`; account and database IDs are now pinned
  in `worker/wrangler.jsonc`.
- Remote migration `0001_usage.sql` succeeded. A read-only remote query verified
  both `usage` and `auth_limits` exist and each contains zero rows.
- No paid AI request, Worker deployment, or Pages publication occurred during
  this checkpoint. Next dependency is owner OpenAI API platform/billing setup.
