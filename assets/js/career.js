/* ─────────────────────────────────────────────────────────────
   career.js - experience.html chapter choreography.
   A scrub-drawn career spine links the five role panels (accent
   node pings awake as each chapter enters), role titles rise in
   word by word, story beats and skill chips stagger in, and the
   page hero gets a light load intro. Loads after the GSAP CDN;
   without GSAP (or with reduced motion) the page renders fully
   static and visible — every hidden state here is JS-applied.
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
    /* Wait for Fraunces so split metrics are stable — capped at 900ms. */
    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise(function (resolve) { setTimeout(resolve, 900); })
    ]).then(fn, fn);
  }

  /* ── Hero load intro ────────────────────────────────────────
     Animates opacity/transform only — editorial.js's scroll
     scrub owns the h1 font-variation/letter-spacing. */

  function initHeroIntro() {
    var hero = document.querySelector('.ed-hero');
    if (!hero) return;
    /* Mid-page reload: skip the intro, leave everything visible. */
    if ((window.scrollY || 0) > window.innerHeight * 0.5) return;

    var eyebrow = hero.querySelector('.ed-eyebrow');
    var h1 = hero.querySelector('.ed-hero__display');
    var support = hero.querySelector('.ed-hero__support');
    var ctaRow = hero.querySelector('.ed-hero__cta-row');
    var ctaItems = ctaRow ? Array.prototype.slice.call(ctaRow.children) : [];

    var split = h1 ? splitWords(h1) : null;
    var words = split ? split.words : [];

    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 8 });
    if (words.length) gsap.set(words, { opacity: 0, yPercent: 60, transformOrigin: '0% 100%' });
    if (support) gsap.set(support, { opacity: 0, y: 14 });
    if (ctaItems.length) gsap.set(ctaItems, { opacity: 0, y: 12 });

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
      if (support) tl.to(support, { opacity: 1, y: 0, duration: 0.8 }, 0.75);
      if (ctaItems.length) tl.to(ctaItems, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 0.9);
      tl.eventCallback('onComplete', function () {
        if (split) split.restore();
        var rest = [eyebrow, support].concat(ctaItems).filter(Boolean);
        if (rest.length) gsap.set(rest, { clearProps: 'opacity,transform' });
      });
    });
  }

  /* ── Per-panel chapter choreography ─────────────────────────
     The right column of each role panel: index number + eyebrow,
     word-split title, company line, story beats, skill chips,
     portfolio link. Body paragraphs stay untouched — editorial.js
     initPhilosophy() already animates .ed-philosophy__body p. */

  function initPanel(panel) {
    var title = panel.querySelector('.experience-role-title');
    var col = title ? title.parentElement : null;
    if (!title || !col) return;

    function inCol(selector) {
      return Array.prototype.filter.call(
        col.querySelectorAll(selector),
        function (n) { return n !== title && !title.contains(n); }
      );
    }

    var meta = [];
    Array.prototype.forEach.call(col.children, function (child) {
      if (child === title) return;
      if (child.tagName === 'SPAN' || child.classList.contains('ed-eyebrow')) meta.push(child);
    });
    var company = title.nextElementSibling && title.nextElementSibling.tagName === 'P'
      ? title.nextElementSibling
      : null;
    var storyItems = inCol('.sema-story__item');
    var chips = inCol('.experience-skill');
    var link = col.querySelector(':scope > .ed-link');

    var split = splitWords(title);
    var words = split.words;

    if (meta.length) gsap.set(meta, { opacity: 0, y: 12 });
    if (words.length) gsap.set(words, { opacity: 0, yPercent: 60, transformOrigin: '0% 100%' });
    if (company) gsap.set(company, { opacity: 0, y: 10 });
    if (storyItems.length) gsap.set(storyItems, { opacity: 0, y: 16 });
    if (chips.length) gsap.set(chips, { opacity: 0, y: 10 });
    if (link) gsap.set(link, { opacity: 0, y: 10 });

    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    if (meta.length) tl.to(meta, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0);
    if (words.length) {
      tl.to(words, {
        opacity: 1, yPercent: 0,
        duration: 0.8, ease: 'power4.out',
        stagger: 0.07
      }, 0.1);
    }
    if (company) tl.to(company, { opacity: 1, y: 0, duration: 0.6 }, 0.45);
    if (storyItems.length) tl.to(storyItems, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, 0.55);
    if (chips.length) tl.to(chips, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.7);
    if (link) tl.to(link, { opacity: 1, y: 0, duration: 0.6 }, 0.8);
    tl.eventCallback('onComplete', function () {
      split.restore();
      var rest = meta.concat(storyItems, chips, [company, link]).filter(Boolean);
      if (rest.length) gsap.set(rest, { clearProps: 'opacity,transform' });
    });

    ScrollTrigger.create({
      trigger: panel,
      start: 'top 70%',
      once: true,
      onEnter: function () { tl.play(); }
    });
  }

  /* ── Career spine ───────────────────────────────────────────
     Built entirely here (no JS = no spine). A hairline track with
     an accent progress line scrubbed by scroll, plus one node per
     chapter that lights and pings as the chapter enters — the
     same accent language as the rings ping. */

  function initSpine(wrap, panels) {
    var spine = document.createElement('div');
    spine.className = 'ed-spine';
    spine.setAttribute('aria-hidden', 'true');

    var track = document.createElement('span');
    track.className = 'ed-spine__track';
    var progress = document.createElement('span');
    progress.className = 'ed-spine__progress';
    spine.appendChild(track);
    spine.appendChild(progress);

    var nodes = panels.map(function (panel) {
      var node = document.createElement('span');
      node.className = 'ed-spine__node';
      var ping = document.createElement('span');
      ping.className = 'ed-spine__ping';
      node.appendChild(ping);
      spine.appendChild(node);
      return { panel: panel, node: node, ping: ping };
    });
    wrap.appendChild(spine);

    function position() {
      var wrapRect = wrap.getBoundingClientRect();
      nodes.forEach(function (item) {
        var anchor = item.panel.querySelector('.experience-role-title') || item.panel;
        var r = anchor.getBoundingClientRect();
        item.node.style.top = (r.top - wrapRect.top + r.height / 2) + 'px';
      });
    }
    position();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(position);
    }
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(position, 150);
    }, { passive: true });

    gsap.fromTo(progress, { scaleY: 0 }, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top 70%',
        end: 'bottom 70%',
        scrub: 0.5
      }
    });

    nodes.forEach(function (item) {
      ScrollTrigger.create({
        trigger: item.panel,
        start: 'top 75%',
        once: true,
        onEnter: function () {
          item.node.classList.add('is-lit');
          gsap.fromTo(item.ping,
            { scale: 1, opacity: 0.6 },
            { scale: 3.2, opacity: 0, duration: 1.1, ease: 'power2.out' });
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
    var wrap = document.querySelector('.ed-career');
    if (!wrap) return;
    var panels = Array.prototype.slice.call(wrap.querySelectorAll(':scope > section'));
    if (!panels.length) return;
    panels.forEach(initPanel);
    initSpine(wrap, panels);
  });
})();
