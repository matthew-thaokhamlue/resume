/* Shared M-to-shooting-star motion used by the home and experience pages. */
(function () {
  if (typeof window === 'undefined') return;

  window.createShootingStar = function (mark, strokes, head, gradient, home) {
    var gsap = window.gsap;
    var original = strokes.map(function (stroke) {
      return stroke.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number);
    });
    var gradientId = gradient.getAttribute('id') || 'ed-star-trail';
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
        var blended = coords.map(function (value, j) {
          return +(original[i][j] + (value - original[i][j]) * morph.v).toFixed(3);
        });
        stroke.setAttribute('d', 'M' + blended.slice(0, 2).join(' ') + ' C' + blended.slice(2, 8).join(' ') + ' C' + blended.slice(8).join(' '));
        stroke.style.stroke = morph.v > 0.98 ? 'url(#' + gradientId + ')' : '#c45a38';
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
  };
})();
