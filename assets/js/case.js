/* ─────────────────────────────────────────────────────────────
   case.js - portfolio/*.html "evidence reel" choreography,
   shared by every case-study page. The case hero rises in word
   by word with the facts row staggering after it, metric values
   count up from zero as they scroll into view, and impact-list
   lines stagger in one by one. Loads after the GSAP CDN; without
   GSAP (or with reduced motion) the page renders fully static
   and visible — every hidden state here is JS-applied.
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

  /* ── Case hero load intro ─────────────────────────────────── */

  function initHeroIntro() {
    var hero = document.querySelector('.case-hero');
    if (!hero) return;
    if ((window.scrollY || 0) > window.innerHeight * 0.5) return;

    var backlink = hero.querySelector('.case-backlink');
    var eyebrow = hero.querySelector('.ed-eyebrow');
    var h1 = hero.querySelector('.case-hero__display');
    var support = hero.querySelector('.case-hero__support');
    var facts = hero.querySelector('.case-hero__facts');
    var factItems = facts ? Array.prototype.slice.call(facts.children) : [];

    var split = h1 ? splitWords(h1) : null;
    var words = split ? split.words : [];

    var lead = [backlink, eyebrow].filter(Boolean);
    if (lead.length) gsap.set(lead, { opacity: 0, y: 8 });
    if (words.length) gsap.set(words, { opacity: 0, yPercent: 60, transformOrigin: '0% 100%' });
    if (support) gsap.set(support, { opacity: 0, y: 14 });
    if (factItems.length) gsap.set(factItems, { opacity: 0, y: 12 });

    whenFontsReady(function () {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (lead.length) tl.to(lead, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.05);
      if (words.length) {
        tl.to(words, {
          opacity: 1, yPercent: 0,
          duration: 0.9, ease: 'power4.out',
          stagger: 0.06
        }, 0.2);
      }
      if (support) tl.to(support, { opacity: 1, y: 0, duration: 0.8 }, 0.75);
      if (factItems.length) tl.to(factItems, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.95);
      tl.eventCallback('onComplete', function () {
        if (split) split.restore();
        var rest = lead.concat([support], factItems).filter(Boolean);
        if (rest.length) gsap.set(rest, { clearProps: 'opacity,transform' });
      });
    });
  }

  /* ── Metric count-up ────────────────────────────────────────
     "1M+", "€1M", "5", "60" count up from zero; anything that
     doesn't parse as prefix-number-suffix (or whose suffix still
     contains digits, e.g. ranges) is left untouched and keeps
     its CSS reveal. The exact original string is always written
     back on complete. */

  function formatValue(value, decimals, useGrouping) {
    var s = value.toFixed(decimals);
    if (!useGrouping) return s;
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function initMetrics() {
    var values = document.querySelectorAll('.case-metric__value');
    Array.prototype.forEach.call(values, function (el) {
      var original = el.textContent;
      var match = original.trim().match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
      if (!match) return;
      var prefix = match[1];
      var number = match[2];
      var suffix = match[3];
      if (/[0-9]/.test(suffix)) return;

      var useGrouping = number.indexOf(',') !== -1;
      var plain = number.replace(/,/g, '');
      var decimals = (plain.split('.')[1] || '').length;
      var target = parseFloat(plain);
      if (!isFinite(target)) return;

      el.textContent = prefix + formatValue(0, decimals, useGrouping) + suffix;

      var proxy = { v: 0 };
      gsap.to(proxy, {
        v: target,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () {
          el.textContent = prefix + formatValue(proxy.v, decimals, useGrouping) + suffix;
        },
        onComplete: function () {
          el.textContent = original;
        }
      });
    });
  }

  /* ── Impact-list staggers ─────────────────────────────────── */

  function initImpactLists() {
    var lists = document.querySelectorAll('.case-impact-list');
    Array.prototype.forEach.call(lists, function (list) {
      var items = Array.prototype.slice.call(list.querySelectorAll('li'));
      if (!items.length) items = Array.prototype.slice.call(list.children);
      if (!items.length) return;
      gsap.set(items, { opacity: 0, y: 14 });
      ScrollTrigger.create({
        trigger: list,
        start: 'top 82%',
        once: true,
        onEnter: function () {
          gsap.to(items, {
            opacity: 1, y: 0,
            duration: 0.7, ease: 'power3.out',
            stagger: 0.1,
            onComplete: function () {
              gsap.set(items, { clearProps: 'opacity,transform' });
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
    initMetrics();
    initImpactLists();
  });
})();
