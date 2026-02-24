# AGENTS.md

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
- jQuery, browser detection, and breakpoint utilities are vendored in `assets/js/`.

**Modal Article Pattern:** Both `index.html` and `portfolio.html` use a pattern where `<article>` elements inside `<div id="main">` act as modal overlays. Articles are shown/hidden via CSS classes (`active`, `is-article-visible`) with JS managing transitions. Hash fragments (`#about`, `#work1`) drive navigation.

## Key Conventions

- All external dependencies loaded via CDN (Tailwind, Font Awesome, Google Fonts, jQuery) — no `node_modules`
- Tailwind config is duplicated in each HTML file's `<script id="tailwind-config">` block — keep them in sync when changing theme tokens
- Google Analytics tag (G-D11HKMWFB4) is included in each page's `<head>`
- SEO: `structured-data.json` contains JSON-LD schema, `sitemap.xml` and `robots.txt` are at root
- Images go in `images/` directory
