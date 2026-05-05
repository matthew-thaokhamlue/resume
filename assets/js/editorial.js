/* ─────────────────────────────────────────────────────────────
   editorial.js — GSAP scroll-driven motion for the editorial UI
   Loads after gsap + ScrollTrigger CDN. Vanilla, no React.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn('[editorial] GSAP or ScrollTrigger missing — animations disabled.');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initBaseReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;
    nodes.forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        once: true,
        onEnter: function () { el.classList.add('is-in'); }
      });
    });
  }

  function initHeroScrub() {
    var display = document.querySelector('.ed-hero__display');
    if (!display) return;
    if (prefersReducedMotion) {
      display.style.fontVariationSettings = '"opsz" 144, "SOFT" 0, "WONK" 0, "wght" 600';
      display.style.letterSpacing = '-0.04em';
      return;
    }

    var startState = { wght: 280, track: 0.02, opsz: 144, scale: 0.985 };
    var endState   = { wght: 640, track: -0.045, opsz: 144, scale: 1 };

    var obj = Object.assign({}, startState);
    function apply() {
      display.style.fontVariationSettings =
        '"opsz" ' + obj.opsz.toFixed(0) +
        ', "SOFT" 0, "WONK" 0, "wght" ' + obj.wght.toFixed(0);
      display.style.letterSpacing = obj.track.toFixed(4) + 'em';
      display.style.transform = 'scale(' + obj.scale.toFixed(4) + ')';
    }
    apply();

    gsap.to(obj, {
      wght: endState.wght,
      track: endState.track,
      scale: endState.scale,
      ease: 'none',
      onUpdate: apply,
      scrollTrigger: {
        trigger: '.ed-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      }
    });
  }

  function initStages() {
    var stages = gsap.utils.toArray('.ed-stage');
    if (!stages.length) return;
    stages.forEach(function (stage, i) {
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 78%',
        once: true,
        onEnter: function () {
          stage.classList.add('is-in');
          var num = stage.querySelector('.ed-stage__num');
          if (num) {
            gsap.fromTo(num, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', delay: 0.05 * i });
          }
          var title = stage.querySelector('.ed-stage__title');
          if (title) {
            gsap.fromTo(title, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 + 0.04 * i });
          }
          var desc = stage.querySelector('.ed-stage__desc');
          if (desc) {
            gsap.fromTo(desc, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.18 + 0.04 * i });
          }
        }
      });
    });
  }

  function initSignature() {
    var stage = document.querySelector('.ed-signature__stage');
    if (!stage) return;
    var words = stage.querySelectorAll('.ed-signature__word');
    if (!words.length) return;

    if (prefersReducedMotion) {
      words.forEach(function (w) {
        w.style.opacity = 1;
        w.style.transform = 'none';
      });
      return;
    }

    /* Each word starts off-position via CSS variables.
       GSAP scrubs them into a stacked composition as user scrolls past the section. */
    var positions = [
      { x: '-22vw', y: '-6vh' },
      { x: '18vw', y: '-2vh' },
      { x: '-12vw', y: '8vh' },
      { x: '24vw', y: '14vh' },
    ];
    words.forEach(function (w, i) {
      var p = positions[i % positions.length];
      w.style.setProperty('--ed-sig-x', p.x);
      w.style.setProperty('--ed-sig-y', p.y);
    });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.ed-signature',
        start: 'top 70%',
        end: 'bottom 30%',
        scrub: 0.8,
      }
    });
    tl.to(words, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      ease: 'power2.out',
      stagger: { each: 0.08, from: 'start' },
      duration: 1
    });

    /* Velocity hint — slight extra rotation when user scrolls fast. */
    var velQuickSetters = Array.prototype.map.call(words, function (w) {
      return gsap.quickTo(w, 'rotate', { duration: 0.4, ease: 'power3' });
    });
    ScrollTrigger.create({
      trigger: '.ed-signature',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: function (self) {
        var v = Math.max(-1.6, Math.min(1.6, self.getVelocity() / 1500));
        velQuickSetters.forEach(function (set, i) {
          set(v * (i % 2 === 0 ? 1 : -1));
        });
      }
    });
  }

  function initPhilosophy() {
    var lede = document.querySelector('.ed-philosophy__lede');
    if (lede) {
      gsap.fromTo(lede,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: lede, start: 'top 80%', once: true }
        });
    }
    var paragraphs = gsap.utils.toArray('.ed-philosophy__body p');
    paragraphs.forEach(function (p, i) {
      gsap.fromTo(p,
        { opacity: 0, y: 16 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: i * 0.04,
          scrollTrigger: { trigger: p, start: 'top 86%', once: true }
        });
    });
  }

  function initInlineQuotes() {
    var quotes = gsap.utils.toArray('.ed-quote');
    quotes.forEach(function (q) {
      gsap.fromTo(q,
        { opacity: 0, y: 22 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: q, start: 'top 82%', once: true }
        });
    });
  }

  function refreshOnFontsLoaded() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    initBaseReveal();
    initHeroScrub();
    initStages();
    initSignature();
    initPhilosophy();
    initInlineQuotes();
    refreshOnFontsLoaded();
    /* Gentle nudge so first paint matches scroll position on reload. */
    setTimeout(function () { ScrollTrigger.refresh(); }, 200);
  });

  /* Re-run reveal logic if elements are added later (defensive — currently unused) */
  window.editorialRefresh = function () {
    initBaseReveal();
    ScrollTrigger.refresh();
  };
})();
