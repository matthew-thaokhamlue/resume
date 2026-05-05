# Plan — Apply index.html Editorial Elegance to portfolio.html + certificates.html

## Context

Phase 1 (the editorial rebuild of `index.html`) shipped on `main` at commit `b0cdefb`. It introduced a full editorial design system in `assets/css/editorial.css` (Fraunces variable serif + Space Grotesk, dark editorial palette `#0a1014 / #f3f5f7 / #4fb6dc`, namespaced `.ed-*` classes for topbar, hero, eyebrow, rule, buttons, philosophy, stages, signature, quote, foot) and shared GSAP scrub/reveal logic in `assets/js/editorial.js`.

Today `portfolio.html` and `certificates.html` still use the **old** visual system: Tailwind `glass-nav` topbar, centered bold sans hero, `bg-surface` cards with cyan pill tags, fade-in animations. They look like a different site than the new `index.html`.

The user wants those two pages to inherit the same elegance — Fraunces display headline, hairline-on-dark cards, calm `.ed-eyebrow` section labels, scroll-driven reveals, the new topbar and footer — **without losing any content, links, GA events, modals, or routing**. Scope is explicitly *only* these two pages this round (`experience.html` and the `portfolio/*.html` case studies are deferred to a later prompt).

## What "elegance from index page" means concretely

1. **Topbar**: replace the `glass-nav` Tailwind header with `<header class="ed-topbar">` markup that mirrors `index.html:145-167` exactly (brand mark "M", hairline bottom border, calm hover, mono-feeling links). The mobile menu hamburger still calls `toggleMenu()` since it's the same contract.
2. **Hero**: replace the centered `text-4xl sm:text-6xl font-bold` headline with `.ed-hero` markup — eyebrow pill, Fraunces variable display headline (with one italic emphasis word per index's pattern), supporting line below. Slightly more compact than index's full-viewport hero since these are content pages, not landing — use a `.ed-hero--page` modifier (new) that drops the min-height and trims padding.
3. **Section heads**: replace the `material-symbols-outlined work` + `<h2>Career Portfolio</h2>` icon-and-headline pattern with `.ed-eyebrow` small-caps label + larger Fraunces headline (matches index's "The system" / "In their words" rhythm at `index.html:270, 323`).
4. **Cards**: redesign with hairline border on `--ed-surface-1` (#0f161b), Fraunces title, calm `--ed-ink-soft` body, no cyan pill tags. Tags become small-caps Space Grotesk eyebrow text with a thin hairline border, no fill. Hover lifts 1px and brightens hairline to `--ed-accent`. This is the biggest single elegance lift.
5. **Footer**: replace the bespoke per-page footer with the `<footer class="ed-foot">` pattern from `index.html:380-394`. GA events on the LinkedIn/GitHub icons preserved verbatim.
6. **Reveals**: add `.reveal` class to each section block. `editorial.js`'s `initBaseReveal()` already toggles `is-in` via ScrollTrigger — just including `editorial.js` and adding the class makes it work.
7. **Fonts + GSAP**: add the Fraunces Google Fonts link and GSAP 3.12.5 + ScrollTrigger CDN scripts that `index.html` already loads. Tailwind stays — mobile menu and dialog markup still use it.

## What does NOT change (load-bearing)

- All textual copy, headings, descriptions, dates, names, links.
- All `<a href>` URLs, including the three career card links (`portfolio/labforward.html`, `portfolio/labtwin.html`, `portfolio/thryve.html`) and all 14 certificate credly/coursera/microsoft URLs.
- All inline `gtag('event', ...)` calls — same event names, same parameters, same `typeof gtag === 'function'` guard. Specifically: `credential_verified`, `social_profile_link_clicked`.
- The `<dialog id="project-modal">` markup at `portfolio.html:361-424` and the JS contract: `openProject(projectId)`, `closeProject(event)`, the `projects` data dictionary with three entries (`mcp-server`, `automation-tools`, `interview-prep`).
- The `toggleMenu()` function and `#mobile-menu` Tailwind drawer markup. Mobile menu is reused, just inserted under the new `.ed-topbar`.
- All image paths (`images/thryve-card.png`, `images/labtwin-card.png`, `images/labforward-card.png`).
- JSON-LD, OG meta, GA bootstrap script in `<head>`.
- File names, URLs, routing — every page stays at its current path.
- LF line endings on `portfolio.html` and `certificates.html` (per `CLAUDE.md`: "`index.html` and `assets/js/*.js` use CRLF; all other HTML files use LF-only"). The Edit tool is fine here.

## Concrete changes

### 1. `assets/css/editorial.css` — add reusable card + section primitives

Append the following selectors. Plain CSS (no `@layer` wrapper, per the cascade-bug fix that resolved Phase 1's Tailwind preflight collision).

- `.ed-hero--page` — modifier for hero on content pages: drops `min-height: 100vh`, trims top padding to `calc(var(--ed-s-7) + var(--ed-s-3))`.
- `.ed-section` — full-width section with `padding-block: var(--ed-s-8)`, hairline divider via `:not(:last-child)::after` rule.
- `.ed-section__inner` — `max-width: var(--ed-content-max); margin-inline: auto; padding-inline: var(--ed-gutter-x);`.
- `.ed-section__head` — flex column, `gap: var(--ed-s-3)`, bottom margin `var(--ed-s-7)`.
- `.ed-section__eyebrow` — alias of `.ed-eyebrow` for clarity.
- `.ed-section__title` — Fraunces, `var(--ed-fz-3xl)`, line-height 1.05, `letter-spacing: -0.02em`.
- `.ed-cards` — CSS grid: `grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: var(--ed-s-5);`.
- `.ed-card` — `display: flex; flex-direction: column; gap: var(--ed-s-4); padding: var(--ed-s-5); background: var(--ed-surface-1); border: 1px solid var(--ed-hairline); border-radius: var(--ed-radius-lg); color: inherit; text-decoration: none; transition: transform var(--ed-d-base), border-color var(--ed-d-base);`. Hover: `transform: translateY(-2px); border-color: var(--ed-accent-mute);`.
- `.ed-card__media` — `aspect-ratio: 16/10; overflow: hidden; border-radius: var(--ed-radius-md); background: var(--ed-surface-2);`. Inner `img` uses `width: 100%; height: 100%; object-fit: cover;` with subtle `transform: scale(1)` → `scale(1.04)` on `.ed-card:hover`.
- `.ed-card__icon` — for cert cards: `width: 3rem; height: 3rem; border-radius: 999px; border: 1px solid var(--ed-hairline); display: grid; place-items: center; color: var(--ed-accent);`.
- `.ed-card__kicker` — small-caps Space Grotesk, `var(--ed-fz-xs)`, `letter-spacing: 0.14em`, `color: var(--ed-ink-mute)`. Used for issuer name on cert cards.
- `.ed-card__title` — Fraunces, `var(--ed-fz-xl)`, line-height 1.15, `color: var(--ed-ink)`.
- `.ed-card__lede` — Space Grotesk, `var(--ed-fz-sm)`, `color: var(--ed-ink-soft)`, line-height 1.55, `display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;` for the 3-line truncation pattern that exists today.
- `.ed-card__tags` — flex wrap, `gap: var(--ed-s-2)`.
- `.ed-tag` — inline-block, `padding: 0.25rem 0.5rem`, `border: 1px solid var(--ed-hairline); border-radius: 999px; font-family: var(--ed-body); font-size: var(--ed-fz-xs); letter-spacing: 0.06em; text-transform: uppercase; color: var(--ed-ink-mute);`. No fill, no cyan flood.
- `.ed-card__cta` — small `.ed-link` clone, `margin-top: auto`. Optional, used for "View on GitHub" → external arrow.
- `.ed-card--cert` — variant tweak: `flex-direction: column`, top row `display: flex; justify-content: space-between; align-items: center` for icon + open-in-new arrow.
- Reduced-motion: existing `@media (prefers-reduced-motion: reduce)` already covers `.reveal`. Add `.ed-card { transition: none; }` inside that media query.

No changes to existing tokens or selectors. Append-only.

### 2. `portfolio.html` — full visual rewrite, content preserved

Section by section:

- **`<head>`** (lines 4-120):
  - Keep GA bootstrap, meta, OG tags, canonical, favicon, Tailwind CDN, Tailwind config, Material Symbols, Font Awesome.
  - Add Fraunces Google Fonts link from `index.html:97-99` (preconnect + variable axes).
  - Add `<link rel="stylesheet" href="assets/css/editorial.css?v=20260505a" />` after the Tailwind config script.
  - Remove the inline `<style>` block at lines 67-119 (`glass-nav`, `animate-fade-in`, `card-hover`, scrollbar). Editorial.css already handles scrollbar styling; the rest become unused.
- **`<body>`** (line 122): change to `class="ed-page"` (drops `font-display bg-background-dark`, since `.ed-page` defines those tokens). Keep antialiased + selection if helpful via inline class.
- **Topbar** (lines 126-152): replace with `.ed-topbar` markup mirroring `index.html:145-167`. Update the active link: Portfolio gets `aria-current="page"` and a slightly stronger color via `[aria-current="page"]` rule already in editorial.css (verify or add).
- **Mobile menu** (lines 155-168): keep the `<div id="mobile-menu">` and `toggleMenu()` JS contract. Tailwind classes preserved. Active link styling matches.
- **Hero** (lines 171-181): rewrite as
  ```html
  <section class="ed-hero ed-hero--page">
    <div class="ed-hero__inner">
      <div class="ed-hero__meta">
        <span class="ed-eyebrow">Selected works · 2018 — present</span>
      </div>
      <h1 class="ed-hero__display">Portfolio &amp; <em>projects</em>.</h1>
      <p class="ed-hero__support">A selected collection of professional case studies and personal AI projects — products I led from discovery to production.</p>
    </div>
  </section>
  ```
- **Career portfolio section** (lines 183-252): rewrite as
  ```html
  <section class="ed-section reveal">
    <div class="ed-section__inner">
      <div class="ed-section__head">
        <span class="ed-section__eyebrow">Career portfolio</span>
        <h2 class="ed-section__title">Products I led from <em>discovery</em> to production.</h2>
      </div>
      <div class="ed-cards">
        <a class="ed-card" href="portfolio/thryve.html">…</a>
        <a class="ed-card" href="portfolio/labtwin.html">…</a>
        <a class="ed-card" href="portfolio/labforward.html">…</a>
      </div>
    </div>
  </section>
  ```
  Each card: `<div class="ed-card__media"><img …></div>` → `<p class="ed-card__kicker">Lab Intelligence Platform</p>` → `<h3 class="ed-card__title">Labforward GmbH</h3>` → `<p class="ed-card__lede">…</p>` → `<div class="ed-card__tags"><span class="ed-tag">GenAI</span>…</div>`. All copy preserved verbatim from current cards (lines 199-249).
- **Personal projects section** (lines 255-332): same structure as career, but `<a class="ed-card">` becomes `<button class="ed-card" type="button" onclick="openProject('mcp-server')">` (or `<div class="ed-card" tabindex="0" role="button" onclick=…>` to match current behavior — pick `<button>` for accessibility, since `openProject` doesn't need link semantics). Inner markup mirrors career cards but uses Material Symbols icon as the media (no image): the existing `terminal`, `auto_fix_high`, `smart_toy` icons stay, sized at `font-size: 4rem; color: var(--ed-accent-mute);` inside a `.ed-card__media` block.
- **Footer** (lines 337-355): replace with `.ed-foot` from `index.html:380-394`. Preserve both GA `social_profile_link_clicked` events with `page:'portfolio'` parameter.
- **Project modal `<dialog>`** (lines 361-424): keep markup intact — it has IDs the JS depends on (`modal-title`, `modal-tags`, `modal-image-container`, `modal-image`, `modal-links`, `modal-overview`, `modal-challenge`, `modal-solution`, `modal-tech`, `modal-impact`). Optional polish: bump `<h3 id="modal-title">` to use `.ed-card__title` typography, change overview/challenge/solution `<h4>` from cyan uppercase to `.ed-eyebrow` style. Tag pills inside the modal stay cyan because they're part of the modal's internal style language and the user didn't ask for modal redesign — leave them alone unless trivially overridable.
- **Scripts** (lines 426-548): keep `toggleMenu`, `projects` dict, `openProject`, `closeProject` exactly as-is. Add `<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>` + ScrollTrigger + `<script src="assets/js/editorial.js?v=20260505a"></script>` before the existing inline `<script>` block. (Order matters: editorial.js registers ScrollTrigger; the inline script defines page-specific functions.)

### 3. `certificates.html` — same treatment, certificate card variant

- **`<head>`** (lines 4-111): same diff as portfolio.html (add Fraunces, add editorial.css link, remove inline style block, keep everything else). Title and description unchanged.
- **`<body>`** (line 113): `class="ed-page"`.
- **Topbar + mobile menu** (lines 117-161): same rewrite. Active link is Certifications.
- **Hero** (lines 166-176): rewrite as
  ```html
  <section class="ed-hero ed-hero--page">
    <div class="ed-hero__inner">
      <div class="ed-hero__meta">
        <span class="ed-eyebrow">Verified credentials · 14 active</span>
      </div>
      <h1 class="ed-hero__display">Certifications &amp; <em>achievements</em>.</h1>
      <p class="ed-hero__support">Professional certifications across product management, cloud architecture (Azure, AWS), cybersecurity, and agile delivery.</p>
    </div>
  </section>
  ```
- **Certificate grid** (lines 179-495): wrap in a single `<section class="ed-section reveal">` → `<div class="ed-section__inner">` → `<div class="ed-cards">`. Each `<a>` becomes `<a class="ed-card ed-card--cert">…</a>`. Inside:
  ```html
  <div class="ed-card__media" style="display:flex; align-items:center; justify-content:space-between;">
    <span class="ed-card__icon"><span class="material-symbols-outlined">sprint</span></span>
    <span class="material-symbols-outlined" style="color: var(--ed-ink-mute); font-size: 1.25rem;">open_in_new</span>
  </div>
  <div class="ed-card__body">
    <h3 class="ed-card__title">Professional Scrum Product Owner I</h3>
    <p class="ed-card__kicker">Scrum.org</p>
    <p class="ed-card__lede">Supports backlog prioritization around customer value, …</p>
  </div>
  ```
  All 14 cert cards preserved with their existing `href`, `target="_blank"`, `onclick` GA events, and copy. The three category comment markers (`<!-- ========== PRODUCT MANAGEMENT & BUSINESS ========== -->` etc.) stay as in-source dividers but are not rendered as visual section breaks for now (cards flow into one grid). If the user wants visual category groupings, that's a follow-up.
- **Footer** (lines 502-521): `.ed-foot` rewrite. GA events with `page:'certificates'` preserved.
- **Scripts** (lines 526-530): add GSAP + editorial.js scripts before the existing inline `<script>` block. Keep `toggleMenu` exactly.

## Critical files

- **Modify**: `assets/css/editorial.css` — append new selectors only (`.ed-hero--page`, `.ed-section*`, `.ed-cards`, `.ed-card*`, `.ed-tag`). No edits to existing rules.
- **Rewrite**: `portfolio.html` — full body restructure, head augmented, scripts intact.
- **Rewrite**: `certificates.html` — same.
- **Touched, not modified semantically**: `assets/js/editorial.js` already runs `initBaseReveal` on page load — no JS edit needed; just including the script gives `.reveal` behavior.

## Do not touch

- `index.html`, `experience.html`, `portfolio/labforward.html`, `portfolio/labtwin.html`, `portfolio/thryve.html` — out of scope this round.
- `assets/js/main.js`, `portfolio.js`, `ai-match.js`, `jquery.min.js`, etc.
- `tests/*.test.mjs` — both regression tests still pass unchanged (test paths point to `experience.html`).
- `structured-data.json`, `sitemap.xml`, `robots.txt`, `humans.txt`, `favicon.svg`, `images/`, `Matthew main CV.pdf`.

## GitHub Pages compatibility

- All deps still CDN-loaded (Tailwind, Fraunces, Space Grotesk, Material Symbols, Font Awesome, GSAP). No build step.
- New CSS additions live in the existing `assets/css/editorial.css` — same static asset path, same cache-buster query param pattern (`?v=20260505b` after this Phase 2 ship).
- No SPA routing changes. URLs unchanged.

## Verification

1. **Local browser smoke** — open `portfolio.html` and `certificates.html` in Safari/Chrome:
   - Topbar matches index.html visually (brand mark, hairline, link spacing, active state on the current page).
   - Hero shows Fraunces display + eyebrow + support line. No 16px-fallback bug (the cascade fix is already in place since it's the same editorial.css).
   - Cards render with hairline borders on the dark surface, no cyan pill tags. Hover lifts and brightens hairline.
   - Career cards still navigate to `portfolio/labforward.html` etc.
   - Personal project cards still open the `<dialog>` modal with full content.
   - Cert cards still open external credly/coursera/microsoft URLs in new tabs.
   - Footer LinkedIn + GitHub icons fire GA events.
   - Mobile menu still toggles open/close and active link reflects current page.
   - Scroll reveals fire — sections fade-up once as they enter viewport (`.reveal` → `is-in`).
2. **GA event check** (DevTools → Network → filter `collect`): on portfolio, click any career or personal card → no firing on cards (correct: career cards don't have GA, personal cards don't have GA). Click footer LinkedIn → fires `social_profile_link_clicked` with `page:'portfolio', link_position:'footer'`. On certificates, click a cert → fires `credential_verified` with the original issuer/name params.
3. **Regression tests** — run `node --test tests/ai-match.test.mjs tests/stack-snap-upward-regression.test.mjs`. Should still pass (no changes to `index.html`, `experience.html`, or test fixtures).
4. **Mobile breakpoint** (375 px): no horizontal overflow, hero compresses cleanly, cards reflow to one column, mobile menu opens.
5. **Reduced motion**: `prefers-reduced-motion: reduce` disables `.reveal` animations and card transitions; final state renders.
6. **Lighthouse spot check** on both pages: performance ≥ 90, accessibility ≥ 95, no LCP regression from added Fraunces (it's already preconnected from index.html so the font file may already be cached when navigating).
7. **Cross-page nav**: from `index.html` → click Portfolio → land on rebuilt portfolio.html → click Certifications → land on rebuilt certificates.html → click Home → back to index.html. Topbar feel stays consistent across all four routes.
8. **Live deploy**: push to `main`, wait ~60s for Pages, load `https://matthew-thaokhamlue.github.io/resume/portfolio.html` and `…/certificates.html`, confirm no console errors, no 404s, GA events fire over https.

## Resolved scope

- Pages in scope: `portfolio.html` and `certificates.html`.
- Pages deferred: `experience.html`, `portfolio/*.html` case study pages (separate Phase 2 prompts that already exist for pi-agent).
- Card design: aggressive editorial — hairline borders, no cyan pill fills, Fraunces titles, calm eyebrow tags. (User can pull back during review.)
- `<dialog>` project modal internals: left as-is. Restyling the modal body is a follow-up if the user wants it.
