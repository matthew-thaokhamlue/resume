import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = [
  fs.readFileSync(new URL('../assets/js/motion-star.js', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../assets/js/loop.js', import.meta.url), 'utf8'),
].join('\n');

// Execute the production scroll callbacks and frame updates with a controlled clock.
function scene(reduced = false) {
  function element(attributes = {}) {
    return {
      style: {}, attributes, state: {},
      getAttribute: key => attributes[key],
      setAttribute(key, value) { attributes[key] = String(value); },
    };
  }
  const strokes = [
    element({ d: 'M4 51 C17 45 28 26 40 8 C47 19 54 35 66 43' }),
    element({ d: 'M25 51 C39 45 52 25 63 8 C72 20 84 43 96 51' }),
  ];
  const head = element();
  const gradient = element();
  const mark = element();
  mark.querySelectorAll = () => strokes;
  mark.querySelector = selector => selector === '.ed-motion-mark__head' ? head : gradient;
  const home = { left: 20, top: 40, width: 300, height: 174 };
  const role = { querySelectorAll: () => Array.from({ length: 6 }, element), style: { setProperty() {} } };
  const hero = { getBoundingClientRect: () => ({ top: 0 }), querySelector: selector => ({
    '.ed-hero__role': role,
    '.ed-hero__mark-home': { getBoundingClientRect: () => home },
    '.ed-motion-mark': mark,
  })[selector] };
  const cards = Array.from({ length: 6 }, () => {
    const classes = new Set();
    return { offsetWidth: 200, offsetHeight: 100, classList: {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
      toggle: (value, force) => force ? classes.add(value) : classes.delete(value),
    } };
  });
  const track = { left: 100, top: 200, width: 1000, height: 300 };
  const section = {
    querySelectorAll: () => cards,
    querySelector: selector => selector === '.ed-loop__stage'
      ? { clientHeight: 500 } : { getBoundingClientRect: () => track },
  };
  const tickers = new Set();
  const tweens = [];
  const triggers = [];
  let heroTimeline;
  const appended = [];
  const gsap = {
    registerPlugin() {},
    set(target, values) { Object.assign(target.state, values); },
    ticker: { add: fn => tickers.add(fn), remove: fn => tickers.delete(fn) },
    timeline(config) {
      heroTimeline = config;
      const timeline = { to(target, values) { tweens.push({ target, values }); return timeline; } };
      return timeline;
    },
  };
  const window = {
    gsap, innerWidth: 1280, innerHeight: 800,
    ScrollTrigger: { create: config => triggers.push(config) },
    matchMedia: () => ({ matches: reduced }),
  };
  const document = {
    readyState: 'complete',
    body: { appendChild: node => appended.push(node) },
    querySelector: selector => selector === '.ed-hero--product' ? hero : section,
  };
  vm.runInNewContext(source, { document, window });
  let time = 0;
  function frames(count = 120) {
    for (let i = 0; i < count; i++) {
      time += 1 / 60;
      [...tickers].forEach(tick => tick(time, 1000 / 60));
    }
  }
  return {
    mark, head, strokes, home, track, cards, window, tickers, appended, frames, triggers, heroTimeline,
    morph(progress) {
      const tween = tweens.find(({ values }) => values.duration === 0.75 && values.onUpdate);
      assert.ok(tween, 'the M-to-star morph is missing');
      tween.target.v = progress;
      tween.values.onUpdate();
      frames();
    },
    move(progress, count = 120) {
      triggers.find(({ start }) => start === 'top top').onUpdate({ progress });
      frames(count);
    },
    center: () => ({ x: mark.state.x + home.width / 2, y: mark.state.y + home.height / 2 }),
  };
}

test('the M becomes a star whose head turns and tail stretches, curves and settles after movement', () => {
  const s = scene();
  const original = s.strokes.map(stroke => stroke.getAttribute('d'));
  s.morph(0.5);
  assert.ok(Number(s.head.style.opacity) > 0 && Number(s.head.style.opacity) < 1);
  s.strokes.forEach((stroke, i) => assert.notEqual(stroke.getAttribute('d'), original[i]));
  s.morph(1);
  assert.equal(Number(s.head.style.opacity), 1);
  assert.equal(s.appended.length, 1, 'the star must reuse the hero SVG');
  assert.equal(s.mark.state.opacity, 1);
  s.move(0.25);
  s.heroTimeline.onUpdate();
  s.frames();
  assert.ok(Math.abs(s.center().x - 170) < 1, 'a later trigger must not pull the star away from the pinned hero');
  s.move(0.125);
  s.move(0.24, 5);
  const movingTrail = s.strokes[0].getAttribute('d');
  const forward = s.head.getAttribute('transform');
  s.move(0.30, 5);
  assert.notEqual(s.strokes[0].getAttribute('d'), movingTrail, 'the tail must deform while turning');
  s.frames(180);
  assert.notEqual(s.strokes[0].getAttribute('d'), movingTrail, 'the tail must settle after scrolling stops');
  assert.equal(s.tickers.size, 0, 'idle animation must release the frame callback');
  s.move(0.20, 8);
  assert.notEqual(s.head.getAttribute('transform'), forward, 'the head must turn when scrolling reverses');
  s.morph(0);
  assert.equal(Number(s.head.style.opacity), 0);
  assert.deepEqual(s.strokes.map(stroke => stroke.getAttribute('d')), original);
});

test('the star follows the outer loop, stays on mobile and exits after returning to Strategy', () => {
  const s = scene();
  s.morph(1);
  s.triggers.find(({ start }) => start === 'top bottom').onUpdate({ progress: 1 });
  s.frames();
  const staged = s.center().y;
  s.move(0.0625);
  assert.ok(s.center().y > staged, 'the star must descend to Strategy');
  s.move(0.125);
  assert.ok(Math.abs(s.center().x - 600) < 1);
  assert.ok(s.center().y < s.track.top);
  s.move(0.25);
  assert.ok(s.cards[1].classList.contains('is-front'));
  assert.ok(s.center().x > 1133, 'the star must clear the Planning card');
  Object.assign(s.track, { left: 107, top: 200, width: 176, height: 384 });
  s.window.innerWidth = 390;
  s.move(0.3125);
  assert.ok(s.center().x <= 362, 'the star left the mobile viewport');
  s.move(0.875);
  assert.ok(s.cards[0].classList.contains('is-front'));
  const strategyY = s.center().y;
  s.move(1);
  assert.equal(s.mark.state.opacity, 0);
  assert.ok(s.center().y < strategyY);
});

test('reduced motion leaves the static M in place without animation work', () => {
  const s = scene(true);
  assert.equal(s.appended.length, 0);
  assert.equal(s.triggers.length, 0);
  assert.equal(s.tickers.size, 0);
});
