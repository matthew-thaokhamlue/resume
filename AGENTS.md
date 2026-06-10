# AGENTS.md

## Key Files
- `index.html` — main landing page (editorial flow, AI Match feature, GA events)
- `experience.html` — career timeline (GSAP reveals, SVG tree rings with career-year counts)
- `portfolio/*.html` — editorial case study pages
- `assets/js/ai-match.js` — "Evaluate role fit" feature: prompt template, provider URL, GA events
- `assets/js/editorial.js` — GSAP scroll reveals shared by `index.html` and `experience.html`
- `tests/` — Node.js test suite (`node --test tests/*.test.mjs`)
- `harness/validate.sh` — invariant checker; run after editing HTML or harness rules
- For full conventions, brand copy guidance, and gotchas: see CLAUDE.md

## Architecture Invariants (checked by harness/validate.sh)
- GA tag `G-D11HKMWFB4` must be in every content page's `<head>` — `about.html` (redirect) and `cv.html` (export) are exempt
- `typeof gtag==='function'` guard required on every inline `gtag()` call — never call gtag without it
- `AI Workflow Architect` must remain in `index.html` — canonical brand positioning
- ` DAU` must not appear in any content page — public-safe content (no internal metrics)

## Gotchas
- `index.html` and `assets/js/editorial.js` use **CRLF line endings** — the Edit tool silently fails to match strings in these files; use the Python byte-replace pattern in CLAUDE.md (`ai-match.js` is LF)
- Tailwind config is duplicated in each HTML `<head>` (`<script id="tailwind-config">`) — change theme tokens in all pages, not just one
- SVG tree ring counts encode accumulated career years: Sema=9, Labforward=8, LabTwin=7, Thryve=5, EY=2 — preserve when editing SVGs
- Background subagents (`run_in_background: true`) cannot use Edit or Write tools — apply all file edits in the main agent session

## Workflow
- Run tests: `node --test tests/*.test.mjs`
- Run harness checks: `bash harness/validate.sh`
- Worktrees land in `.claude/worktrees/` — clean up with `git worktree remove --force` after merging
