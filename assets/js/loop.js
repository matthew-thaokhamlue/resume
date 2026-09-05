/* ─────────────────────────────────────────────────────────────
   loop.js — index.html only. Two scroll pins driven by GSAP +
   ScrollTrigger:
     1. Hero: "Product <role>" where the role word swaps one step per
        scroll span (builder, manager, designer, owner, tester, builder)
        and the last step recolours the word to the ink colour.
     2. The same mark drops onto Strategy as a shooting star, travels
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

  function createShootingStar(mark, strokes, head, gradient, home) {
    var original = strokes.map(function (stroke) {
      return stroke.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number);
    });
    var morph = { v: 0 };
    var target = { x: home.left + home.width / 2, y: home.top + home.height / 2, scale: 1, opacity: 1 };
    var position = { x: target.x, y: target.y, scale: 1 };
    var trail = Array.from({ length: 6 }, function () { return { x: target.x, y: target.y }; });
    var heading = -Math.PI / 4;
    var running = false;

    function frame(time, delta) {
      var dt = Math.min(delta || 16.67, 50) / 1000;
      var follow = 1 - Math.exp(-20 * dt);
      var lag = 1 - Math.exp(-24 * dt);
      var oldX = position.x;
      var oldY = position.y;
      position.x += (target.x - position.x) * follow;
      position.y += (target.y - position.y) * follow;
      position.scale += (target.scale - position.scale) * follow;
      var dx = position.x - oldX;
      var dy = position.y - oldY;
      var speed = Math.hypot(dx, dy) / dt;
      var turn = 0;
      if (speed > 3) {
        var direction = Math.atan2(dy, dx);
        turn = Math.atan2(Math.sin(direction - heading), Math.cos(direction - heading));
        heading += turn * follow;
      }

      var error = Math.hypot(target.x - position.x, target.y - position.y);
      trail.forEach(function (point, i) {
        var leader = i ? trail[i - 1] : position;
        point.x += (leader.x - point.x) * lag;
        point.y += (leader.y - point.y) * lag;
        error += Math.hypot(leader.x - point.x, leader.y - point.y);
      });
      var unit = Math.max(0.01, home.width / 100 * position.scale);
      var forwardX = Math.cos(heading);
      var forwardY = Math.sin(heading);
      var localTrail = trail.map(function (point, i) {
        var tx = point.x - position.x - forwardX * (i + 1) * 4 * unit;
        var ty = point.y - position.y - forwardY * (i + 1) * 4 * unit;
        // Bound the tail during large scroll jumps and keep it within the viewport.
        var limit = Math.min(1, 100 / (Math.hypot(tx, ty) || 1));
        tx = Math.min(window.innerWidth - 8, Math.max(8, position.x + tx * limit)) - position.x;
        return { x: 50 + tx / unit, y: 29 + ty * limit / unit };
      });
      strokes.forEach(function (stroke, i) {
        var side = i ? -2.4 : 2.4;
        var coords = [50 - forwardX * 7 - forwardY * side, 29 - forwardY * 7 + forwardX * side];
        localTrail.forEach(function (point, j) {
          var spread = side * (1 - j / 5);
          coords.push(point.x - forwardY * spread, point.y + forwardX * spread);
        });
        var blended = coords.map(function (value, j) { return +(original[i][j] + (value - original[i][j]) * morph.v).toFixed(3); });
        stroke.setAttribute('d', 'M' + blended.slice(0, 2).join(' ') + ' C' + blended.slice(2, 8).join(' ') + ' C' + blended.slice(8).join(' '));
        stroke.style.stroke = morph.v > 0.98 ? 'url(#ed-star-trail)' : '#c45a38';
        stroke.style.opacity = 1 - (i ? 0.4 : 0) * morph.v;
      });
      gradient.setAttribute('x2', localTrail[5].x);
      gradient.setAttribute('y2', localTrail[5].y);
      var stretch = Math.min(speed / 1200, 0.22) * morph.v;
      head.setAttribute('transform', 'translate(50 29) rotate(' + ((heading * 180 / Math.PI) + 90) + ') scale(' + (morph.v * (1 - stretch * 0.45)) + ' ' + (morph.v * (1 + stretch)) + ')');
      head.style.opacity = morph.v;
      gsap.set(mark, {
        x: position.x - home.width / 2,
        y: position.y - home.height / 2,
        scale: position.scale,
        opacity: target.opacity,
        rotation: 0
      });
      if (error < 0.05 && Math.abs(target.scale - position.scale) < 0.001 && Math.abs(turn) < 0.001) {
        gsap.ticker.remove(frame);
        running = false;
      }
    }

    function wake() {
      if (!running) {
        running = true;
        gsap.ticker.add(frame);
      }
    }

    return {
      morph: morph,
      wake: wake,
      move: function (x, y, scale, opacity) {
        target = { x: x, y: y, scale: scale, opacity: opacity };
        if (!morph.v) {
          position.x = x;
          position.y = y;
          position.scale = scale;
          trail.forEach(function (point) { point.x = x; point.y = y; });
        }
        wake();
      }
    };
  }

  function initHeroRoles() {
    var hero = document.querySelector('.ed-hero--product');
    var role = hero && hero.querySelector('.ed-hero__role');
    var home = hero && hero.querySelector('.ed-hero__mark-home');
    var mark = hero && hero.querySelector('.ed-motion-mark');
    var strokes = mark ? Array.prototype.slice.call(mark.querySelectorAll('.ed-motion-mark__stroke')) : [];
    var head = mark && mark.querySelector('.ed-motion-mark__head');
    var gradient = mark && mark.querySelector('#ed-star-trail');
    var words = role ? Array.prototype.slice.call(role.querySelectorAll('.ed-hero__role-word')) : [];
    if (!hero || !home || !mark || !head || !gradient || strokes.length !== 2 || words.length < 2) return;

    var homeRect = home.getBoundingClientRect();
    document.body.appendChild(mark);
    var flight = createShootingStar(mark, strokes, head, gradient, homeRect);
    motionMark = { element: mark, home: homeRect, flight: flight };
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
      },
      onUpdate: function () {
        // A refresh or a large scroll jump can update the later triggers first.
        if (hero.getBoundingClientRect().top >= -1) {
          var rect = home.getBoundingClientRect();
          flight.move(rect.left + rect.width / 2, rect.top + rect.height / 2, 1, 1);
        }
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
    /* The M strokes converge into the star's two moving trails. */
    tl.to(flight.morph, { v: 1, duration: 0.75, onUpdate: flight.wake }, steps);
    /* Hold the resolved "Product builder" for one step before the page moves on. */
    tl.to({}, { duration: 1 });
  }

  function initLoopRing() {
    var section = document.querySelector('.ed-loop');
    var cards = section ? Array.prototype.slice.call(section.querySelectorAll('.ed-loop__card')) : [];
    var stage = section && section.querySelector('.ed-loop__stage');
    var track = section && section.querySelector('.ed-loop__track');
    if (!section || cards.length < 2 || !stage || !track || !motionMark) return;

    var flight = motionMark.flight;
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

      flight.move(homeCenterX + (stageCenterX - homeCenterX) * progress,
        homeCenterY + (stageCenterY - homeCenterY) * progress, scale, 1);
    }

    function render(progress) {
      var entry = clamp(progress / entryEnd, 0, 1);
      var travel = clamp((progress - entryEnd) / (exitStart - entryEnd), 0, 1);
      var exit = clamp((progress - exitStart) / (1 - exitStart), 0, 1);
      var step = Math.round(travel * n);
      var angle = -90 + (travel * 360);
      var radians = angle * Math.PI / 180;
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
      setFront(step % n);
      flight.move(centerX, centerY, pointerScale * (1 - exit * 0.2), 1 - exit);
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
      onToggle: function (self) { section.classList.toggle('is-in-view', self.isActive); },
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
