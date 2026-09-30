# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static resume/portfolio website for Matthew Thaokhamlue, deployed to GitHub Pages. No build step, no bundler, no package manager — just static HTML/CSS/JS served directly.

## Development

Serve the repo root over http to test: `python3 -m http.server 8765`, then open `http://localhost:8765/index.html`. The logo masks do not load over `file://`. No build or install commands are needed. The site is deployed by pushing to the `main` branch (GitHub Pages serves from root).

Pushing this repo uses the personal `gh` account `matthew-thaokhamlue` (not `matthew-semasoftware`); a push to `main` triggers both the CI workflow and the Pages build automatically, so verify CI is green after pushing.

## Architecture

**Pages:** Each top-level HTML file is a standalone page sharing a common structure:
- `index.html` — the home page: the loop hero (the star-written M, "Product" plus a role word, six station cards on a ring), four results that open receipts, testimonials, AI Match, contact
- `experience.html` — a Fibonacci spiral of five tiles, stretched to the top bar’s content width while keeping its fitted height. Its grid uses these proportions: Sema 55, Labforward / LabTwin 34, Thryve 21, EY 13 and Education & Languages 13 x 8. The combined lab reveal keeps both role sections and their AI Match hooks; the old LabTwin fragments open it. The Education reveal keeps `id="role-education"`, which ai-match.js reads
- `portfolio.html` — a mosaic of eight project tiles that open five project reveals; each reveal links its `portfolio/*.html` case page
- `certificates.html` — a mosaic of 14 credential tiles; each opens a reveal with a verify link
- `portfolio/*.html` — editorial case study pages (Labforward, LabTwin, Thryve, Opportunity Paths, Remarcable Living); `portfolio/achievement.html` stays hidden (see SEO below)
- `about.html` and the retired case pages `portfolio/mcp-server.html`, `portfolio/automation-tools.html`, `portfolio/interview-prep.html` — redirect stubs (meta refresh + JS + a canonical, no `noindex`) to `index.html` or `portfolio.html`; not content pages, exempt from the GA/metadata rules, not in the sitemap
- `cv.html` — generated CV export linked as a download from index/experience; not hand-maintained

**Styling:**
- **Tailwind CSS, precompiled** — `assets/css/tailwind.css` is a checked-in one-time compile (tailwindcss 3.4.17 + forms + container-queries plugins). Theme tokens live only in `tailwind.config.js` at the repo root, which also documents the regen command. **After adding/removing Tailwind classes in any HTML/JS file, regenerate the stylesheet** — a static compile only contains classes found in the content scan, so a new class without a rebuild silently renders unstyled.
- **`assets/css/editorial.css`** — the design system, loaded after tailwind.css so its rules win the cascade. The tokens (`--ed-*`) sit in `:root` (light) and `:root[data-theme="dark"]` (dark, set by `theme.js` before paint). Every class uses the `ed-` prefix. The fonts come from one Google Fonts link on every content page (tested): Instrument Sans with the width and italic axes (display and body), IBM Plex Mono, Material Symbols. All local CSS/JS use a `?v=` cache-bust param that must stay identical across all pages (tested).

**JavaScript:**
- `assets/js/site.js` — site-wide glue: cookie-consent banner + consent-gated GA (gtag.js injected only after explicit accept; `resume_cookie_consent` localStorage key, `resume_cookie_consent_change` window event, `data-action="cookie-accept" | "cookie-dismiss" | "cookie-preferences"`), delegated GA event tracking via `[data-ga-event]`/`[data-ga-params]`, mobile menu (`data-action="toggle-menu"`), the testimonial modal (`data-action="open-testimonial"` etc.), and the reveal system. Loaded on every content page. `window.gtag` stays undefined until consent, so all `track()` calls no-op for unconsented visitors.
  - **Reveals:** `data-action="open-reveal" data-reveal="ID"` opens `<dialog class="ed-reveal" id="ID">` with `showModal()`. A URL fragment `#ID` opens its reveal on load and on `hashchange` (deep links such as `experience.html#role-sema`). A click inside an open reveal closes it, except on a link or while text is selected; the close button always closes it. Without scripts, `@media (scripting: none)` in editorial.css shows every reveal's content in the page, and no inline `<style>` may override that rule (tested).
- `assets/js/star-cursor.js` — every content page, loaded directly after `site.js` (tested): the clay star that replaces the mouse cursor on a 2D canvas. With a fine pointer and no reduced-motion request it sets `html.star-on` (last, once the canvas works) and draws a pill: "Info" over a reveal target, "Close ×" while a reveal is open, none over a link inside a reveal. Otherwise it sets `html.no-star`, and each reveal target shows its `.ed-chip` "Info" chip. Links, buttons, labels, summaries, and home workflow cards trigger a spark once per pointer entry; only reveal targets show the Info pill. The canvas and the pill follow any open dialog into the top layer. Text-like fields keep the native caret (one field list in the script and the CSS, tested).
- `assets/js/loop-hero.js` — index.html only, with its own `?v=`: the loop hero. Six `.ed-loop-card` stations on a ring of 96 particles (XPBD constraints) with WebGL 2 dust. On first view the star writes the M at the centre through two fitted mask paths, then a tour walks the highlight (`.is-front`) and the role word (builder, manager, designer, tester, owner, builder) around the stations with a Web Animations width morph. `WRITE_S` 0.9 s + `TOUR_S` 3.9 s = 4.8 s, once per load (WCAG 2.2.2). The ring's default layout is CSS, so the page shows the ring before the script runs; a container query on the stage width picks the tall phone ring, with a 671 px media query only where container queries are missing. Reduced motion, no WebGL 2 and a shader failure keep the static ring, the full M and "Product builder", and still follow resizes. The wheel button adds angular momentum with each click, up to a speed cap. The cards stay upright, the role word rolls as a reel while "Product" stays fixed, and the wheel slows to a station at the top. A matching role description appears below the controls, chosen from four sentences per station (24 total). On phones the role reel sits below the ring, clear of the moving cards. Reduced motion selects a station immediately. The wheel uses DOM placement without WebGL, including shader failure and context loss; a lost context never renders again. The drag hint shows only while the ring answers a drag (`.is-draggable`).
- `assets/js/ai-match.js` — Custom "Evaluate role fit" feature: reads a job description textarea, builds a prompt from the role reveals' `data-role-*` hooks, opens ChatGPT or Claude.ai in a popup/tab. (Contains no gtag calls.)
- `assets/js/theme.js` — sets `data-theme` on `<html>` from localStorage before paint.
- GSAP, ScrollTrigger and the scroll-motion scripts (`editorial.js`, `loop.js`, `rings.js`, `career.js`, `folio.js`, `case.js`) were deleted in September 2026, with the `data-motion-pending` gate. No page loads them (tested). The legacy HTML5 UP Dimension assets were deleted in June 2026. Don't reintroduce either.

**Fit mode (Experience, Portfolio, Certifications):** the body carries `ed-fit`. With scripts on and a window of at least 761 x 500 px, the page fits the window with no scrolling: a compact top bar, page head and footer, and the tiles in the height that is left (`@media (scripting: enabled) and (min-width: 761px) and (min-height: 500px)`, written once, tested). Tile text scales with container units; `--rows` on each mosaic must equal its last grid row (tested). While the cookie banner shows, `site.js` publishes its height as `--ed-consent-h` and the page reserves it. Phones, short windows and no scripts keep the scrolling layout; nothing hides overflow, so a page that cannot fit scrolls.

**CDN dependencies:** Font Awesome 6.4.0 is pinned on cdnjs with `integrity` (SRI sha384) + `crossorigin="anonymous"` attributes. When bumping a CDN version, recompute the hash: `curl -sf <url> | openssl dgst -sha384 -binary | base64`.

**Content-Security-Policy:** every content page carries a CSP `<meta>` tag (first element in `<head>`) with `script-src 'self' cdnjs googletagmanager` — **no `'unsafe-inline'` for scripts**. Consequences: never add inline `<script>` blocks (JSON-LD data blocks are the only exception) or inline `on*=` handlers; put behavior in `site.js` and wire it with data attributes. When adding a new external resource, extend the CSP on all content pages (tested). No page loads a cdnjs script now (Font Awesome loads as a stylesheet), so the cdnjs entry in `script-src` has no user.

## Motion

No page moves on scroll: native OS scrolling, no pins, no scroll snap, no wheel hijack, no scroll-linked reveals. The `.reveal` class is inert.

- **`index.html`**: the loop hero runs once per load (see `loop-hero.js`); the drag on the ring works with a fine pointer.
- **All content pages**: the reveals open with a short rise (`ed-reveal-rise`), and the star cursor draws on demand and stops when it settles.
- Reduced motion, no WebGL 2, no scripts and a failed script load all leave the content visible.
- `experience.html` panels show each company as a logo mask; the Skills and Education section uses `.ed-stages`/`.ed-stage` rows.

## File Editing Gotchas

- `index.html` uses CRLF line endings (`ai-match.js` is LF); all other HTML files use LF-only. The Edit tool silently fails to match strings in CRLF files. Use this Python pattern for reliable replacements:
  ```python
  with open('index.html', 'rb') as f: src = f.read().decode('utf-8')
  src = src.replace('OLD', 'NEW')
  with open('index.html', 'wb') as f: f.write(src.encode('utf-8'))
  ```
- Background subagents can edit files and commit in this repo; each works in its own worktree when dispatched with worktree isolation.
- Worktrees created by Claude land in `.claude/worktrees/` — clean up with `git worktree remove --force` after branches are merged.
- The rtk Bash hook mangles grep patterns with escaped parens/alternations and can fail on missing `gsed` — for multi-pattern greps over the HTML files, use `rtk proxy grep` or a python script instead.
- zsh reserves `status` as a read-only variable — shell loops in Bash/Monitor tools must use a different variable name or they exit 1.
- `cv.html` is a GitHub-export render whose TOC anchors use `id="user-content-*"`, so its `#fragment` links don't resolve statically — that's why it's exempt from the fragment-link contract test.
- `overflow-x: clip` must sit on `html` (root) — set only on `body` it propagates to the viewport as scrollable and mobile can still pan sideways.
- The local `python3 -m http.server` sends no Cache-Control, so the /browse headless browser heuristically caches HTML **and CSS/JS assets**. Fresh query params (`?fresh=N`) only bust the HTML — after editing a CSS/JS file mid-verification, confirm via computed styles that the change actually arrived before trusting a failing check.
- Headless Chrome does not lay out below 500 px. Check a 390 px phone layout through a page that holds a 390 px `<iframe>`.
- The /browse headless browser has no WebGL, so it shows only the static loop. Check the live loop in system Chrome, or headless Chrome with `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- A merge conflict at the end of `editorial.css` can hide a shared closing brace: view it with `git checkout --conflict=diff3 <file>` before keeping both sides, or the second block nests inside a phone-only `@media` with no error.

## Key Conventions

- External dependencies via CDN (Font Awesome, Google Fonts) — no `node_modules`; Tailwind is precompiled into `assets/css/tailwind.css`
- Standard content container: `.ed-shell` (editorial.css) — the same width and gutter as the top bar (`--ed-content-max` plus `--ed-gutter-x`), full width inside a flex column. Use it for all section content (tested on the four main pages).
- Tailwind theme tokens live in `tailwind.config.js` only — regenerate `assets/css/tailwind.css` after changing them (command in that file's header comment)
- Google Analytics (G-D11HKMWFB4) is consent-gated: no page carries a static gtag.js loader (tested); `assets/js/site.js` injects it only after the visitor accepts the cookie banner, and every content page footer carries the `data-action="cookie-preferences"` control (tested) that clears the choice and re-opens the banner. GA4 custom events (`resume_downloaded`, `external_link_clicked`, `credential_verified`, etc.) are wired declaratively: `data-ga-event="event_name" data-ga-params='{"key":"value"}'` on the clickable element — never inline `onclick` (CSP forbids it, tested).
- Tiles and panels take their accessible names from their visible text (WCAG 2.5.3): the Portfolio and Certifications tiles carry no `aria-label`; the Experience panels keep one, because the company shows only as a logo, and it ends with the visible dates (tested).
- SEO: JSON-LD Person schema lives inline in `index.html` `<head>` (there is no separate structured-data file — a standalone JSON file is invisible to crawlers). `sitemap.xml` and `robots.txt` are at root; content pages carry Open Graph + Twitter Card tags (tested). `portfolio/achievement.html` is intentionally hidden: noindex, unlinked, excluded from the sitemap — keep it that way.
- Machine-readable profile: `llms.txt` (summary + page index) and `llms-full.txt` (full CV) at root — update the current-role facts there when career copy changes on the site.
- Images go in `images/` directory; the tile logos in `images/logos/`, the tile photos in `images/mosaic/`
- Design docs and implementation plans stay private: this repo is public and GitHub Pages serves every file, so they never enter it (tested).
- Branch naming: Claude-created branches use `claude/<adjective-name>` prefix (e.g. `claude/recursing-kalam`)

## Personal Brand & Content Positioning

Matthew's positioning throughline: **"AI Workflow Architect"** — he builds AI systems, not just ships AI features. All copy, hero text, and card descriptions should reinforce this.

**Confirmed facts per project (use for copy/story work):**
- **Labforward**: Full GenAI roadmap ownership — ran LLM evaluation, drove strategy to production deployment
- **LabTwin**: AI integration PM role — led strategy and partner integrations (not model/pipeline ownership)
- **Automation Tools**: Multi-LLM suite (OpenAI, Claude, Gemini) — eliminates 12+ hrs/week of manual PM work
- **MCP Server**: Live on GitHub but early-stage / proof of concept
- **Interview-prep**: Multi-agent Claude Code framework (`/.claude/agents/onboarding.md` + `interview-prep.md`); uses MCP WebSearch/WebFetch; 5-stage pipeline; canonical I/O files (`00_user_profile.md`, `01_cv_resume.md`, `02_target_company_role.md`). Strongest single showcase of AI workflow architect skills.

**Home page (index.html) current state (September 2026):** the head and the hero title read "Senior AI Product Manager"; the subline names Liz, Sema's AI agent; the actions are Evaluate role fit, View CV and LinkedIn. Below them the loop hero: the M written by the star at the ring centre, "Product" plus the role word, and six station cards. Then four results (~39%, $500K, 1M+, 4 → 12), each opening a receipt with the employer, the role, the dates and the claim; then testimonials and a plain "Contact" heading. The footer line on every page still reads "Builder · AI Workflow Architect".

### Regression Tests

- `tests/ai-match.test.mjs`: verifies AI Match prompt, provider URL, clipboard, and popup helpers.
- `tests/static-contract.test.mjs`: verifies the fonts link and the tokens; local HTML references; the AI Match DOM contract and the role-reveal hooks; the loop hero contract (the six cards, the exact role-word order, the fitted mask paths, the 4.8 s budget, the default CSS ring, the container query, resize handling, the first frame, the drag hint, a lost context); the four results and the band; tile and panel names (WCAG 2.5.3), the focus ring, the chip ring and the dark ink edge; the `.ed-shell` wrapper; no GSAP or old motion script; no design docs in the repo; every reveal target and its dialog, the close paths and the no-script fallback; no inline style that hides the reveals; the star cursor guards, its field list, its pointer-events and its load order; the home head copy and JSON-LD; the logo masks; the Portfolio mosaic and its case links; the redirect stubs and links to retired pages; the 14 credentials and their analytics values.
- `tests/site-contract.test.mjs`: verifies sitemap ↔ disk sync (achievement.html excluded by design), per-page head metadata (title, description, canonical, OG, Twitter Card), GA tag presence, precompiled-Tailwind usage (no Play CDN, no inline config), `?v=` cache-bust consistency, CSP meta presence, zero inline event handlers, no executable inline scripts (JSON-LD only), `data-ga-params` JSON validity, `data-action` ↔ site.js handler sync, and same-page anchor targets.
- Run with:
  - `node --test tests/*.test.mjs`
