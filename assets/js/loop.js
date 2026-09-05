/* ─────────────────────────────────────────────────────────────
   loop.js — index.html only. Two scroll pins driven by GSAP +
   ScrollTrigger:
     1. Hero: "Product <role>" where the role word swaps one step per
        scroll span (builder, manager, designer, owner, tester, builder)
        and the last step recolours the word to the ink colour.
     2. The loop: a red cursor drops onto Strategy, travels past all six stations,
        returns to Strategy, then exits upward while the active card follows it.
   Bails without GSAP or under reduced motion. Every hidden state is
   applied by this script, so the page fails visible.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  function initHeroRoles() {
    var hero = document.querySelector('.ed-hero--product');
    var role = hero && hero.querySelector('.ed-hero__role');
    var mark = hero && hero.querySelector('.ed-hero__mark');
    var orbit = hero && hero.querySelector('.ed-hero__orbit-circle');
    var words = role ? Array.prototype.slice.call(role.querySelectorAll('.ed-hero__role-word')) : [];
    if (!hero || !mark || !orbit || words.length < 2) return;

    words.forEach(function (w, i) {
      gsap.set(w, { yPercent: i === 0 ? 0 : 100, opacity: i === 0 ? 1 : 0 });
    });
    gsap.set(orbit, { strokeDashoffset: 1, opacity: 0 });

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
    /* Close the painted M into one complete ring before the hero releases. */
    tl.to(mark, { opacity: 0, scale: 0.72, rotation: 8, duration: 0.75 }, steps);
    tl.to(orbit, { strokeDashoffset: 0, opacity: 1, duration: 0.75 }, steps);
    /* Hold the resolved "Product builder" for one step before the page moves on. */
    tl.to({}, { duration: 1 });
  }

  function initLoopRing() {
    var section = document.querySelector('.ed-loop');
    var cards = section ? Array.prototype.slice.call(section.querySelectorAll('.ed-loop__card')) : [];
    var cursor = section && section.querySelector('.ed-loop__cursor');
    var stage = section && section.querySelector('.ed-loop__stage');
    var track = section && section.querySelector('.ed-loop__track');
    if (!section || cards.length < 2 || !cursor || !stage || !track) return;

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
      var cursorOffsetY = (activeCard.offsetHeight + cursor.offsetHeight) / 2 + 40;
      var verticalExit = (1 - entry) * stage.clientHeight * 0.75 + exit * stage.clientHeight * 0.85;

      setFront(step % n);
      gsap.set(cursor, {
        xPercent: -50,
        yPercent: -50,
        x: Math.cos(radians) * track.offsetWidth / 2,
        y: (Math.sin(radians) * track.offsetHeight / 2) - cursorOffsetY - verticalExit,
        rotation: (Math.sin(travel * Math.PI * 2) * 8) - ((1 - entry) * 12) + (exit * 12),
        scale: (0.9 + landing * 0.1) * (0.65 + entry * 0.35) * (1 - exit * 0.35),
        opacity: entry * (1 - exit),
        transformOrigin: '50% 50%'
      });
    }

    render(0);

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
