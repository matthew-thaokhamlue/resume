import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function extractStackingScript(html) {
  const match = html.match(/<!-- Stacking scroll effect -->\s*<script>([\s\S]*?)<\/script>/);
  assert.ok(match && match[1], 'Failed to locate stacking scroll script in HTML');
  return match[1];
}

function createHarness(scriptCode, options = {}) {
  const panelHeights = options.panelHeights ?? [1000, 1000, 1000];
  const totalHeight = panelHeights.reduce((sum, value) => sum + value, 0);
  const starts = [];
  let cursor = 0;
  for (const height of panelHeights) {
    starts.push(cursor);
    cursor += height;
  }

  const windowMock = {
    innerHeight: options.innerHeight ?? 1000,
    scrollY: options.scrollY ?? 0,
    setTimeout: () => 1,
    clearTimeout: () => {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    scrollTo: (_x, y) => {
      windowMock.scrollY = y;
    },
  };

  const panels = panelHeights.map((height, index) => ({
    offsetHeight: height,
    classList: {
      remove: () => {},
      toggle: () => {},
    },
    getBoundingClientRect: () => ({
      top: starts[index] - windowMock.scrollY,
      height,
    }),
  }));

  const eventHandlers = {};
  windowMock.addEventListener = (type, handler) => {
    eventHandlers[type] = handler;
  };

  const documentMock = {
    querySelectorAll: (selector) => (selector === '.stack-panel' ? panels : []),
    documentElement: {
      scrollHeight: totalHeight,
    },
  };

  windowMock.document = documentMock;

  const context = vm.createContext({
    window: windowMock,
    document: documentMock,
    Math,
    Number,
    Array,
    Boolean,
    console,
  });

  vm.runInContext(scriptCode, context);
  return { eventHandlers };
}

test('index stacking script does not force upward snap when deep in current panel', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const script = extractStackingScript(html);
  const { eventHandlers } = createHarness(script, {
    scrollY: 1400,
    innerHeight: 1000,
    panelHeights: [1000, 1000, 1000],
  });

  assert.equal(typeof eventHandlers.wheel, 'function', 'Wheel handler was not registered');

  let prevented = false;
  eventHandlers.wheel({
    deltaY: -120,
    target: {
      closest: () => null,
    },
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(
    prevented,
    false,
    'Upward wheel input should not snap while far from panel top',
  );
});
