import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/star-cursor.js', import.meta.url), 'utf8');

class Element {
  constructor(selectors = '', parent = null) { this.selectors = [].concat(selectors); this.parent = parent; }
  closest(query) {
    return query.split(', ').some((s) => this.selectors.includes(s)) ? this : this.parent?.closest(query) || null;
  }
}

function loadStarCursor() {
  const listeners = {};
  const nodes = [];
  const counts = { bursts: 0 };
  const makeNode = () => {
    const node = {
      style: {}, classList: { add() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, appendChild() {}, animate() {},
      append(...children) { for (const child of children) child.parentNode = this; },
      getContext() { return { setTransform() {} }; },
    };
    nodes.push(node);
    return node;
  };
  const body = makeNode();
  vm.runInNewContext(source, {
    Element, Path2D: class {}, MutationObserver: class { observe() {} },
    performance: { now() { counts.bursts++; return 1; } },
    requestAnimationFrame() {}, innerWidth: 1200, innerHeight: 800,
    window: {
      matchMedia(query) { return { matches: query === '(pointer: fine)' }; },
      addEventListener(name, fn) { listeners[name] = fn; },
    },
    document: {
      body, documentElement: makeNode(), createElement: makeNode,
      querySelector() { return null; }, elementFromPoint() { return null; },
      addEventListener(name, fn) { listeners[name] = fn; },
    },
  });
  const move = (target, pointerType = 'mouse') => listeners.pointermove({ target, pointerType, clientX: 100, clientY: 100 });
  const pill = nodes.find((node) => node.className === 'ed-star-label__text');
  return { listeners, counts, move, pill };
}

test('the cursor sparks once per home element entry, preserves reveal sparks, and skips text fields and touch', () => {
  const { listeners, counts, move } = loadStarCursor();
  const card = new Element('.ed-loop-card');
  move(card);
  assert.equal(counts.bursts, 1, 'entering a workflow card produces a burst');
  move(new Element('span', card));
  assert.equal(counts.bursts, 1, 'moving across the same card does not repeat the burst');
  move(new Element('a[href]'));
  assert.equal(counts.bursts, 2, 'entering a link produces a burst');
  const button = new Element('button');
  move(button);
  assert.equal(counts.bursts, 3, 'entering a button produces a burst');
  move(new Element('textarea', button));
  assert.equal(counts.bursts, 3, 'text fields keep the native caret without a burst');
  move(card, 'touch');
  assert.equal(counts.bursts, 3, 'touch does not trigger cursor effects');
  const reveal = new Element('[data-action="open-reveal"]');
  move(reveal);
  assert.equal(counts.bursts, 4, 'a reveal still produces exactly one burst');
  move(new Element('span', reveal));
  assert.equal(counts.bursts, 4, 'moving inside a reveal target does not repeat the burst');
  move(button);
  assert.equal(counts.bursts, 5);
  listeners.mouseout({ relatedTarget: null });
  move(button);
  assert.equal(counts.bursts, 6, 'returning from outside the window counts as a new entry');
});

test('the pill says "Play" over the intro play icon and "Info" over every other reveal opener', () => {
  const { counts, move, pill } = loadStarCursor();
  const playIcon = new Element(['.ed-play', '[data-action="open-reveal"]', 'button']);
  move(playIcon);
  assert.equal(pill.innerHTML, 'Play', 'the intro play icon shows the "Play" pill');
  assert.equal(counts.bursts, 1, 'entering the play icon produces exactly one burst');
  move(new Element('main'));
  move(new Element(['[data-action="open-reveal"]', 'button']));
  assert.equal(pill.innerHTML, 'Info', 'another reveal opener keeps the "Info" pill');
  move(new Element(['[data-action="open-testimonial"]', 'button']));
  assert.equal(pill.innerHTML, 'Info', 'a testimonial opener keeps the "Info" pill');
});
