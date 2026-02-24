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

**Modal Article Pattern:** Both `index.html` and `portfolio.html` use a pattern where `<article>` elements inside `<div id="main">` act as modal overlays. Articles are shown/hidden via CSS classes (`active`, `is-article-visible`) with JS managing transitions. Hash fragments (`#about`, `#work1`) drive navigation.

## File Editing Gotchas

- `index.html` and `assets/js/*.js` use CRLF line endings; all other HTML files (experience, about, certificates, portfolio, portfolio/*.html) use LF-only. The Edit tool silently fails to match strings in CRLF files — use Python with `open(path, 'rb')` / `.decode('utf-8')` / write back with `open(path, 'wb')` for reliable replacements.
- Background subagents (`run_in_background: true`) cannot use Edit or Write tools — use them for research/reads only; apply all file edits in the main agent session.

## Key Conventions

- All external dependencies loaded via CDN (Tailwind, Font Awesome, Google Fonts, jQuery) — no `node_modules`
- Tailwind config is duplicated in each HTML file's `<script id="tailwind-config">` block — keep them in sync when changing theme tokens
- Google Analytics tag (G-D11HKMWFB4) is included in each page's `<head>`. Custom GA4 events are instrumented across all pages: `modal_article_viewed`, `portfolio_project_opened`, `resume_downloaded`, `external_link_clicked`, `testimonial_opened`, `social_profile_link_clicked`, `audio_played`, `mobile_menu_toggled`, `contact_intent_registered`, `credential_verified`. GA event pattern: `onclick="if(typeof gtag==='function'){gtag('event',...)}"`.
- Portfolio work cards use `data-work="work1"` attributes; `portfolio.js` reads this to drive hash navigation and modal display.
- SEO: `structured-data.json` contains JSON-LD schema, `sitemap.xml` and `robots.txt` are at root
- Images go in `images/` directory
