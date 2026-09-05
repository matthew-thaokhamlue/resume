import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const careerSource = fs.readFileSync(new URL('../assets/js/career.js', import.meta.url), 'utf8');
const experienceHtml = fs.readFileSync(new URL('../experience.html', import.meta.url), 'utf8');

function classes() {
  const values = new Set();
  return {
    add: value => values.add(value),
    remove: value => values.delete(value),
    contains: value => values.has(value),
    toggle: (value, force) => force ? values.add(value) : values.delete(value),
  };
}

function scene(reduced = false) {
  const triggers = [];
  const moves = [];
  const morph = { v: 0 };
  let factoryCalls = 0;
  const mark = { state: {}, querySelectorAll: () => [{}, {}], querySelector: () => ({}) };
  const homeRect = { left: 930, top: 180, width: 220, height: 128, right: 1150, bottom: 308 };
  const home = { getBoundingClientRect: () => ({ ...homeRect, top: homeRect.top - window.scrollY }) };
  const hero = {
    getBoundingClientRect: () => ({ left: 0, top: -500, width: 1280, height: 720, right: 1280, bottom: 220 }),
    querySelector: selector => ({
      '.ed-experience__mark-home': home,
      '.ed-motion-mark': mark,
    })[selector] || null,
  };
  const positions = [1000, 2000, 3000, 4300];
  const stops = positions.map((top, index) => ({
    classList: classes(),
    dataset: { starSide: index % 2 ? 'left' : 'right' },
    getBoundingClientRect: () => ({
      left: window.innerWidth < 720 ? 60 : index % 2 ? 680 : 320,
      right: window.innerWidth < 720 ? window.innerWidth - 16 : index % 2 ? 1040 : 650,
      top: top - window.scrollY,
      bottom: top - window.scrollY + 80,
      width: index % 2 ? 360 : 330,
      height: 80,
    }),
  }));
  const wrap = { querySelectorAll: selector => selector === ':scope > section' ? [] : [] };
  const skills = { getBoundingClientRect: () => ({ bottom: 4700 - window.scrollY }) };
  const gsap = {
    registerPlugin() {},
    set(target, values) { Object.assign(target.state, values); },
  };
  const window = {
    gsap,
    ScrollTrigger: { create: config => triggers.push(config) },
    createShootingStar() {
      factoryCalls += 1;
      return { morph, wake() {}, move(...args) { moves.push(args); } };
    },
    matchMedia: () => ({ matches: reduced }),
    innerWidth: 1280,
    innerHeight: 800,
    scrollY: 500,
  };
  const document = {
    readyState: 'complete',
    body: { appendChild() {} },
    fonts: null,
    querySelector: selector => ({
      '.ed-hero': hero,
      '.ed-career': wrap,
      '#role-skills': skills,
    })[selector] || null,
    querySelectorAll: selector => selector === '[data-star-stop]' ? stops : [],
  };
  vm.runInNewContext(careerSource, { document, window, Promise, setTimeout, clearTimeout });
  return {
    triggers, moves, morph, stops, mark, window, factoryCalls: () => factoryCalls,
    scrollTo(y) { window.scrollY = y; triggers[0].onUpdate(); return moves.at(-1); },
  };
}

test('experience page provides one right-side M and four evidence stops', () => {
  assert.match(experienceHtml, /ed-hero--experience/);
  assert.match(experienceHtml, /ed-experience__mark-home/);
  assert.equal((experienceHtml.match(/data-star-stop/g) ?? []).length, 4);
  assert.match(experienceHtml, /assets\/js\/motion-star\.js\?v=/);
});

test('the experience star follows a continuous route and retraces it on reverse scroll', () => {
  const s = scene();
  assert.equal(s.factoryCalls(), 1);
  assert.equal(s.triggers.length, 1, 'one controller owns the entire route');
  s.scrollTo(600);
  assert.equal(s.morph.v, 1);
  assert.ok(s.stops[0].classList.contains('is-star-active'));
  const firstMove = s.moves.at(-1);
  const midpoint = s.scrollTo(1100);
  const nearby = s.scrollTo(1101);
  assert.ok(Math.hypot(nearby[0] - midpoint[0], nearby[1] - midpoint[1]) < 3, 'the star jumps when the nearest stop changes');
  assert.ok(!s.stops.some(stop => stop.classList.contains('is-star-active')), 'only a docked star highlights text');
  s.scrollTo(1600);
  assert.ok(s.stops[1].classList.contains('is-star-active'));
  assert.notDeepEqual(s.moves.at(-1), firstMove);
  assert.deepEqual(s.scrollTo(1100), midpoint, 'reverse scrolling must retrace the same curve');
  assert.deepEqual(s.scrollTo(600), firstMove);
  assert.ok(s.stops[0].classList.contains('is-star-active'));
  s.scrollTo(0);
  assert.equal(s.morph.v, 0, 'returning to the hero restores the M');
  assert.equal(s.moves.at(-1)[1], 244);
  s.scrollTo(4600);
  assert.equal(s.moves.at(-1)[3], 0, 'the star fades after the last stop');

  let previous = s.scrollTo(0);
  for (let y = 1; y < 4400; y++) {
    const next = s.scrollTo(y);
    assert.ok(Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 5, 'the route jumps at scroll ' + y);
    previous = next;
  }
});

test('mobile flight stays in the viewport through the whole route and refresh', () => {
  const s = scene();
  s.window.innerWidth = 390;
  for (let y = 400; y <= 4500; y += 10) {
    const [x, top] = s.scrollTo(y);
    assert.ok(x >= 24 && x <= 366, 'star left the mobile viewport');
    assert.ok(top >= 80 && top <= 760, 'the route stalls at a viewport edge');
  }
  s.scrollTo(2600);
  s.triggers[0].onRefresh();
  assert.ok(s.stops[2].classList.contains('is-star-active'));
});

test('reduced motion keeps the experience M static', () => {
  const s = scene(true);
  assert.equal(s.factoryCalls(), 0);
  assert.equal(s.triggers.length, 0);
  assert.equal(s.moves.length, 0);
});
