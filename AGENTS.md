# Repository Guidelines

## Project Structure & Module Organization
This repository is a static GitHub Pages site (no backend/runtime services). Key paths:
- `index.html`, `about.html`, `experience.html`, `certificates.html`, `portfolio.html`: top-level pages.
- `portfolio/*.html`: detailed case-study pages.
- `assets/js/`: client-side behavior (`main.js` for modal/article behavior, `portfolio.js` for portfolio routing).
- `assets/css/` and `assets/sass/`: compiled CSS and SASS sources from the Dimension template.
- `images/`: page and portfolio media assets.
- `robots.txt`, `sitemap.xml`, `structured-data.json`, `humans.txt`: SEO/discovery metadata.

## Build, Test, and Development Commands
No build, package manager, or test runner is required.
- `python3 -m http.server 8000`: run locally from repo root.
- Open `http://localhost:8000/index.html`: verify the main page.
- `open index.html` (macOS quick check): fast static preview without a server.
- `git status` and `git diff --stat`: review scope before committing.

## Coding Style & Naming Conventions
- Match existing formatting per file type: HTML/JS commonly use 2-space indentation; keep style consistent within edited files.
- Use lowercase, hyphenated filenames for new pages/assets (for example, `new-case-study.html`).
- Preserve the current modal-article/hash navigation patterns when changing page structure.
- Keep duplicated Tailwind config blocks consistent across top-level HTML pages when updating theme tokens.
- Avoid editing vendored/minified files unless a dependency update is intentional.

## Testing Guidelines
There is no automated suite yet; use manual verification before opening a PR:
- Check navigation and hash routes (`#about`, `#portfolio-grid`, `#work1`).
- Validate responsive layouts on mobile and desktop.
- Confirm contact and external links resolve correctly.
- Verify SEO files still match page URLs after adding/removing pages.

## Commit & Pull Request Guidelines
- Follow existing history style: short, imperative commit subjects (for example, `add certificates page`, `fix typo`).
- Keep commits focused to one logical change.
- PRs should include: purpose, affected pages/files, manual test notes, and screenshots/GIFs for UI changes.
- Link related issues/tasks when available.

## Security & Configuration Tips
- Do not commit secrets/tokens; this is a public static site.
- When changing canonical URLs or page paths, update `sitemap.xml`, `robots.txt`, and structured metadata in the same PR.
