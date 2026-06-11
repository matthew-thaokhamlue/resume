import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('experience.html frames Sema around Liz observability story beats', () => {
  const experienceHtml = readText('experience.html');

  assert.match(
    experienceHtml,
    /Owned the integration strategy behind Liz(?:'|&rsquo;)s sensory system/,
  );
  assert.match(experienceHtml, /Sema(?:'|&rsquo;)s AI-native observability platform/);
  assert.match(experienceHtml, /Jira, GitHub, Slack, Zoom, Linear, and document/);

  const storyBeatLabels = [
    ...experienceHtml.matchAll(/<span class="sema-story__label">([^<]+)<\/span>/g),
  ].map((match) => match[1]);
  assert.deepEqual(storyBeatLabels, ['Ingest', 'Clarify', 'Close the loop']);
});

test('experience.html frames earlier roles as the career spine behind Liz', () => {
  const experienceHtml = readText('experience.html');
  const expectedStoryPhrases = [
    'Turned lab operations and GenAI ambiguity into shipped product direction',
    'Moved AI from demo surface to daily lab workflow',
    'Built the integration muscle underneath health-data products at scale',
    'Learned where organizations fracture first: risk, process, controls, and change',
  ];

  for (const phrase of expectedStoryPhrases) {
    assert.match(experienceHtml, new RegExp(escapeRegExp(phrase)));
  }
});

test('index.html keeps the living-workflow hero contract', () => {
  const indexHtml = readText('index.html');

  // Markup hooks hero.js depends on
  for (const hook of ['ed-hero--living', 'ed-hero__canvas', 'ed-hero__scroll-cue', 'data-intro-pending']) {
    assert.match(indexHtml, new RegExp(escapeRegExp(hook)), `Missing ${hook}`);
  }
  assert.match(indexHtml, /assets\/js\/hero\.js\?v=/, 'Missing hero.js script tag');

  // The headline split/restore round-trip and editorial.js's scrub both
  // target this exact h1 markup.
  assert.match(
    indexHtml,
    /I build AI <em>workflows<\/em>,<br \/>not AI features\./,
    'Hero h1 markup changed — hero.js splitHeadline and the scrub depend on it',
  );

  // Cheap guards that the perf/a11y gates survive refactors
  const heroJs = readText('assets/js/hero.js');
  assert.match(heroJs, /prefers-reduced-motion/, 'hero.js lost its reduced-motion gate');
  assert.match(heroJs, /IntersectionObserver/, 'hero.js lost its offscreen rAF pause');
});

test('experience.html keeps the growth-rings contract', () => {
  const experienceHtml = readText('experience.html');

  // rings.js targets svg.ed-rings — one per career panel
  const taggedSvgs = experienceHtml.match(/<svg[^>]*class="ed-rings /g) ?? [];
  assert.equal(taggedSvgs.length, 5, 'Expected 5 svg.ed-rings panels');
  assert.match(experienceHtml, /assets\/js\/rings\.js\?v=/, 'Missing rings.js script tag');

  // Ring counts are accumulated career years (Sema=9, Labforward=8,
  // LabTwin=7, Thryve=5, EY=2) — preserve when editing the SVGs.
  for (const years of [9, 8, 7, 5, 2]) {
    assert.match(
      experienceHtml,
      new RegExp(`${years} organic growth rings`),
      `Missing the ${years}-ring panel`,
    );
  }

  // rings.js must keep degrading to the static authored SVGs
  const ringsJs = readText('assets/js/rings.js');
  assert.match(ringsJs, /prefers-reduced-motion/, 'rings.js lost its reduced-motion gate');
});

test('experience.html keeps the career-spine contract', () => {
  const experienceHtml = readText('experience.html');

  // career.js builds the spine + chapter choreography inside this wrap
  assert.match(experienceHtml, /<div class="ed-career">/, 'Missing .ed-career wrapper');
  assert.match(experienceHtml, /assets\/js\/career\.js\?v=/, 'Missing career.js script tag');

  // The five role panels live inside the wrap; Skills & Education stays outside
  const wrapped = experienceHtml.match(/<div class="ed-career">([\s\S]*?)<\/div><!-- \/\.ed-career -->/);
  assert.ok(wrapped, 'Could not find the ed-career wrap region');
  for (const id of ['role-sema', 'role-labforward', 'role-labtwin', 'role-thryve', 'role-ey']) {
    assert.match(wrapped[1], new RegExp(`id="${id}"`), `${id} left the ed-career wrap`);
  }
  assert.doesNotMatch(wrapped[1], /id="role-skills"/, 'role-skills must stay outside the wrap');

  const careerJs = readText('assets/js/career.js');
  assert.match(careerJs, /prefers-reduced-motion/, 'career.js lost its reduced-motion gate');
});

test('portfolio.html keeps the gallery contract', () => {
  const portfolioHtml = readText('portfolio.html');

  assert.match(portfolioHtml, /assets\/js\/folio\.js\?v=/, 'Missing folio.js script tag');
  // Section heads reveal via CSS; folio.js staggers the cards themselves
  const heads = portfolioHtml.match(/<div class="ed-section__head reveal">/g) ?? [];
  assert.equal(heads.length, 2, 'Expected both section heads to carry .reveal');

  const folioJs = readText('assets/js/folio.js');
  assert.match(folioJs, /prefers-reduced-motion/, 'folio.js lost its reduced-motion gate');
});

test('case-study pages keep the evidence-reel contract', () => {
  const casePages = fs
    .readdirSync(path.join(repoRoot, 'portfolio'))
    .filter((name) => name.endsWith('.html'));
  assert.ok(casePages.length > 0);

  for (const name of casePages) {
    const html = readText(path.join('portfolio', name));
    assert.match(
      html,
      /\.\.\/assets\/js\/case\.js\?v=/,
      `portfolio/${name} is missing the case.js script tag`,
    );
  }

  const caseJs = readText('assets/js/case.js');
  assert.match(caseJs, /prefers-reduced-motion/, 'case.js lost its reduced-motion gate');
});

test('the motion layer fails visible', () => {
  // Pages that hide content pre-reveal must declare the pending state...
  const motionPages = listHtmlFiles().filter((file) => {
    const name = relative(file);
    return name !== 'about.html' && name !== 'cv.html';
  });
  for (const file of motionPages) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(
      html,
      /<body[^>]*\bdata-motion-pending\b[^>]*>/,
      `${relative(file)} body is missing data-motion-pending`,
    );
  }

  // ...site.js must lift it when the GSAP CDN never loaded...
  const siteJs = readText('assets/js/site.js');
  assert.match(
    siteJs,
    /removeAttribute\('data-motion-pending'\)/,
    'site.js lost the blocked-CDN fallback',
  );

  // ...and editorial.css may only hide .reveal behind the scripting gate.
  const editorialCss = readText('assets/css/editorial.css');
  assert.match(
    editorialCss,
    /@media \(scripting: enabled\) and \(prefers-reduced-motion: no-preference\)/,
    'editorial.css lost the scripting/motion gate',
  );
  assert.match(editorialCss, /\[data-motion-pending\] \.reveal/, 'editorial.css lost the gated reveal state');
  const baseReveal = editorialCss.match(/\n {2}\.reveal \{([^}]*)\}/);
  assert.ok(baseReveal, 'Could not find the base .reveal rule');
  assert.doesNotMatch(baseReveal[1], /opacity:\s*0/, 'base .reveal must not hide content ungated');
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
