# Task: Bring experience.html and portfolio.html up to the same animation caliber as the rest of the site

## Context: what already shipped (build on it, don't duplicate it)

Two animation upgrades shipped recently, establishing the site's motion language:

1. **index.html "Living Workflow" hero** (`assets/js/hero.js`, commit eb74e2c): generative
   2D-canvas agent-workflow graph behind the headline (nodes, bezier edges, traveling accent
   pulses, DISCOVERY/ARCHITECTURE/BUILD/SHIP labeled chain), char-split GSAP load intro that
   restores the original h1 innerHTML on complete, magnetic CTA pills (±7px quickTo), scroll
   cue, parallax + fade on scroll exit.
2. **experience.html tree rings** (`assets/js/rings.js`, commit 05f4bc9): the five organic
   ring SVGs draw themselves in on scroll (innermost first via stroke-dash, one ring per
   career year), accent ping off the newest ring, slow idle rotation + counter-orbiting rim
   caption paused offscreen, cursor tilt on fine pointers.

Read both files first; they are the style guide. CLAUDE.md documents both under
**JavaScript**. Design language: editorial dark (#0a1014), Fraunces display + Space Grotesk,
accent #4fb6dc, quiet confidence, motion that serves the metaphor ("I build AI workflows").

## Scope: overhaul these two pages

- **experience.html** (rings already animate, the rest of the page doesn't): plan a coherent
  upgrade for everything around them. Candidates: scroll-triggered choreography for the role
  titles and the intro/header section (consistent with the index char-split language),
  staggered reveals for story beats and skill chips, and a connective "career spine" element
  linking the five chapters. Also fix the pre-existing 28px horizontal overflow on mobile,
  caused by unrevealed `.reveal-right` wrappers translated +44px (an `overflow-x: clip` on
  the page or sections; verify it doesn't break reveals).
- **portfolio.html** (currently has zero scroll-driven motion): page intro choreography for
  its `ed-hero--page` header, staggered card-grid reveals, and card hover micro-interactions
  with one signature touch in the established language. Keep it quieter than index; it's a
  gallery, not a hero.

Plan first (plan mode), and give me 2-3 direction options per page via AskUserQuestion with
ASCII previews before writing the plan, like the hero session did.

## Hard constraints (all contract-tested; violations fail CI)

- **CSP**: no inline `<script>` (JSON-LD only), no inline `on*=` handlers. All JS in local
  files; GSAP 3.12.5 + ScrollTrigger load from cdnjs with SRI on both pages already.
- **New JS files**: one IIFE file per page, LF line endings, own `?v=` cache-bust version
  (pattern: hero.js/rings.js use `?v=20260611a`). Filename must NOT end in `site.js`,
  `editorial.js`, `editorial.css`, or `tailwind.css`: the cache-bust contract regex is
  unanchored and would then require the shared `?v=` value.
- **Tailwind is precompiled**: prefer zero new Tailwind utility classes; put new styles in
  `assets/css/editorial.css` as `ed-*` classes (LF, Edit tool works). If you must add
  Tailwind classes, regenerate per the command in tailwind.config.js's header.
- **Line endings**: experience.html and portfolio.html are LF (Edit tool OK). index.html and
  editorial.js are CRLF; don't touch them unless needed, and then only via python binary
  read/replace/write.
- **Don't break existing contracts**: the growth-rings test (5 `svg.ed-rings`, ring counts
  9/8/7/5/2, the `<title>` text), the experience story-beat phrase tests, per-page metadata
  tests. Don't touch `editorial.js`'s existing functions; rings.js must keep working.
- **Fail-visible rule**: content must be fully visible with no JS, blocked CDN, old
  browsers, and `prefers-reduced-motion: reduce`. Apply hiding via JS only, or via CSS gated
  behind `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)` plus a
  `data-*-pending` attribute the JS removes unconditionally on first run (see hero.js +
  editorial.css's living-hero section for the exact pattern).
- **Performance**: idle/continuous animations must pause offscreen (ScrollTrigger onToggle
  or IntersectionObserver) and honor `document.hidden`. Pointer effects only on
  `(pointer: fine)`. Passive listeners. No layout thrash in pointermove handlers.
- **Mobile lesson learned**: text spans full width on mobile, so decorative elements that
  read fine on desktop collide with copy there. Screenshot mobile (390x844) and actually
  look before calling it done; hide or reposition decorations per breakpoint.

## Verification workflow (do all of it)

1. `node --test tests/*.test.mjs` green; extend static-contract.test.mjs with a contract
   test per page (markup hooks, script wiring, reduced-motion guard in the JS).
2. Serve via `python3 -m http.server` and verify with the /browse skill. **Gotcha**: the
   browser heuristically caches pages from this server (no Cache-Control header), so after
   every edit navigate with a fresh query param (`?fresh=N`) or your checks run against
   stale HTML.
3. Desktop 1440x900 + mobile 390x844 screenshots of every changed section, mid-animation
   and settled. Zero console errors (the "rotate not eligible for reset" warnings on scroll
   are pre-existing from editorial.js's signature section; ignore them). No horizontal
   overflow on mobile.
4. Verify programmatically: animations actually run (sample computed styles mid-tween),
   idle animations freeze when scrolled away, content visible after mid-page reload.
5. Commit/push only when I say so. Push goes through gh account `matthew-thaokhamlue`,
   triggers CI + Pages on main; wait for both runs green, then curl the live URLs to
   confirm the new markup is served.
