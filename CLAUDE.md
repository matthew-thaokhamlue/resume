# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static resume/portfolio website for Matthew Thaokhamlue, deployed to GitHub Pages. No build step, no bundler, no package manager — just static HTML/CSS/JS served directly.

## Development

Open `index.html` in a browser to test. No build or install commands needed. The site is deployed by pushing to the `main` branch (GitHub Pages serves from root).

## Architecture

**Pages:** Each top-level HTML file is a standalone page sharing a common structure:
- `index.html` — Main landing page (hero, testimonials, AI Match, contact)
- `portfolio.html` — Portfolio index page linking to standalone editorial case studies
- `experience.html`, `certificates.html` — Dedicated full pages for each section
- `portfolio/*.html` — Individual editorial case study pages for career and personal projects
- `about.html` — redirect stub to `index.html` (meta refresh + JS); not a content page, exempt from GA/metadata rules, not in the sitemap
- `cv.html` — generated CV export linked as a download from index/experience; not hand-maintained

**Styling:**
- **Tailwind CSS, precompiled** — `assets/css/tailwind.css` is a checked-in one-time compile (tailwindcss 3.4.17 + forms + container-queries plugins). Theme tokens live only in `tailwind.config.js` at the repo root, which also documents the regen command. **After adding/removing Tailwind classes in any HTML/JS file, regenerate the stylesheet** — a static compile only contains classes found in the content scan, so a new class without a rebuild silently renders unstyled.
- **`assets/css/editorial.css`** — the editorial design system (reveals, hero display, stages, quotes). Loaded after tailwind.css so its rules win the cascade. All local CSS/JS use a `?v=` cache-bust param that must stay identical across all pages (tested).

**JavaScript:**
- `assets/js/site.js` — site-wide glue: GA bootstrap (`gtag` config), delegated GA event tracking via `[data-ga-event]`/`[data-ga-params]`, mobile menu (`data-action="toggle-menu"`), and the testimonial modal (`data-action="open-testimonial"` etc.). Loaded on every content page.
- `assets/js/editorial.js` — GSAP + ScrollTrigger scroll reveals (see Scroll Motion Pattern below).
- `assets/js/ai-match.js` — Custom "Evaluate role fit" feature: reads a job description textarea, builds a prompt, opens ChatGPT or Claude.ai in a popup/tab. (Contains no gtag calls.)
- The legacy HTML5 UP Dimension assets (jQuery, `main.js`, `portfolio.js`, `main.css`, `portfolio.css`, the SASS tree, and local Font Awesome webfonts) were deleted in June 2026 — no page referenced them. Don't reintroduce them.

**CDN dependencies:** GSAP 3.12.5, ScrollTrigger 3.12.5, and Font Awesome 6.4.0 are pinned on cdnjs with `integrity` (SRI sha384) + `crossorigin="anonymous"` attributes. When bumping a CDN version, recompute the hash: `curl -sf <url> | openssl dgst -sha384 -binary | base64`.

**Content-Security-Policy:** every content page carries a CSP `<meta>` tag (first element in `<head>`) with `script-src 'self' cdnjs googletagmanager` — **no `'unsafe-inline'` for scripts**. Consequences: never add inline `<script>` blocks (JSON-LD data blocks are the only exception) or inline `on*=` handlers; put behavior in `site.js` and wire it with data attributes. When adding a new external resource, extend the CSP on all 11 pages (tested).

## Scroll Motion Pattern

`index.html` and `experience.html` both use native OS scrolling plus GSAP + ScrollTrigger reveals via `assets/js/editorial.js` (loaded with the GSAP CDN at the bottom of each page). No sticky panels, no scroll snap, no wheel hijack.

- **`index.html`**: flat editorial flow. GSAP scrubs `.ed-hero__display` font-variation/letter-spacing, plus reveals on `.ed-stage`, `.ed-philosophy`, `.ed-quote`, `.ed-signature`, and any `.reveal` block.
- **`portfolio.html`**: no scroll-driven motion.
- **`experience.html`**: 6 flow sections, one per job role plus Skills/Education. Sections 2–6 carry a `border-t border-white/5` divider so each chapter still reads as a discrete block.
  - Panels 1–5 use a 50/50 split: organic SVG tree rings (left) + editorial text (right). Both wrappers carry `class="reveal"` so they fade up via `editorial.js`'s `initBaseReveal()` as the section enters the viewport.
  - Panel 6 (Skills & Education) uses `.ed-stages`/`.ed-stage`, animated by `initStages()`. The heading block carries `.reveal`.
  - SVG tree ring counts = **accumulated career years**: Sema=9, Labforward=8, LabTwin=7, Thryve=5, EY=2. Preserve these when editing SVGs.
  - The page still needs `.card-hover` CSS in the inline `<style>` block — don't remove it when editing other styles.

## File Editing Gotchas

- `index.html` and `assets/js/editorial.js` use CRLF line endings (`ai-match.js` is LF); all other HTML files use LF-only. The Edit tool silently fails to match strings in CRLF files. Use this Python pattern for reliable replacements:
  ```python
  with open('index.html', 'rb') as f: src = f.read().decode('utf-8')
  src = src.replace('OLD', 'NEW')
  with open('index.html', 'wb') as f: f.write(src.encode('utf-8'))
  ```
- Background subagents (`run_in_background: true`) cannot use Edit or Write tools — use them for research/reads only; apply all file edits in the main agent session.
- Worktrees created by Claude land in `.claude/worktrees/` — clean up with `git worktree remove --force` after branches are merged.

## Key Conventions

- External dependencies via CDN (GSAP, Font Awesome, Google Fonts) — no `node_modules`; Tailwind is precompiled into `assets/css/tailwind.css`
- Standard content container: `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — matches nav width/padding exactly. Use this for all section content.
- Tailwind theme tokens live in `tailwind.config.js` only — regenerate `assets/css/tailwind.css` after changing them (command in that file's header comment)
- Google Analytics loader (G-D11HKMWFB4) in each content page `<head>` (`about.html` and `cv.html` exempt); config + events live in `assets/js/site.js`. GA4 custom events (`resume_downloaded`, `external_link_clicked`, etc.) are wired declaratively: `data-ga-event="event_name" data-ga-params='{"key":"value"}'` on the clickable element — never inline `onclick` (CSP forbids it, tested).
- `portfolio.html` all project cards link directly to standalone `portfolio/*.html` editorial case-study pages.
- SEO: JSON-LD Person schema lives inline in `index.html` `<head>` (there is no separate structured-data file — a standalone JSON file is invisible to crawlers). `sitemap.xml` and `robots.txt` are at root; content pages carry Open Graph + Twitter Card tags (tested). `portfolio/achievement.html` is intentionally hidden: noindex, unlinked, excluded from the sitemap — keep it that way.
- Machine-readable profile: `llms.txt` (summary + page index) and `llms-full.txt` (full CV) at root — update the current-role facts there when career copy changes on the site.
- Images go in `images/` directory
- `docs/plans/` — design docs (`*-design.md`) and implementation plans from brainstorm/writing-plans skill sessions
- Branch naming: Claude-created branches use `claude/<adjective-name>` prefix (e.g. `claude/recursing-kalam`)

## Personal Brand & Content Positioning

Matthew's positioning throughline: **"AI Workflow Architect"** — he builds AI systems, not just ships AI features. All copy, hero text, and card descriptions should reinforce this.

**Confirmed facts per project (use for copy/story work):**
- **Labforward**: Full GenAI roadmap ownership — ran LLM evaluation, drove strategy to production deployment
- **LabTwin**: AI integration PM role — led strategy and partner integrations (not model/pipeline ownership)
- **Automation Tools**: Multi-LLM suite (OpenAI, Claude, Gemini) — eliminates 12+ hrs/week of manual PM work
- **MCP Server**: Live on GitHub but early-stage / proof of concept
- **Interview-prep**: Multi-agent Claude Code framework (`/.claude/agents/onboarding.md` + `interview-prep.md`); uses MCP WebSearch/WebFetch; 5-stage pipeline; canonical I/O files (`00_user_profile.md`, `01_cv_resume.md`, `02_target_company_role.md`). Strongest single showcase of AI workflow architect skills.

**Hero section (index.html) current state:** Subtitle = "Senior Product Manager · AI Workflow Architect"; description leads with "Senior PM and AI systems builder — I own GenAI roadmaps from LLM evaluation to production, and design multi-agent Claude Code workflows…"

## Smooth Scroll Implementation Notes (2026-05-06)

`experience.html` previously used a wheel-driven snap IIFE, then a sticky stack-panel cover effect. Both were removed: the wheel snap hijacked native scroll, and the sticky stack made later panels visually cover earlier ones in a way that read as "scroll is broken" before content could fade in. The page now mirrors `index.html` — flat editorial sections, GSAP `.reveal` fade-ups, no sticky/snap/hijack.

Current state for both pages:

- Native OS scrolling, no `event.preventDefault()` on wheel, no programmatic `scrollTo`, no `.stack-panel`/`.is-covered` CSS, no `--panel-z` z-index ladder.
- `assets/js/editorial.js` (loaded via GSAP + ScrollTrigger CDN at the bottom of each page) drives all scroll-linked motion: `.reveal` fade-ups, `.ed-stage` staggered reveals, `.ed-philosophy` paragraph fade-ups, `.ed-hero__display` font-variation scrub, `.ed-signature` word composition.
- Reduced motion is honored in both `editorial.js` and `editorial.css` — content remains visible, transitions are disabled.

### Regression Tests

- `tests/ai-match.test.mjs`: verifies AI Match prompt, provider URL, clipboard, and popup helpers.
- `tests/static-contract.test.mjs`: verifies local HTML references, AI Match DOM IDs, prompt template wiring, and the experience.html story beats.
- `tests/site-contract.test.mjs`: verifies sitemap ↔ disk sync (achievement.html excluded by design), per-page head metadata (title, description, canonical, OG, Twitter Card), GA tag presence, precompiled-Tailwind usage (no Play CDN, no inline config), `?v=` cache-bust consistency, CSP meta presence, zero inline event handlers, no executable inline scripts (JSON-LD only), `data-ga-params` JSON validity, `data-action` ↔ site.js handler sync, and same-page anchor targets.
- Run with:
  - `node --test tests/*.test.mjs`
