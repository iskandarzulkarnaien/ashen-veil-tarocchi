# DM Preparation — agreed requirements

Date: 2026-10-21. Status: approved for implementation.

This brief records the requirements agreed with the owner. It extends the initial
deployment brief in `CODEX_HANDOFF.md`; its original preservation requirements
continue to apply. OpenAI API calls and a small Cloudflare backend are explicitly
authorized for this feature. No framework, redesign, or tarot-data revision is
authorized.

## Purpose and information boundary

The DM supplies Vesper's question to her god and the DM's true answer. The system
recommends a three-card Threefold Eminence spread expressing that answer through
the existing cheatsheet. Vesper interprets the cards herself. Her link must never
contain the true answer, DM explanations, access credentials, or private draft.

Retain the existing 22 Major Arcana, all six meanings per card, and fixed positions:
Light (what is revealed), Shadow (what is hidden), Dusk (what must end). Cards within
a spread must be distinct. Orientations remain upright or reversed.

## Generation and faithfulness

- Preparation mode returns three ranked spreads and short explanations, ranked
  primarily by faithfulness to the answer and existing positional meanings.
- Prefer direct support from the cheatsheet. Use metaphorical extensions only
  when necessary and identify them explicitly.
- Explain what each spread conveys, what specificity is lost, and how it could
  mislead. An explanation cannot make an unsupported card meaning faithful.
- Intentional ambiguity and detail loss are part of play. Give the DM informed
  choices; do not invent names, locations, or precise identifiers in the cards.
- Distinguish missing context from an intrinsic limitation of the deck. Ask a
  focused clarification where useful; otherwise disclose the limitation. An
  explicit best-effort fallback may provide imperfect candidates with warnings.
- Use two editable input fields and regeneration rather than a conversational
  chat interface. Regeneration replaces the previous generation.

## Fast mode

- Return one recommended spread, without generated explanations or alternatives.
- Keep a brief warning only for material limitations or inability to represent
  the answer faithfully. The faithfulness standard is unchanged.
- Return compact card identifiers and orientations; render existing names and
  cheatsheet meanings locally rather than asking the model to repeat them.
- Offer an optional separate paid "Explain this spread" request for the exact
  selected cards, including manual edits; it must not replace the spread.
- Target a complete usable result in ten seconds or less. This is a benchmark
  target, not a guaranteed deadline or automatic cancellation threshold.
- Beyond ten seconds, show a waiting message and continue. Do not silently start
  another paid request or change models.
- Determine model, reasoning effort, and processing tier through representative
  faithfulness and latency tests. Start by shortening output while preserving
  selection quality; evaluate other speed controls if needed.

## DM interface, edits, and persistence

- Add a DM Preparation tab in the existing application, preserving its style.
- Allow manual edits and mark edited items; retain the original suggestion for
  comparison. Do not automatically pay for reevaluation after an edit.
- Auto-save the current preparation locally, separately from `vesperTarocchi_v1`.
- Save/load a versioned private JSON file containing current inputs, suggestions,
  explanations/warnings, selected spread, original suggestions, and manual edits.
- Do not retain earlier generations. Loading a file must not call the API.
- Preserve the existing `vesperTarocchi_v1` state schema and offline reference,
  manual reading, random drawing, keyboard, and responsive behavior.

## Vesper's self-contained reading link

- Copy a link containing only Vesper's question, selected cards in position order,
  orientations, and a format version. The link fully reproduces the reading.
- No database lookup, login, or AI request is required to open it.
- Encode the payload in the URL fragment. Encoding is not encryption: exclude
  secrets rather than encoding them. Validate input and supported versions.
- Display it in the existing reading interface, temporarily, without replacing
  the recipient's saved reading. Provide an explicit save option and a return to
  the previous reading. Shared-state persistence must remain opt-in even when
  using other controls or full-card navigation.
- Keep the private JSON export distinct from this player-safe link.

## Hosting, authentication, and costs

- Keep the frontend on the existing GitHub Pages site; use a Cloudflare Worker
  for OpenAI requests and Cloudflare D1 for a small usage ledger.
- The owner owns the Cloudflare/OpenAI accounts and pays API usage. The DM needs
  no account, installation, hosting, or API credentials.
- Protect generation and usage information with a shared private access code.
  The owner may choose a simple codeword; no password-manager or minimum-length
  requirement applies. Reject empty values and retain attempt limiting.
  Remember access where possible, offer Lock, expire authorization, and make
  access-code rotation invalidate old authorization.
- Keep OpenAI keys and access credentials in Worker secrets, never public source,
  frontend assets, shared links, JSON exports, or logs. GitHub Secrets may support
  deployment, but cannot make a key embedded in static files private.
- Store usage metadata (timestamp, model/tier, token counts, estimated cost), not
  questions, true answers, spreads, or explanations, in D1. No cloud draft saving
  is part of this version.
- Show estimated current-month app-only API spend across devices. Clearly label
  it as an estimate, account for reasoning/cache tokens and processing tiers,
  and do not present it as an authoritative OpenAI invoice.
- Provider-side spending controls belong to the owner's OpenAI project/account.
  Expected volume is three to four readings monthly with refinement requests.
- Aim to remain within Cloudflare's free hosting/database allowances. Configure
  and test authentication/rate controls without adding DM account setup.

## Acceptance and delivery

1. Preserve all baseline card data byte-for-byte and old state compatibility.
2. Regression-test existing file/HTTP behavior and layouts at 1440, 938, and 680
   pixels, including both half-window 2 × 2 layouts.
3. Test private JSON round trips, malformed imports, original-versus-edited state,
   link privacy/validation, and temporary reading isolation from saved state.
4. Test backend authentication, expiry/rotation, origin controls, model-output
   validation, failure handling, and usage accounting with deterministic mocks.
5. Live-test paid generation only with authorized owner credentials. Record
   fidelity and full-result latency; do not claim the ten-second target from
   mocked tests or time-to-first-token measurements.
6. Publish only public assets. Keep secrets, backend source/configuration,
   private files, docs, and tests outside the Pages artifact.
7. Verify any deployed Worker and Pages application before reporting publication.
   Report test results and any pending account/authentication/configuration work.

## Implementation sequence

1. Record this brief before source edits (this document).
2. Implement local preparation state, JSON import/export, and player-safe links.
3. Implement Worker generation/authentication and D1 accounting; connect the UI.
4. Complete automated and visual regression checks.
5. Configure owner accounts/secrets through secure authentication, benchmark real
   generation, then publish and verify when the required credentials are ready.
