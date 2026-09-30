import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/star-cursor.js', import.meta.url), 'utf8');

test('the cursor sparks once per home element entry, preserves reveal sparks, and skips text fields and touch', () => {
  const listeners = {};
  let bursts = 0;
  class Element {
    constructor(selector = '', parent = null) { this.selector = selector; this.parent = parent; }
    closest(selectors) {
      return selectors.split(', ').includes(this.selector) ? this : this.parent?.closest(selectors) || null;
    }
  }
  const makeNode = () => ({
    style: {}, classList: { add() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, appendChild() {}, animate() {},
    append(...nodes) { for (const node of nodes) node.parentNode = this; },
    getContext() { return { setTransform() {} }; },
  });
  const body = makeNode();
  vm.runInNewContext(source, {
    Element, Path2D: class {}, MutationObserver: class { observe() {} },
    performance: { now() { bursts++; return 1; } },
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
  const card = new Element('.ed-loop-card');
  move(card);
  assert.equal(bursts, 1, 'entering a workflow card produces a burst');
  move(new Element('span', card));
  assert.equal(bursts, 1, 'moving across the same card does not repeat the burst');
  move(new Element('a[href]'));
  assert.equal(bursts, 2, 'entering a link produces a burst');
  const button = new Element('button');
  move(button);
  assert.equal(bursts, 3, 'entering a button produces a burst');
  move(new Element('textarea', button));
  assert.equal(bursts, 3, 'text fields keep the native caret without a burst');
  move(card, 'touch');
  assert.equal(bursts, 3, 'touch does not trigger cursor effects');
  const reveal = new Element('[data-action="open-reveal"]');
  move(reveal);
  assert.equal(bursts, 4, 'a reveal still produces exactly one burst');
  move(new Element('span', reveal));
  assert.equal(bursts, 4, 'moving inside a reveal target does not repeat the burst');
  move(button);
  assert.equal(bursts, 5);
  listeners.mouseout({ relatedTarget: null });
  move(button);
  assert.equal(bursts, 6, 'returning from outside the window counts as a new entry');
});
