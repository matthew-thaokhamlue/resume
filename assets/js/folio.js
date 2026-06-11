/* ─────────────────────────────────────────────────────────────
   folio.js - portfolio.html gallery choreography.
   The page header rises in word by word on load and each card
   grid staggers its cards into place on scroll. Hover polish
   (top hairline sweep, title underline) is pure CSS in
   editorial.css. Loads after the GSAP CDN; without GSAP (or
   with reduced motion) the page renders fully static and
   visible — every hidden state here is JS-applied.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;

  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ── Word split (restored on complete, hero.js pattern) ──── */

  function splitWords(el) {
    var original = el.innerHTML;
    var labelText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', labelText);

    var words = [];
    function split(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) {
              frag.appendChild(document.createTextNode(word));
              return;
            }
            var span = document.createElement('span');
            span.className = 'ed-word';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = word;
            frag.appendChild(span);
            words.push(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          /* Recurse in place so <em> keeps its styling. */
          split(child);
        }
      });
    }
    split(el);

    return {
      words: words,
      restore: function () {
        el.innerHTML = original;
        el.removeAttribute('aria-label');
      }
    };
  }

  function whenFontsReady(fn) {
    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise(function (resolve) { setTimeout(resolve, 900); })
    ]).then(fn, fn);
  }

  /* ── Page hero load intro ─────────────────────────────────── */

  function initHeroIntro() {
    var hero = document.querySelector('.ed-hero--page');
    if (!hero) return;
    if ((window.scrollY || 0) > window.innerHeight * 0.5) return;

    var eyebrow = hero.querySelector('.ed-eyebrow');
    var h1 = hero.querySelector('.ed-hero__display');
    var support = hero.querySelector('.ed-hero__support');

    var split = h1 ? splitWords(h1) : null;
    var words = split ? split.words : [];

    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 8 });
    if (words.length) gsap.set(words, { opacity: 0, yPercent: 60, transformOrigin: '0% 100%' });
    if (support) gsap.set(support, { opacity: 0, y: 14 });

    whenFontsReady(function () {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 }, 0.05);
      if (words.length) {
        tl.to(words, {
          opacity: 1, yPercent: 0,
          duration: 0.9, ease: 'power4.out',
          stagger: 0.07
        }, 0.2);
      }
      if (support) tl.to(support, { opacity: 1, y: 0, duration: 0.8 }, 0.7);
      tl.eventCallback('onComplete', function () {
        if (split) split.restore();
        var rest = [eyebrow, support].filter(Boolean);
        if (rest.length) gsap.set(rest, { clearProps: 'opacity,transform' });
      });
    });
  }

  /* ── Card grid staggers ───────────────────────────────────── */

  function initCards() {
    var grids = document.querySelectorAll('.ed-cards');
    Array.prototype.forEach.call(grids, function (grid) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.ed-card'));
      if (!cards.length) return;
      gsap.set(cards, { opacity: 0, y: 28 });
      ScrollTrigger.create({
        trigger: grid,
        /* Fire as soon as the grid enters the viewport — a stricter line
           leaves a blank band at the fold on load (grid partially visible
           but untriggered). */
        start: 'top bottom',
        once: true,
        onEnter: function () {
          gsap.to(cards, {
            opacity: 1, y: 0,
            duration: 0.8, ease: 'power3.out',
            stagger: 0.08,
            onComplete: function () {
              gsap.set(cards, { clearProps: 'opacity,transform' });
            }
          });
        }
      });
    });
  }

  /* ── Boot ─────────────────────────────────────────────────── */

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    initHeroIntro();
    initCards();
  });
})();
