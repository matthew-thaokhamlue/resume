/*
 * star-cursor.js — the clay shooting star that replaces the mouse cursor.
 *
 * It runs only with a fine pointer (mouse, pen) and no reduced-motion request.
 * It then sets html.star-on, and editorial.css hides the native cursor except
 * in text fields. Otherwise it sets html.no-star, and each reveal target except
 * the play icon shows its "Info" chip instead. The star head sits exactly on
 * the pointer, so clicks stay precise; only the tail lags. Over a reveal target
 * a pill says "Info", or "Play" over the intro video's play icon; while a
 * reveal is open it says "Close ×". A modal dialog renders in the top layer, so
 * the canvas and the pill move into any open dialog. The frame loop runs on
 * demand and stops when the star settles.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const layer = document.createElement('canvas');
  const ctx = fine && !reduce && typeof Path2D === 'function' ? layer.getContext('2d') : null;
  // Fail visible: without a working canvas the native cursor stays, and every reveal target shows its chip.
  if (!ctx) { root.classList.add('no-star'); return; }

  const STAR = new Path2D('M0 -11 L3.2 -4.4 L10.5 -3.4 L5.2 1.7 L6.5 8.9 L0 5.5 L-6.5 8.9 L-5.2 1.7 L-10.5 -3.4 L-3.2 -4.4 Z');
  layer.className = 'ed-star-layer';
  layer.setAttribute('aria-hidden', 'true');
  const label = document.createElement('div');
  label.className = 'ed-star-label';
  label.setAttribute('aria-hidden', 'true');
  const labelText = document.createElement('span');
  labelText.className = 'ed-star-label__text';
  label.appendChild(labelText);
  document.body.append(layer, label);

  let W = 0, H = 0, px = -200, py = -200, seen = false, visible = false, mode = 'idle', overField = false, overLink = false;
  const star = { x: -200, y: -200, rot: 0 };
  const trail = Array.from({ length: 14 }, () => ({ x: -200, y: -200 }));
  const sparks = [];
  let spinFrom = -1, last = 0, running = false;
  let hoverTarget = null;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const isDark = () => root.getAttribute('data-theme') === 'dark';
  const openDialog = () => document.querySelector('dialog[open]');
  const openReveal = () => { const d = openDialog(); return d && d.classList.contains('ed-reveal') ? d : null; };
  // A link or video click inside an open reveal leaves the reveal open (site.js), so no "Close" pill there.
  const modeAt = (el) => {
    if (openReveal()) return el && el.closest('a, video') ? 'idle' : 'close';
    if (!el) return 'idle';
    return el.closest('.ed-play') ? 'play' : el.closest('[data-action="open-reveal"], [data-action="open-testimonial"]') ? 'info' : 'idle';
  };
  const PILL = { info: 'Info', play: 'Play', close: 'Close <span aria-hidden="true">×</span>' };
  const onOpener = (m) => m === 'info' || m === 'play';
  // Text-like fields keep the native caret; the star hides over them.
  const TEXT_FIELD = 'textarea, [contenteditable="true"], input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]';

  let shown = '';   // the mode that the pill text shows; the pill keeps it while it fades out
  function applyLabel() {
    label.classList.toggle('is-visible', visible && mode !== 'idle');
    if (mode === 'idle' || mode === shown) return;
    shown = mode;
    labelText.innerHTML = PILL[mode];
  }
  function flourish() {
    spinFrom = performance.now();
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 60;
      sparks.push({ x: star.x, y: star.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.55 + Math.random() * 0.25, age: 0 });
    }
  }
  function setMode(m, force) {
    if (m === mode && !force) return;
    const entering = (onOpener(m) && mode === 'idle') || (m === 'close' && onOpener(mode));   // a tile, or the reveal it opens
    mode = m;
    if (entering) flourish();
    applyLabel();
    // The pill pops in on each change to a visible mode; a fading pill keeps its size.
    if (m !== 'idle') labelText.animate([{ transform: 'translate(22px, -50%) scale(0.55)' }, { transform: 'translate(22px, -50%) scale(1)' }], { duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.35)' });
    wake();
  }

  // A modal dialog renders in the top layer: the canvas and the pill live inside it while it is open.
  function follow() {
    const parent = openDialog() || document.body;
    if (layer.parentNode !== parent) parent.append(layer, label);
    setMode(modeAt(document.elementFromPoint(px, py)), true);
  }
  new MutationObserver(follow).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  function wake() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    layer.width = Math.round(W * d); layer.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    wake();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('themechange', wake);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY;
    if (!seen) { seen = true; star.x = px; star.y = py; trail.forEach((p) => { p.x = px; p.y = py; }); }
    visible = true;
    const t = e.target instanceof Element ? e.target : null;
    overField = !!(t && t.closest(TEXT_FIELD));
    overLink = !!(t && t.closest('a, button, label, summary'));
    const m = modeAt(t);
    const target = !overField && t ? t.closest('a[href], button, label, summary, .ed-loop-card') : null;
    if (target !== hoverTarget) {
      hoverTarget = target;
      if (target && m === 'idle') flourish(); // Reveal modes already trigger their own burst.
    }
    if (m !== mode) setMode(m); else applyLabel();
    wake();
  }, { passive: true });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { visible = false; hoverTarget = null; applyLabel(); wake(); } });
  resize();
  follow();   // site.js may have opened a deep-linked reveal before this script ran
  root.classList.add('star-on');   // last: the native cursor hides only once the star can draw

  function frame(t) {
    const dt = last ? Math.min(0.05, Math.max(0, (t - last) / 1000)) : 1 / 60;   // never negative
    last = t;
    const ox = star.x, oy = star.y;
    star.x = px; star.y = py;   // the head sits exactly on the pointer
    const speed = dt > 0 ? Math.hypot(star.x - ox, star.y - oy) / dt : 0;
    star.rot += Math.min(speed, 1600) * dt * 0.004;
    let lead = star;
    const kt = 1 - Math.exp(-24 * dt);
    for (const p of trail) { p.x += (lead.x - p.x) * kt; p.y += (lead.y - p.y) * kt; lead = p; }
    for (const s of sparks) { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.9; s.vy *= 0.9; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].age > sparks[i].life) sparks.splice(i, 1);
    draw(t);
    label.style.transform = `translate(${px}px, ${py}px)`;
    const tail = trail[trail.length - 1];
    const settled = Math.hypot(star.x - tail.x, star.y - tail.y) < 0.5;
    const spinning = spinFrom >= 0 && t - spinFrom < 700;
    if (!settled || sparks.length || spinning) requestAnimationFrame(frame); else { running = false; draw(t); }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (!visible || !seen || overField) return;
    const color = isDark() ? '#e0764f' : '#c45a38';
    let prev = star;
    ctx.lineCap = 'round';
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], f = 1 - i / trail.length;
      ctx.strokeStyle = color; ctx.globalAlpha = 0.85 * f * f; ctx.lineWidth = 5.5 * f + 0.5;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
    for (const s of sparks) {
      ctx.globalAlpha = 1 - s.age / s.life; ctx.fillStyle = color;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.age * 6); ctx.scale(0.28, 0.28); ctx.fill(STAR); ctx.restore();
    }
    ctx.globalAlpha = 1;
    let spin = 0;
    if (spinFrom >= 0) { const u = clamp01((t - spinFrom) / 700); spin = (1 - Math.pow(1 - u, 3)) * Math.PI * 2; }
    const sc = mode !== 'idle' ? 1 : overLink ? 1.15 : 0.9;
    ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(star.rot + spin); ctx.scale(sc, sc);
    ctx.fillStyle = color; ctx.fill(STAR); ctx.restore();
  }
})();
