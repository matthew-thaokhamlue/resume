import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/loop-hero.js', import.meta.url), 'utf8');

test('the wheel adds momentum, lands on the matching role, and handles reduced motion and unavailable WebGL', () => {
  function run({ reduced = false, webgl = false, shaderFail = false } = {}) {
    const node = () => {
      const classes = new Set(), attributes = {};
      return {
        style: {}, listeners: {}, children: [], textContent: '', hidden: true,
        classList: {
          add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); },
          toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
        },
        setAttribute(name, value) { attributes[name] = value; },
        getAttribute(name) { return attributes[name]; },
        removeAttribute(name) { delete attributes[name]; },
        addEventListener(name, fn) { this.listeners[name] = fn; },
        append(child) { this.children.push(child); },
        replaceChildren(child) { this.children = [child]; },
        getBoundingClientRect() { return { width: 358, height: 560, left: 0, top: 0, bottom: 560 }; },
        getTotalLength() { return 100; },
        getPointAtLength(value) { return { x: value, y: value }; },
      };
    };
    const stage = node(), section = node(), canvas = node(), role = node(), button = node(), result = node(), icon = node();
    const cards = Array.from({ length: 6 }, node), paths = [node(), node()];
    const queries = { canvas, '.ed-role-word': role, '.ed-loop-orbit': node(), '.ed-mark-star': node() };
    stage.querySelector = (selector) => queries[selector];
    stage.querySelectorAll = (selector) => selector === '.ed-loop-card' ? cards : paths;
    stage.closest = () => section;
    button.querySelector = () => icon;
    let glCalls = 0;
    const gl = new Proxy({}, { get(_, name) {
      if (/^[A-Z_]+$/.test(name)) return name;
      return (...args) => {
        glCalls++;
        if (name === 'getShaderParameter') return !shaderFail;
        if (name === 'getProgramParameter') return args[1] === 'ACTIVE_UNIFORMS' ? 0 : true;
        return {};
      };
    } });
    canvas.getContext = () => webgl ? gl : null;
    const queue = [];
    let timestamp = 1, intersect, random = 0.5;
    vm.runInNewContext(source, {
      console: { error() {} }, Math: Object.assign(Object.create(Math), { random: () => random }),
      requestAnimationFrame(fn) { queue.push(fn); },
      ResizeObserver: class { observe() {} },
      IntersectionObserver: class { constructor(fn) { intersect = fn; } observe() { fnVisible(); } },
      window: { matchMedia() { return { matches: reduced }; }, addEventListener() {} },
      document: {
        documentElement: node(), createElement: node,
        getElementById(id) { return { 'loop-stage': stage, 'loop-spin': button, 'loop-result': result }[id]; },
      },
    });
    function fnVisible() { intersect([{ isIntersecting: true }]); }
    const step = (count = 1, gap = 1000 / 60) => {
      for (let i = 0; i < count && queue.length; i++) {
        assert.equal(queue.length, 1, 'one animation loop handles repeated clicks');
        queue.shift()(timestamp); timestamp += gap;
      }
    };
    const settle = () => { step(300); assert.equal(queue.length, 0, 'the wheel stops within five seconds after the last click'); };
    const rotation = () => Number(icon.style.transform?.match(/rotate\(([^r]+)rad\)/)?.[1] || 0);
    return { role, button, result, cards, canvas, paths, step, settle, rotation, visible: fnVisible, calls: () => glCalls, setRandom(value) { random = value; }, click: () => button.listeners.click() };
  }

  const slow = run(), fast = run();
  assert.equal(slow.button.hidden, false, 'the spin control works without WebGL');
  slow.click(); fast.click(); slow.step(10); fast.step(10);
  const slowBefore = slow.rotation(), fastBefore = fast.rotation();
  fast.click(); fast.click(); slow.step(2); fast.step(2);
  assert.ok(fast.rotation() - fastBefore > 2 * (slow.rotation() - slowBefore), 'more clicks increase visible angular speed');
  assert.equal(fast.role.children[0].children.length, 7, 'the reel repeats its first word for a continuous wrap');
  assert.equal(fast.result.textContent, '', 'the description waits for the wheel to stop');
  slow.settle();
  assert.equal(slow.role.textContent, 'tester');
  assert.match(slow.result.textContent, /Product Tester,/);
  assert.equal(slow.cards[3].classList.contains('is-front'), true, 'the UAT station matches the tester role');
  assert.match(slow.cards[3].style.transform, /translate\(179\.0px, 56\.0px\)/, 'the selected station lands at the top');
  assert.equal(slow.role.getAttribute('aria-hidden'), undefined);
  for (let i = 0; i < 50; i++) fast.click();
  fast.settle();
  assert.match(fast.result.textContent.toLowerCase(), new RegExp(`product ${fast.role.textContent}`));
  assert.equal(fast.result.getAttribute('aria-busy'), undefined);

  const reduced = run({ reduced: true });
  for (let i = 0; i < 6; i++) { reduced.click(); assert.ok(reduced.result.textContent); }
  assert.equal(reduced.role.textContent, 'builder');
  assert.equal(reduced.rotation(), 0, 'reduced motion skips the spin animation');
  reduced.settle();
  reduced.setRandom(0); reduced.click(); const firstSentence = reduced.result.textContent;
  reduced.setRandom(0.99);
  for (let i = 0; i < 6; i++) reduced.click();
  assert.notEqual(reduced.result.textContent, firstSentence, 'the same station can select a different sentence from its bank');
  assert.equal((source.match(/'As a Product /g) || []).length, 24, 'six stations each have four sentences');

  const delayed = run(); delayed.click(); delayed.step(1, 6000); delayed.step();
  assert.ok(delayed.result.textContent, 'a delayed frame stops the wheel according to elapsed time');
  delayed.settle();

  const failed = run({ webgl: true, shaderFail: true });
  failed.click(); failed.settle(); assert.equal(failed.role.textContent, 'tester');
  const live = run({ webgl: true });
  live.click(); live.step(10);
  live.canvas.listeners.webglcontextlost({ preventDefault() {} });
  const beforeLoss = live.calls();
  live.settle(); live.visible(); live.click(); live.settle();
  assert.equal(live.calls(), beforeLoss, 'a lost WebGL context never receives another render call');
  assert.equal(live.canvas.style.display, 'none');
  assert.equal(live.paths[0].style.strokeDashoffset, 0, 'a lost context completes the mark');
  assert.ok(live.result.textContent, 'explicit spins keep working through the DOM after context loss');
});
