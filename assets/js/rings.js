/* ─────────────────────────────────────────────────────────────
   rings.js - growth animation for the experience.html tree
   rings. Each panel's rings draw themselves in (innermost
   first, one ring per career year), an accent ping marks the
   newest growth, then the cross-section idles in a slow drift.
   Loads after the GSAP CDN; without GSAP (or with reduced
   motion) the authored static SVGs render untouched.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (typeof window === 'undefined') return;

  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CENTER = '280 280';

  /* Accent ping reads the active theme's accent from the CSS custom
     property so it matches the light (clay) / dark (cyan) palette. */
  function accentColor() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--ed-accent').trim();
    return v || '#4fb6dc';
  }

  function initSvg(svg, index) {
    var group = svg.querySelector('g');
    if (!group) return;

    var paths = Array.prototype.slice.call(group.querySelectorAll('path'));
    var rings = [];
    var checks = [];
    paths.forEach(function (p) {
      var d = (p.getAttribute('d') || '').trim();
      /* Closed loops are age rings; open center-out strokes are
         the radial checking lines. */
      if (/z$/i.test(d)) rings.push(p);
      else checks.push(p);
    });
    if (!rings.length) return;

    var pith = svg.querySelector('circle');
    var rimText = svg.querySelector('text');

    /* ── Growth draw-in ──────────────────────────────────── */

    var ringLens = rings.map(function (p) { return p.getTotalLength(); });
    var checkLens = checks.map(function (p) { return p.getTotalLength(); });

    rings.forEach(function (p, i) {
      gsap.set(p, { strokeDasharray: ringLens[i], strokeDashoffset: ringLens[i] });
    });
    checks.forEach(function (p, i) {
      gsap.set(p, { strokeDasharray: checkLens[i], strokeDashoffset: checkLens[i] });
    });
    if (pith) gsap.set(pith, { opacity: 0 });
    if (rimText) gsap.set(rimText, { opacity: 0 });

    var tl = gsap.timeline({ paused: true });
    if (pith) {
      tl.to(pith, { opacity: 0.38, duration: 0.45, ease: 'power2.out' }, 0);
    }
    tl.to(checks, {
      strokeDashoffset: 0,
      duration: 1.1,
      ease: 'power2.inOut',
      stagger: 0.1
    }, 0.1);
    tl.to(rings, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      stagger: 0.14
    }, 0.15);
    if (rimText) {
      tl.to(rimText, { opacity: 1, duration: 0.9, ease: 'power2.out' }, '>-0.4');
    }
    tl.eventCallback('onComplete', function () {
      /* Drop dash props so rotation renders the seamless authored
         strokes, then ping the newest growth. */
      gsap.set(rings.concat(checks), { clearProps: 'strokeDasharray,strokeDashoffset' });
      ping(svg, rings[rings.length - 1]);
    });

    ScrollTrigger.create({
      trigger: svg,
      start: 'top 75%',
      once: true,
      onEnter: function () { tl.play(); }
    });

    /* ── Idle drift — alternating direction per panel, only
          while the panel is on screen ───────────────────── */

    var dir = index % 2 === 0 ? 1 : -1;
    var spin = gsap.to(group, {
      rotation: dir * 360,
      svgOrigin: CENTER,
      duration: 240,
      repeat: -1,
      ease: 'none',
      paused: true
    });
    var rimSpin = rimText ? gsap.to(rimText, {
      rotation: -dir * 360,
      svgOrigin: CENTER,
      duration: 150,
      repeat: -1,
      ease: 'none',
      paused: true
    }) : null;

    ScrollTrigger.create({
      trigger: svg,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: function (self) {
        if (self.isActive) {
          spin.play();
          if (rimSpin) rimSpin.play();
        } else {
          spin.pause();
          if (rimSpin) rimSpin.pause();
        }
      }
    });

    /* ── Cursor tilt (fine pointers only) ────────────────── */

    if (finePointer) {
      var maxTilt = 4;
      var rxTo = gsap.quickTo(svg, 'rotationX', { duration: 0.6, ease: 'power3' });
      var ryTo = gsap.quickTo(svg, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(svg, { transformPerspective: 900 });

      svg.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        rxTo(-ny * 2 * maxTilt);
        ryTo(nx * 2 * maxTilt);
      }, { passive: true });
      svg.addEventListener('pointerleave', function () {
        rxTo(0);
        ryTo(0);
      }, { passive: true });
    }
  }

  /* One expanding accent ring off the newest growth — same accent
     language as the index hero pulses. */
  function ping(svg, outerRing) {
    var box;
    try { box = outerRing.getBBox(); } catch (err) { return; }
    var r = Math.max(box.width, box.height) / 2;
    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '280');
    circle.setAttribute('cy', '280');
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', accentColor());
    circle.setAttribute('stroke-width', '1');
    circle.setAttribute('opacity', '0.45');
    circle.setAttribute('aria-hidden', 'true');
    svg.appendChild(circle);
    gsap.to(circle, {
      attr: { r: r + 26 },
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out',
      onComplete: function () {
        if (circle.parentNode) circle.parentNode.removeChild(circle);
      }
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var svgs = document.querySelectorAll('svg.ed-rings');
    Array.prototype.forEach.call(svgs, initSvg);
  });
})();
