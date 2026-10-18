# Initial publication verification

Date: 2026-10-18. See the publication section below for the verified deployment result.

## Source and repository

- Public repository: https://github.com/iskandarzulkarnaien/ashen-veil-tarocchi
- Default branch: `main`.
- Imported baseline commit: `d5c67d8`.
- Test commit: `96457dc`.
- Deployment workflow commit: `63a3ac7`.
- `index.html` is unchanged from the supplied file. SHA-256: `e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6`.
- All 22 records, their six contextual meanings, questions, UI markup, CSS, JavaScript, and `vesperTarocchi_v1` schema are preserved by that exact-file check.

## Local checks

- `npm test`: **9 checks passed** (source bytes/syntax, card fields/order, search, duplicate-card swaps, 100 distinct-card draws, persistence/schema, malformed saved-state recovery, clearing, escaping).
- Browser suite: **6 scenarios passed** in installed Chrome: offline `file://` and HTTP repository subpath, each at **1440, 938, and 680 px**. An earlier run also passed all six scenarios in bundled Chromium before screenshot stabilization and additional real typing/hosted-byte assertions were added.
- Both reference and reading layouts were checked programmatically. At 938 px both use 2 × 2 grids; At a glance sits beside Dusk with equal height. Wide layouts use three columns; narrow layouts stack. No document horizontal overflow was detected.
- Death upright and Moon reversed render all six meanings with the selected orientation emphasized and alternatives readable. The desktop shortcut legend remains visible.
- Both specified spreads render the expected positional meanings, contemplation questions, card names/orientations, and summaries: Chariot/Moon/Tower upright; Temperance upright/Lovers reversed/Emperor upright.
- Manual swaps, unique randomized draws, Clear, compact/expanded questions, Full card → focused Shadow reversed → Back to Reading, reload persistence, search, J/K/U/R/1/2/3, `/`, Esc, and typing protection passed.
- No page JavaScript errors, console errors, failed requests, or application asset/API requests occurred in the passing browser scenarios.
- `git diff --check` passed.

## Visual review

The four supplied images were inspected and compared with generated Death, Moon reversed, vineyard, and blood-offering screenshots at 938 px. Wide and narrow screenshots were also inspected. Grid placement, colors, orientation hierarchy, divider padding, and reading summaries are retained.

**Visual caveat:** the current Windows automated browsers render system fonts differently from the supplied images; the sidebar brand wraps to two lines at desktop widths, and some text metrics differ. This also occurs with the unchanged offline file in installed Chrome. No font, layout, or application source changes were made to compensate. The supplied images are visual guides rather than exact pixel assertions. Generated review captures are in ignored `test-results/`; the original references remain untouched.

## Publication

- **Verified public URL:** https://iskandarzulkarnaien.github.io/ashen-veil-tarocchi/
- **Successful first deployment:** https://github.com/iskandarzulkarnaien/ashen-veil-tarocchi/actions/runs/39094281768 (source commit `63a3ac7`). Both `validate` and `deploy` completed successfully. CI passed all 9 validation checks and 6 offline/HTTP browser scenarios using Node 24 and bundled Chromium on Ubuntu.
- GitHub Pages is configured with `build_type: workflow`, HTTPS enforcement, and a `github-pages` environment restricted to `main`.
- CI runners are pinned to Ubuntu 24.04, the tested environment, to avoid the announced `ubuntu-latest` image transition changing browser dependencies immediately after this handoff.
- **3 live browser scenarios passed** in installed Chrome, one at each required width. The full same behavior/content/layout/persistence/keyboard/error/network checks ran against the public repository subpath. Every HTTP document returned status 200 and exactly matched the local HTML.
- **12 live screenshots are pixel-identical** to the corresponding offline Chrome screenshots: all four reference/spread examples at all three widths. This establishes visual parity between the unchanged offline app and the live site in the same browser environment, separately from the supplied-reference font caveat above.
- The downloaded `github-pages` artifact was inspected: its tar contains only the root directory and `./index.html`. Extracted HTML has the original SHA-256. No docs, screenshots, tests, dependencies, instructions, or Git files were published in the site artifact.
- No remaining authentication or deployment action is required from the owner. The earlier permission restrictions were resolved by enabling Ask for approval; GitHub authentication then succeeded without a refresh.

## Files introduced

`.gitignore`, `.gitattributes`, `README.md`, `package.json`, `package-lock.json`, `tests/validate.mjs`, `tests/browser.mjs`, `.github/workflows/pages.yml`, and this report. Existing instructions, screenshots, and application were imported unchanged.

No runtime dependency, framework, account, analytics, external asset, or software/content license was added. Playwright is test-only. The repository's package is marked private to prevent accidental npm publication; the GitHub repository itself is public.

## Maintenance notes

Local-file saved state does not automatically migrate to the hosted origin. A software/content licensing decision remains with the owner.

No functional or deployment blockers remain. The system-font difference from supplied visual guides remains documented above; application and stylesheet bytes were preserved.

Optional next milestone, requiring a separate decision: extract CSS, JavaScript, and card data into maintainable source files while preserving an easy offline distribution and the current UI/behavior. No extraction has been undertaken.
