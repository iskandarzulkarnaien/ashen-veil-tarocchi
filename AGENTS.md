# Codex Instructions — Vesper's Tarocchi

1. Read `CODEX_HANDOFF.md` before making changes. It is the authoritative project brief and acceptance checklist.
2. `index.html` is the known-working offline application baseline. Preserve its content, appearance, behavior, all 22 card records, and six interpretation combinations unless asked otherwise.
3. First milestone: small, static, version-controlled GitHub Pages deployment. Avoid a framework rewrite or dependencies unless needed for testing.
4. Check changes at browser widths near 1440, 938, and 680 px, particularly both 2 × 2 half-window layouts. Use `docs/visual-baselines/` for comparison.
5. Preserve the `vesperTarocchi_v1` localStorage state schema; do not claim that file-origin state migrates automatically to a hosted site.
6. No accounts, analytics, remote APIs, or third-party assets without explicit user approval. Do not automatically assign a software/content license.
7. Keep git commits focused and report precisely what was tested and deployed. Confirm public GitHub publishing details; never claim success without verifying it.
8. For the approved DM Preparation feature, also read `docs/DM_PREPARATION_REQUIREMENTS.md` and `docs/DM_PREPARATION_SETUP.md`. That feature extends the original first-milestone non-goals with explicitly authorized OpenAI/Cloudflare integration; preserve the original tarot data and existing offline functionality.
