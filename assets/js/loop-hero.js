/*
 * loop-hero.js — the home page loop: six station cards on a ring of 96 particles
 * (XPBD edge, bend and tether constraints, 8 substeps), with WebGL 2 dust along it.
 * On first view the star writes the M at the centre, then a tour walks the highlight
 * and the role word around the stations: WRITE_S + TOUR_S = 4.8 s, within WCAG 2.2.2.
 * Without WebGL, with reduced motion, or after a lost context, the CSS ellipse, the
 * placed cards, the full M and "Product builder" stay.
 */
(() => {
  'use strict';
  const stage = document.getElementById('loop-stage');
  if (!stage) return;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDark = () => root.getAttribute('data-theme') === 'dark';
  const dprCap = () => Math.min(window.devicePixelRatio || 1, 1.5);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const WRITE_S = 0.9, TOUR_S = 3.9;   // the first-view sequence: 4.8 s

  function LoopHero() {
    const canvas = stage.querySelector('canvas');
    const section = stage.closest('.ed-loop-hero');
    const orbit = stage.querySelector('.ed-loop-orbit');
    const cards = [...stage.querySelectorAll('.ed-loop-card')];
    const api = { show() {}, hide() {}, theme() {} };
    const N = 96, STEP = 16, M = 5000;
    const x = new Float32Array(N * 2), px_ = new Float32Array(N * 2), v = new Float32Array(N * 2), rest = new Float32Array(N * 2);
    const inv = new Float32Array(N).fill(1), rl = new Float32Array(N), rl2 = new Float32Array(N);
    let W = 0, H = 0, progress = 0, hoverIdx = -1;
    function layout() {
      const r = stage.getBoundingClientRect();
      if (r.width < 2) return false;
      W = r.width; H = r.height;
      const narrow = W < 640;
      const cx = W / 2, cy = H / 2, rx = Math.min(W * (narrow ? 0.34 : 0.40), 470), ry = H * (narrow ? 0.40 : 0.36);
      for (let i = 0; i < N; i++) { const th = -Math.PI / 2 + 2 * Math.PI * i / N; rest[2 * i] = cx + rx * Math.cos(th); rest[2 * i + 1] = cy + ry * Math.sin(th); }
      for (let i = 0; i < N; i++) { const j = (i + 1) % N, k = (i + 2) % N; rl[i] = Math.hypot(rest[2 * j] - rest[2 * i], rest[2 * j + 1] - rest[2 * i + 1]); rl2[i] = Math.hypot(rest[2 * k] - rest[2 * i], rest[2 * k + 1] - rest[2 * i + 1]); }
      x.set(rest); v.fill(0);
      Object.assign(orbit.style, { left: `${cx - rx}px`, top: `${cy - ry}px`, width: `${2 * rx}px`, height: `${2 * ry}px` });
      placeCards();
      return true;
    }
    function placeCards() { cards.forEach((c, k) => { const i = k * STEP; c.style.transform = `translate(${x[2 * i].toFixed(1)}px, ${x[2 * i + 1].toFixed(1)}px) translate(-50%, -50%)`; }); }
    const WORDS = ['builder', 'manager', 'designer', 'tester', 'owner', 'builder'];
    const roleEl = stage.querySelector('.ed-role-word');
    let roleIdx = 0, roleAnim = null;
    function setRole(i) {
      if (i === roleIdx) return;
      roleIdx = i;
      const next = WORDS[i];
      if (roleAnim) { roleAnim.cancel(); roleAnim = null; }   // a newer station always wins; a cancelled morph never writes its word
      if (reduceMotion || !roleEl.animate) { roleEl.textContent = next; return; }
      if (roleEl.textContent === next) return;
      // width morph: the old word condenses and lifts away, the new one expands into place
      const out = roleEl.animate([{ fontVariationSettings: "'wdth' 100, 'wght' 560", opacity: 1, transform: 'translateY(0)' }, { fontVariationSettings: "'wdth' 75, 'wght' 420", opacity: 0, transform: 'translateY(-0.28em)' }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      roleAnim = out;
      out.finished.then(() => {
        if (roleAnim !== out) return;
        const from = roleEl.getBoundingClientRect().width;   // the old word, condensed by the held fade-out
        roleEl.textContent = next;
        out.cancel();   // the held fade-out would hide the word again when the fade-in ends
        const to = roleEl.getBoundingClientRect().width;     // the new word at full width; nothing paints between these lines
        // the box glides from the old width to the new one, so the centred line never jumps
        roleAnim = roleEl.animate([{ fontVariationSettings: "'wdth' 75, 'wght' 420", opacity: 0, transform: 'translateY(0.28em)', width: `${from}px` }, { fontVariationSettings: "'wdth' 100, 'wght' 560", opacity: 1, transform: 'translateY(0)', width: `${to}px` }], { duration: 300, easing: 'cubic-bezier(0,0,.2,1)' });
      }).catch(() => {});
    }
    function highlight() { const s = hoverIdx >= 0 ? hoverIdx : Math.floor(progress * 6) % 6; cards.forEach((c, k) => c.classList.toggle('is-front', k === s)); setRole(s); }
    // the star writes the M: two masked strokes, a star head riding the stroke end
    const markPaths = [...stage.querySelectorAll('.ed-mark-reveal')];
    const markStar = stage.querySelector('.ed-mark-star');
    const markLen = markPaths.map((pth) => pth.getTotalLength());
    function tip(k, p) {   // the pen tip on stroke k at progress p: position and direction
      const len = markLen[k], L = len * p, t0 = Math.max(0, Math.min(len - 0.5, L - 0.25));
      const a = markPaths[k].getPointAtLength(t0), b = markPaths[k].getPointAtLength(t0 + 0.5), at = markPaths[k].getPointAtLength(L);
      return { x: at.x, y: at.y, dir: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    function drawMark(w) {
      const p1 = ease(clamp01(w / 0.45)), p2 = ease(clamp01((w - 0.55) / 0.45));
      markPaths[0].style.strokeDasharray = markLen[0]; markPaths[0].style.strokeDashoffset = markLen[0] * (1 - p1);
      markPaths[1].style.strokeDasharray = markLen[1]; markPaths[1].style.strokeDashoffset = markLen[1] * (1 - p2);
      let t;
      if (w < 0.45) t = tip(0, p1);
      else if (w >= 0.55) t = tip(1, p2);
      else {   // pen lift: a short hop from the end of stroke A to the start of stroke B
        const u = ease((w - 0.45) / 0.1), e = tip(0, 1), b = tip(1, 0);
        t = { x: e.x + (b.x - e.x) * u, y: e.y + (b.y - e.y) * u - Math.sin(Math.PI * u) * 5, dir: Math.atan2(b.y - e.y, b.x - e.x) };
      }
      const rot = t.dir * 180 / Math.PI + w * 540;
      markStar.setAttribute('transform', `translate(${t.x.toFixed(2)} ${t.y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(0.42)`);
      markStar.style.opacity = w < 0.92 ? '1' : String(Math.max(0, (1 - w) / 0.08));
    }
    layout(); highlight();
    let active = false;   // the observer reads it before the static branches return, and they never set it
    new ResizeObserver(() => { if (layout() && active) render(); }).observe(stage);
    if (reduceMotion) return api;
    let gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true }); } catch (e) { gl = null; }
    if (!gl) return api;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
    const prog = (vs, fs) => { const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs); if (!a || !b) return null; const p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null; const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); } return { p, u }; };
    const RING = `uniform vec2 uRing[96];
      vec2 ringAt(float s) { float f = fract(s) * 96.0; int i1 = int(floor(f)); float t = f - float(i1); int i0 = (i1 + 95) % 96, i2 = (i1 + 1) % 96, i3 = (i1 + 2) % 96;
        vec2 p0 = uRing[i0], p1 = uRing[i1], p2 = uRing[i2], p3 = uRing[i3]; float t2 = t * t, t3 = t2 * t;
        return 0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3); }`;
    const dust = prog(`#version 300 es
      layout(location = 0) in vec4 aData; uniform vec2 uRes; uniform float uFlow; uniform float uScale; out float vA; ${RING}
      void main() { float s = aData.x + uFlow; vec2 p = ringAt(s); vec2 q = ringAt(s + 0.002); vec2 tg = normalize(q - p + vec2(1e-6));
        p += vec2(-tg.y, tg.x) * aData.y * uScale; vec2 c = p / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); gl_PointSize = aData.z * uScale; vA = aData.w; }`,
      `#version 300 es
      precision highp float; in float vA; uniform vec3 uColor; out vec4 o;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA; o = vec4(uColor * a, a); }`);
    const line = prog(`#version 300 es
      uniform vec2 uRing[96]; uniform vec2 uRes; void main() { vec2 c = uRing[gl_VertexID % 96] / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`,
      `#version 300 es
      precision highp float; uniform vec4 uColor; out vec4 o; void main() { o = uColor; }`);
    if (!dust || !line) return api;
    const gauss = () => { let a = 0, b = 0; while (!a) a = Math.random(); while (!b) b = Math.random(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
    const data = new Float32Array(M * 4);
    for (let i = 0; i < M; i++) { const halo = Math.random() < 0.28; data[4 * i] = Math.random(); data[4 * i + 1] = Math.max(-3, Math.min(3, gauss())) * (halo ? 34 : 11); data[4 * i + 2] = halo ? 1.0 + Math.random() * 1.4 : 1.2 + Math.pow(Math.random(), 2) * 2.4; data[4 * i + 3] = halo ? 0.12 + Math.random() * 0.25 : 0.3 + Math.random() * 0.55; }
    const dustVao = gl.createVertexArray(); gl.bindVertexArray(dustVao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    const emptyVao = gl.createVertexArray(); gl.bindVertexArray(emptyVao);
    function distC(i, j, L, alpha, h) { const wi = inv[i], wj = inv[j], w = wi + wj; if (!w) return; const dx = x[2 * i] - x[2 * j], dy = x[2 * i + 1] - x[2 * j + 1], d = Math.hypot(dx, dy); if (d < 1e-6) return; const dl = -(d - L) / (w + alpha / (h * h)); x[2 * i] += wi * dl * dx / d; x[2 * i + 1] += wi * dl * dy / d; x[2 * j] -= wj * dl * dx / d; x[2 * j + 1] -= wj * dl * dy / d; }
    function tether(i, alpha, h) { const wi = inv[i]; if (!wi) return; const dx = x[2 * i] - rest[2 * i], dy = x[2 * i + 1] - rest[2 * i + 1], d = Math.hypot(dx, dy); if (d < 1e-6) return; const dl = -d / (wi + alpha / (h * h)); x[2 * i] += wi * dl * dx / d; x[2 * i + 1] += wi * dl * dy / d; }
    let grabbed = -1, gx = 0, gy = 0, gox = 0, goy = 0;
    function simulate(dt) {
      const S = 8, h = dt / S, damp = Math.exp(-3.2 * h); let maxV = 0;
      for (let s = 0; s < S; s++) {
        for (let i = 0; i < N; i++) { px_[2 * i] = x[2 * i]; px_[2 * i + 1] = x[2 * i + 1]; if (inv[i] > 0) { x[2 * i] += v[2 * i] * h; x[2 * i + 1] += v[2 * i + 1] * h; } }
        if (grabbed >= 0) { x[2 * grabbed] = gx + gox; x[2 * grabbed + 1] = gy + goy; }
        for (let i = 0; i < N; i++) distC(i, (i + 1) % N, rl[i], 2e-5, h);
        for (let i = 0; i < N; i++) distC(i, (i + 2) % N, rl2[i], 4e-4, h);
        for (let i = 0; i < N; i++) tether(i, 2.5e-3, h);
        for (let i = 0; i < N; i++) { v[2 * i] = (x[2 * i] - px_[2 * i]) / h * damp; v[2 * i + 1] = (x[2 * i + 1] - px_[2 * i + 1]) / h * damp; if (inv[i] > 0) maxV = Math.max(maxV, Math.abs(v[2 * i]) + Math.abs(v[2 * i + 1])); }
      }
      return maxV;
    }
    const ringPx = new Float32Array(N * 2);
    let shown = false;
    function render() {
      placeCards();
      const d = dprCap(), r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * d)), hh = Math.max(1, Math.round(r.height * d));
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < 2 * N; i++) ringPx[i] = x[i] * d;
      const dark = isDark();
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(line.p); gl.bindVertexArray(emptyVao);
      gl.uniform2fv(line.u.uRing, ringPx); gl.uniform2f(line.u.uRes, canvas.width, canvas.height);
      gl.uniform4fv(line.u.uColor, dark ? [0.14, 0.14, 0.14, 0.14] : [0.015, 0.015, 0.015, 0.14]);
      gl.drawArrays(gl.LINE_LOOP, 0, N);
      gl.useProgram(dust.p); gl.bindVertexArray(dustVao);
      gl.uniform2fv(dust.u.uRing, ringPx); gl.uniform2f(dust.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(dust.u.uFlow, progress + scrollFlow); gl.uniform1f(dust.u.uScale, d);
      gl.uniform3fv(dust.u.uColor, rgb(dark ? '#e0764f' : '#c45a38'));
      if (dark) gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, M);
      gl.bindVertexArray(emptyVao);
      if (!shown) { shown = true; orbit.style.visibility = 'hidden'; }
    }
    let running = false, lastT = 0, tourFrom = null, tourPending = false, toured = false, settleT = 0, scrollFlow = 0, writeFrom = null, writePending = false;
    function frame(ts) {
      if (!active) { running = false; return; }
      const now = ts / 1000, dt = lastT ? Math.min(1 / 30, Math.max(1 / 240, now - lastT)) : 1 / 60; lastT = now;
      if (writePending) { writePending = false; writeFrom = now; }
      if (writeFrom !== null) { const w = clamp01((now - writeFrom) / WRITE_S); drawMark(w); if (w >= 1) { writeFrom = null; tourPending = true; } }
      if (tourPending) { tourPending = false; tourFrom = now; }
      if (tourFrom !== null) { const t = clamp01((now - tourFrom) / TOUR_S); progress = t; highlight(); if (t >= 1) tourFrom = null; }   // WRITE_S + TOUR_S: under 5 s, then it stops
      const maxV = simulate(dt); render();
      settleT = grabbed < 0 && maxV < 2 ? settleT + dt : 0;
      if (writePending || writeFrom !== null || tourPending || tourFrom !== null || grabbed >= 0 || settleT < 0.4) requestAnimationFrame(frame); else running = false;
    }
    function wake() { if (active && !running) { running = true; lastT = 0; requestAnimationFrame(frame); } }
    cards.forEach((c, k) => {
      c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; hoverIdx = k; highlight(); });
      c.addEventListener('pointerleave', () => { hoverIdx = -1; highlight(); });
      c.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        const r = stage.getBoundingClientRect(); grabbed = k * STEP; inv[grabbed] = 0;
        gx = e.clientX - r.left; gy = e.clientY - r.top; gox = x[2 * grabbed] - gx; goy = x[2 * grabbed + 1] - gy;
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
        e.preventDefault(); wake();
      });
      c.addEventListener('pointermove', (e) => { if (grabbed !== k * STEP) return; const r = stage.getBoundingClientRect(); gx = Math.max(0, Math.min(W, e.clientX - r.left)); gy = Math.max(0, Math.min(H, e.clientY - r.top)); wake(); });
      const rel = () => { if (grabbed === k * STEP) { inv[grabbed] = 1; grabbed = -1; wake(); } };
      c.addEventListener('pointerup', rel); c.addEventListener('pointercancel', rel);
    });
    window.addEventListener('scroll', () => { if (!active) return; const r = stage.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; scrollFlow = window.scrollY / 1400; render(); }, { passive: true });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); active = false; orbit.style.visibility = 'visible';
      writeFrom = tourFrom = null; writePending = tourPending = false;   // the loop stops here, so show the end state now
      drawMark(1); progress = 1; hoverIdx = -1; highlight();
    });
    api.show = () => { active = true; layout(); render(); if (!toured) { toured = true; drawMark(0); writePending = true; } wake(); };
    api.hide = () => { active = false; };
    api.theme = () => { if (active) render(); };
    section.classList.add('is-draggable');   // the pointer handlers are attached: the CSS shows the drag hint
    drawMark(0);   // live path only: the first paint must not show the full M before show() starts the write
    return api;
  }

  const loop = LoopHero();
  new IntersectionObserver((entries) => {
    for (const entry of entries) { if (entry.isIntersecting) loop.show(); else loop.hide(); }
  }).observe(stage);
  window.addEventListener('themechange', () => loop.theme());
})();
