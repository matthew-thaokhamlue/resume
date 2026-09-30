# AGENTS.md

## Key Files
- `index.html` — home page (the loop hero, results with receipts, AI Match, GA events)
- `experience.html` — five role panels that open full-screen role reveals (the AI Match `data-role-*` hooks live inside them)
- `portfolio.html`, `certificates.html` — mosaics of tiles that open reveals
- `portfolio/*.html` — editorial case study pages
- `assets/js/site.js` — consent-gated GA + delegated `[data-ga-event]` tracking + menu/testimonial glue + the reveal system (loaded on every content page)
- `assets/js/star-cursor.js` — the clay star cursor and its Info/Close pills (every content page, directly after `site.js`)
- `assets/js/loop-hero.js` — the home page loop hero (WebGL 2, the written M, the role word)
- `assets/js/ai-match.js` — "Evaluate role fit" feature: prompt template, provider URLs
- `assets/css/editorial.css` — the design system: `--ed-*` tokens, `ed-` classes, the no-script reveal fallback
- `tailwind.config.js` + `assets/css/tailwind.src.css` — dev-time source for the checked-in `assets/css/tailwind.css` (regen command in the config header)
- `tests/` — Node.js test suite (`node --test tests/*.test.mjs`)
- `harness/validate.sh` — invariant checker; run after editing HTML or harness rules
- For full conventions, brand copy guidance, and gotchas: see CLAUDE.md

## Architecture Invariants (checked by harness/validate.sh)
- GA is opt-in: no content page loads `gtag.js` statically, every content page carries the `data-action="cookie-preferences"` footer control and loads `site.js`, and `site.js` holds the GA ID and the consent gate — `about.html`, the three retired case-page stubs (redirects) and `cv.html` (export) are exempt
- No inline `<script>` blocks (except JSON-LD) and no inline `on*=` handlers — the CSP meta forbids them; behavior goes in `site.js`, GA events via `data-ga-event`/`data-ga-params`
- `AI Workflow Architect` must remain in `index.html` — canonical brand positioning (the footer carries it; the home band is removed)
- ` DAU` must not appear in any content page — public-safe content (no internal metrics)

## Gotchas
- `index.html` uses **CRLF line endings** — the Edit tool silently fails to match strings in it; use the Python byte-replace pattern in CLAUDE.md (every other file is LF)
- Tailwind is precompiled — after adding/removing Tailwind classes in HTML/JS, regenerate `assets/css/tailwind.css` (command in `tailwind.config.js`) or the new classes silently render unstyled
- Logo masks do not load over `file://`, headless Chrome does not lay out below 500 px, and the /browse browser has no WebGL — see the checks in CLAUDE.md
- Background subagents can edit files and commit; give each its own worktree

## Workflow
- Run tests: `node --test tests/*.test.mjs`
- Run harness checks: `bash harness/validate.sh`
- Worktrees land in `.claude/worktrees/` — clean up with `git worktree remove --force` after merging
