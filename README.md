# Matthew Thaokhamlue - Resume & Portfolio

Personal resume and portfolio website for Matthew Thaokhamlue, Senior AI Product Manager. Static HTML/CSS/JS with no build step, deployed to GitHub Pages from the `main` branch.

## Live Website

https://matthew-thaokhamlue.github.io/resume/

## Architecture

- **No build step to deploy.** Every page is standalone HTML served directly from the repo root. To develop, serve the root over http (`python3 -m http.server 8765`): the logo masks do not load over `file://`. (Tailwind has a dev-time regen step only when classes change — see `tailwind.config.js`.)
- **Styling**: precompiled Tailwind CSS (`assets/css/tailwind.css`, theme in `tailwind.config.js`), plus `assets/css/editorial.css` for the design system: light and dark tokens, Instrument Sans and IBM Plex Mono.
- **Reveals**: panels and tiles open full-screen `<dialog>` reveals through `assets/js/site.js`; a URL fragment opens its reveal, and without scripts every reveal's content shows in the page.
- **Star cursor**: `assets/js/star-cursor.js` replaces the mouse cursor with a clay star on devices with a fine pointer and no reduced-motion request.
- **Fit mode**: on Experience, Portfolio and Certifications, the whole page fits the window (761 x 500 px and up) with no scrolling; phones keep scrolling.
- **Loop hero**: `assets/js/loop-hero.js` draws the home page loop with WebGL 2 and writes the M once per load, within 4.8 s. No page moves on scroll.
- **AI Match**: `assets/js/ai-match.js` powers the "Evaluate role fit" feature on the homepage (paste a job description, open ChatGPT/Claude with a prefilled prompt).
- **Analytics**: GA4 (`G-D11HKMWFB4`) loads only after the visitor accepts the cookie banner (`assets/js/site.js`), with declarative `data-ga-event` click tracking.
- **Security**: every page ships a Content-Security-Policy meta tag with no `'unsafe-inline'` scripts; all interactive behavior lives in external JS.

## Pages

```
index.html               Home: the loop hero, results with receipts, How I work, testimonials, AI Match, contact
experience.html          A Fibonacci spiral of role tiles (most recent largest) that open full-screen reveals
portfolio.html           A mosaic of project tiles; each reveal links its case study
portfolio/*.html         Standalone case studies (career + personal projects)
certificates.html        A mosaic of credential tiles with verify links
about.html               Redirect stub to index.html
cv.html                  Generated CV export (linked as a download)
llms.txt / llms-full.txt Machine-readable profile for AI crawlers
```

Three retired case pages (`portfolio/mcp-server.html`, `portfolio/automation-tools.html`, `portfolio/interview-prep.html`) are redirect stubs to `portfolio.html`.

## Tests & CI

```bash
node --test tests/*.test.mjs   # contract tests (local refs, metadata, sitemap sync, reveals, loop hero, AI Match)
bash harness/validate.sh       # invariant checks (consent-gated GA, site.js on every page, brand phrase)
```

Both run in GitHub Actions (`.github/workflows/ci.yml`) on every push and pull request against `main`.

## Deployment

Push to `main`. GitHub Pages serves the repository root; there is no build or release step.

## Contact

- **Email**: matthew.thaokhamlue@gmail.com
- **LinkedIn**: [linkedin.com/in/matthewthaokhamlue](https://www.linkedin.com/in/matthewthaokhamlue)
- **GitHub**: [github.com/matthew-thaokhamlue](https://github.com/matthew-thaokhamlue)
