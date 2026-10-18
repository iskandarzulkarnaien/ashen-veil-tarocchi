# Vesper's Tarocchi

A desktop-oriented Major Arcana reference and Threefold Eminence reading aid for Vesper of the Ashen Veil. The application is a single, self-contained HTML file: no build, runtime dependencies, external assets, accounts, analytics, or backend.

## Use

Open `index.html` directly in a browser for offline use. **Arcana Reference** contains all 22 Major Arcana, Upright/Reversed keywords, six contextual interpretations per card, and contemplation questions. Search includes interpretation text.

**Threefold Reading** assigns distinct cards to Light (what is revealed), Shadow (what is hidden), and Dusk (what must end). Choose cards and orientations manually or use **Draw three**. **Full card ↗** opens the matching reference; **Back to Reading** returns to the spread.

State is stored locally using `vesperTarocchi_v1`. File-origin state does **not** automatically transfer to localhost or GitHub Pages; browser storage belongs to each origin. Clearing browser storage removes that origin's saved reading.

## Local preview

No installation is required to run the application. For an HTTP preview, with Python 3 installed:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/>. Stop the server with Ctrl+C.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus sidebar search |
| `J` / `K` | Next / previous Arcana |
| `U` / `R` | Upright / Reversed for the reference or active reading slot |
| `1` / `2` / `3` | Select a reading position |
| `Esc` | Leave an editable field |

Shortcuts do not intercept typing in search, the question, or card selectors. The sidebar legend remains visible at desktop widths.

## Validation

Node.js 20 or later is required only for development checks. The application itself still needs no installation.

```sh
npm test
npm ci --ignore-scripts
npx playwright install chromium
npm run test:browser
```

`npm test` uses only Node's built-in modules to verify the exact imported HTML hash, JavaScript syntax, all card fields, search, duplicate-card swaps, random draws, saved-state compatibility, clearing, and text escaping. The browser suite uses Playwright as a **development-only** dependency. On Linux CI, install browser system dependencies with `npx playwright install --with-deps chromium`.

Browser checks run against both the direct offline file and a temporary localhost server under `/ashen-veil-tarocchi/`, at 1440, 938, and 680 px. They check reference and reading content, orientations, layouts, question expansion, navigation back from full-card details, real keyboard events, duplicate assignments, persistence, console errors, and unexpected network requests. Screenshots are written to ignored `test-results/` for comparison with the supplied references. System fonts can render differently across browsers and operating systems; these are layout guides, not pixel-exact snapshot assertions.

To verify a deployed site, set `BASE_URL` before running the same suite. It also checks that hosted HTML matches the local authoritative source. For example, in PowerShell:

```powershell
$env:BASE_URL = 'https://iskandarzulkarnaien.github.io/ashen-veil-tarocchi/'
npm run test:browser
Remove-Item Env:BASE_URL
```

Optionally set `BROWSER_CHANNEL=chrome` to check an installed Chrome browser instead of Playwright's bundled Chromium.

## Repository and publication

Public repository: [iskandarzulkarnaien/ashen-veil-tarocchi](https://github.com/iskandarzulkarnaien/ashen-veil-tarocchi).

**Live application:** [Vesper's Tarocchi](https://iskandarzulkarnaien.github.io/ashen-veil-tarocchi/).

Published and verified on 2026-10-18: the Actions deployment succeeded, all three live browser scenarios passed, and the hosted HTML matches the authoritative offline file. Twelve live screenshots are pixel-identical to the offline app in the same Chrome environment. See [the verification report](docs/VERIFICATION.md) for checks, source hash, workflow evidence, and the supplied-baseline font-rendering caveat.

The deployment uses `.github/workflows/pages.yml` on pushes to `main` and manual workflow runs. Validation must pass before deployment. Only `index.html` is staged in `_site/` and uploaded; instructions, tests, screenshots, and Git metadata remain outside the site artifact. **Settings → Pages → Source: GitHub Actions** is configured. The `github-pages` environment permits deployments only from `main`; choose that branch for manual runs. A failed validation leaves the previous successful site in place. To restore an older version, revert the relevant source commit on `main`, run the checks, and push.

## Structure and maintenance

```text
index.html                Authoritative offline application, styling, and data
AGENTS.md                 Standing project instructions
CODEX_HANDOFF.md          Project brief and acceptance checklist
docs/visual-baselines/    Four supplied visual references at about 938 px
tests/                    Data/state validation and browser regression checks
package.json              Development commands and test-only dependency
.github/workflows/        Validate and publish only the static entry point
```

Read `AGENTS.md` and `CODEX_HANDOFF.md` before changing the application. Preserve the original UI, tarot copy, all 22 records and six interpretations per card, and saved-state schema. Check reference and reading layouts at 1440, 938, and 680 px, particularly both half-window 2 × 2 grids. Test both a direct file and an HTTP preview; hosting must also work under a repository subpath.

The imported `index.html` SHA-256 is `e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6`. Git preserves its bytes without line-ending conversion.

## License

No software or content license has been selected. Public repository visibility does not itself grant a license. A licensing decision remains with the owner.
