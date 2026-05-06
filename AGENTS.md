# AGENTS.md

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
- jQuery, browser detection, and breakpoint utilities are vendored in `assets/js/`.

**Modal Article Pattern:** Legacy Dimension-template pages can use `<article>` elements inside `<div id="main">` as modal overlays. The current `portfolio.html` is a direct-link editorial index, not a modal-article page.

**Stacking Scroll Pattern (`index.html`, `experience.html`):**
- Both pages use inline `.stack-panel` CSS (`position: sticky`, `top: 0`) plus a wheel-driven snap IIFE near the end of each file.
- Smoothness depends on cached `flowOffsets[]` (cumulative panel heights) instead of viewport-nearest panel detection.
- Shared snap constants:
  - `WHEEL_THRESHOLD = 20`
  - `SNAP_DURATION_MS = 960`
  - `SNAP_LOCK_MS = 560`
  - `SNAP_EDGE_GUTTER_UP = 200` (critical for natural upward scrolling)
- Upward snap guard: only allow upward snap when near the top edge of the active panel (`scrollY <= flowOffsets[from] + SNAP_EDGE_GUTTER_UP`).
- Recompute offsets on resize (`cacheFlowOffsets()`), and keep wheel-ignore guard for nested scrollable areas (`dialog[open]`, `.overflow-y-auto`, form fields, `[data-stack-snap-ignore]`).
- Mobile (`max-width: 767px`) disables snapping and covered-state transforms.

## Key Conventions

- All external dependencies loaded via CDN (Tailwind, Font Awesome, Google Fonts, jQuery) — no `node_modules`
- Tailwind config is duplicated in each HTML file's `<script id="tailwind-config">` block — keep them in sync when changing theme tokens
- Google Analytics tag (G-D11HKMWFB4) is included in each page's `<head>`
- SEO: `structured-data.json` contains JSON-LD schema, `sitemap.xml` and `robots.txt` are at root
- Images go in `images/` directory
- Editorial case-study feature blocks can switch from `.case-feature__media--icon` placeholders to plain `.case-feature__media` with an `<img src="../images/*.png">`; existing CSS already handles crop and sizing.
- `labtwin.html` and `labforward.html` use a local `.case-feature__media--illustration` variant for full-bleed art; disable the default image filter/transform and hide the media overlay so abstract illustrations render cleanly.
- `portfolio.html` card covers should use dedicated `images/*-card.png` assets rather than the larger case-study illustration files, so grid art can diverge without overwriting page-level visuals.
- `thryve.html` now uses the same local `.case-feature__media--illustration` treatment for full-bleed abstract art instead of the older SDK screenshot-style media block.
- If editing JavaScript behavior, AI Match markup, local page links/assets, or stack snap behavior, re-run:
  - `node --test tests/*.test.mjs`

## Known Issues

None at this time.
