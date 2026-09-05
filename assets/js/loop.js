/* ─────────────────────────────────────────────────────────────
   loop.js — index.html only. Two scroll pins driven by GSAP +
   ScrollTrigger:
     1. Hero: "Product <role>" where the role word swaps one step per
        scroll span (builder, manager, designer, owner, tester, builder)
        and the last step recolours the word to the ink colour.
     2. The same mark drops onto Strategy as an open circular pointer, travels
        outside all six stations, returns to Strategy, then exits upward.
   Bails without GSAP or under reduced motion. Every hidden state is
   applied by this script, so the page fails visible.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var motionMark = null;
  gsap.registerPlugin(ScrollTrigger);

  function initHeroRoles() {
    var hero = document.querySelector('.ed-hero--product');
    var role = hero && hero.querySelector('.ed-hero__role');
    var home = hero && hero.querySelector('.ed-hero__mark-home');
    var mark = hero && hero.querySelector('.ed-motion-mark');
    var strokes = mark ? Array.prototype.slice.call(mark.querySelectorAll('.ed-motion-mark__stroke')) : [];
    var words = role ? Array.prototype.slice.call(role.querySelectorAll('.ed-hero__role-word')) : [];
    if (!hero || !home || !mark || strokes.length !== 2 || words.length < 2) return;

    var homeRect = home.getBoundingClientRect();
    document.body.appendChild(mark);
    motionMark = { element: mark, home: homeRect };
    gsap.set(mark, {
      position: 'fixed',
      left: 0,
      top: 0,
      width: homeRect.width,
      height: homeRect.height,
      x: homeRect.left,
      y: homeRect.top,
      opacity: 1,
      transformOrigin: '50% 50%'
    });

    words.forEach(function (w, i) {
      gsap.set(w, { yPercent: i === 0 ? 0 : 100, opacity: i === 0 ? 1 : 0 });
    });

    var steps = words.length - 1;
    var mix = { v: 0 };
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 0.6 },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=' + ((steps + 1) * 80) + '%',
        pin: true,
        scrub: 0.5,
        anticipatePin: 1
      }
    });

    words.forEach(function (w, i) {
      if (i === 0) return;
      var at = (i - 1) + 0.4; /* hold each word for 0.4, swap over 0.6 */
      tl.to(words[i - 1], { yPercent: -100, opacity: 0 }, at);
      tl.to(w, { yPercent: 0, opacity: 1 }, at);
    });
    /* Final step: builder returns and takes the Product colour. */
    tl.to(mix, {
      v: 1,
      ease: 'none',
      onUpdate: function () { role.style.setProperty('--ed-role-mix', mix.v.toFixed(3)); }
    }, (steps - 1) + 0.4);
    /* The two strokes meet on the left and leave one intentional opening on the right. */
    tl.to(strokes[0], { attr: { d: 'M66 17 C58 8 43 8 34 18 C31 22 30 26 30 29' }, duration: 0.75 }, steps);
    tl.to(strokes[1], { attr: { d: 'M30 29 C30 40 39 49 50 49 C57 49 62 46 66 41' }, duration: 0.75 }, steps);
    /* Hold the resolved "Product builder" for one step before the page moves on. */
    tl.to({}, { duration: 1 });
  }

  function initLoopRing() {
    var section = document.querySelector('.ed-loop');
    var cards = section ? Array.prototype.slice.call(section.querySelectorAll('.ed-loop__card')) : [];
    var stage = section && section.querySelector('.ed-loop__stage');
    var track = section && section.querySelector('.ed-loop__track');
    if (!section || cards.length < 2 || !stage || !track || !motionMark) return;

    var mark = motionMark.element;
    var home = motionMark.home;
    var n = cards.length;
    var slots = n + 2;
    var entryEnd = 1 / slots;
    var exitStart = (slots - 1) / slots;
    var front = 0;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function setFront(i) {
      if (i === front) return;
      cards[front].classList.remove('is-front');
      cards[i].classList.add('is-front');
      front = i;
    }
    cards.forEach(function (c, i) { c.classList.toggle('is-front', i === 0); });

    function renderHandoff(progress) {
      var trackRect = track.getBoundingClientRect();
      var pointerSize = Math.min(48, Math.max(34, trackRect.width * 0.055));
      var pointerScale = pointerSize / (home.width * 0.36);
      var homeCenterX = home.left + home.width / 2;
      var homeCenterY = home.top + home.height / 2;
      var stageCenterX = window.innerWidth / 2;
      var stageCenterY = pointerSize / 2 + 16;
      var scale = 1 + (pointerScale - 1) * progress;

      gsap.set(mark, {
        x: homeCenterX + (stageCenterX - homeCenterX) * progress - home.width / 2,
        y: homeCenterY + (stageCenterY - homeCenterY) * progress - home.height / 2,
        rotation: 0,
        scaleX: scale,
        scaleY: scale,
        opacity: 1,
        transformOrigin: '50% 50%'
      });
    }

    function render(progress) {
      var entry = clamp(progress / entryEnd, 0, 1);
      var travel = clamp((progress - entryEnd) / (exitStart - entryEnd), 0, 1);
      var exit = clamp((progress - exitStart) / (1 - exitStart), 0, 1);
      var step = Math.round(travel * n);
      var angle = -90 + (travel * 360);
      var radians = angle * Math.PI / 180;
      var nearestStep = Math.round(travel * n);
      var landing = 1 - Math.min(1, Math.abs((travel * n) - nearestStep) * 2);
      var activeCard = cards[step % n];
      var trackRect = track.getBoundingClientRect();
      var pointerSize = Math.min(48, Math.max(34, trackRect.width * 0.055));
      var pointerScale = pointerSize / (home.width * 0.36);
      var entryCenterX = window.innerWidth / 2;
      var entryCenterY = pointerSize / 2 + 16;
      var loopCenterX = trackRect.left + trackRect.width / 2;
      var loopCenterY = trackRect.top + trackRect.height / 2;
      var rimX = Math.cos(radians) * trackRect.width / 2;
      var rimY = Math.sin(radians) * trackRect.height / 2;
      var radialLength = Math.hypot(rimX, rimY) || 1;
      var radialX = rimX / radialLength;
      var radialY = rimY / radialLength;
      var edgeX = Math.abs(radialX) > 0.001 ? activeCard.offsetWidth / 2 / Math.abs(radialX) : Infinity;
      var edgeY = Math.abs(radialY) > 0.001 ? activeCard.offsetHeight / 2 / Math.abs(radialY) : Infinity;
      var clearance = Math.min(edgeX, edgeY) + pointerSize * 0.55 + 14;
      var pointerCenterX = loopCenterX + rimX + radialX * clearance;
      var pointerCenterY = loopCenterY + rimY + radialY * clearance;
      pointerCenterX = clamp(pointerCenterX, pointerSize / 2 + 12, window.innerWidth - pointerSize / 2 - 12);
      var centerX = entryCenterX + (pointerCenterX - entryCenterX) * entry;
      var centerY = entryCenterY + (pointerCenterY - entryCenterY) * entry - exit * stage.clientHeight * 0.85;
      var moving = 1 - landing;
      var scaleX = pointerScale * (1 + moving * 0.12 * entry);
      var scaleY = pointerScale * (1 - moving * 0.08 * entry);

      setFront(step % n);
      gsap.set(mark, {
        x: centerX - home.width / 2,
        y: centerY - home.height / 2,
        rotation: (angle + 90 + Math.sin(travel * Math.PI * 2) * 5) * entry,
        scaleX: scaleX * (1 - exit * 0.2),
        scaleY: scaleY * (1 - exit * 0.2),
        opacity: 1 - exit,
        transformOrigin: '50% 50%'
      });
    }

    renderHandoff(0);

    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'top top',
      scrub: 0.5,
      onUpdate: function (self) {
        renderHandoff(self.progress);
      }
    });

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + (slots * 70) + '%',
      pin: true,
      anticipatePin: 1,
      onUpdate: function (self) {
        render(self.progress);
      }
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    initHeroRoles();
    initLoopRing();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  });
})();
