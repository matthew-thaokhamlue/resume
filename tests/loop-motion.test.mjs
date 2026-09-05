import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
    contains(value) { return values.has(value); },
  };
}

test('the hero M paths merge into one open circular stroke without fading the mark', () => {
  const strokes = [{}, {}];
  const mark = {
    querySelectorAll(selector) {
      return selector === '.ed-motion-mark__stroke' ? strokes : [];
    },
  };
  const home = {
    getBoundingClientRect() {
      return { left: 20, top: 40, width: 300, height: 169 };
    },
  };
  const words = Array.from({ length: 6 }, () => ({}));
  const role = {
    style: { setProperty() {} },
    querySelectorAll(selector) {
      return selector === '.ed-hero__role-word' ? words : [];
    },
  };
  const hero = {
    querySelector(selector) {
      return {
        '.ed-hero__mark-home': home,
        '.ed-motion-mark': mark,
        '.ed-hero__role': role,
      }[selector] ?? null;
    },
  };
  const sets = [];
  const tweens = [];
  const timeline = {
    to(target, values, at) {
      tweens.push({ target, values, at });
      return timeline;
    },
  };
  const document = {
    readyState: 'complete',
    fonts: null,
    body: { appendChild() {} },
    documentElement: { classList: { add() {} } },
    querySelector(selector) {
      return selector === '.ed-hero--product' ? hero : null;
    },
  };
  const gsap = {
    registerPlugin() {},
    set(target, values) { sets.push({ target, values }); },
    timeline() { return timeline; },
  };

  const source = fs.readFileSync(path.join(repoRoot, 'assets/js/loop.js'), 'utf8');
  vm.runInNewContext(source, {
    document,
    window: {
      gsap,
      ScrollTrigger: { refresh() {} },
      matchMedia: () => ({ matches: false }),
    },
  });

  const morphs = tweens.filter(({ target, values }) => strokes.includes(target) && values.attr?.d);
  assert.equal(morphs.length, 2, 'both M strokes must reshape into the open circle');
  assert.equal(tweens.some(({ target, values }) => target === mark && values.opacity === 0), false);
});

test('the same open-circle mark lands above Strategy and travels outside the loop rim', () => {
  const strokes = [{}, {}];
  const mark = {
    querySelectorAll(selector) {
      return selector === '.ed-motion-mark__stroke' ? strokes : [];
    },
  };
  const homeRect = { left: 20, top: 40, width: 300, height: 169 };
  const home = { getBoundingClientRect: () => homeRect };
  const words = Array.from({ length: 6 }, () => ({}));
  const role = {
    style: { setProperty() {} },
    querySelectorAll(selector) {
      return selector === '.ed-hero__role-word' ? words : [];
    },
  };
  const hero = {
    querySelector(selector) {
      return {
        '.ed-hero__mark-home': home,
        '.ed-motion-mark': mark,
        '.ed-hero__role': role,
      }[selector] ?? null;
    },
  };
  const cards = Array.from({ length: 6 }, (_, index) => ({
    offsetWidth: 200,
    offsetHeight: 100,
    classList: classList(index === 0 ? ['is-front'] : []),
  }));
  const stage = { clientHeight: 500 };
  const trackRect = { left: 100, top: 200, width: 1000, height: 300 };
  const track = { getBoundingClientRect: () => trackRect };
  const markUpdates = [];
  const scrollTriggers = [];
  const section = {
    querySelectorAll(selector) {
      return selector === '.ed-loop__card' ? cards : [];
    },
    querySelector(selector) {
      return {
        '.ed-loop__stage': stage,
        '.ed-loop__track': track,
      }[selector] ?? null;
    },
  };
  const document = {
    readyState: 'complete',
    fonts: null,
    body: { appendChild() {} },
    querySelector(selector) {
      if (selector === '.ed-hero--product') return hero;
      if (selector === '.ed-loop') return section;
      return null;
    },
  };
  const gsap = {
    registerPlugin() {},
    set(target, values) {
      if (target === mark) markUpdates.push(values);
    },
    timeline() {
      const timeline = { to() { return timeline; } };
      return timeline;
    },
  };
  const ScrollTrigger = {
    create(config) { scrollTriggers.push(config); },
  };

  const source = fs.readFileSync(path.join(repoRoot, 'assets/js/loop.js'), 'utf8');
  const browserWindow = {
    gsap,
    ScrollTrigger,
    innerHeight: 800,
    innerWidth: 1280,
    matchMedia: () => ({ matches: false }),
  };
  vm.runInNewContext(source, { document, window: browserWindow });

  assert.equal(scrollTriggers.length, 2);
  const handoff = scrollTriggers.find(({ start }) => start === 'top bottom');
  const loop = scrollTriggers.find(({ start }) => start === 'top top');
  handoff.onUpdate({ progress: 1 });
  const stagedState = markUpdates.at(-1);
  const stagedCenterY = stagedState.y + homeRect.height / 2;
  loop.onUpdate({ progress: 0.0625 });
  const descendingState = markUpdates.at(-1);
  assert.ok(descendingState.y + homeRect.height / 2 > stagedCenterY, 'the mark did not move down to Strategy');

  const update = loop.onUpdate;

  update({ progress: 0.125 });
  const strategyState = markUpdates.at(-1);
  const strategyCenter = {
    x: strategyState.x + homeRect.width / 2,
    y: strategyState.y + homeRect.height / 2,
  };
  assert.ok(Math.abs(strategyCenter.x - 600) < 1, 'the mark did not land over Strategy');
  assert.ok(strategyCenter.y < trackRect.top, 'the mark did not land outside the top rim');

  update({ progress: 0.25 });
  assert.equal(cards[1].classList.contains('is-front'), true, 'Planning was not highlighted');
  const planningState = markUpdates.at(-1);
  const planningCenter = {
    x: planningState.x + homeRect.width / 2,
    y: planningState.y + homeRect.height / 2,
  };
  const planningCardRight = 600 + Math.cos(-30 * Math.PI / 180) * 500 + cards[1].offsetWidth / 2;
  assert.ok(planningCenter.x > planningCardRight, 'the mark overlapped the Planning card');
  const normalizedDistance = ((planningCenter.x - 600) / 500) ** 2 + ((planningCenter.y - 350) / 150) ** 2;
  assert.ok(normalizedDistance > 1, 'the mark travelled inside the loop rim');

  Object.assign(trackRect, { left: 107, top: 200, width: 176, height: 384 });
  browserWindow.innerWidth = 390;
  update({ progress: 0.3125 });
  const mobileState = markUpdates.at(-1);
  const mobileCenterX = mobileState.x + homeRect.width / 2;
  assert.ok(mobileCenterX <= 361, 'the pointer left the mobile viewport');

  update({ progress: 0.875 });
  assert.equal(cards[0].classList.contains('is-front'), true, 'Strategy was not highlighted on return');

  update({ progress: 1 });
  const finalMarkState = markUpdates.at(-1);
  assert.equal(finalMarkState.opacity, 0);
  assert.ok(finalMarkState.y < strategyState.y, 'the mark did not exit upward');
});
