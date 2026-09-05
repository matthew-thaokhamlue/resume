/* ─────────────────────────────────────────────────────────────
   loop.js — index.html only. Two scroll pins driven by GSAP +
   ScrollTrigger:
     1. Hero: "Product <role>" where the role word swaps one step per
        scroll span (builder, manager, designer, owner, tester, builder)
        and the last step recolours the word to the ink colour.
     2. The loop: six station cards on one flat ellipse; the scroll walks
        the .is-front highlight around them, back to the first, then holds.
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
    var words = role ? Array.prototype.slice.call(role.querySelectorAll('.ed-hero__role-word')) : [];
    if (!hero || words.length < 2) return;

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
    /* Hold the resolved "Product builder" for one step before the page moves on. */
    tl.to({}, { duration: 1 });
  }

  function initLoopRing() {
    var section = document.querySelector('.ed-loop');
    var cards = section ? Array.prototype.slice.call(section.querySelectorAll('.ed-loop__card')) : [];
    if (!section || cards.length < 2) return;

    var n = cards.length;
    /* n highlight steps, one step back to the first station, one held step. */
    var slots = n + 2;
    var front = 0;
    function setFront(i) {
      if (i === front) return;
      cards[front].classList.remove('is-front');
      cards[i].classList.add('is-front');
      front = i;
    }
    cards.forEach(function (c, i) { c.classList.toggle('is-front', i === 0); });

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + (slots * 70) + '%',
      pin: true,
      anticipatePin: 1,
      onUpdate: function (self) {
        var slot = Math.min(Math.floor(self.progress * slots), slots - 1);
        /* Slots n and n+1 both show the first station: the return, then the hold. */
        setFront(Math.min(slot, n) % n);
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
