# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static resume/portfolio website for Matthew Thaokhamlue, deployed to GitHub Pages. No build step, no bundler, no package manager — just static HTML/CSS/JS served directly.

## Development

Open `index.html` in a browser to test. No build or install commands needed. The site is deployed by pushing to the `main` branch (GitHub Pages serves from root).

## Architecture

**Pages:** Each top-level HTML file is a standalone page sharing a common structure:
- `index.html` — Main landing page (about, experience, certificates, contact as modal articles)
- `portfolio.html` — Portfolio index page linking to standalone editorial case studies
- `about.html`, `experience.html`, `certificates.html` — Dedicated full pages for each section
- `portfolio/*.html` — Individual editorial case study pages for career and personal projects

**Styling:** Dual CSS approach:
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) with inline config in each HTML `<head>` — used for layout and utility classes. Config defines custom colors (`primary: #0da6f2`, `background-dark: #101c22`, `surface: #1a262d`), font family (`Space Grotesk`), and border radius tokens.
- **SASS/CSS** in `assets/sass/` and `assets/css/` — legacy styles from the HTML5 UP Dimension template. `main.css` and `portfolio.css` handle the modal article animation system.

**JavaScript:**
- `assets/js/main.js` — Dimension template's modal article system (hash-based routing, article show/hide animations, keyboard/click handlers). jQuery-based.
- `assets/js/portfolio.js` — Legacy Dimension-template routing; current `portfolio.html` and `portfolio/*.html` case-study pages do not use it.
- `assets/js/ai-match.js` — Custom "Evaluate role fit" feature: reads a job description textarea, builds a prompt, opens ChatGPT or Claude.ai in a popup/tab. Contains all GA custom event tracking for the feature (`ai_match_*` events).
- jQuery, browser detection, and breakpoint utilities are vendored in `assets/js/`.

**Modal Article Pattern:** Legacy Dimension-template pages can use `<article>` elements inside `<div id="main">` as modal overlays. The current `portfolio.html` is a direct-link editorial index, not a modal-article page.

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

- `index.html` and `assets/js/*.js` use CRLF line endings; all other HTML files use LF-only. The Edit tool silently fails to match strings in CRLF files. Use this Python pattern for reliable replacements:
  ```python
  with open('index.html', 'rb') as f: src = f.read().decode('utf-8')
  src = src.replace('OLD', 'NEW')
  with open('index.html', 'wb') as f: f.write(src.encode('utf-8'))
  ```
- Background subagents (`run_in_background: true`) cannot use Edit or Write tools — use them for research/reads only; apply all file edits in the main agent session.
- Worktrees created by Claude land in `.claude/worktrees/` — clean up with `git worktree remove --force` after branches are merged.

## Key Conventions

- All external dependencies loaded via CDN (Tailwind, Font Awesome, Google Fonts, jQuery) — no `node_modules`
- Standard content container: `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — matches nav width/padding exactly. Use this for all section content.
- Tailwind config is duplicated in each HTML file's `<script id="tailwind-config">` block — keep them in sync when changing theme tokens
- Google Analytics tag (G-D11HKMWFB4) in each page `<head>`. GA4 custom events (`resume_downloaded`, `external_link_clicked`, `audio_played`, etc.) use inline `onclick="if(typeof gtag==='function'){gtag('event',...)}"` — never call `gtag()` without the guard.
- `portfolio.html` all project cards link directly to standalone `portfolio/*.html` editorial case-study pages. `portfolio.js`, `data-work` attributes, and old project `<dialog>` modals are legacy and not used.
- SEO: `structured-data.json` contains JSON-LD schema, `sitemap.xml` and `robots.txt` are at root
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
- `tests/static-contract.test.mjs`: verifies local HTML references, AI Match DOM IDs, and prompt template wiring.
- Run with:
  - `node --test tests/*.test.mjs`
