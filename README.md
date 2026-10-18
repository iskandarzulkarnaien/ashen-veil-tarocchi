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

## Repository and publication

Approved target: `iskandarzulkarnaien/ashen-veil-tarocchi`, public repository.

**Publication status: pending.** No remote repository or deployed URL has been verified yet. The expected project path is `https://iskandarzulkarnaien.github.io/ashen-veil-tarocchi/`; this is an intended address, not a claim of deployment. Replace this status with the actual verified URL after publishing.

The deployment will use GitHub Actions on pushes to `main` and manual workflow runs. Only `index.html` will be staged in `_site/` and uploaded; instructions, tests, screenshots, and Git metadata will remain outside the site artifact. Enable **Settings → Pages → Source: GitHub Actions** once the remote exists.

## Structure and maintenance

```text
index.html                Authoritative offline application, styling, and data
AGENTS.md                 Standing project instructions
CODEX_HANDOFF.md          Project brief and acceptance checklist
docs/visual-baselines/    Four supplied visual references at about 938 px
```

Read `AGENTS.md` and `CODEX_HANDOFF.md` before changing the application. Preserve the original UI, tarot copy, all 22 records and six interpretations per card, and saved-state schema. Check reference and reading layouts at 1440, 938, and 680 px, particularly both half-window 2 × 2 grids. Test both a direct file and an HTTP preview; hosting must also work under a repository subpath.

The imported `index.html` SHA-256 is `e6b15af9c0cd983a2da9bf3dcbbfb415bac2b8d36eb2bdb7f6ae6f7b03caf3a6`. Git preserves its bytes without line-ending conversion.

## License

No software or content license has been selected. Public repository visibility does not itself grant a license. A licensing decision remains with the owner.
