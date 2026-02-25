# Scroll Stack Layout — Design Doc
**Date:** 2026-02-25

## Problem

Two layout issues introduced after the stacking scroll panel effect was applied:

1. **`index.html` hero** — bento grid cards overflow the viewport height; full hero is not visible within the first stack panel.
2. **`experience.html`** — the sticky experience wrapper is taller than the viewport, causing the Certifications section to slide over and obscure content the user hasn't scrolled to yet.

## Decisions

### `experience.html` — Option A: Un-stick experience, make Certifications the arriving card

- Remove `sticky top-0 z-10` from the experience wrapper div → becomes `relative z-10`
- Make `#certifications` a `stack-panel` with `--panel-z:20`
- Add the same stack-panel CSS + scroll JS already used on `index.html` and `portfolio.html`
- **Result**: user scrolls freely through all experience content; Certifications slides up as a card at the end

### `index.html` hero — Option B: Restructure into 2-row asymmetric bento

**Row 1** (`lg:col-span-2` + sidebar):
- Intro card: name, title, 2-line description, slim audio + AI match strip
- Sidebar card: location, open-to-work status, LinkedIn link, Download CV link

**Row 2** (3 equal columns):
- Portfolio card — icon, title, one-liner, arrow
- Experience card — icon, title, one-liner, arrow
- Download CV card — icon, title, one-liner, arrow

**Constraints:**
- Outer grid uses `h-screen py-16` to enforce viewport fit
- Remove standalone "Let's Connect" contact card from grid (LinkedIn stays in sidebar)
- Audio + AI match become a 2-column inline strip inside intro card (no individual card wrappers)

## Out of Scope

- No changes to `portfolio.html`
- No changes to the modal/article system or JS routing
