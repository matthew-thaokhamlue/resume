import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_BASE = 'https://matthew-thaokhamlue.github.io/resume/';

// about.html is a redirect stub, cv.html is a generated export — neither is a content page.
const NON_CONTENT_PAGES = new Set(['about.html', 'cv.html']);
// Intentionally hidden (noindex, unlinked) — must stay OUT of the sitemap.
const HIDDEN_PAGES = new Set(['portfolio/achievement.html']);

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function listPages() {
  const rootPages = fs
    .readdirSync(repoRoot)
    .filter((name) => name.endsWith('.html'));
  const portfolioPages = fs
    .readdirSync(path.join(repoRoot, 'portfolio'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => `portfolio/${name}`);
  return [...rootPages, ...portfolioPages].sort();
}

function contentPages() {
  return listPages().filter((page) => !NON_CONTENT_PAGES.has(page));
}

test('sitemap.xml stays in sync with the pages on disk', () => {
  const sitemap = readText('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const sitemapPaths = new Set(
    locs.map((loc) => {
      assert.ok(loc.startsWith(SITE_BASE), `Unexpected sitemap origin: ${loc}`);
      const rel = loc.slice(SITE_BASE.length);
      return rel === '' ? 'index.html' : rel;
    }),
  );

  // Every sitemap entry must exist on disk.
  for (const rel of sitemapPaths) {
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `sitemap entry has no file: ${rel}`);
  }

  // Every public content page must be in the sitemap.
  const missing = contentPages().filter(
    (page) => !HIDDEN_PAGES.has(page) && !sitemapPaths.has(page),
  );
  assert.deepEqual(missing, [], 'public pages missing from sitemap');

  // Hidden pages must never leak into the sitemap.
  for (const hidden of HIDDEN_PAGES) {
    assert.ok(!sitemapPaths.has(hidden), `${hidden} is hidden and must not be in the sitemap`);
  }
});

test('content pages carry the required head metadata', () => {
  const requirements = [
    ['title', /<title>[^<]+<\/title>/],
    ['meta description', /<meta\s+name="description"[\s\S]*?content="[^"]+"/],
    ['canonical link', /<link\s+rel="canonical"\s+href="[^"]+"/],
    ['og:title', /<meta\s+property="og:title"[\s\S]*?content="[^"]+"/],
    ['og:description', /<meta\s+property="og:description"[\s\S]*?content="[^"]+"/],
    ['og:image', /<meta\s+property="og:image"[\s\S]*?content="[^"]+"/],
    ['twitter:card', /<meta\s+name="twitter:card"\s+content="summary_large_image"/],
    ['twitter:title', /<meta\s+name="twitter:title"[\s\S]*?content="[^"]+"/],
    ['twitter:description', /<meta\s+name="twitter:description"[\s\S]*?content="[^"]+"/],
    ['twitter:image', /<meta\s+name="twitter:image"[\s\S]*?content="[^"]+"/],
  ];

  const failures = [];
  for (const page of contentPages()) {
    const html = readText(page);
    for (const [label, pattern] of requirements) {
      if (!pattern.test(html)) failures.push(`${page}: missing ${label}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('GA is consent-gated: no static gtag.js loader, site.js gates on accepted', () => {
  const offenders = contentPages().filter((page) =>
    readText(page).includes('googletagmanager.com/gtag/js'),
  );
  assert.deepEqual(offenders, [], 'pages must not load gtag.js unconditionally');

  const siteJs = readText('assets/js/site.js');
  assert.ok(siteJs.includes('G-D11HKMWFB4'), 'site.js lost the GA measurement ID');
  assert.ok(siteJs.includes("'resume_cookie_consent'"), 'site.js lost the consent storage key');
  assert.ok(siteJs.includes("'resume_cookie_consent_change'"), 'site.js lost the consent change event');
  assert.ok(siteJs.includes("readConsent() !== 'accepted'"), 'site.js no longer gates gtag.js on accepted consent');
});

test('every content page offers the footer cookie-preferences control', () => {
  const missing = contentPages().filter(
    (page) => !readText(page).includes('data-action="cookie-preferences"'),
  );
  assert.deepEqual(missing, []);
});

test('content pages use the precompiled tailwind stylesheet, not the Play CDN', () => {
  const failures = [];
  for (const page of contentPages()) {
    const html = readText(page);
    const prefix = page.startsWith('portfolio/') ? '../' : '';
    if (html.includes('cdn.tailwindcss.com')) failures.push(`${page}: still loads the Tailwind Play CDN`);
    if (/tailwind\.config\s*=/.test(html)) failures.push(`${page}: still has an inline tailwind config block`);
    if (!html.includes(`${prefix}assets/css/tailwind.css?v=`)) failures.push(`${page}: missing compiled tailwind.css link`);
  }
  assert.deepEqual(failures, []);
});

test('local asset cache-bust versions match across all content pages', () => {
  const versions = new Set();
  for (const page of contentPages()) {
    for (const match of readText(page).matchAll(/(?:editorial\.(?:css|js)|tailwind\.css|site\.js)\?v=([A-Za-z0-9]+)/g)) {
      versions.add(match[1]);
    }
  }
  assert.equal(versions.size, 1, `expected one shared ?v= version, found: ${[...versions].join(', ')}`);
});

test('content pages have no inline event handlers', () => {
  const failures = [];
  for (const page of contentPages()) {
    const matches = [...readText(page).matchAll(/\son(?:click|keydown|keyup|submit|change|load|error|mouseover|focus|blur)\s*=/g)];
    if (matches.length > 0) failures.push(`${page}: ${matches.length} inline handler(s)`);
  }
  assert.deepEqual(failures, []);
});

test('content pages carry the Content-Security-Policy meta tag', () => {
  const missing = contentPages().filter(
    (page) => !readText(page).includes('http-equiv="Content-Security-Policy"'),
  );
  assert.deepEqual(missing, []);
});

test('the only inline scripts are JSON-LD data blocks', () => {
  const failures = [];
  for (const page of contentPages()) {
    for (const match of readText(page).matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)) {
      if (!match[1].includes('application/ld+json')) {
        failures.push(`${page}: executable inline script (${match[1].trim() || 'no attrs'})`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('data-ga-params attributes hold valid JSON', () => {
  const failures = [];
  for (const page of contentPages()) {
    for (const match of readText(page).matchAll(/data-ga-params='([^']*)'/g)) {
      try {
        JSON.parse(match[1]);
      } catch {
        failures.push(`${page}: invalid JSON ${match[1].slice(0, 60)}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('every data-action in markup is handled by site.js', () => {
  const siteJs = readText('assets/js/site.js');
  const unhandled = new Set();
  for (const page of contentPages()) {
    for (const match of readText(page).matchAll(/data-action="([^"]+)"/g)) {
      if (!siteJs.includes(`case '${match[1]}':`)) unhandled.add(`${page}: ${match[1]}`);
    }
  }
  assert.deepEqual([...unhandled], []);
});

test('fragment links point at ids that exist', () => {
  // cv.html is a generated export with GitHub-style `user-content-*` anchor ids — skip it.
  const failures = [];
  const pages = contentPages();
  const idsByPage = new Map(
    pages.map((page) => [
      page,
      new Set([...readText(page).matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((m) => m[2])),
    ]),
  );

  for (const page of pages) {
    const html = readText(page);
    for (const match of html.matchAll(/\bhref\s*=\s*(["'])([^"':]*?)#([^"']+)\1/g)) {
      const [, , target, fragment] = match;
      let targetPage = page;
      if (target) {
        const resolved = path.relative(
          repoRoot,
          path.resolve(repoRoot, path.dirname(page), target),
        );
        if (!idsByPage.has(resolved)) continue; // external or non-page target
        targetPage = resolved;
      }
      if (!idsByPage.get(targetPage).has(fragment)) {
        failures.push(`${page}: href="${target}#${fragment}" has no matching id`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
