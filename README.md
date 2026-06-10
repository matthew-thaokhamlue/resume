# Matthew Thaokhamlue - Resume & Portfolio

Personal resume and portfolio website for Matthew Thaokhamlue, Senior AI Product Manager. Static HTML/CSS/JS with no build step, deployed to GitHub Pages from the `main` branch.

## Live Website

https://matthew-thaokhamlue.github.io/resume/

## Architecture

- **No build step to deploy.** Every page is standalone HTML served directly from the repo root. Open `index.html` in a browser to develop. (Tailwind has a dev-time regen step only when classes change — see `tailwind.config.js`.)
- **Styling**: precompiled Tailwind CSS (`assets/css/tailwind.css`, theme in `tailwind.config.js`), plus `assets/css/editorial.css` for the editorial design system.
- **Motion**: GSAP + ScrollTrigger (pinned CDN with SRI hashes) drive scroll reveals via `assets/js/editorial.js`. Native OS scrolling only; reduced motion is honored.
- **AI Match**: `assets/js/ai-match.js` powers the "Evaluate role fit" feature on the homepage (paste a job description, open ChatGPT/Claude with a prefilled prompt).
- **Analytics**: GA4 (`G-D11HKMWFB4`) bootstrapped in `assets/js/site.js`, with declarative `data-ga-event` click tracking.
- **Security**: every page ships a Content-Security-Policy meta tag with no `'unsafe-inline'` scripts; all interactive behavior lives in external JS.

## Pages

```
index.html               Landing page (hero, testimonials, AI Match, contact)
experience.html          Career history with tree-ring visuals per role
portfolio.html           Index of editorial case studies
portfolio/*.html         Standalone case studies (career + personal projects)
certificates.html        Certifications
about.html               Redirect stub to index.html
cv.html                  Generated CV export (linked as a download)
llms.txt / llms-full.txt Machine-readable profile for AI crawlers
```

## Tests & CI

```bash
node --test tests/*.test.mjs   # contract tests (local refs, metadata, sitemap sync, AI Match)
bash harness/validate.sh       # invariant checks (GA tags, gtag guards, brand phrase)
```

Both run in GitHub Actions (`.github/workflows/ci.yml`) on every push and pull request against `main`.

## Deployment

Push to `main`. GitHub Pages serves the repository root; there is no build or release step.

## Contact

- **Email**: matthew.thaokhamlue@gmail.com
- **LinkedIn**: [linkedin.com/in/matthewthaokhamlue](https://www.linkedin.com/in/matthewthaokhamlue)
- **GitHub**: [github.com/matthew-thaokhamlue](https://github.com/matthew-thaokhamlue)
