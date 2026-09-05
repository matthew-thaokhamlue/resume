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

test('the hero M closes into a complete circle before the hero releases', () => {
  const mark = {};
  const orbit = {};
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
        '.ed-hero__mark': mark,
        '.ed-hero__orbit-circle': orbit,
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

  assert.equal(sets.some(({ target, values }) => target === orbit && values.strokeDashoffset === 1), true);
  assert.equal(tweens.some(({ target, values }) => target === mark && values.opacity === 0), true);
  assert.equal(tweens.some(({ target, values }) => target === orbit && values.strokeDashoffset === 0 && values.opacity === 1), true);
});

test('the loop cursor visits Planning, returns to Strategy, then exits upward', () => {
  const cards = Array.from({ length: 6 }, (_, index) => ({
    offsetHeight: 100,
    classList: classList(index === 0 ? ['is-front'] : []),
  }));
  const cursor = { offsetWidth: 64, offsetHeight: 4 };
  const stage = { clientHeight: 500 };
  const track = { offsetWidth: 1000, offsetHeight: 300 };
  const cursorUpdates = [];
  const scrollTriggers = [];
  const section = {
    querySelectorAll(selector) {
      return selector === '.ed-loop__card' ? cards : [];
    },
    querySelector(selector) {
      return {
        '.ed-loop__cursor': cursor,
        '.ed-loop__stage': stage,
        '.ed-loop__track': track,
      }[selector] ?? null;
    },
  };
  const document = {
    readyState: 'complete',
    fonts: null,
    querySelector(selector) {
      if (selector === '.ed-loop') return section;
      return null;
    },
  };
  const gsap = {
    registerPlugin() {},
    set(target, values) {
      if (target === cursor) cursorUpdates.push(values);
    },
  };
  const ScrollTrigger = {
    create(config) { scrollTriggers.push(config); },
  };

  const source = fs.readFileSync(path.join(repoRoot, 'assets/js/loop.js'), 'utf8');
  vm.runInNewContext(source, {
    document,
    window: {
      gsap,
      ScrollTrigger,
      matchMedia: () => ({ matches: false }),
    },
  });

  assert.equal(scrollTriggers.length, 1);
  const update = scrollTriggers[0].onUpdate;

  update({ progress: 0.25 });
  assert.ok(cursorUpdates.length > 0, 'the travelling cursor was not positioned');
  assert.equal(cards[1].classList.contains('is-front'), true, 'Planning was not highlighted');
  const planningCursorState = cursorUpdates.at(-1);
  const planningCardTop = (Math.sin(-30 * Math.PI / 180) * track.offsetHeight / 2) - cards[1].offsetHeight / 2;
  assert.ok(
    planningCursorState.y + cursor.offsetHeight / 2 < planningCardTop - 24,
    'the cursor does not clear the active card',
  );

  update({ progress: 0.875 });
  assert.equal(cards[0].classList.contains('is-front'), true, 'Strategy was not highlighted on return');

  update({ progress: 1 });
  const finalCursorState = cursorUpdates.at(-1);
  assert.equal(finalCursorState.opacity, 0);
  assert.ok(finalCursorState.y < -stage.clientHeight / 2, 'the cursor did not exit upward');
});
