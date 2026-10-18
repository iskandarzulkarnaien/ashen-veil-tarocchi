# Codex Handoff — Vesper's Tarocchi

**Date:** 2026-10-17  
**Status:** Existing, working single-file prototype; ready for repository setup and GitHub Pages deployment.  
**Primary goal:** Convert the provided offline HTML prototype into a small, maintainable, version-controlled GitHub project and publish it to GitHub Pages **without changing the app's design or functionality**.

> **Codex: start here.** This is an execution brief, not an invitation to redesign the product. Read this document and `AGENTS.md`, inspect `index.html`, and work in the milestones below. The provided `index.html` is the source of truth for today's behavior and copy.

## 1. Project overview

**Name:** Vesper's Tarocchi  
**Suggested repository:** `vesper-tarocchi` (confirm owner/repo name before publishing)  
**Purpose:** A fast, desktop-oriented Major Arcana tarot reference and interactive Threefold Eminence reading aid for the user's Daggerheart character Vesper, an assassin of the Ashen Veil.  
**Primary use case:** During live tabletop play, find a card's relevant interpretation in seconds, or assemble a three-card spread without consulting multiple pages.  
**Hosting target:** GitHub Pages, ideally `https://<owner>.github.io/vesper-tarocchi/`, with the repository's actual Pages URL recorded in the README after deployment.

The supplied prototype is a roughly 48 KB standalone HTML document containing **all markup, styling, JavaScript, and tarot data**. It has no third-party libraries, CDNs, remote fonts, images, APIs, authentication, or backend. It works by directly opening the file in a browser. Preserve that offline capability in the initial milestone.

### Handoff inputs

- `index.html` — exact copy of the latest working `vesper_tarot_reference.html`, renamed only to serve as the Pages entry point. Treat its UI text and data as authoritative.
- `docs/visual-baselines/` — four reference screenshots captured at an approximately **938 px browser width**, useful for visual regression checks.
- `CODEX_HANDOFF.md` — this document.
- `AGENTS.md` — succinct standing instructions for Codex.

**Baseline SHA-256:** `e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6` for the original `vesper_tarot_reference.html` (same bytes as the supplied initial `index.html`). If the initial file differs, investigate before proceeding.

## 2. Existing functional specification — preserve all of this

### Shared layout and styling

- Dark charcoal/ash theme with warm parchment typography, muted gold, and differentiated Light/Shadow/Dusk accents.
- Persistent desktop left sidebar with the Ashen Veil identity, searchable index of all **22 Major Arcana**, and **visible keyboard shortcut legend**. Do **not** remove the legend.
- Top navigation between **Arcana Reference** and **Threefold Reading**.
- Responsive layout designed for wide desktop, approximately 938 px half-window desktop, and narrow/mobile widths.
- No footer or status tagline such as "Offline · No account · Stored in this browser".

### Arcana Reference

- Every card from `0 — The Fool` through `XXI — The World`, with core keywords and general **Upright**/**Reversed** keywords.
- All **six** contextual meanings per card: Light U/R, Shadow U/R, Dusk U/R, plus the **Question for Contemplation**.
- Search matches names, numerals, keywords, and interpretation text.
- Orientation buttons visually emphasize the selected orientation across both general keyword boxes and positional meanings; they **do not delete** the alternative interpretation.
- On wide desktop, position cards are presented horizontally; at half-window widths, **Light / Shadow / Dusk / Question for Contemplation** form a 2 × 2 grid. Maintain the existing divider spacing between Upright/Reversed meanings.
- Clicking **Full card ↗** from a reading opens the correct Arcana and orientation, emphasizes the relevant position, and offers **← Back to Reading** without losing the spread.
- No permanent supplementary interpretation guide or redundant "THE MAJOR ARCANA" heading above the main Arcana title.

### Threefold Reading

- Fixed three positions, in order: **☀ The Light — What is revealed?**, **◐ The Shadow — What is hidden?**, **● The Dusk — What must end?**
- Three card selectors, each with independent Upright/Reversed orientation and its own contextual meaning plus Question for Contemplation.
- **Draw three** picks three unique random cards (with randomized orientations); **Clear** resets the reading and question.
- Manually choosing a card already in another slot **does not create duplicate cards**; retain existing swap/reassignment semantics unless there is a demonstrated bug.
- Question input stays compact when empty and expands when focused or containing text.
- **At a glance** summarizes all three positions, card names/orientations, and actual interpretations. On half-window desktop it occupies the **bottom-right cell beside Dusk**, matching that row's height and distributing the summaries vertically; on wide desktop it spans beneath the three cards; on narrow screens it stacks naturally.
- **Do not** restore the previously removed interpretation notes textbox, example-loading button, or copy-reading button.

### Controls, persistence, offline behavior

- `/` focuses sidebar search; `J`/`K` navigate Arcana; `U`/`R` switch orientation; `1`/`2`/`3` select the active reading position; `Esc` can leave an editable field. Do not hijack shortcuts while typing.
- Browser `localStorage` persists the selected tab, currently selected Arcana, orientation, three slots, and question using the existing key **`vesperTarocchi_v1`**. Preserve current saved-state compatibility (or provide an explicit migration if intentionally changing the schema).
- No network requests during application use. No mandatory account, third-party scripts, analytics, cookies, or backend.
- Important: state stored when running a local `file://` copy does **not automatically transfer** to a GitHub Pages origin. Do not promise seamless migration of users' pre-existing local state.

## 3. Scope and guardrails

### Required in this handoff

1. Initialize a Git repository with `main` as its default branch, a useful `.gitignore`, and a meaningful first commit capturing the imported baseline.
2. Create an informative `README.md` including purpose, features, usage, local-preview instructions, keyboard shortcuts, repository structure, GitHub Pages URL, and maintenance/deployment notes.
3. Keep deployment **static and dependency-light**. Do not introduce React, Vite, a router, or a bundler as a prerequisite to publication. A one-file runtime is acceptable and desirable for this first milestone.
4. Add modest automated validation and/or browser smoke tests appropriate to a small static project; prioritize regression prevention over test-framework sophistication.
5. Add a GitHub Actions workflow that publishes the site to GitHub Pages from pushes to `main` and allows manual runs.
6. Set up the GitHub remote, push, enable GitHub Pages with **GitHub Actions** as publishing source, verify an actual successful deployment, and report its real URL.
7. Preserve all existing copy and Arcana interpretation data; do not editorially revise the tarot meanings during the migration.

### Explicit non-goals for milestone 1

- Redesigning the UI or changing the visual palette.
- Adding features, new tarot spreads, user profiles, backends, accounts, or analytics.
- Migrating to a front-end framework or adding runtime dependencies.
- Adding copyrighted tarot art, D&D art, campaign notes, or character portraits as decorative assets.
- Changing divination semantics or automatically generating interpretations using AI.
- Rewriting the entire single-file prototype for stylistic reasons alone.

**License:** Do not silently choose a code/content license. Public visibility is not the same as licensing; ask the owner whether they want a license, otherwise leave that decision explicit in the README or follow-up. Review repository contents before public publication (the site contains user-authored character flavor and tarot interpretations).

## 4. Recommended repository structure

Initially keep this minimal:

```text
vesper-tarocchi/
├── index.html                     # Authoritative working application
├── README.md                      # Create in milestone 1
├── AGENTS.md                      # Persistent agent guidance
├── CODEX_HANDOFF.md               # This brief
├── .gitignore                     # Create
├── .github/
│   └── workflows/
│       └── pages.yml              # Create: validate + deploy
├── docs/
│   └── visual-baselines/
│       ├── reference-death.png
│       ├── reference-moon-reversed.png
│       ├── reading-vineyard.png
│       └── reading-blood-offering.png
└── tests/                         # Add only what is useful
```

Do not deploy the entire repository contents just because the source is static. Stage a clean publish folder (for example `_site/`) containing **only `index.html` and any necessary public assets**; exclude screenshots, docs, internal instructions, `.git`, etc. Add `_site/` to `.gitignore`.

After successful deployment and verification, propose — but **do not automatically undertake** — an optional second milestone to extract CSS, JavaScript and the card data into maintainable source modules. If doing this later, design a build output that preserves both Pages hosting and an easy offline distribution; `fetch('./cards.json')` from `file://` may not work consistently.

## 5. Deployment requirements and suggested approach

Use the **GitHub Pages Actions deployment** workflow, not a manually maintained `gh-pages` branch. The app should work at a repository subpath without absolute-root URLs (`/assets/...`), because the usual project Pages URL is `https://<owner>.github.io/<repo>/`.

Use official maintained Actions versions, checking availability at implementation time. At the time of this brief, GitHub documents `actions/checkout@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`.

A suitable straightforward workflow shape (Codex may implement an equivalent):

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6
      - name: Validate source
        run: |
          test -s index.html
          # Add lightweight project checks here when implemented.
      - name: Stage static site
        run: |
          mkdir -p _site
          cp index.html _site/index.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v4
```

In repository settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**. If CLI/API automation cannot set it reliably, explicitly request the human perform this one-time setting and then continue. Do not report deployment as complete until the workflow has succeeded and the public URL has been opened/tested. Consider configuring the `github-pages` environment to deploy only from `main`.

**Repository visibility and consent:** Confirm desired GitHub owner/account and repo name. A public repository is the simplest GitHub Free Pages route. If private is desired, verify the user's GitHub plan/settings allow Pages; GitHub notes that a Pages site itself may still be public even when the repository is private. Do not put private or sensitive material in the publishing artifact.

**Authentication:** Use `gh auth status` before trying remote operations. If unauthenticated, stop and ask the owner to log in interactively (`gh auth login`); do not ask for raw tokens, store secrets in source, or claim a remote was created. Check whether the target repository already exists before creating one.

Official documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 6. Verification plan and acceptance criteria

### Baseline / data integrity

- All 22 Major Arcana are present once, ordered 0–21, with nonempty `core`, `u`, `r`, `light.u`, `light.r`, `shadow.u`, `shadow.r`, `dusk.u`, `dusk.r`, and `ask` fields.
- Card names, keywords, all six interpretations, and contemplation questions match the imported baseline byte-for-byte unless only harmless formatting changes are needed; if any data changes are proposed, ask first.
- No JS errors or failed network requests in a clean browser session.

### Reference view smoke tests

1. Initial page loads; both navigation tabs function; selecting Death or Moon shows correct content.
2. Search narrows the sidebar by card name and terms (e.g. `justice`, `control`) and clearing search restores all 22 cards.
3. Upright/Reversed controls consistently emphasize the correct general and contextual meanings while leaving the other readable.
4. At ~938 px browser width, verify the 2 × 2 reference layout and balanced Upright/Reversed separator spacing. No horizontal overflow.

### Threefold Reading smoke tests

1. Manually set **Light = Chariot upright, Shadow = Moon upright, Dusk = Tower upright**; confirm interpretations and questions for contemplation appear in the appropriate positions and in the summary.
2. Test **Light = Temperance upright, Shadow = Lovers reversed, Dusk = Emperor upright**. Verify correct reversed interpretation and a consistent at-a-glance summary.
3. `Draw three` fills three **distinct** cards, each with a valid orientation; `Clear` resets cards and the question.
4. Question field starts compact, expands on focus/text, and shrinks again when emptied and blurred.
5. `Full card ↗` on Shadow reversed opens the corresponding reference orientation and emphasizes Shadow; `Back to Reading` restores the intact spread.
6. Reload persists a manual reading and selected state via the existing localStorage key.
7. Keyboard shortcuts work as documented and don't intercept typing in the question/search fields.

### Responsive / deployment checks

- Check approximate browser widths **1440, 938, and 680 px** (the screenshots are visual guides, not strict pixel-snapshot assertions).
- At ~938 px, Threefold Reading has the requested **2 × 2 layout**, with At a glance directly beside Dusk and equal row height. Wide view has three reading cards horizontally and summary below; narrow view stacks.
- Opening `index.html` directly still works offline, and `http://localhost` preview works.
- The deployed GitHub Pages URL loads under the repository subpath, with all functions operating. Verify the console and public URL (not just a successful GitHub Action).
- README contains the **actual verified public URL**, not a placeholder.

Optional tooling: Playwright for interactive/browser smoke tests if available; a tiny Python/Node data-shape validator is also suitable. Keep tests proportionate to this project and avoid unnecessary infrastructure.

## 7. Execution order for Codex

**Milestone A — Baseline import**
1. Inspect `index.html` and `docs/visual-baselines/`.
2. Verify it opens unchanged; capture what was tested.
3. `git init -b main` if this is a new directory; write `.gitignore`, `README.md`, and initial commit. If a repository already exists, inspect its state instead of reinitializing or overwriting work.

**Milestone B — Quality gate**
1. Add small, meaningful data and/or interaction checks without modifying the UX.
2. Test on ~1440/938/680 px widths and compare against baseline images.
3. Commit tests/changes separately and summarize any differences.

**Milestone C — GitHub deployment**
1. Check `gh auth status`, determine owner, verify repo naming/visibility with the user if unknown, and create or reuse the GitHub repository.
2. Add `.github/workflows/pages.yml`, commit, push `main` to origin.
3. Enable Pages via Actions, observe workflow, resolve any failures, open the live site, and test there.
4. Update README with the verified URL; commit and push that update.

**Milestone D — Handoff report**
Report: repository URL, Pages URL, first/last commit hashes, tests run with results, deployment/workflow status, files created/modified, anything requiring manual action, and suggested optional next steps. **Do not** claim the remote repository or site exists until checked.

## 8. Definition of done

- [ ] Git repository initialized (or existing repo safely reused); meaningful commits on `main`.
- [ ] Clean README and minimal `.gitignore`, with the original offline page working.
- [ ] All 22 cards and six contextual combinations preserved.
- [ ] Reference and Reading functionality pass checks at desktop/half-window/narrow widths.
- [ ] GitHub Actions deploys only the necessary static site files.
- [ ] GitHub Pages deployment succeeds and the publicly opened URL is verified.
- [ ] README includes the real deployed URL.
- [ ] Codex reports what changed and what remains, including any user action needed.

## 9. Kickoff prompt for Codex CLI

> Read `AGENTS.md` and `CODEX_HANDOFF.md` completely. Treat the supplied `index.html` as an existing, working product and the screenshots under `docs/visual-baselines/` as layout references. Carry out Milestones A–D in order, preserving UI and all tarot content. Keep the first deployment static and dependency-light. Initialize version control, add proportional checks, set up a GitHub Pages Actions deployment, and verify the published website. Confirm the GitHub account/repository visibility when needed; ask for authentication rather than requesting tokens. At the end, provide a concise report with the real repo URL, Pages URL, commits, checks, and any blockers.
