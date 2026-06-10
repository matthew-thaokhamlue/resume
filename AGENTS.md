# AGENTS.md

## Key Files
- `index.html` — main landing page (editorial flow, AI Match feature, GA events)
- `experience.html` — career timeline (GSAP reveals, SVG tree rings with career-year counts)
- `portfolio/*.html` — editorial case study pages
- `assets/js/site.js` — GA bootstrap + delegated `[data-ga-event]` tracking + menu/testimonial glue (loaded on every content page)
- `assets/js/ai-match.js` — "Evaluate role fit" feature: prompt template, provider URLs
- `assets/js/editorial.js` — GSAP scroll reveals shared by `index.html` and `experience.html`
- `tailwind.config.js` + `assets/css/tailwind.src.css` — dev-time source for the checked-in `assets/css/tailwind.css` (regen command in the config header)
- `tests/` — Node.js test suite (`node --test tests/*.test.mjs`)
- `harness/validate.sh` — invariant checker; run after editing HTML or harness rules
- For full conventions, brand copy guidance, and gotchas: see CLAUDE.md

## Architecture Invariants (checked by harness/validate.sh)
- GA loader `G-D11HKMWFB4` must be in every content page's `<head>` and `assets/js/site.js` — `about.html` (redirect) and `cv.html` (export) are exempt
- No inline `<script>` blocks (except JSON-LD) and no inline `on*=` handlers — the CSP meta forbids them; behavior goes in `site.js`, GA events via `data-ga-event`/`data-ga-params`
- `AI Workflow Architect` must remain in `index.html` — canonical brand positioning
- ` DAU` must not appear in any content page — public-safe content (no internal metrics)

## Gotchas
- `index.html` and `assets/js/editorial.js` use **CRLF line endings** — the Edit tool silently fails to match strings in these files; use the Python byte-replace pattern in CLAUDE.md (`ai-match.js` is LF)
- Tailwind is precompiled — after adding/removing Tailwind classes in HTML/JS, regenerate `assets/css/tailwind.css` (command in `tailwind.config.js`) or the new classes silently render unstyled
- SVG tree ring counts encode accumulated career years: Sema=9, Labforward=8, LabTwin=7, Thryve=5, EY=2 — preserve when editing SVGs
- Background subagents (`run_in_background: true`) cannot use Edit or Write tools — apply all file edits in the main agent session

## Workflow
- Run tests: `node --test tests/*.test.mjs`
- Run harness checks: `bash harness/validate.sh`
- Worktrees land in `.claude/worktrees/` — clean up with `git worktree remove --force` after merging
