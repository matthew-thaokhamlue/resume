/* ─────────────────────────────────────────────────────────────
   hero.js - "Living Workflow" hero (index.html only).
   Generative canvas workflow graph, load choreography, and
   magnetic CTAs. Loads after the GSAP CDN; the canvas runs
   without GSAP, the intro and magnetic effects require it.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ── Canvas: agent workflow graph ───────────────────────────
     Nodes are agents; pulses are work traveling between them.
     The four labeled nodes mirror the site's four stages. */

  var KEY_SPECS = [
    { label: 'DISCOVERY',    ux: 0.30, uy: 0.16 },
    { label: 'ARCHITECTURE', ux: 0.80, uy: 0.22 },
    { label: 'BUILD',        ux: 0.88, uy: 0.55 },
    { label: 'SHIP',         ux: 0.70, uy: 0.88 }
  ];

  function initCanvas(hero) {
    var canvas = hero.querySelector('.ed-hero__canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = 0;
    var height = 0;
    var mobile = false;
    var heroTopDoc = 0;
    var heroLeftDoc = 0;
    var nodes = [];
    var edges = [];
    var chainEdges = [];
    var pulses = [];
    var pointer = { x: 0, y: 0, active: false };
    var scrollYCache = window.scrollY || 0;
    var heroVisible = true;
    var rafId = null;
    var lastTime = 0;

    function sizeCanvas() {
      var rect = hero.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      heroTopDoc = rect.top + (window.scrollY || 0);
      heroLeftDoc = rect.left;
      mobile = window.innerWidth < 768;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeNode(ux, uy, label) {
      return {
        ux: ux, uy: uy,
        x: 0, y: 0, hx: 0, hy: 0,
        r: label ? 3.5 : rand(1.5, 2.5),
        phase: rand(0, Math.PI * 2),
        ampX: rand(6, 18),
        ampY: rand(5, 14),
        speed: rand(0.25, 0.6),
        flash: 0,
        label: label || null
      };
    }

    function placeNodes() {
      nodes.forEach(function (n) {
        n.hx = n.ux * width;
        n.hy = n.uy * height;
        /* Keep the upper rows clear of the sticky topbar. */
        if (n.hy < 90) n.hy = 90 + (n.phase / (Math.PI * 2)) * 26;
        n.x = n.hx;
        n.y = n.hy;
      });
    }

    function buildGraph() {
      nodes = [];
      edges = [];
      chainEdges = [];

      var keys = KEY_SPECS.map(function (spec) {
        var n = makeNode(
          clamp(spec.ux + rand(-0.02, 0.02), 0.04, 0.96),
          clamp(spec.uy + rand(-0.02, 0.02), 0.05, 0.95),
          spec.label
        );
        nodes.push(n);
        return n;
      });

      /* Band quotas keep node density away from the headline block
         (left-center) — top strip, right rail, bottom strip. */
      var bands, counts, minDist;
      if (mobile) {
        bands = [
          { x0: 0.06, x1: 0.94, y0: 0.05, y1: 0.22 },
          { x0: 0.68, x1: 0.96, y0: 0.26, y1: 0.78 },
          { x0: 0.08, x1: 0.92, y0: 0.82, y1: 0.96 }
        ];
        counts = [4, 3, 3];
        minDist = 64;
      } else {
        bands = [
          { x0: 0.05, x1: 0.95, y0: 0.05, y1: 0.24 },
          { x0: 0.66, x1: 0.97, y0: 0.28, y1: 0.80 },
          { x0: 0.06, x1: 0.94, y0: 0.82, y1: 0.97 }
        ];
        counts = [7, 9, 6];
        minDist = 90;
      }

      bands.forEach(function (band, bi) {
        for (var c = 0; c < counts[bi]; c++) {
          var placed = null;
          for (var attempt = 0; attempt < 20 && !placed; attempt++) {
            var ux = rand(band.x0, band.x1);
            var uy = rand(band.y0, band.y1);
            var px = ux * width;
            var py = uy * height;
            var ok = nodes.every(function (other) {
              var dx = px - other.ux * width;
              var dy = py - other.uy * height;
              return dx * dx + dy * dy > minDist * minDist;
            });
            if (ok || attempt === 19) placed = makeNode(ux, uy, null);
          }
          if (placed) nodes.push(placed);
        }
      });

      placeNodes();

      var seen = {};
      function addEdge(a, b, bow) {
        var ia = nodes.indexOf(a);
        var ib = nodes.indexOf(b);
        var k = ia < ib ? ia + '-' + ib : ib + '-' + ia;
        if (seen[k]) return seen[k];
        var e = {
          a: a, b: b,
          bow: typeof bow === 'number' ? bow : rand(14, 40) * (Math.random() < 0.5 ? -1 : 1),
          glow: 0
        };
        seen[k] = e;
        edges.push(e);
        return e;
      }

      /* Each node connects to its 2 nearest neighbours (deduped). */
      nodes.forEach(function (n) {
        var sorted = nodes
          .filter(function (o) { return o !== n; })
          .sort(function (p, q) {
            var dp = (p.hx - n.hx) * (p.hx - n.hx) + (p.hy - n.hy) * (p.hy - n.hy);
            var dq = (q.hx - n.hx) * (q.hx - n.hx) + (q.hy - n.hy) * (q.hy - n.hy);
            return dp - dq;
          });
        if (sorted[0]) addEdge(n, sorted[0]);
        if (sorted[1]) addEdge(n, sorted[1]);
      });

      /* Explicit pipeline: Discovery → Architecture → Build → Ship. */
      for (var i = 0; i < keys.length - 1; i++) {
        chainEdges.push(addEdge(keys[i], keys[i + 1], rand(28, 52) * (i % 2 === 0 ? -1 : 1)));
      }

      pulses = [];
      var pulseCount = mobile ? 3 : 6;
      for (var p = 0; p < pulseCount; p++) pulses.push(spawnPulse(null));
    }

    function spawnPulse(pulse) {
      var pool = (Math.random() < 0.4 && chainEdges.length) ? chainEdges : edges;
      var edge = pool[Math.floor(Math.random() * pool.length)];
      if (!pulse) pulse = {};
      pulse.edge = edge;
      pulse.t = rand(-0.4, 0);   /* negative start staggers respawns */
      pulse.speed = rand(0.15, 0.35);
      return pulse;
    }

    function edgeControl(e) {
      var dx = e.b.x - e.a.x;
      var dy = e.b.y - e.a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      return {
        x: (e.a.x + e.b.x) / 2 + (-dy / len) * e.bow,
        y: (e.a.y + e.b.y) / 2 + (dx / len) * e.bow
      };
    }

    function quadPoint(e, c, t) {
      var u = 1 - t;
      return {
        x: u * u * e.a.x + 2 * u * t * c.x + t * t * e.b.x,
        y: u * u * e.a.y + 2 * u * t * c.y + t * t * e.b.y
      };
    }

    function update(dt, now) {
      var t = now / 1000;
      var parallax = scrollYCache * 0.3;
      var px = pointer.x;
      var py = pointer.y - parallax;

      nodes.forEach(function (n) {
        var tx = n.hx + Math.sin(t * n.speed + n.phase) * n.ampX;
        var ty = n.hy + Math.cos(t * n.speed * 0.9 + n.phase * 1.7) * n.ampY;
        if (pointer.active) {
          var dx = n.x - px;
          var dy = n.y - py;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140 && d > 0.001) {
            var push = ((140 - d) / 140) * 26;
            tx += (dx / d) * push;
            ty += (dy / d) * push;
          }
        }
        n.x += (tx - n.x) * 0.08;
        n.y += (ty - n.y) * 0.08;
        n.flash *= 0.94;
      });

      edges.forEach(function (e) {
        var target = 0;
        if (pointer.active) {
          var dx = (e.a.x + e.b.x) / 2 - px;
          var dy = (e.a.y + e.b.y) / 2 - py;
          if (dx * dx + dy * dy < 110 * 110) target = 1;
        }
        e.glow += (target - e.glow) * 0.1;
      });

      pulses.forEach(function (p) {
        p.t += p.speed * dt;
        if (p.t >= 1) {
          p.edge.b.flash = 1;
          spawnPulse(p);
        }
      });
    }

    function draw(alpha, parallax) {
      ctx.clearRect(0, 0, width, height);
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, parallax);

      edges.forEach(function (e) {
        var c = edgeControl(e);
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.quadraticCurveTo(c.x, c.y, e.b.x, e.b.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.05 + e.glow * 0.05).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (e.glow > 0.02) {
          ctx.strokeStyle = 'rgba(79, 182, 220, ' + (e.glow * 0.22).toFixed(3) + ')';
          ctx.stroke();
        }
      });

      pulses.forEach(function (p) {
        if (p.t < 0) return;
        var c = edgeControl(p.edge);
        var pt = quadPoint(p.edge, c, clamp(p.t, 0, 1));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(79, 182, 220, 0.18)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#4fb6dc';
        ctx.fill();
      });

      nodes.forEach(function (n) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 150, 158, ' + (0.55 + n.flash * 0.4).toFixed(3) + ')';
        ctx.fill();
        if (n.label) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(79, 182, 220, 0.55)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      /* Labels only on desktop — mobile copy spans the full width,
         so label text would collide with the headline and support. */
      if (mobile) {
        ctx.restore();
        return;
      }
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.letterSpacing = '0.12em';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(139, 150, 158, 0.9)';
      nodes.forEach(function (n) {
        if (!n.label) return;
        var w = ctx.measureText(n.label).width;
        if (n.x + 10 + w > width - 8) {
          ctx.textAlign = 'right';
          ctx.fillText(n.label, n.x - 10, n.y);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(n.label, n.x + 10, n.y);
        }
      });

      ctx.restore();
    }

    function frame(now) {
      rafId = window.requestAnimationFrame(frame);
      var dt = clamp((now - lastTime) / 1000, 0, 0.05);
      lastTime = now;
      var prog = clamp(scrollYCache / Math.max(1, hero.offsetHeight), 0, 1);
      update(dt, now);
      draw(1 - prog, scrollYCache * 0.3);
    }

    function start() {
      if (rafId === null) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
    function syncRunning() {
      if (heroVisible && !document.hidden) start();
      else stop();
    }

    function drawStatic() {
      nodes.forEach(function (n) { n.x = n.hx; n.y = n.hy; });
      pulses = [];
      draw(1, 0);
    }

    var resizeTimer = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var wasMobile = mobile;
        sizeCanvas();
        if (mobile !== wasMobile) buildGraph();
        else placeNodes();
        if (reducedMotion) drawStatic();
      }, 150);
    }

    sizeCanvas();
    buildGraph();
    window.addEventListener('resize', onResize, { passive: true });

    if (reducedMotion) {
      drawStatic();
      return;
    }

    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('scroll', function () {
      scrollYCache = window.scrollY || 0;
    }, { passive: true });
    document.addEventListener('visibilitychange', syncRunning);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        syncRunning();
      }, { threshold: 0 }).observe(hero);
    }

    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        pointer.x = e.clientX - heroLeftDoc;
        pointer.y = e.clientY + (window.scrollY || 0) - heroTopDoc;
        pointer.active = true;
      }, { passive: true });
      document.addEventListener('pointerleave', function () { pointer.active = false; });
      window.addEventListener('blur', function () { pointer.active = false; });
    }

    start();
  }

  /* ── Headline char split (intro only; restored on complete) ── */

  function splitHeadline(h1) {
    var original = h1.innerHTML;
    var labelText = (h1.innerText || h1.textContent || '').replace(/\s+/g, ' ').trim();
    h1.setAttribute('aria-label', labelText);

    var chars = [];
    function splitNode(node) {
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
            var wordSpan = document.createElement('span');
            wordSpan.className = 'ed-hero__word';
            wordSpan.setAttribute('aria-hidden', 'true');
            for (var i = 0; i < word.length; i++) {
              var charSpan = document.createElement('span');
              charSpan.className = 'ed-hero__char';
              charSpan.textContent = word.charAt(i);
              wordSpan.appendChild(charSpan);
              chars.push(charSpan);
            }
            frag.appendChild(wordSpan);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          /* Recurse in place so <em> keeps its styling. */
          splitNode(child);
        }
      });
    }
    splitNode(h1);

    return {
      chars: chars,
      restore: function () {
        h1.innerHTML = original;
        h1.removeAttribute('aria-label');
      }
    };
  }

  /* ── Load choreography ──────────────────────────────────────
     Never touches font-variation-settings / letter-spacing on
     the h1 — editorial.js's scroll scrub owns those. */

  function initIntro(hero) {
    function showInstantly() {
      hero.removeAttribute('data-intro-pending');
      hero.classList.add('is-intro');
    }

    if (!window.gsap || reducedMotion) {
      showInstantly();
      return;
    }
    /* Mid-page reload: skip the intro, let the scrub own the hero. */
    if ((window.scrollY || 0) > window.innerHeight * 0.5) {
      showInstantly();
      return;
    }

    var gsap = window.gsap;
    var h1 = hero.querySelector('.ed-hero__display');
    var eyebrow = hero.querySelector('.ed-eyebrow');
    var support = hero.querySelector('.ed-hero__support');
    var ctaRow = hero.querySelector('.ed-hero__cta-row');
    var cue = hero.querySelector('.ed-hero__scroll-cue');
    var ctaItems = ctaRow ? Array.prototype.slice.call(ctaRow.children) : [];

    var split = h1 ? splitHeadline(h1) : null;
    var chars = split ? split.chars : [];

    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 8 });
    if (h1) gsap.set(h1, { opacity: 1 });
    if (chars.length) gsap.set(chars, { opacity: 0, yPercent: 110, rotateZ: 6, transformOrigin: '0% 100%' });
    if (support) gsap.set(support, { opacity: 0, y: 14 });
    if (ctaItems.length) gsap.set(ctaItems, { opacity: 0, y: 12 });
    if (cue) gsap.set(cue, { opacity: 0 });

    /* Hairline stays drawn-out via .is-intro-armed until the timeline
       starts; remove the CSS-only pending hook now that inline initial
       states are in place (fails visible if anything below breaks). */
    hero.classList.add('is-intro-armed');
    hero.removeAttribute('data-intro-pending');

    var played = false;
    function play() {
      if (played) return;
      played = true;
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.add(function () { hero.classList.add('is-intro'); }, 0);
      if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 }, 0.05);
      if (chars.length) {
        tl.to(chars, {
          opacity: 1, yPercent: 0, rotateZ: 0,
          duration: 0.9, ease: 'power4.out',
          stagger: { each: 0.018 }
        }, 0.25);
      }
      if (support) tl.to(support, { opacity: 1, y: 0, duration: 0.8 }, 0.9);
      if (ctaItems.length) tl.to(ctaItems, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 1.05);
      if (cue) tl.to(cue, { opacity: 1, duration: 0.6 }, 1.3);
      tl.eventCallback('onComplete', function () {
        if (split) split.restore();
        if (h1) gsap.set(h1, { clearProps: 'opacity' });
        var rest = [eyebrow, support, cue].concat(ctaItems).filter(Boolean);
        if (rest.length) gsap.set(rest, { clearProps: 'opacity,transform' });
        hero.classList.add('is-intro-done');
      });
    }

    /* Wait for Fraunces so char metrics are stable — capped at 900ms. */
    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise(function (resolve) { setTimeout(resolve, 900); })
    ]).then(play, play);
  }

  /* ── Magnetic CTA pills ─────────────────────────────────── */

  function initMagnetic(hero) {
    if (!window.gsap || reducedMotion || !finePointer) return;
    var gsap = window.gsap;
    var buttons = Array.prototype.slice.call(hero.querySelectorAll('.ed-hero__cta-row .ed-btn'));
    if (!buttons.length) return;

    var items = buttons.map(function (btn) {
      btn.classList.add('ed-btn--magnetic');
      return {
        el: btn,
        rect: null,
        xTo: gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3' }),
        yTo: gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3' })
      };
    });

    var rectsDirty = true;
    function markDirty() { rectsDirty = true; }
    window.addEventListener('scroll', markDirty, { passive: true });
    window.addEventListener('resize', markDirty, { passive: true });

    window.addEventListener('pointermove', function (e) {
      if (rectsDirty) {
        items.forEach(function (it) { it.rect = it.el.getBoundingClientRect(); });
        rectsDirty = false;
      }
      items.forEach(function (it) {
        var r = it.rect;
        if (!r) return;
        var inflate = 48;
        if (e.clientX > r.left - inflate && e.clientX < r.right + inflate &&
            e.clientY > r.top - inflate && e.clientY < r.bottom + inflate) {
          it.xTo(clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -7, 7));
          it.yTo(clamp((e.clientY - (r.top + r.height / 2)) * 0.22, -7, 7));
        } else {
          it.xTo(0);
          it.yTo(0);
        }
      });
    }, { passive: true });
  }

  /* ── Boot ─────────────────────────────────────────────────── */

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var hero = document.querySelector('.ed-hero--living');
    if (!hero) return;
    initCanvas(hero);
    initIntro(hero);
    initMagnetic(hero);
  });
})();
