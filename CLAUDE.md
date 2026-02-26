# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static resume/portfolio website for Matthew Thaokhamlue, deployed to GitHub Pages. No build step, no bundler, no package manager — just static HTML/CSS/JS served directly.

## Development

Open `index.html` in a browser to test. No build or install commands needed. The site is deployed by pushing to the `main` branch (GitHub Pages serves from root).

## Architecture

**Pages:** Each top-level HTML file is a standalone page sharing a common structure:
- `index.html` — Main landing page (about, experience, certificates, contact as modal articles)
- `portfolio.html` — Portfolio page with work detail modals
- `about.html`, `experience.html`, `certificates.html` — Dedicated full pages for each section
- `portfolio/*.html` — Individual portfolio case study pages (labforward, labtwin, thryve)

**Styling:** Dual CSS approach:
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) with inline config in each HTML `<head>` — used for layout and utility classes. Config defines custom colors (`primary: #0da6f2`, `background-dark: #101c22`, `surface: #1a262d`), font family (`Space Grotesk`), and border radius tokens.
- **SASS/CSS** in `assets/sass/` and `assets/css/` — legacy styles from the HTML5 UP Dimension template. `main.css` and `portfolio.css` handle the modal article animation system.

**JavaScript:**
- `assets/js/main.js` — Dimension template's modal article system (hash-based routing, article show/hide animations, keyboard/click handlers). jQuery-based.
- `assets/js/portfolio.js` — Portfolio-specific routing that extends the article system with work card clicks, hash-based navigation between portfolio grid and work detail modals, and escape/close behavior that redirects appropriately.
- `assets/js/ai-match.js` — Custom "Evaluate role fit" feature: reads a job description textarea, builds a prompt, opens ChatGPT or Claude.ai in a popup/tab. Contains all GA custom event tracking for the feature (`ai_match_*` events).
- jQuery, browser detection, and breakpoint utilities are vendored in `assets/js/`.

**Modal Article Pattern:** `index.html` uses a pattern where `<article>` elements inside `<div id="main">` act as modal overlays. Articles are shown/hidden via CSS classes (`active`, `is-article-visible`) with JS managing transitions. Hash fragments (`#about`) drive navigation.

## Scroll Stack Panel Pattern

`index.html` and `experience.html` use a Geist-style stacking scroll effect. Key CSS class `.stack-panel` is defined inline in each page's `<style>` block:

```css
.stack-panel { position: sticky; top: 0; z-index: var(--panel-z, 10); background: #101c22;
  transform-origin: top center; transition: scale 0.55s, filter 0.55s, border-radius 0.55s; will-change: scale, filter; }
.stack-panel + .stack-panel { border-radius: 1.5rem 1.5rem 0 0; box-shadow: 0 -8px 48px rgba(0,0,0,.55); }
.stack-panel.is-covered { scale: 0.965; filter: brightness(0.58); border-radius: 1.5rem; }
```

A passive scroll IIFE toggles `is-covered` when the next panel's top crosses `vh * 0.88`. Each panel gets `style="--panel-z:N"` (10, 20, 30...).

- **`index.html`**: hero (`--panel-z:10`) → testimonials (`--panel-z:20`, `h-screen overflow-hidden`) → my story (`--panel-z:30`)
- **`portfolio.html`**: no stack panels (scrolling removed)
- **`experience.html`**: 5 stack panels (`--panel-z:10`–`50`), one per job role. Scroll IIFE uses cached `flowOffsets[]` (cumulative heights) to avoid sticky `offsetTop` distortion. `SNAP_EDGE_GUTTER_UP=200` gate allows natural scroll through each panel before an upward snap fires.
  - Panels 1–4 use an "Our Disciplines" 50/50 layout: organic SVG tree rings (left) + editorial text (right). Panel 5 is Skills/Education with a 3-column card grid.
  - SVG tree ring counts = **accumulated career years**: Labforward=8, LabTwin=7, Thryve=5, EY=2. Preserve these when editing SVGs.
  - Panel 5 requires `.card-hover` CSS in the page `<style>` block — don't remove it when editing other styles.

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
- Standard stack-panel content container: `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — matches nav width/padding exactly. Use this for all panel content.
- Tailwind config is duplicated in each HTML file's `<script id="tailwind-config">` block — keep them in sync when changing theme tokens
- Google Analytics tag (G-D11HKMWFB4) in each page `<head>`. GA4 custom events (`resume_downloaded`, `external_link_clicked`, `audio_played`, etc.) use inline `onclick="if(typeof gtag==='function'){gtag('event',...)}"` — never call `gtag()` without the guard.
- `portfolio.html` career cards link directly to `portfolio/*.html`; personal project cards use an inline `openProject(id)` JS function with a `<dialog>` modal. `portfolio.js` and `data-work` attributes are legacy and not used.
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

## Smooth Scroll Implementation Notes (2026-02-26)

Append-only operational note for future edits:

- `index.html` and `experience.html` should keep the same stack snap algorithm for consistent feel.
- Root-cause lesson: viewport-nearest panel snapping can feel hectic on upward wheel input with sticky panels.
- Preferred approach is flow-based snapping with cached cumulative offsets:
  - Build `flowOffsets[]` from panel `offsetHeight` in order.
  - Determine active panel from `window.scrollY` against `flowOffsets[]`.
  - Compute snap target by centering the target panel in viewport.
- Required constants for current behavior:
  - `WHEEL_THRESHOLD = 20`
  - `SNAP_DURATION_MS = 960`
  - `SNAP_LOCK_MS = 560`
  - `SNAP_EDGE_GUTTER_UP = 200`
- Keep upward snap guard in place:
  - Upward snap only when user is near panel top
  - Condition: `direction < 0 && window.scrollY > flowOffsets[from] + SNAP_EDGE_GUTTER_UP` should return `false` (do not snap yet)
- Keep `wheel` ignore guard for nested scroll containers and interactive controls:
  - `dialog[open]`, `.overflow-y-auto`, `textarea`, `input`, `select`, `[data-stack-snap-ignore]`
- Re-cache offsets on resize (`cacheFlowOffsets()`), then run `update()`.
- Mobile mode (`max-width: 767px`) should bypass snapping and covered transforms.

### Regression Test

- File: `tests/stack-snap-upward-regression.test.mjs`
- Purpose: verifies upward wheel does not force snap when user is deep inside current panel.
- Run with:
  - `node --test tests/ai-match.test.mjs tests/stack-snap-upward-regression.test.mjs`
