import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function listHtmlFiles() {
  const rootPages = fs
    .readdirSync(repoRoot)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(repoRoot, name));

  const portfolioDir = path.join(repoRoot, 'portfolio');
  const portfolioPages = fs
    .readdirSync(portfolioDir)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(portfolioDir, name));

  return [...rootPages, ...portfolioPages].sort();
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Not content pages: a redirect stub, a generated export, and the three retired case pages, now redirect stubs.
const NON_CONTENT = new Set([
  'about.html', 'cv.html',
  'portfolio/mcp-server.html', 'portfolio/automation-tools.html', 'portfolio/interview-prep.html',
]);
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700&family=IBM+Plex+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';

test('content pages share one fonts link with the Instrument Sans width and italic axes', () => {
  const failures = [];
  for (const file of listHtmlFiles()) {
    const name = relative(file);
    if (NON_CONTENT.has(name)) continue;
    const links = [...fs.readFileSync(file, 'utf8').matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/g)].map((m) => m[1]);
    if (links.length !== 1 || links[0] !== FONTS_HREF) failures.push(`${name}: ${links.join(' | ') || 'no fonts link'}`);
  }
  assert.deepEqual(failures, []);
});

test('editorial.css carries the neutral tokens and the clay accent', () => {
  const css = readText('assets/css/editorial.css');
  const light = css.match(/\n {2}:root \{([\s\S]*?)\n {2}\}/);
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n {2}\}/);
  assert.ok(light && dark, 'token blocks not found');
  const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [name, value] of [['--ed-bg', '#ffffff'], ['--ed-ink', '#111111'], ['--ed-ink-mute', '#767672'], ['--ed-accent', '#c45a38'], ['--ed-panel', '#f1f1ef'], ['--ed-field', '#c9cdd4'],
    ['--ed-panel-hover', '#e9e9e6'], ['--ed-accent-strong', '#a8431f'], ['--ed-accent-tint', '#f6e9e3'], ['--ed-card-shadow', '0 10px 30px rgba(17, 17, 17, 0.07)']]) {
    assert.match(light[1], new RegExp(`${name}:\\s*${escape(value)};`), `light ${name}`);
  }
  for (const [name, value] of [['--ed-bg', '#0c0c0d'], ['--ed-ink', '#f4f4f2'], ['--ed-ink-mute', '#7c7c78'], ['--ed-accent', '#e0764f'], ['--ed-panel', '#18181a'], ['--ed-field', '#1b1e23'],
    ['--ed-panel-hover', '#1f1f22'], ['--ed-accent-strong', '#eb8a66'], ['--ed-accent-tint', '#2a1b15'], ['--ed-card-shadow', '0 10px 30px rgba(0, 0, 0, 0.5)']]) {
    assert.match(dark[1], new RegExp(`${name}:\\s*${escape(value)};`), `dark ${name}`);
  }
  assert.match(light[1], /--ed-display:\s*"Instrument Sans"/);
  assert.match(light[1], /--ed-mono:\s*"IBM Plex Mono"/);
});

function localTargetForReference(reference, sourceFile) {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) return null;

  const withoutHash = trimmed.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery) return null;

  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    // Keep the raw value; the existence assertion below will report it clearly.
  }

  if (decoded.startsWith('/')) {
    return path.resolve(repoRoot, `.${decoded}`);
  }

  return path.resolve(path.dirname(sourceFile), decoded);
}

test('HTML pages only reference local files that exist', () => {
  const missingReferences = [];
  const attributePattern = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/g;

  for (const htmlFile of listHtmlFiles()) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    let match;
    while ((match = attributePattern.exec(html)) !== null) {
      const [, , reference] = match;
      const target = localTargetForReference(reference, htmlFile);
      if (!target) continue;

      const relativeTarget = path.relative(repoRoot, target);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        missingReferences.push(`${relative(htmlFile)} -> ${reference} escapes project root`);
        continue;
      }

      if (!fs.existsSync(target)) {
        missingReferences.push(`${relative(htmlFile)} -> ${reference} (${relativeTarget})`);
      }
    }
  }

  assert.deepEqual(missingReferences, []);
});

test('index.html keeps the AI Match DOM contract used by assets/js/ai-match.js', () => {
  const indexHtml = readText('index.html');
  const aiMatchJs = readText('assets/js/ai-match.js');
  const requiredIds = [
    'ai-match-trigger',
    'ai-match-modal',
    'ai-match-close',
    'ai-match-jd',
    'ai-match-status',
  ];

  for (const id of requiredIds) {
    assert.match(
      indexHtml,
      new RegExp(`\\bid\\s*=\\s*(["'])${escapeRegExp(id)}\\1`),
      `Missing #${id}`,
    );
  }

  assert.match(indexHtml, /\bdata-ai-match-overlay\b/, 'Missing [data-ai-match-overlay]');

  const providersInMarkup = [
    ...indexHtml.matchAll(/\bdata-ai-provider\s*=\s*(["'])(.*?)\1/g),
  ].map((match) => match[2]);
  assert.ok(providersInMarkup.length > 0, 'Expected at least one [data-ai-provider] button');

  const providerBlock = aiMatchJs.match(/const PROVIDER_URL_BUILDERS = \{([\s\S]*?)\};/);
  assert.ok(providerBlock, 'Could not find PROVIDER_URL_BUILDERS in ai-match.js');
  const supportedProviders = [
    ...providerBlock[1].matchAll(/^\s*([a-z0-9_-]+):\s*/gm),
  ].map((match) => match[1]);

  const unsupportedProviders = providersInMarkup.filter(
    (provider) => !supportedProviders.includes(provider),
  );
  assert.deepEqual(unsupportedProviders, []);
});

test('index.html keeps the loop hero contract', () => {
  const html = readText('index.html');
  const js = readText('assets/js/loop-hero.js');
  assert.equal((html.match(/<div class="ed-loop-card" style="--k:\d"><small>/g) || []).length, 6, 'six station cards');
  assert.match(html, /<div class="ed-loop-orbit" aria-hidden="true"><\/div>/, 'the CSS ellipse fallback');
  assert.match(html, /<p class="ed-role-line">Product <span class="ed-role-word">builder<\/span><\/p>/);
  const paths = [...html.matchAll(/<path class="ed-mark-reveal" d="([^"]+)"><\/path>/g)].map((m) => m[1]);
  assert.equal(paths.length, 2, 'two mask strokes');
  const strokes = [
    'M0.6 48 C1.8 47.3 5.6 45.5 7.9 44 C10.2 42.5 12.5 40.8 14.6 39 C16.7 37.2 18.6 35 20.3 33 C22 31 23.7 28.7 25 27 C26.3 25.3 26.6 24.6 28 23 C29.4 21.4 32.4 18.3 33.3 17.4 C33.5 18.2 34.2 20.9 34.6 22.5 C35 24.1 35.3 25.6 35.6 27 C35.9 28.4 35.8 29.7 36.4 30.8 C37 31.9 37.8 32.9 39 33.6 C40.2 34.4 42.5 34.6 43.8 35.3 C45.1 36 45.8 37.1 46.9 38 C48 38.9 49.3 39.8 50.3 40.5 C51.3 41.2 52.1 41.4 53.1 42 C54.1 42.6 55.5 43.7 56 44',
    'M32 44 C32.2 43.5 32.5 42 33 41 C33.5 40 34.1 39 34.7 38 C35.3 37 35.8 36.2 36.8 35 C37.8 33.8 39.9 32.2 40.8 31 C41.7 29.8 41.6 29 42.3 28 C43 27 44 26 44.9 25 C45.8 24 46.5 23 47.4 22 C48.2 21 48.9 20.3 50 19 C51.1 17.7 52.6 15.8 54 14.3 C55.4 12.8 57.8 10.7 58.6 10 C58.9 10.6 59.9 12.3 60.4 13.5 C60.9 14.7 61.1 15.9 61.5 17 C61.9 18.1 62.3 18.7 63 20 C63.7 21.3 64.6 23.3 65.6 25 C66.6 26.7 67.7 28.3 69 30 C70.3 31.7 71.6 33.3 73.3 35 C75 36.7 77 38.5 79.1 40 C81.1 41.5 83.4 42.8 85.6 44 C87.8 45.2 90.3 46.2 92.5 47 C94.7 47.8 97.8 48.7 98.9 49',
  ];
  assert.deepEqual(paths, strokes, 'both mask strokes are the fitted paths, character for character');
  assert.match(html, /<image href="images\/m-mark-brush\.png"/);
  assert.match(html, /<button id="ai-match-trigger" type="button"/, 'the AI Match trigger stays in the hero');
  assert.match(html, /assets\/js\/loop-hero\.js\?v=20260929/);
  assert.match(js, /const WORDS = \['builder', 'manager', 'designer', 'tester', 'owner', 'builder'\];/);
  const d = js.match(/const WRITE_S = ([\d.]+), TOUR_S = ([\d.]+);/);
  assert.ok(d && Number(d[1]) + Number(d[2]) <= 5, 'the first-view sequence must stay within 5 seconds (WCAG 2.2.2)');
  assert.match(js, /\(now - writeFrom\) \/ WRITE_S\)/, 'the write phase runs on WRITE_S');
  assert.match(js, /\(now - tourFrom\) \/ TOUR_S\)/, 'the tour runs on TOUR_S');
  assert.doesNotMatch(js, /\(now - (?:writeFrom|tourFrom)\) \/ \d/, 'a literal duration would bypass the 5 second check');
  assert.match(js, /getContext\('webgl2'/, 'WebGL 2 guard');
  assert.match(js, /if \(reduceMotion\) return api;/, 'reduced motion keeps the static loop');
  assert.match(js, /'webglcontextlost'[\s\S]{0,400}drawMark\(1\)/, 'a lost context completes the M');
  assert.match(js, /out\.cancel\(\)/, 'the finished fade-out is cancelled, or the role word stays hidden');
});

test('the loop ring is the default CSS layout, and layout() writes what the card transforms assume', () => {
  const css = readText('assets/css/editorial.css');
  const js = readText('assets/js/loop-hero.js');
  // The ring holds before loop-hero.js runs, when it fails to load, and with scripts off, so no scripting query wraps it.
  assert.match(css, /\n {2}\.ed-loop-orbit \{[^}]*left: calc\(50% - min\(40%, 470px\)\); top: 14%; width: calc\(2 \* min\(40%, 470px\)\); height: 72%;/, 'the ellipse has a default box');
  const ring = css.indexOf('.ed-loop-card { --a: calc(-90deg + 60deg * var(--k)); left: calc(50% + min(40%, 470px) * cos(var(--a))); top: calc(50% + 36% * sin(var(--a))); transform: translate(-50%, -50%); }');
  assert.ok(ring > 0, 'the cards have a default ring');
  const phone = css.indexOf('.ed-loop-card { left: calc(50% + 34% * cos(var(--a))); top: calc(50% + 40% * sin(var(--a))); }');
  assert.ok(phone > ring, 'the phone ring comes after the default ring, so it wins at equal specificity');
  assert.match(css, /@media \(max-width: 671px\) \{[^@]*\.ed-loop-orbit \{ left: 16%; top: 10%; width: 68%; height: 80%; \}/, 'the phone ellipse is tall');
  assert.doesNotMatch(css, /@media \(scripting: none\)[^{]*\{\s*\.ed-loop/, 'the ring does not depend on a scripting query');
  // The pixels from layout() replace the percentages, so each card gets the corner that its transform counts from.
  assert.match(js, /function layout\(\) \{[\s\S]*?c\.style\.left = '0px'; c\.style\.top = '0px';[\s\S]*?placeCards\(\);/, 'layout() gives every card left 0 and top 0 before it places the cards');
});

test('the tall ring follows the stage width through a container query, and the viewport rule is the fallback only where container queries are missing', () => {
  const css = readText('assets/css/editorial.css');
  const js = readText('assets/js/loop-hero.js');
  const orbitRule = '.ed-loop-orbit { left: 16%; top: 10%; width: 68%; height: 80%; }';
  const cardRule = '.ed-loop-card { left: calc(50% + 34% * cos(var(--a))); top: calc(50% + 40% * sin(var(--a))); }';
  // layout() chooses the tall ring for a stage narrower than 640 px; 639.98 px rounds to the last layout unit below that
  assert.match(js, /const narrow = W < 640;/, 'layout() switches at a stage width of 640 px');
  assert.match(css, /\n {2}\.ed-loop-stage \{[^}]*container-type: inline-size;/, 'the stage is the query container');
  const query = css.indexOf('@container (max-width: 639.98px) {');
  assert.ok(query > 0, 'the query limit is 639.98 px');
  assert.ok(query > css.indexOf('.ed-loop-card { --a:'), 'the query follows the default ring, so it wins at equal specificity');
  assert.match(css, /@container \(max-width: 639\.98px\) \{\s*\.ed-loop-orbit \{ left: 16%; top: 10%; width: 68%; height: 80%; \}\s*\.ed-loop-card \{ left: calc\(50% \+ 34% \* cos\(var\(--a\)\)\); top: calc\(50% \+ 40% \* sin\(var\(--a\)\)\); \}\s*\}/, 'the query holds the two phone rules');
  // The query can add the tall ring but cannot remove one that the viewport rule set. A viewport rule outside @supports would keep
  // the tall ring in a stage of 640 px or more whenever the scrollbar and both gutters total 31 px or less. So the viewport rule
  // sets the ring only inside @supports not (container-type: inline-size), and the query alone decides where it is supported.
  const fallback = css.match(/\n {2}@supports not \(container-type: inline-size\) \{\s*@media \(max-width: 671px\) \{\s*(\.ed-loop-orbit \{[^}]*\})\s*(\.ed-loop-card \{[^}]*\})\s*\}\s*\}/);
  assert.ok(fallback, 'the two ring rules of the viewport rule sit inside @supports not (container-type: inline-size)');
  assert.deepEqual([fallback[1], fallback[2]], [orbitRule, cardRule], 'and they are the two phone rules');
  for (const rule of [orbitRule, cardRule]) {
    assert.equal(css.split(rule).length - 1, 2, `one copy in the fallback and one in the query: ${rule}`);
  }
  const bare = [...css.matchAll(/\n {2}@media \(max-width: 671px\) \{([\s\S]*?)\n {2}\}/g)];
  assert.ok(bare.length >= 1, 'the viewport rule for the stage height exists');
  for (const block of bare) assert.doesNotMatch(block[1], /\.ed-loop-(?:orbit|card)/, 'no viewport rule outside @supports sets the ring');
  assert.match(css, /\n {2}@media \(max-width: 671px\) \{\s*\.ed-loop-stage \{ height: 560px; \}\s*\.ed-loop-mark \{ width: 120px; \}\s*\}/, 'the stage height and the mark width stay in the viewport rule');
});

test('loop-hero.js lays the ring out again on every resize, in the static branches too', () => {
  const js = readText('assets/js/loop-hero.js');
  assert.equal((js.match(/new ResizeObserver\(/g) || []).length, 1, 'one resize observer');
  assert.equal((js.match(/\blet active\b/g) || []).length, 1, 'one declaration of active');
  // The static branches return before the live setup, so the observer starts first and reads a variable that already exists.
  assert.match(js, /let active = false;[\s\S]*new ResizeObserver\([\s\S]*if \(reduceMotion\) return api;/, 'active, then the observer, then the first static return');
  assert.match(js, /if \(reduceMotion\) return api;[\s\S]*if \(!gl\) return api;[\s\S]*if \(!dust \|\| !line\) return api;/, 'three static branches return early');
});

test('loop-hero.js hides the M before the first paint, in the live path only', () => {
  const js = readText('assets/js/loop-hero.js');
  const lastStaticReturn = js.indexOf('if (!dust || !line) return api;');
  const hide = js.search(/\n\s*drawMark\(0\);[^\n]*\n\s*return api;/);
  assert.ok(lastStaticReturn > 0, 'the last static return exists');
  assert.ok(hide > lastStaticReturn, 'drawMark(0) ends the live path, so the static branches keep the full M');
  assert.ok(hide < js.indexOf('new IntersectionObserver'), 'and it runs before the observer starts, which reports after the first paint');
});

test('the drag hint shows only while the ring answers a drag', () => {
  const css = readText('assets/css/editorial.css');
  const js = readText('assets/js/loop-hero.js');
  // visibility, not display: the class rule outranks the touch rule, and display: none still wins over any visibility
  assert.match(css, /\n {2}\.ed-loop-hint \{[^}]*visibility: hidden;/, 'the hint is invisible by default and keeps its line');
  assert.match(css, /\n {2}\.ed-loop-hero\.is-draggable \.ed-loop-hint \{ visibility: visible; \}/, 'the class turns the hint on');
  assert.match(css, /@media \(hover: none\) \{ \.ed-loop-hint \{ display: none; \} \}/, 'a touch device never shows the hint');
  // the pointer handlers attach in the live path only, so the class follows them
  const lastStaticReturn = js.indexOf('if (!dust || !line) return api;');
  const handlers = js.indexOf("addEventListener('pointerdown'");
  const add = js.indexOf("classList.add('is-draggable')");
  assert.ok(lastStaticReturn > 0 && handlers > lastStaticReturn, 'the pointer handlers sit in the live path');
  assert.ok(add > handlers, 'the class comes after the pointer handlers');
  // loop-hero.js finds the section by its class, and the hint rule needs the hint inside it
  assert.match(readText('index.html'), /<section class="ed-loop-hero" id="loop"[^>]*>[\s\S]*<p class="ed-loop-hint">[^<]*<\/p>\s*<\/section>/, 'the section that gets is-draggable holds the hint');
});

test('a lost WebGL context hides the dead canvas and the drag hint', () => {
  const js = readText('assets/js/loop-hero.js');
  assert.match(js, /'webglcontextlost'[\s\S]{0,400}canvas\.style\.display = 'none'/, 'a dead canvas paints over the ellipse');
  assert.match(js, /'webglcontextlost'[\s\S]{0,400}classList\.remove\('is-draggable'\)/, 'the ring no longer answers a drag');
  // the observer calls loop.show() when the stage re-enters the viewport, which would revive the loop on the dead context
  assert.match(js, /'webglcontextlost'[\s\S]{0,600}api\.show = \(\) => \{\};/, 'a lost context is final: show() does nothing afterwards');
});

test('index.html shows four results with receipts and the How I work band', () => {
  const html = readText('index.html');
  const bigs = [...html.matchAll(/<button class="ed-result" type="button" data-action="open-reveal" data-reveal="receipt-[a-z]+" aria-haspopup="dialog"><b>([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(bigs, ['~39%', '$500K', '1M+', '4 → 12']);
  assert.match(html, /<p class="ed-band__label" id="band-title">AI Workflow Architect<\/p>/);
  assert.match(html, /<a class="ed-band__link" href="experience\.html#role-sema">How I work at Sema →<\/a>/);
  assert.doesNotMatch(html, /Seven more recommendations/, 'the testimonials link carries no count');
  assert.match(html, /<h2 class="ed-cta__line">Contact<\/h2>/, 'the contact heading is plain');
  assert.doesNotMatch(html, /Have ideas worth/, 'the old contact slogan leaves the page');
});

test('no inline style block overrides the no-script reveal fallback', () => {
  for (const file of listHtmlFiles()) {
    const name = relative(file);
    if (NON_CONTENT.has(name)) continue;
    const inline = [...fs.readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
    // A later author rule wins the tie with the no-script rule in editorial.css, so the reveals would stay hidden.
    assert.doesNotMatch(inline, /dialog:not\(\[open\]\)/, `${name}: an inline dialog:not([open]) rule hides the reveals without scripts`);
    assert.doesNotMatch(inline, /(^|[\s,{}])dialog\[open\]/, `${name}: an inline dialog[open] rule restyles every open reveal`);
  }
  assert.match(readText('index.html'), /#ai-match-modal\[open\], #testimonial-modal\[open\] \{ display: flex; \}/, 'the home modals keep their flex layout');
});

test('tiles and panels take their names from the visible text (WCAG 2.5.3)', () => {
  for (const name of ['portfolio.html', 'certificates.html']) {
    const tiles = [...readText(name).matchAll(/<button class="ed-tile[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.ok(tiles.length >= 8, `${name} has its tiles`);
    for (const tag of tiles) assert.doesNotMatch(tag, /aria-label=/, `${name}: a tile label hides the visible caption`);
  }
  const certs = readText('certificates.html');
  assert.doesNotMatch(certs, /<\/span><span class="ed-ct__(big|name)"/, 'the credential spans need a space, or the computed name runs the words together');
  const panels = [...readText('experience.html').matchAll(/<button class="ed-panel"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<span class="ed-panel__dates">([^<]+)<\/span>/g)];
  assert.equal(panels.length, 4, 'four career panels, with Labforward and LabTwin combined');
  for (const [, label, dates] of panels) assert.ok(label.endsWith(`, ${dates}`), `the panel label "${label}" must end with its visible dates`);

  const css = readText('assets/css/editorial.css');
  assert.match(css, /\.ed-tile:focus-visible \{ outline: 2px solid var\(--ed-accent\); outline-offset: -4px; \}/, 'the focus ring sits inside the tile');
  assert.match(css, /\.ed-chip \{[^}]*box-shadow: 0 0 0 1px var\(--ed-bg\);/, 'the chip ring keeps the chip visible on a tile of its own colour');
  assert.match(css, /:root\[data-theme="dark"\] \.ed-ct--ink \{ box-shadow: inset 0 0 0 1px var\(--ed-hairline-strong\); \}/, 'dark ink tiles keep an edge');
  assert.doesNotMatch(readText('portfolio.html'), /<img [^>]*loading="lazy"[^>]*><span class="ed-tile__logo">/, 'every tile starts in the first viewport at 1440 x 900');
});

test('the redesigned pages wrap content in .ed-shell, the top bar width', () => {
  for (const name of ['index.html', 'experience.html', 'portfolio.html', 'certificates.html']) {
    const html = readText(name);
    assert.match(html, /<div class="ed-shell">/, `${name} must wrap its content in .ed-shell`);
    assert.doesNotMatch(html, /max-w-7xl mx-auto px-4 sm:px-6 lg:px-8/, `${name} keeps the old 80rem wrapper, which misaligns with the top bar`);
  }
  const css = readText('assets/css/editorial.css');
  assert.match(css, /\.ed-shell \{\s*width: 100%;\s*max-width: var\(--ed-content-max\);\s*margin-inline: auto;\s*padding-inline: var\(--ed-gutter-x\);/, 'full width inside a flex column, then the top bar width and gutter');
  assert.match(css, /\.ed-topbar__inner \{\s*max-width: var\(--ed-content-max\);\s*margin-inline: auto;\s*padding: 1rem var\(--ed-gutter-x\);/, 'the top bar uses the same width and gutter');
});

test('no page loads GSAP or the old motion scripts', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const name = relative(file);
    const html = fs.readFileSync(file, 'utf8');
    for (const needle of ['gsap', 'ScrollTrigger', 'editorial.js', 'rings.js', 'career.js', 'folio.js', 'case.js', 'motion-star.js', 'loop.js', 'data-motion-pending']) {
      if (html.toLowerCase().includes(needle.toLowerCase())) offenders.push(`${name}: ${needle}`);
    }
  }
  assert.deepEqual(offenders, []);
  for (const gone of ['career.js', 'rings.js', 'folio.js', 'case.js', 'editorial.js', 'loop.js', 'motion-star.js']) {
    assert.ok(!fs.existsSync(path.join(repoRoot, 'assets/js', gone)), `assets/js/${gone} should be deleted`);
  }
  assert.doesNotMatch(readText('assets/js/site.js'), /data-motion-pending/, 'site.js keeps no GSAP fallback');
  assert.doesNotMatch(readText('assets/css/editorial.css'), /\[data-motion-pending\]/, 'editorial.css keeps no motion gate');
  const baseReveal = readText('assets/css/editorial.css').match(/\n {2}\.reveal \{([^}]*)\}/);
  assert.ok(baseReveal, 'base .reveal rule not found');
  assert.doesNotMatch(baseReveal[1], /opacity:\s*0/, 'base .reveal must not hide content: no script un-hides it');
});

test('design documents stay out of the public repo', () => {
  const ignore = readText('.gitignore');
  assert.match(ignore, /^docs\/plans\/$/m, '.gitignore must list docs/plans/');
  assert.match(ignore, /^docs\/research\/$/m, '.gitignore must list docs/research/');
  const tracked = execFileSync('git', ['ls-files', 'docs/plans', 'docs/research'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  assert.equal(tracked, '', `design documents are tracked:\n${tracked}`);
});

test('every reveal target opens a dialog in the same page', () => {
  const failures = [];
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const dialogs = new Set([...html.matchAll(/<dialog class="ed-reveal" id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/data-action="open-reveal" data-reveal="([^"]+)"/g)) {
      if (!dialogs.has(m[1])) failures.push(`${relative(file)}: no dialog for ${m[1]}`);
    }
  }
  assert.deepEqual(failures, []);

  const siteJs = readText('assets/js/site.js');
  assert.match(siteJs, /case 'open-reveal':/);
  assert.match(siteJs, /closest\('dialog\.ed-reveal\[open\]'\)/, 'a click inside an open reveal must close it');
  assert.match(siteJs, /target\.closest\('\.ed-reveal__close'\) \|\| \(!target\.closest\('a'\)/, 'the close button closes the reveal even with text selected; a link click does not close it');
  assert.match(siteJs, /'hashchange'/, 'a URL fragment must open its reveal');

  const css = readText('assets/css/editorial.css');
  assert.match(css, /@media \(scripting: none\) \{\s*dialog\.ed-reveal \{[^}]*display: block;/, 'without scripts, reveal content shows in the page');
  assert.match(css, /\.star-on \.ed-reveal__close:not\(:focus-visible\) \{ opacity: 0; \}/, 'the close button hides for the star only, and shows on keyboard focus');
});

test('the star cursor guards on a fine pointer and reduced motion, and stays on top', () => {
  const js = readText('assets/js/star-cursor.js');
  assert.match(js, /matchMedia\('\(pointer: fine\)'\)/);
  assert.match(js, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(js, /classList\.add\('no-star'\)/, 'without a working canvas the native cursor must stay');
  const ctxAt = js.indexOf("getContext('2d')");
  const starOnAt = js.indexOf("classList.add('star-on')");
  assert.ok(ctxAt > 0 && starOnAt > ctxAt, 'star-on (which hides the native cursor) must come after the canvas check');
  assert.match(js, /attributeFilter: \['open'\]/, 'the star must follow any dialog into the top layer');
  assert.match(js, /\n\s*follow\(\);/, 'the star must join a reveal that opened before this script ran (a deep link)');
  assert.match(js, /if \(openReveal\(\)\) return el && el\.closest\('a'\) \? 'idle' : 'close';/, 'a link inside an open reveal does not close it, so no "Close" pill there');
  assert.match(js, /if \(m !== 'idle'\) labelText\.animate\(/, 'a fading pill must not pop');
  assert.match(js, /if \(mode === 'idle' \|\| mode === shown\) return;/, 'the pill text changes only when its mode changes');

  const css = readText('assets/css/editorial.css');
  assert.match(css, /\.star-on, \.star-on \* \{ cursor: none !important; \}/);
  const jsFields = js.match(/const TEXT_FIELD = '([^']+)';/);
  const cssFields = css.match(/\.star-on :is\(([^)]*(?:\([^)]*\)[^)]*)*)\) \{ cursor: text !important; \}/);
  assert.ok(jsFields && cssFields, 'the text-field list exists in star-cursor.js and editorial.css');
  assert.equal(cssFields[1], jsFields[1], 'the CSS caret rule and the script use the same text-field list');
  for (const cls of ['ed-star-layer', 'ed-star-label']) {
    assert.match(css, new RegExp(`\\.${cls} \\{[^}]*pointer-events: none;`), `.${cls} must let every click through`);
  }
  const z = css.match(/\.ed-star-layer \{[^}]*z-index: (\d+);/);
  assert.ok(z && Number(z[1]) > 100, 'the star layer must sit above the cookie banner and the mobile menu');

  for (const file of listHtmlFiles()) {
    const name = relative(file);
    if (NON_CONTENT.has(name)) continue;
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/star-cursor\.js/g) || []).length, 1, `${name} must load star-cursor.js once`);
    assert.match(html, /<script src="(?:\.\.\/)?assets\/js\/site\.js\?v=20260929"><\/script>\r?\n\s*<script src="(?:\.\.\/)?assets\/js\/star-cursor\.js\?v=20260930-hover"><\/script>/, `${name} must load star-cursor.js directly after site.js`);
  }
});

test('the home page head carries the headline', () => {
  const html = readText('index.html');
  assert.match(html, /<title>Matthew Thaokhamlue – Senior AI Product Manager<\/title>/);
  assert.match(html, /"jobTitle": "Senior AI Product Manager"/);
  // The footer line keeps the old headline on every page until a later review, so this assert reads only the head.
  const headEnd = html.indexOf('</head>');
  assert.ok(headEnd > 0, 'index.html has a </head>');
  const head = html.slice(0, headEnd);
  assert.doesNotMatch(head, /Builder · AI Workflow Architect/, 'the old headline leaves the head');
  assert.doesNotMatch(head, /[Bb]uilder and AI workflow architect/, 'the old description leaves the head');

  const TITLE = 'Matthew Thaokhamlue – Senior AI Product Manager';
  const DESC = 'Senior AI Product Manager at Sema, and product manager for Liz, Sema’s AI agent. Earlier roles at Labforward, LabTwin, Thryve and EY.';
  const q = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const attr of ['property="og:title"', 'name="twitter:title"']) {
    assert.match(head, new RegExp(`<meta ${attr}\\s+content="${q(TITLE)}"`), `${attr} carries the headline`);
  }
  for (const attr of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    assert.match(head, new RegExp(`<meta ${attr}\\s+content="${q(DESC)}"`), `${attr} carries the approved description`);
  }
  const ld = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.description, DESC, 'the JSON-LD description');
  assert.equal(ld.hasOccupation[0].name, 'Senior AI Product Manager', 'the JSON-LD occupation follows the job title');
});

test('experience.html keeps the AI Match hooks inside the role reveals', () => {
  const html = readText('experience.html');
  const sections = [...html.matchAll(/<section class="(?:ed-reveal__inner|ed-role)" id="(role-[a-z]+)"[^>]*>([\s\S]*?)<\/section>(?=\s*(?:<\/dialog>|<section class="ed-role"|<\/div>\s*<\/dialog>))/g)];
  assert.deepEqual(sections.map((m) => m[1]), ['role-sema', 'role-labforward', 'role-labtwin', 'role-thryve', 'role-ey', 'role-education']);
  for (const [, id, body] of sections.filter((m) => m[1] !== 'role-education')) {
    for (const hook of ['data-role-company', 'data-role-title', 'data-role-meta', 'data-role-summary', 'data-role-skill']) {
      assert.ok(body.includes(hook), `${id} lost ${hook}`);
    }
    if (!['role-labforward', 'role-labtwin'].includes(id)) {
      assert.ok(body.includes('<section class="ed-how" aria-label="How I work">'), `${id} lost its How I work block`);
    }
  }
  // ai-match.js reads the Education rows from #role-education, and skips that section as a role.
  const edu = sections.find((m) => m[1] === 'role-education')[2];
  const rows = [...edu.matchAll(/<div class="ed-stage"><span class="ed-stage__num">\d+<\/span><h3 class="ed-stage__title">([^<]+)<\/h3><p class="ed-stage__desc">[^<]+<\/p>/g)].map((m) => m[1]);
  assert.deepEqual(rows, ['Education', 'Languages'], 'the Education reveal keeps its two rows');
  assert.match(html, /<a class="ed-page-head__link" href="cv\.html"[^>]*data-ga-event="resume_downloaded"/, 'the Experience page keeps its View CV link');
  const aiMatch = readText('assets/js/ai-match.js');
  for (const hook of ['[data-role-company]', '[data-role-title]', '[data-role-meta]', '[data-role-summary]', '[data-role-skill]']) {
    assert.ok(aiMatch.includes(hook), `ai-match.js no longer reads ${hook}`);
  }
  assert.match(aiMatch, /section\[id\^="role-"\]:not\(#role-education\)/, 'ai-match.js skips the Education section as a role');
  assert.match(aiMatch, /#role-education \.ed-stage/, 'ai-match.js reads the Education rows');
});

test('the tile pages fit the window: one fit condition, and a failed fit scrolls', () => {
  for (const name of ['experience.html', 'portfolio.html', 'certificates.html']) {
    assert.match(readText(name), /<body class="ed-page ed-fit">/, `${name} opts into fit mode`);
  }
  const css = readText('assets/css/editorial.css');
  const fit = css.match(/@media \(scripting: enabled\) and \(min-width: 761px\) and \(min-height: 500px\) \{([\s\S]*?)\n {2}\}\n/);
  assert.ok(fit, 'one fit block: scripts on, at least 761 px wide and 500 px tall');
  assert.equal((css.match(/min-width: 761px\) and \(min-height: 500px\)/g) || []).length, 1, 'the fit condition is written once');
  assert.doesNotMatch(fit[1], /\.ed-fit(?: > main(?: > \.ed-shell)?)? \{[^}]*overflow:\s*hidden/, 'the page, main and the shell never hide overflow: a page that cannot fit must scroll, not clip');
  assert.match(fit[1], /\.ed-fit \{ display: flex; flex-direction: column; height: 100dvh; \}/);
  assert.match(fit[1], /\.ed-fit:has\(> \.cookie-consent\) \{ padding-bottom: var\(--ed-consent-h, 0px\); \}/, 'the cookie banner never covers the footer');
  assert.match(readText('assets/js/site.js'), /new ResizeObserver\([\s\S]{0,160}--ed-consent-h/, 'site.js publishes the banner height');

  // --rows on each mosaic matches its tile placements, or an extra row would make the page scroll again.
  for (const name of ['portfolio.html', 'certificates.html']) {
    const html = readText(name);
    const rows = Number(html.match(/<div class="ed-mosaic ed-mosaic--[a-z]+" style="--rows:(\d+)">/)[1]);
    const ends = [...html.matchAll(/grid-row:(\d+) \/ span (\d+)/g)].map((m) => Number(m[1]) + Number(m[2]) - 1);
    assert.equal(rows, Math.max(...ends), `${name}: --rows must equal the last row the tiles use`);
  }
  // each credential code carries its designed size and its length, which caps the size to the tile width
  for (const m of readText('certificates.html').matchAll(/<span class="ed-ct__big" style="--big:[0-9.]+rem;--chars:(\d+)">([^<]+)<\/span>/g)) {
    assert.equal(Number(m[1]), m[2].length, `--chars of ${m[2]}`);
  }
  assert.equal((readText('certificates.html').match(/class="ed-ct__big" style="--big:/g) || []).length, 14);
});

test('experience.html lays the roles out as a Fibonacci spiral, most recent in the largest tile', () => {
  const html = readText('experience.html');
  const areas = [...html.matchAll(/<button class="ed-panel[^"]*" type="button" data-area="([a-z])" data-action="open-reveal" data-reveal="([a-z-]+)"/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(areas, ['s:reveal-sema', 'l:reveal-labforward', 't:reveal-thryve', 'y:reveal-ey', 'e:reveal-education']);
  const css = readText('assets/css/editorial.css');
  assert.match(css, /grid-template-columns: 55fr 13fr 21fr; grid-template-rows: 34fr 8fr 13fr;\s*grid-template-areas: "s l l" "s e t" "s y t";/, 'Sema 55, Labforward / LabTwin 34, Thryve 21, EY 13, Education 13 x 8');
  assert.match(css, /\.ed-fit \.ed-fib \{[^}]*width: 100cqw; height: min\(100cqh, 100cqw \* 55 \/ 89\);/, 'the grid fills the content width and retains its fitted height');
  assert.match(html, /<svg class="ed-fib__spiral" viewBox="0 0 89 55"[^>]*aria-hidden="true"/, 'the spiral is decoration only');
  assert.match(css, /\.ed-fit \.ed-fib__spiral \{[^}]*pointer-events: none;/, 'the spiral lets every click through');
});

test('the combined lab chapter keeps both logos, role dates, and old links', () => {
  const html = readText('experience.html');
  const panel = html.match(/<button class="ed-panel"[^>]*data-reveal="reveal-labforward"[^>]*>([\s\S]*?)<\/button>/)[1];
  for (const logo of ['labforward.png', 'labtwin.png']) assert.ok(panel.includes(logo));
  assert.match(panel, /Jan 2023 – Nov 2025/);
  assert.equal((html.match(/<dialog class="ed-reveal"/g) || []).length, 5);
  const chapter = html.match(/<dialog class="ed-reveal" id="reveal-labforward"[^>]*>([\s\S]*?)<\/dialog>/)[1];
  for (const id of ['role-labforward', 'role-labtwin', 'reveal-labtwin']) {
    assert.ok(chapter.includes(`id="${id}"`), `${id} must resolve inside the combined dialog`);
  }
  assert.match(chapter, /Nov 2024 – Nov 2025/);
  assert.match(chapter, /Jan 2023 – Nov 2024/);
  assert.match(chapter, /customer pilot/);
});

test('every logo mask the markup references exists, in both the prefixed and the standard property', () => {
  const missing = [];
  let masks = 0;
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const plain = [...html.matchAll(/(?<!-webkit-)mask-image:url\('([^']+)'\)/g)].length;
    for (const m of html.matchAll(/-webkit-mask-image:url\('([^']+)'\);mask-image:url\('([^']+)'\)/g)) {
      masks += 1;
      if (m[1] !== m[2]) missing.push(`${relative(file)}: -webkit- ${m[1]} differs from ${m[2]}`);
      if (!fs.existsSync(path.resolve(path.dirname(file), m[2]))) missing.push(`${relative(file)} -> ${m[2]}`);
    }
    const pairs = [...html.matchAll(/-webkit-mask-image:url\('[^']+'\);mask-image:url\('[^']+'\)/g)].length;
    if (plain !== pairs) missing.push(`${relative(file)}: ${plain - pairs} mask(s) without a -webkit- twin`);
  }
  assert.ok(masks > 0, 'the pages carry logo masks');
  assert.deepEqual(missing, []);
});

test('portfolio.html is a mosaic of eight tiles over five project reveals', () => {
  const html = readText('portfolio.html');
  assert.equal((html.match(/<button class="ed-tile[ "]/g) || []).length, 8, 'expected eight tiles');
  const reveals = [...html.matchAll(/<dialog class="ed-reveal" id="(project-[a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(reveals, ['project-labforward', 'project-labtwin', 'project-thryve', 'project-opppaths', 'project-remarcable']);
  assert.doesNotMatch(html, /mcp-server|automation-tools|interview-prep/, 'retired projects stay off the portfolio');
  const caseLinks = [...html.matchAll(/<a class="ed-reveal__link" href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(caseLinks.length, 5, 'each project reveal links its case page');
  for (const link of caseLinks) {
    assert.match(link, /^portfolio\/[a-z-]+\.html$/, `case-study link should be relative: ${link}`);
    assert.ok(fs.existsSync(path.join(repoRoot, link)), `the case page ${link} exists`);
  }
});

test('the three retired case pages redirect to the portfolio and stay out of the sitemap', () => {
  const sitemap = readText('sitemap.xml');
  const retired = ['mcp-server', 'automation-tools', 'interview-prep'];
  for (const name of retired) {
    const html = readText(`portfolio/${name}.html`);
    assert.match(html, /<meta http-equiv="refresh" content="0; url=\.\.\/portfolio\.html" \/>/, `${name} must redirect`);
    assert.match(html, /window\.location\.replace\('\.\.\/portfolio\.html'\)/, `${name} must redirect with scripts on`);
    assert.match(html, /<link rel="canonical" href="https:\/\/matthew-thaokhamlue\.github\.io\/resume\/portfolio\.html" \/>/, `${name} must name the portfolio as canonical`);
    assert.doesNotMatch(html, /noindex/, `${name}: noindex beside a canonical to another page sends mixed signals (about.html has none)`);
    assert.match(html, /<a href="\.\.\/portfolio\.html">portfolio<\/a>/, `${name} must keep the fallback link`);
    assert.ok(!sitemap.includes(`portfolio/${name}.html`), `${name} must leave the sitemap`);
  }
  for (const file of listHtmlFiles()) {
    const page = relative(file);
    if (NON_CONTENT.has(page)) continue;
    const hrefs = [...fs.readFileSync(file, 'utf8').matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    for (const name of retired) {
      assert.ok(!hrefs.some((h) => h.split(/[?#]/)[0].endsWith(`${name}.html`)), `${page} links the retired page ${name}.html`);
    }
  }
});

test('certificates.html shows all 14 credentials, each with a verify link', () => {
  const html = readText('certificates.html');
  assert.equal((html.match(/<button class="ed-tile ed-ct /g) || []).length, 14, 'expected 14 credential tiles');
  const dialogs = [...html.matchAll(/<dialog class="ed-reveal" id="credential-(\d+)"[\s\S]*?<\/dialog>/g)];
  assert.equal(dialogs.length, 14, 'expected 14 credential reveals');
  const decode = (v) => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  for (const [block, n] of dialogs) {
    const link = block.match(/<a class="ed-reveal__link" href="https:\/\/[^"]+" target="_blank" rel="noopener" data-ga-event="credential_verified" data-ga-params='(\{"credential_issuer":"[^"]+","credential_name":"[^"]+"\})'>Verify the credential →<\/a>/);
    assert.ok(link, `credential-${n} lost its verify link or its analytics`);
    const params = JSON.parse(decode(link[1]));
    const title = decode(block.match(/<h2 class="ed-reveal__title" id="credential-\d+-title">([^<]+)<\/h2>/)[1]);
    assert.equal(params.credential_name, title, `credential-${n}: the analytics name must equal the reveal title`);
    const tile = html.match(new RegExp(`data-reveal="credential-${n}"[^>]*>\\s*<span class="ed-ct__issuer">([^<]+)</span>`));
    assert.ok(tile, `credential-${n} has a tile with an issuer line`);
    assert.equal(params.credential_issuer, decode(tile[1]), `credential-${n}: the analytics issuer must equal the tile issuer`);
  }
});

test('AI Match prompt template exists for the configured prompt version', () => {
  const aiMatchJs = readText('assets/js/ai-match.js');
  const versionMatch = aiMatchJs.match(/const PROMPT_VERSION = ['"]([^'"]+)['"]/);
  assert.ok(versionMatch, 'Could not find PROMPT_VERSION in ai-match.js');

  const promptPath = path.join(repoRoot, 'assets', 'prompts', `${versionMatch[1]}.txt`);
  assert.ok(fs.existsSync(promptPath), `Missing prompt template: ${relative(promptPath)}`);

  const promptTemplate = fs.readFileSync(promptPath, 'utf8');
  for (const placeholder of ['FULL_NAME', 'ROLE', 'SUMMARY', 'PORTFOLIO', 'ASK']) {
    assert.match(promptTemplate, new RegExp(`\\{\\{${placeholder}\\}\\}`));
  }
});
