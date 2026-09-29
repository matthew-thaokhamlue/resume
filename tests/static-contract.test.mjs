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

// Not content pages: a redirect stub and a generated export, plus the three retired case pages (stubs from Task 9).
const NON_CONTENT = new Set([
  'about.html', 'cv.html',
  'portfolio/mcp-server.html', 'portfolio/automation-tools.html', 'portfolio/interview-prep.html',
]);
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700&family=IBM+Plex+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';

test('content pages share one fonts link with the Instrument Sans width axis', () => {
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
  for (const [name, value] of [['--ed-bg', '#ffffff'], ['--ed-ink', '#111111'], ['--ed-ink-mute', '#767672'], ['--ed-accent', '#c45a38'], ['--ed-panel', '#f1f1ef'], ['--ed-field', '#c9cdd4']]) {
    assert.match(light[1], new RegExp(`${name}:\\s*${value};`), `light ${name}`);
  }
  for (const [name, value] of [['--ed-bg', '#0c0c0d'], ['--ed-ink', '#f4f4f2'], ['--ed-ink-mute', '#7c7c78'], ['--ed-accent', '#e0764f'], ['--ed-panel', '#18181a'], ['--ed-field', '#1b1e23']]) {
    assert.match(dark[1], new RegExp(`${name}:\\s*${value};`), `dark ${name}`);
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

  const css = readText('assets/css/editorial.css');
  assert.match(css, /\.star-on, \.star-on \* \{ cursor: none !important; \}/);
  assert.match(css, /\.star-on input, \.star-on textarea, \.star-on select, \.star-on \[contenteditable="true"\] \{ cursor: text !important; \}/);
  const z = css.match(/\.ed-star-layer \{[^}]*z-index: (\d+);/);
  assert.ok(z && Number(z[1]) > 100, 'the star layer must sit above the cookie banner and the mobile menu');

  for (const file of listHtmlFiles()) {
    const name = relative(file);
    if (NON_CONTENT.has(name) || name === 'index.html') continue;   // the home page joins in PR B
    assert.match(fs.readFileSync(file, 'utf8'), /assets\/js\/star-cursor\.js\?v=20260929/, `${name} must load star-cursor.js`);
  }
});

test('experience.html keeps the AI Match hooks inside the role reveals', () => {
  const html = readText('experience.html');
  const roles = [...html.matchAll(/<section class="ed-reveal__inner" id="(role-[a-z]+)">([\s\S]*?)<\/section>\s*<\/dialog>/g)];
  assert.deepEqual(roles.map((m) => m[1]), ['role-sema', 'role-labforward', 'role-labtwin', 'role-thryve', 'role-ey']);
  for (const [, id, body] of roles) {
    for (const hook of ['data-role-company', 'data-role-title', 'data-role-meta', 'data-role-summary', 'data-role-skill']) {
      assert.ok(body.includes(hook), `${id} lost ${hook}`);
    }
    assert.ok(body.includes('<section class="ed-how" aria-label="How I work">'), `${id} lost its How I work block`);
  }
  assert.match(html, /id="role-skills"/);
  assert.ok((html.match(/class="ed-stage[ "]/g) || []).length >= 4, 'the skills section keeps its .ed-stage rows');
  assert.match(html, /<a class="ed-page-head__link" href="cv\.html"[^>]*data-ga-event="resume_downloaded"/, 'the Experience page keeps its View CV link');
  const aiMatch = readText('assets/js/ai-match.js');
  for (const hook of ['[data-role-company]', '[data-role-title]', '[data-role-meta]', '[data-role-summary]', '[data-role-skill]']) {
    assert.ok(aiMatch.includes(hook), `ai-match.js no longer reads ${hook}`);
  }
});

test('every logo mask the markup references exists', () => {
  const missing = [];
  for (const file of listHtmlFiles()) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/(?<!-webkit-)mask-image:url\('([^']+)'\)/g)) {
      if (!fs.existsSync(path.resolve(path.dirname(file), m[1]))) missing.push(`${relative(file)} -> ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('portfolio.html is a mosaic of eight tiles over five project reveals', () => {
  const html = readText('portfolio.html');
  assert.equal((html.match(/<button class="ed-tile[ "]/g) || []).length, 8, 'expected eight tiles');
  const reveals = [...html.matchAll(/<dialog class="ed-reveal" id="(project-[a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(reveals, ['project-labforward', 'project-labtwin', 'project-thryve', 'project-opppaths', 'project-remarcable']);
  assert.doesNotMatch(html, /mcp-server|automation-tools|interview-prep/, 'retired projects stay off the portfolio');
  for (const m of html.matchAll(/<a class="ed-reveal__link" href="([^"]+)"/g)) {
    assert.match(m[1], /^portfolio\/[a-z-]+\.html$/, `case-study link should be relative: ${m[1]}`);
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
