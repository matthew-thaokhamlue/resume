/*
 * room.js — the 3D room on the home page: a wide room with a wooden window above a long desk. On the desk lie
 * five boarding passes, a laptop and a CV printout. A chosen pass shows its role on a lined paper held in front
 * of the camera, and the window shows that role's city. room-boot.js imports this module behind ?room=1 and
 * calls start(section). start() resolves after the first frame. Until then any failure removes every listener
 * and rejects, and room-boot.js hides the room. The role text comes from experience.html, read the same way as
 * assets/js/ai-match.js. The laptop and the printout click the hero's own AI Match button and CV link.
 */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';

const NAME = 'Matthew Thaokhamlue';
const PASSENGER = NAME.toUpperCase();
const LINK_TEXT = 'The full role on the Experience page';
// The passes, left to right on the desk: their role sections in experience.html, the print and the view.
const PASSES = [
  { id: 'sema', roles: ['role-sema'], code: 'SFO', city: 'San Francisco', view: 'sanfrancisco-sema-day.webp' },
  { id: 'lab', roles: ['role-labtwin', 'role-labforward'], code: 'BER', city: 'Berlin', view: 'berlin-lab-day.webp' },
  { id: 'thryve', roles: ['role-thryve'], code: 'BER', city: 'Berlin', view: 'berlin-thryve-day.webp' },
  { id: 'ey', roles: ['role-ey'], code: 'BKK', city: 'Bangkok', view: 'bangkok-ey-day.webp' },
  { id: 'education', roles: ['role-education'], code: 'CNX → BER', city: 'Chiang Mai → Berlin', view: 'chiangmai-education-day.webp' },
];
// Each window view with its landmark as fractions of the image: u from the left, v from the top (top to base).
// A bridge spans its two towers in u.
const HOME_VIEW = 'berlin-home-day.webp';
const VIEWS = {
  'berlin-home-day.webp': { u: [0.706, 0.706], v: [0.105, 0.27] },          // the TV tower
  'sanfrancisco-sema-day.webp': { u: [0.42, 0.59], v: [0.11, 0.32] },     // the Golden Gate Bridge
  'berlin-lab-day.webp': { u: [0.51, 0.51], v: [0, 0.4] },                // the TV tower
  'berlin-thryve-day.webp': { u: [0.44, 0.56], v: [0.15, 0.44] },         // the Oberbaum Bridge
  'bangkok-ey-day.webp': { u: [0.5, 0.5], v: [0.04, 0.46] },              // Wat Arun
  'chiangmai-education-day.webp': { u: [0.51, 0.51], v: [0.1, 0.18] },    // the Doi Suthep chedi
};

// Units are metres. The back wall's room-side face is z = 0, and x runs to the right.
const WALL_H = 2.8, WALL_T = 0.2;
const ROOM = { x0: -3.4, x1: 2.6, z1: 4.6 };
const WIN = { x0: -0.2, x1: 1.3, y0: 1.0, y1: 2.3 };   // the opening in the back wall
const LINING = 0.025, CASING = 0.075, SILL_OUT = 0.16, FRAME_Z = -0.12, F = 0.06, MUL = 0.042;
// The sill top sits above the opening's bottom face, so the two never share a plane.
const SILL_UP = 0.006;
const DESK = { x: 0.55, z: 0.47, w: 2.1, d: 0.9, top: 0.78 };
// The passes lie in a row along the front of the desk; each one overlaps the next by PASS_W - PASS_STEP.
const PASS_W = 0.44, PASS_STEP = 0.4, PASS_PAD = 0.022, PASS_LIFT = 0.03;
const LAPTOP = { x: 0.55, z: 0.37, scale: 0.55, tilt: 0.2 };   // tilt: the lid leans back by this angle in radians
const PRINT = { x: 0.04, z: 0.35, w: 0.21, h: 0.297, turn: 0.16 };
// Text sizes in metres. EM is the smallest text on a pass. Textures carry TEX_PPM px per metre.
const EM = 0.0205, TEX_PPM = 1750;
const SANS = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const INK = '#1d1b18', INK_SOFT = '#45413b', CLAY = '#c45a38';
// The window view: an image plane behind the window, so the eye's orbit gives parallax. MAX_IMG_H is the
// largest image height as seen at the frame from the rest eye; VIEW_MARGIN keeps a landmark off the wood.
const VIEW_Z = -5, MAX_IMG_H = 1.45, VIEW_PAD = 4, VIEW_MARGIN = 0.012;
const MAX_TILT = THREE.MathUtils.degToRad(3);
const MOVE_MS = 900, FADE_MS = 400;
// The desk station: the eye sits up and back from the desk's front edge. A narrow stage moves it further back.
const DESK_EYE = { up: 1.0, back: 0.92 };

// The lined paper, laid out in CSS px: it hangs at a fixed place in front of the camera, so its size on screen
// never changes. Each line of text sits on a ruled line.
const HAND = '"Patrick Hand", "Comic Sans MS", cursive';
const PEN = '#1d2740';
const NOTE = { body: 19, head: 23, title: 27, line: 32, left: 92, right: 34, top: 66, bottom: 64, chars: 70, bullet: 22, shadow: 18 };
// Where the paper sits on the stage: on the left, below the Back button, up to SHARE of the width.
const NOTE_BOX = { left: 24, top: 72, bottom: 20, share: 0.52, maxW: 720 };

const clean = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Role text from experience.html ──

function readRole(doc, id) {
  const section = doc.getElementById(id);
  if (!section) throw new Error(`experience.html has no #${id}`);
  if (id === 'role-education') {
    const stages = [...section.querySelectorAll('.ed-stage')].map((stage) => ({
      head: clean(stage.querySelector('.ed-stage__title')), text: clean(stage.querySelector('.ed-stage__desc')),
    }));
    if (!stages.length || stages.some((s) => !s.head || !s.text)) throw new Error('experience.html lost its Education rows');
    return { company: stages.map((s) => s.head).join(' & '), role: stages[0].text.split(/\.\s/)[0], dates: [], summary: '', items: stages, link: id };
  }
  const company = clean(section.querySelector('[data-role-company]'));
  const role = clean(section.querySelector('[data-role-title]'));
  if (!company || !role) throw new Error(`#${id} lost its company or role`);
  // The meta reads "dates · place"; the pass prints the dates only.
  const dates = clean(section.querySelector('[data-role-meta]')).split(' · ').slice(0, -1);
  const items = [...section.querySelectorAll('h4.ed-reveal__subhead, li:not([data-role-skill])')].map((el) => {
    if (!el.matches('h4')) return { bullet: clean(el) };
    const when = clean(el.querySelector('span'));
    return { head: when ? `${clean(el).replace(when, '').trim()}, ${when}` : clean(el) };
  });
  return { company, role, dates, summary: clean(section.querySelector('[data-role-summary]')), items, link: id };
}

// The role line repeats nothing: when the dates already start with the role, as Sema's do, only the dates print.
const roleLine = (leg) => (leg.dates[0]?.startsWith(leg.role) ? '' : leg.role);

async function loadRoles() {
  const response = await fetch(new URL('experience.html', document.baseURI));
  if (!response.ok) throw new Error(`experience.html returned ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  return PASSES.map((pass) => {
    const legs = pass.roles.map((id) => readRole(doc, id));
    const name = legs.map((leg) => [leg.company, roleLine(leg), leg.dates.join(' · ')].filter(Boolean).join(', ')).join('; ');
    return { ...pass, legs, name, link: legs[legs.length - 1].link };
  });
}

// ── Text on canvas: lay out in metres, record the draw calls, then size and draw the canvas ──

const measure = document.createElement('canvas').getContext('2d');
const font = (size, weight, family) => `${weight} ${size * TEX_PPM}px ${family}`;

// Breaks text into lines no wider than maxW (in the font's px) and, when given, no longer than chars.
function wrap(text, f, maxW, chars = Infinity) {
  measure.font = f;
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && (next.length > chars || measure.measureText(next).width > maxW)) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

class Sheet {
  constructor(w) { this.w = w; this.y = 0; this.ops = []; this.marks = []; }

  // Writes wrapped text in lines of size * lead; mark names the line for the text-size check.
  text(str, { size, weight = 400, family = SANS, color = INK, x = 0, maxW = this.w - x, lead = 1.3, mark }) {
    const f = font(size, weight, family);
    for (const line of wrap(str, f, maxW * TEX_PPM)) {
      const base = this.y + size * (0.82 + (lead - 1) / 2);
      this.ops.push({ text: line, f, color, x, base });
      if (mark) this.marks.push({ mark, size, x, base });
      this.y += size * lead;
    }
  }

  // Writes runs side by side on one baseline when they fit in maxW, else each on its own line.
  runs(parts, { x = 0, lead = 1.3, maxW = this.w - 2 * x } = {}) {
    let width = 0;
    for (const p of parts) { measure.font = font(p.size, p.weight || 400, p.family || SANS); width += measure.measureText(p.text).width / TEX_PPM; }
    if (width > maxW) { for (const p of parts) this.text(p.text.trim(), { ...p, x, maxW }); return; }
    const size = Math.max(...parts.map((p) => p.size));
    const base = this.y + size * (0.82 + (lead - 1) / 2);
    let at = x;
    for (const p of parts) {
      const f = font(p.size, p.weight || 400, p.family || SANS);
      this.ops.push({ text: p.text, f, color: p.color || INK, x: at, base });
      if (p.mark) this.marks.push({ mark: p.mark, size: p.size, x: at, base });
      measure.font = f;
      at += measure.measureText(p.text).width / TEX_PPM;
    }
    this.y += size * lead;
  }

  draw(background) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(this.w * TEX_PPM);
    canvas.height = Math.round(this.y * TEX_PPM);
    const g = canvas.getContext('2d');
    g.fillStyle = background;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.textBaseline = 'alphabetic';
    for (const op of this.ops) {
      if (op.rect) { g.fillStyle = op.color; g.fillRect(op.x * TEX_PPM, op.y * TEX_PPM, op.w * TEX_PPM, op.h * TEX_PPM); continue; }
      g.font = op.f;
      g.fillStyle = op.color;
      g.textAlign = op.align || 'left';
      g.fillText(op.text, op.x * TEX_PPM, op.base * TEX_PPM);
    }
    return canvas;
  }
}

const BAND = 0.032;

// The front of a pass. The next pass covers its right edge, so the text keeps clear of that strip.
function layoutPass(pass) {
  const s = new Sheet(PASS_W);
  s.ops.push({ rect: true, x: 0, y: 0, w: PASS_W, h: BAND, color: CLAY });
  const bandBase = BAND / 2 + EM * 0.36;
  s.ops.push({ text: 'BOARDING PASS', f: font(EM * 0.76, 500, MONO), color: '#ffffff', x: PASS_PAD, base: bandBase });
  s.ops.push({ text: PASSENGER, f: font(EM * 0.76, 500, MONO), color: '#ffffff', x: PASS_STEP - PASS_PAD, base: bandBase, align: 'right' });
  s.y = BAND + 0.006;
  const maxW = PASS_STEP - 2 * PASS_PAD;
  s.runs([
    { text: pass.code, size: 0.058, weight: 600, mark: 'code' },
    { text: `  ${pass.city}`, size: 0.024, weight: 500, color: INK_SOFT },
  ], { x: PASS_PAD, lead: 1.05, maxW });
  const inner = { x: PASS_PAD, maxW };
  pass.legs.forEach((leg, i) => {
    s.y += i ? 0.008 : 0.002;
    s.text(leg.company, { size: 0.038, weight: 600, lead: 1.1, mark: 'company', ...inner });
    const role = roleLine(leg);
    if (role) s.text(role, { size: 0.021, lead: 1.2, mark: 'role', ...inner });
    for (const part of leg.dates) s.text(part, { size: EM * 0.9, family: MONO, color: INK_SOFT, lead: 1.25, mark: 'dates', ...inner });
  });
  s.y += 0.014;
  return s;
}

// The CV printout: the title and the name, then grey bars for the printed lines.
function layoutPrint() {
  const s = new Sheet(PRINT.w);
  const x = 0.022, rand = random(7);
  s.y = 0.02;
  s.text('CV', { size: 0.05, weight: 600, x, lead: 1.05 });
  s.text(NAME, { size: 0.0145, weight: 500, x, lead: 1.4 });
  s.y += 0.012;
  for (let i = 0; i < 17; i++) {
    if (i % 6 === 0) { s.ops.push({ rect: true, x, y: s.y, w: 0.06, h: 0.005, color: '#b9b2a6' }); s.y += 0.012; }
    s.ops.push({ rect: true, x, y: s.y, w: (PRINT.w - 2 * x) * (0.6 + rand() * 0.4), h: 0.0032, color: '#d8d2c8' });
    s.y += 0.0095;
  }
  s.y = PRINT.h;
  return s;
}

// The laptop screen, drawn like the hero: the name, the page's H1 and subline, and the AI Match button.
const SCREEN = { w: 1024, aspect: 0.449 / 0.367 };
function drawScreen(title, sub) {
  const c = document.createElement('canvas');
  const W = c.width = SCREEN.w, H = c.height = Math.round(SCREEN.w / SCREEN.aspect);
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf8';
  g.fillRect(0, 0, W, H);
  const x = 84;
  g.fillStyle = INK;
  g.font = `600 36px ${SANS}`;
  g.fillText(NAME, x, 112);
  g.fillStyle = 'rgba(17, 17, 17, 0.12)';
  g.fillRect(x, 146, W - 2 * x, 2);
  let y = 300;
  g.fillStyle = INK;
  g.font = `500 112px ${SANS}`;
  for (const line of wrap(title, g.font, W - 2 * x)) { g.fillText(line, x, y); y += 118; }
  g.fillStyle = INK_SOFT;
  g.font = `400 42px ${SANS}`;
  y -= 34;
  for (const line of wrap(sub, g.font, W - 2 * x)) { g.fillText(line, x, y); y += 54; }
  const label = 'Evaluate role fit';
  g.font = `500 40px ${SANS}`;
  const bw = g.measureText(label).width + 96, by = y + 30, bh = 92;
  g.fillStyle = CLAY;
  g.beginPath();
  g.roundRect(x, by, bw, bh, bh / 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.fillText(label, x + 48, by + 60);
  return { canvas: c, title: 112 / H };
}

// ── The lined paper ──

// Lays out a pass's paper for a paper of W x H CSS px: the headings, the role, every bullet and the link, as
// pages of ruled lines. A heading stays with the line after it, a wrapped bullet stays on one page when it fits,
// and a page never starts with a blank line.
function layoutNotes(pass, W, H) {
  const textW = W - NOTE.left - NOTE.right;
  const rows = Math.max(6, Math.floor((H - NOTE.top - NOTE.bottom) / NOTE.line));
  const lines = [];
  const blank = () => { if (lines.length && lines[lines.length - 1]) lines.push(null); };
  const write = (text, { size = NOTE.body, x = 0, keep = false, link = false, lead = '' } = {}) => {
    const wrapped = wrap(text, `${size}px ${HAND}`, textW - x, NOTE.chars);
    wrapped.forEach((t, i) => {
      lines.push({ text: t, size, x: NOTE.left + x, keep: keep || i < wrapped.length - 1, link, lead: i ? '' : lead });
    });
  };
  pass.legs.forEach((leg, i) => {
    if (i) { blank(); lines.push(null); }
    write(leg.company, { size: NOTE.title, keep: true });
    const role = roleLine(leg);
    if (leg.dates.length && role) write(role, { keep: true });
    for (const part of leg.dates) write(part, { keep: true });
    if (leg.summary) { blank(); write(leg.summary); }
    for (const item of leg.items) {
      if (item.head) { blank(); write(item.head, { size: NOTE.head, keep: true }); }
      if (item.text) write(item.text);
      if (item.bullet) write(item.bullet, { x: NOTE.bullet, lead: '–' });
    }
  });
  blank();
  write(LINK_TEXT, { link: true });

  const pages = [[]];
  lines.forEach((line, i) => {
    let page = pages[pages.length - 1];
    let run = 0;
    while (lines[i + run]?.keep) run++;
    if (page.length && (page.length >= rows || (run && page.length + run + 1 > rows))) { page = []; pages.push(page); }
    if (line || page.length) page.push(line);
  });
  for (const page of pages) while (page.length && !page[page.length - 1]) page.pop();
  return { W, H, rows, pages: pages.filter((page) => page.length) };
}

const noteBase = (row) => NOTE.top + (row + 1) * NOTE.line - 7;

// Draws one page: white paper with a soft shadow, pale blue rules, a double red margin, three punch holes, the
// handwriting and, when there is more than one page, two arrows and the page number. Returns the hit zones.
function drawNotes(notes, index) {
  const { W, H, pages } = notes, S = NOTE.shadow;
  const c = document.createElement('canvas');
  c.width = (W + 2 * S) * 2;
  c.height = (H + 2 * S) * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.translate(S, S);
  g.save();
  g.shadowColor = 'rgba(28, 24, 20, 0.32)';
  g.shadowBlur = 16;
  g.shadowOffsetY = 5;
  g.fillStyle = '#fefefc';
  g.fillRect(0, 0, W, H);
  g.restore();
  g.fillStyle = 'rgba(92, 140, 210, 0.45)';
  for (let y = NOTE.top + NOTE.line; y < H - 8; y += NOTE.line) g.fillRect(0, y, W, 1);
  g.fillStyle = 'rgba(214, 70, 70, 0.7)';
  g.fillRect(NOTE.left - 20, 0, 1.2, H);
  g.fillRect(NOTE.left - 15, 0, 1.2, H);
  // The punch holes go through the paper, so the room shows in them.
  g.globalCompositeOperation = 'destination-out';
  for (const f of [0.14, 0.5, 0.86]) { g.beginPath(); g.arc(34, f * H, 10, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(28, 24, 20, 0.18)';
  for (const f of [0.14, 0.5, 0.86]) { g.beginPath(); g.arc(34, f * H, 10.5, 0, Math.PI * 2); g.stroke(); }

  const zones = {};
  g.fillStyle = PEN;
  g.strokeStyle = PEN;
  g.textBaseline = 'alphabetic';
  pages[index].forEach((line, row) => {
    if (!line) return;
    const base = noteBase(row);
    g.font = `${line.size}px ${HAND}`;
    if (line.lead) g.fillText(line.lead, NOTE.left, base);
    g.fillText(line.text, line.x, base);
    if (line.link) {
      const w = g.measureText(line.text).width;
      g.fillRect(line.x, base + 3, w, 1.5);
      zones.link = { x0: line.x - 4, x1: line.x + w + 4, y0: base - line.size, y1: base + 8 };
    }
  });
  if (pages.length > 1) {
    const y = H - NOTE.bottom / 2 - 2, r = 15;
    const arrows = { prev: W - NOTE.right - 128, next: W - NOTE.right - 16 };
    g.font = `${NOTE.body}px ${HAND}`;
    g.textAlign = 'center';
    g.fillText(`${index + 1} / ${pages.length}`, (arrows.prev + arrows.next) / 2, y + 6);
    g.textAlign = 'left';
    g.lineWidth = 1.6;
    g.lineCap = g.lineJoin = 'round';
    for (const [side, x] of Object.entries(arrows)) {
      const on = side === 'prev' ? index > 0 : index < pages.length - 1;
      g.globalAlpha = on ? 1 : 0.25;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
      const d = side === 'prev' ? -1 : 1;
      g.beginPath();
      g.moveTo(x - d * 4, y - 7);
      g.lineTo(x + d * 4, y);
      g.lineTo(x - d * 4, y + 7);
      g.stroke();
      g.globalAlpha = 1;
      if (on) zones[side] = { x0: x - r - 6, x1: x + r + 6, y0: y - r - 6, y1: y + r + 6 };
    }
  }
  return { canvas: c, zones };
}

// ── Procedural textures ──

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const rand = random(11);
  g.fillStyle = '#93603a';
  g.fillRect(0, 0, c.width, c.height);
  // Broad colour bands, then fine grain lines; whole sine cycles keep the texture seamless along x.
  for (let i = 0; i < 26; i++) {
    const y0 = rand() * c.height, amp = 4 + rand() * 14, cycles = 1 + Math.floor(rand() * 3), phase = rand() * 6.3, w = 10 + rand() * 40;
    g.strokeStyle = rand() < 0.5 ? `rgba(120, 72, 38, ${0.25 + rand() * 0.3})` : `rgba(178, 122, 76, ${0.2 + rand() * 0.3})`;
    g.lineWidth = w;
    for (const dy of [-c.height, 0, c.height]) {
      g.beginPath();
      for (let x = 0; x <= c.width; x += 16) g.lineTo(x, y0 + dy + Math.sin((x / c.width) * cycles * Math.PI * 2 + phase) * amp);
      g.stroke();
    }
  }
  for (let i = 0; i < 220; i++) {
    const y0 = rand() * c.height, amp = 2 + rand() * 10, cycles = 1 + Math.floor(rand() * 3), phase = rand() * 6.3;
    g.strokeStyle = `rgba(64, 34, 16, ${0.15 + rand() * 0.4})`;
    g.lineWidth = 0.8 + rand() * 2.4;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 16) g.lineTo(x, y0 + Math.sin((x / c.width) * cycles * Math.PI * 2 + phase) * amp);
    g.stroke();
  }
  return c;
}

// A small paper clip: one wire bent into three loops, lying flat, its long side along z.
function clipGeometry() {
  const path = new THREE.Path()
    .moveTo(0.010, -0.0015).lineTo(0.026, -0.0015)
    .absarc(0.026, 0.0005, 0.002, -Math.PI / 2, Math.PI / 2, false).lineTo(0.004, 0.0025)
    .absarc(0.004, -0.0005, 0.003, Math.PI / 2, Math.PI * 1.5, false).lineTo(0.030, -0.0035)
    .absarc(0.030, 0.0005, 0.004, -Math.PI / 2, Math.PI / 2, false).lineTo(0.012, 0.0045);
  const points = path.getSpacedPoints(160).map((p) => new THREE.Vector3(p.y, 0, p.x));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 240, 0.0006, 6);
}

// ── The module entry ──

export async function start(section) {
  const stage = section.querySelector('[data-room-stage]');
  const list = section.querySelector('[data-room-passes]');
  const live = section.querySelector('[data-room-live]');
  const backButton = section.querySelector('[data-room-back]');
  const root = document.documentElement;
  const abort = new AbortController();
  const { signal } = abort;
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    await build(renderer);
  } catch (error) {
    abort.abort();
    if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    list.replaceChildren();
    live.replaceChildren();
    if (backButton) backButton.hidden = true;
    throw error;
  }

  async function build(renderer) {
    // The hero's own controls: the laptop and the printout click them, so AI Match and the CV link work as there.
    const heroTitle = clean(document.getElementById('home-title'));
    const heroSub = clean(document.querySelector('#top .ed-home-sub'));
    const aiTrigger = document.getElementById('ai-match-trigger');
    const cvLink = document.querySelector('#top a[href="cv.html"][data-ga-event="resume_downloaded"]');
    if (!heroTitle || !heroSub || !aiTrigger || !cvLink) throw new Error('the hero lost its title, subline, AI Match button or CV link');
    if (!backButton) throw new Error('#room lost its Back button');

    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Only the sun casts shadows, so the map renders again only when a shadow caster moves or the light changes.
    renderer.shadowMap.autoUpdate = false;
    stage.appendChild(canvas);
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1a18);
    const camera = new THREE.PerspectiveCamera(45, stage.clientWidth / stage.clientHeight, 0.05, 40);
    scene.add(camera);   // the paper hangs from the camera

    const hand = new FontFace('Patrick Hand', `url("${new URL('fonts/patrick-hand-latin.woff2', import.meta.url).href}") format("woff2")`);
    const model = (id) => new GLTFLoader().loadAsync(new URL(`models/${id}/${id}_1k.gltf`, import.meta.url).href);
    const loads = Promise.all([
      loadRoles(),
      model('desk_lamp_arm_01'),
      model('potted_plant_02'),
      model('classic_laptop'),
      loadView(HOME_VIEW),
      hand.load().then((face) => document.fonts.add(face)),
      Promise.all(['400', '500', '600'].map((w) => document.fonts.load(`${w} 20px "Instrument Sans"`, 'Aa→–•'))
        .concat(['400', '500'].map((w) => document.fonts.load(`${w} 20px "IBM Plex Mono"`, 'Aa–')))),
    ]);

    // ── The room shell ──
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const flat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
    function box(w, h, d, material, x, y, z) {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }

    const woodMap = new THREE.CanvasTexture(woodTexture());
    woodMap.colorSpace = THREE.SRGBColorSpace;
    woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
    woodMap.anisotropy = anisotropy;
    const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.55 });
    const woodRand = random(3);
    // A wooden board with slightly rounded edges. Its UVs run in metres along the longest side, so the
    // grain follows each board and keeps one scale.
    function woodBox(x0, x1, y0, y1, z0, z1) {
      const size = [x1 - x0, y1 - y0, z1 - z0];
      const geometry = new RoundedBoxGeometry(...size, 2, Math.min(0.009, ...size.map((v) => v / 3)));
      const long = size.indexOf(Math.max(...size));
      const [a, b] = [0, 1, 2].filter((i) => i !== long);
      const position = geometry.attributes.position, uv = geometry.attributes.uv;
      const offset = woodRand() * 10;
      for (let i = 0; i < position.count; i++) {
        const p = [position.getX(i), position.getY(i), position.getZ(i)];
        uv.setXY(i, p[long] / 0.9 + offset, (p[a] + p[b]) / 0.16 + offset);
      }
      const mesh = new THREE.Mesh(geometry, wood);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      scene.add(mesh);
      return mesh;
    }

    const WALL = flat(0xd8cab6);
    box(ROOM.x1 - ROOM.x0, 0.02, ROOM.z1 + WALL_T, flat(0x8a6446), (ROOM.x0 + ROOM.x1) / 2, -0.01, ROOM.z1 / 2 - WALL_T / 2);
    // The back wall is one extruded shape with the window hole, so the sun shines through the opening.
    const wallShape = new THREE.Shape().moveTo(ROOM.x0 - WALL_T, 0).lineTo(ROOM.x1 + WALL_T, 0).lineTo(ROOM.x1 + WALL_T, WALL_H).lineTo(ROOM.x0 - WALL_T, WALL_H).closePath();
    wallShape.holes.push(new THREE.Path().moveTo(WIN.x0, WIN.y0).lineTo(WIN.x1, WIN.y0).lineTo(WIN.x1, WIN.y1).lineTo(WIN.x0, WIN.y1).closePath());
    const backWall = new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape, { depth: WALL_T, bevelEnabled: false }), WALL);
    backWall.position.z = -WALL_T;
    scene.add(backWall);
    // The side walls stay empty: later steps hang posters on the left and a shelf on the right.
    const SIDE = flat(0xcdbfab);
    box(WALL_T, WALL_H, ROOM.z1 + WALL_T, SIDE, ROOM.x0 - WALL_T / 2, WALL_H / 2, ROOM.z1 / 2 - WALL_T / 2);
    box(WALL_T, WALL_H, ROOM.z1 + WALL_T, SIDE, ROOM.x1 + WALL_T / 2, WALL_H / 2, ROOM.z1 / 2 - WALL_T / 2);
    // The ceiling closes the room above the walls, where the dark background showed at the top left.
    const ceiling = box(ROOM.x1 - ROOM.x0 + 2 * WALL_T, 0.1, ROOM.z1 + WALL_T, flat(0xe3dbcf), (ROOM.x0 + ROOM.x1) / 2, WALL_H + 0.05, ROOM.z1 / 2 - WALL_T / 2);

    // The window: a wooden lining in the opening, a casing on the wall, a deep sill, and a sash with one
    // mullion. The two panes are full height, so a tall landmark fits one pane.
    const IN = { x0: WIN.x0 + LINING, x1: WIN.x1 - LINING, y1: WIN.y1 - LINING };
    woodBox(WIN.x0, IN.x0, WIN.y0, WIN.y1, -WALL_T, 0.004);
    woodBox(IN.x1, WIN.x1, WIN.y0, WIN.y1, -WALL_T, 0.004);
    woodBox(WIN.x0, WIN.x1, IN.y1, WIN.y1, -WALL_T, 0.004);
    woodBox(WIN.x0 - CASING, WIN.x0 + 0.006, WIN.y0 - 0.02, WIN.y1 + CASING, 0, 0.024);
    woodBox(WIN.x1 - 0.006, WIN.x1 + CASING, WIN.y0 - 0.02, WIN.y1 + CASING, 0, 0.024);
    woodBox(WIN.x0 - CASING, WIN.x1 + CASING, WIN.y1 - 0.006, WIN.y1 + CASING, 0, 0.026);
    woodBox(WIN.x0 - CASING - 0.05, WIN.x1 + CASING + 0.05, WIN.y0 - 0.036, WIN.y0 + SILL_UP, -WALL_T, SILL_OUT);
    woodBox(WIN.x0 - CASING, WIN.x1 + CASING, WIN.y0 - 0.12, WIN.y0 - 0.036, 0, 0.022);
    const SASH = { z0: FRAME_Z - 0.03, z1: FRAME_Z + 0.03 };
    const CX = (IN.x0 + IN.x1) / 2;
    woodBox(IN.x0, IN.x0 + F, WIN.y0, IN.y1, SASH.z0, SASH.z1);
    woodBox(IN.x1 - F, IN.x1, WIN.y0, IN.y1, SASH.z0, SASH.z1);
    woodBox(IN.x0, IN.x1, IN.y1 - F, IN.y1, SASH.z0, SASH.z1);
    woodBox(IN.x0, IN.x1, WIN.y0, WIN.y0 + F, SASH.z0, SASH.z1);
    woodBox(CX - MUL / 2, CX + MUL / 2, WIN.y0 + F, IN.y1 - F, SASH.z0 + 0.008, SASH.z1 - 0.008);
    const PANES = [
      { x0: IN.x0 + F, x1: CX - MUL / 2, y0: WIN.y0 + F, y1: IN.y1 - F },
      { x0: CX + MUL / 2, x1: IN.x1 - F, y0: WIN.y0 + F, y1: IN.y1 - F },
    ];
    const SASH_OPEN = { x0: IN.x0 + F, x1: IN.x1 - F, y0: WIN.y0 + F, y1: IN.y1 - F };

    // The desk under the window. A click on any part of it counts as the desk.
    const DX = { x0: DESK.x - DESK.w / 2, x1: DESK.x + DESK.w / 2, z0: DESK.z - DESK.d / 2, z1: DESK.z + DESK.d / 2 };
    const deskParts = [woodBox(DX.x0, DX.x1, DESK.top - 0.04, DESK.top, DX.z0, DX.z1)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = DESK.x + sx * (DESK.w / 2 - 0.05), z = DESK.z + sz * (DESK.d / 2 - 0.05);
      deskParts.push(woodBox(x - 0.025, x + 0.025, 0, DESK.top - 0.04, z - 0.025, z + 0.025));
    }
    for (const part of deskParts) part.userData.kind = 'desk';

    scene.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    ceiling.castShadow = false;

    // ── The window view ──
    const viewMaterial = () => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false });
    const viewA = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), viewMaterial());
    const viewB = new THREE.Mesh(viewA.geometry, viewMaterial());
    viewA.position.z = VIEW_Z;
    viewB.position.z = VIEW_Z + 0.01;
    viewB.renderOrder = 1;
    viewB.visible = false;
    scene.add(viewA, viewB);

    // ── Lights (the approved day and night values) ──
    const hemi = new THREE.HemisphereLight(0xcfdcff, 0x7a5c44, 1.1);
    const windowLight = new THREE.PointLight(0xfff0dc, 2, 0, 1.2);
    windowLight.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, 0.8);
    const sun = new THREE.DirectionalLight(0xffc68a, 3.5);
    sun.position.set(-3.1, 5.3, -2.7);
    sun.target.position.set(0.9, 0.8, 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 22 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = 0.02;
    scene.add(hemi, windowLight, sun, sun.target);

    const [passes, lampModel, plantModel, laptopModel, homeTexture] = await loads;

    // ── Props: the Poly Haven lamp, plant and laptop ──
    const lamp = new THREE.Group();
    lamp.position.set(1.45, DESK.top, 0.22);
    lamp.rotation.y = 2.4;
    lamp.scale.setScalar(0.8);
    lamp.userData.kind = 'lamp';
    const lampLight = new THREE.PointLight(0xffb066, 0.4, 0, 2);
    lampLight.position.set(-0.005, 0.66, -0.18);   // just below the bulb, in model space
    const plant = new THREE.Group();
    plant.position.set(2.05, 0, 0.5);
    plant.rotation.y = 0.5;
    const laptop = new THREE.Group();
    laptop.position.set(LAPTOP.x, DESK.top, LAPTOP.z);
    laptop.scale.setScalar(LAPTOP.scale);
    laptop.userData.kind = 'laptop';
    for (const [anchor, gltf] of [[lamp, lampModel], [plant, plantModel], [laptop, laptopModel]]) {
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();   // its own copy for the hover tint
        o.castShadow = o.receiveShadow = true;
      });
      anchor.add(gltf.scene);
      scene.add(anchor);
    }
    lamp.add(lampLight);

    // The laptop's lid leans back, and its screen shows the hero on a canvas that glows a little.
    const lid = laptopModel.scene.getObjectByName('classic_laptop_screen');
    let screen = null;
    lid?.traverse((o) => { if (o.isMesh && o.material.name === 'classic_laptop_screen') screen = o; });
    if (!screen) throw new Error('the laptop model lost its screen');
    lid.rotation.x = -LAPTOP.tilt;
    const screenArt = drawScreen(heroTitle, heroSub);
    const screenMap = new THREE.CanvasTexture(screenArt.canvas);
    screenMap.colorSpace = THREE.SRGBColorSpace;
    screenMap.flipY = false;                       // glTF UVs start at the top
    screenMap.wrapS = THREE.RepeatWrapping;        // the screen's u runs from 1 to 2
    screenMap.anisotropy = anisotropy;
    screen.material = new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: screenMap, emissive: 0xffffff, roughness: 0.35 });
    screen.userData.kind = 'screen';
    laptop.traverse((o) => { if (o.isMesh && o !== screen && o.material.map) o.material.emissiveMap = o.material.map; });
    laptop.updateMatrixWorld(true);

    // ── The passes: a row along the front of the desk, each a little turned and overlapping the next ──
    const passLayouts = passes.map(layoutPass);
    const PASS_H = Math.max(...passLayouts.map((s) => s.y));
    passLayouts.forEach((s) => { s.y = PASS_H; });
    const TURN = [2.5, -1.8, 2.2, -2.6, 1.6], SHIFT = [0.004, -0.01, 0.008, -0.006, 0.01];
    const passMeshes = passes.map((pass, i) => {
      const layout = passLayouts[i];
      const map = new THREE.CanvasTexture(layout.draw('#fbf7ef'));
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      const material = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0x000000, roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PASS_W, PASS_H), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { kind: 'pass', id: pass.id, layout };
      // Each pass lies a little above the one on its left, so the overlaps never share a plane.
      const holder = new THREE.Group();
      holder.position.set(DESK.x + (i - (passes.length - 1) / 2) * PASS_STEP, DESK.top + 0.0012 + i * 0.0007, DX.z1 - 0.03 - PASS_H / 2 + SHIFT[i]);
      holder.rotation.y = THREE.MathUtils.degToRad(TURN[i]);
      holder.userData.base = holder.position.y;
      holder.add(mesh);
      scene.add(holder);
      return mesh;
    });
    const passById = new Map(passes.map((pass, i) => [pass.id, { pass, mesh: passMeshes[i] }]));

    // ── The CV printout beside the laptop, with a paper clip at its top edge ──
    const printMap = new THREE.CanvasTexture(layoutPrint().draw('#fdfcf8'));
    printMap.colorSpace = THREE.SRGBColorSpace;
    printMap.anisotropy = anisotropy;
    const print = new THREE.Mesh(new THREE.PlaneGeometry(PRINT.w, PRINT.h), new THREE.MeshStandardMaterial({ map: printMap, emissiveMap: printMap, emissive: 0x000000, roughness: 0.92 }));
    print.rotation.x = -Math.PI / 2;
    print.receiveShadow = true;
    print.userData.kind = 'print';
    const printHolder = new THREE.Group();
    printHolder.position.set(PRINT.x, DESK.top + 0.0012, PRINT.z);
    printHolder.rotation.y = PRINT.turn;
    const clip = new THREE.Mesh(clipGeometry(), new THREE.MeshStandardMaterial({ color: 0xb9bfc7, metalness: 0.3, roughness: 0.3 }));
    clip.position.set(-0.05, 0.0009, -PRINT.h / 2 - 0.008);
    printHolder.add(print, clip);
    scene.add(printHolder);

    // ── The paper: a sheet held in front of the camera on the left, so the window stays in view on the right ──
    const PAPER_D = 0.5;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
    paper.renderOrder = 10;
    paper.visible = false;
    paper.userData.kind = 'paper';
    camera.add(paper);
    const paperState = { id: null, notes: null, page: 0, zones: {}, x: 0, tween: null };

    // The paper's size in CSS px for the current stage, and the world size of one CSS px at the paper.
    function noteBox() {
      const w = stage.clientWidth, h = stage.clientHeight;
      return { W: Math.round(Math.min(NOTE_BOX.maxW, w * NOTE_BOX.share - NOTE_BOX.left)), H: Math.round(h - NOTE_BOX.top - NOTE_BOX.bottom), w, h, k: (2 * PAPER_D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h };
    }

    function drawPaper() {
      const { notes, page } = paperState;
      const { canvas: sheet, zones } = drawNotes(notes, page);
      const map = new THREE.CanvasTexture(sheet);
      map.colorSpace = THREE.SRGBColorSpace;
      paper.material.map?.dispose();
      paper.material.map = map;
      paper.material.needsUpdate = true;
      paperState.zones = zones;
    }

    function placePaper() {
      const { notes } = paperState;
      const { w, h, k } = noteBox(), S = NOTE.shadow;
      paper.scale.set((notes.W + 2 * S) * k, (notes.H + 2 * S) * k, 1);
      paperState.x = (-w / 2 + NOTE_BOX.left - S + notes.W / 2 + S) * k;
      paper.position.set(paperState.x, (h / 2 - NOTE_BOX.top - notes.H / 2) * k, -PAPER_D);
      paper.rotation.z = -0.008;
    }

    function layoutPaper(id, page = 0) {
      const box = noteBox();
      paperState.notes = layoutNotes(passById.get(id).pass, box.W, box.H);
      paperState.page = Math.min(page, paperState.notes.pages.length - 1);
      drawPaper();
      placePaper();
    }

    function showPaper(id) {
      if (paperState.id === id) return;
      if (paperState.tween) tweens.delete(paperState.tween);
      const k = noteBox().k;
      if (id) {
        layoutPaper(id);
        paper.visible = true;
        paperState.tween = tween(380, (t) => {
          const e = easeOut(t);
          paper.position.x = paperState.x - (1 - e) * 60 * k;
          paper.material.opacity = e;
        });
      } else if (paper.visible) {
        const from = paper.material.opacity;
        paperState.tween = tween(220, (t) => { paper.material.opacity = from * (1 - t); paper.position.x = paperState.x - t * 40 * k; }, () => { paper.visible = false; });
      }
      paperState.id = id;
    }

    // A page turn: the paper dims, the next page replaces it, and it comes back.
    function turnPage(step) {
      const { notes, page } = paperState;
      if (!notes || !paper.visible) return;
      const next = page + step;
      if (next < 0 || next >= notes.pages.length) return;
      paperState.page = next;
      if (paperState.tween) tweens.delete(paperState.tween);
      let swapped = false;
      paperState.tween = tween(260, (t) => {
        if (t >= 0.5 && !swapped) { swapped = true; drawPaper(); }
        paper.material.opacity = 1 - 0.75 * Math.sin(Math.PI * t);
        paper.position.x = paperState.x - step * Math.sin(Math.PI * t) * 12 * noteBox().k;
      });
    }

    function clickPaper(uv) {
      const { notes, zones } = paperState, S = NOTE.shadow;
      const x = uv.x * (notes.W + 2 * S) - S, y = (1 - uv.y) * (notes.H + 2 * S) - S;
      const inside = (z) => z && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
      if (inside(zones.prev)) turnPage(-1);
      else if (inside(zones.next)) turnPage(1);
      else if (inside(zones.link)) window.location.href = `experience.html#${passById.get(paperState.id).pass.link}`;
    }

    // ── Views: a pass cross-fades the window to its city; the last city stays until a reload ──
    let viewShown = HOME_VIEW, viewWanted = HOME_VIEW, viewTween = null;
    const atZ = (eye, p, z) => eye.clone().lerp(p, (z - eye.z) / (p.z - eye.z));

    // What the window shows, measured at the frame as the rest eye sees it: shift is how far a view point moves
    // over the rest orbit, and need is the part of the view that the eyes of every station see through the sash.
    function viewBounds() {
      const E = poses.rest.eye, centre = new THREE.Vector3(CX, (SASH_OPEN.y0 + SASH_OPEN.y1) / 2, FRAME_Z);
      const ref = atZ(E, centre, VIEW_Z);
      const need = { x0: Infinity, x1: -Infinity, y0: Infinity };
      let shift = 0;
      for (const pose of [poses.rest, poses.desk, poses.paper]) for (const yaw of [-1, 0, 1]) for (const pitch of [-1, 0, 1]) {
        const eye = orbitEye(pose.eye, pose.target, yaw * MAX_TILT, pitch * MAX_TILT, new THREE.Vector3());
        if (pose === poses.rest) {
          const seen = atZ(eye, ref, FRAME_Z);
          shift = Math.max(shift, Math.abs(seen.x - centre.x), Math.abs(seen.y - centre.y));
        }
        for (const x of [SASH_OPEN.x0, SASH_OPEN.x1]) for (const y of [SASH_OPEN.y0, SASH_OPEN.y1]) {
          const q = atZ(E, atZ(eye, new THREE.Vector3(x, y, FRAME_Z), VIEW_Z), FRAME_Z);
          need.x0 = Math.min(need.x0, q.x);
          need.x1 = Math.max(need.x1, q.x);
          need.y0 = Math.min(need.y0, q.y);
        }
      }
      return { shift, need };
    }

    // Places a view for the rest eye. Its landmark sits inside one pane, clear of the wood across the orbit, at the
    // largest scale up to MAX_IMG_H. The image also covers what the eyes see through the sash; above the image the
    // blurred top row shows as sky. When both cannot hold, the landmark wins, and covers says so.
    function placeView(mesh, file, texture) {
      const { u, v } = VIEWS[file];
      const aspect = texture.image.width / texture.image.height;
      const { shift, need } = viewBounds();
      const inset = shift + VIEW_MARGIN;
      let best = null;
      for (const pane of PANES) {
        const P = { x0: pane.x0 + inset, x1: pane.x1 - inset, y0: pane.y0 + inset, y1: pane.y1 - inset };
        const h = Math.min(MAX_IMG_H, u[1] > u[0] ? (P.x1 - P.x0) / ((u[1] - u[0]) * aspect) : Infinity, (P.y1 - P.y0) / (v[1] - v[0]));
        const least = Math.max((need.x1 - need.x0) / aspect, (need.x1 - P.x1) / ((1 - u[1]) * aspect), (P.x0 - need.x0) / (u[0] * aspect), (P.y0 - need.y0) / (1 - v[1]));
        const covers = least <= h;
        if (!best || covers > best.covers || (covers === best.covers && h > best.h)) best = { pane, P, h, covers };
      }
      const { pane, P, h, covers } = best, w = aspect * h;
      const lo = Math.max(P.x0 - u[0] * w, need.x1 - w), hi = Math.min(P.x1 - u[1] * w, need.x0);
      const x0 = lo <= hi ? (lo + hi) / 2 : (P.x0 - u[0] * w + P.x1 - u[1] * w) / 2;
      const y1 = Math.max(P.y0 + v[1] * h, Math.min(P.y1 + v[0] * h, need.y0 + h));
      // From the frame to the view plane, along rays from the rest eye.
      const E = poses.rest.eye, k = (E.z - VIEW_Z) / (E.z - FRAME_Z);
      const px0 = E.x + (x0 - E.x) * k, py1 = E.y + (y1 - E.y) * k, pw = w * k, ph = h * k;
      // The plane reaches VIEW_PAD past the image on every side, where the clamped edge texels show.
      mesh.material.map = texture;
      mesh.scale.set(pw + 2 * VIEW_PAD, ph + 2 * VIEW_PAD, 1);
      mesh.position.set(px0 + pw / 2, py1 - ph / 2, mesh.position.z);
      texture.repeat.set((pw + 2 * VIEW_PAD) / pw, (ph + 2 * VIEW_PAD) / ph);
      texture.offset.set(-VIEW_PAD / pw, -VIEW_PAD / ph);
      const landmark = [];
      for (const uu of new Set(u)) for (const vv of [v[0], (v[0] + v[1]) / 2, v[1]]) landmark.push(new THREE.Vector3(px0 + uu * pw, py1 - vv * ph, VIEW_Z));
      mesh.userData = { file, pane, landmark, heightAtFrame: +h.toFixed(3), covers };
    }

    async function showView(file) {
      viewWanted = file;
      if (file === viewShown) return;
      let texture;
      try { texture = await loadView(file); } catch (error) { console.warn(`Room: the view ${file} did not load.`, error); return; }
      if (viewWanted !== file || signal.aborted) return;
      if (viewTween) tweens.delete(viewTween);
      placeView(viewB, file, texture);
      viewB.material.opacity = 0;
      viewB.visible = true;
      viewTween = tween(FADE_MS, (k) => { viewB.material.opacity = k; }, () => {
        placeView(viewA, file, texture);
        viewB.visible = false;
        viewShown = file;
        viewTween = null;
      });
    }

    // ── Light: html[data-theme="dark"] is night ──
    let glow = 0, screenGlow = 0;
    function applyLighting() {
      const night = root.getAttribute('data-theme') === 'dark';
      sun.intensity = night ? 0 : 3.5;
      lampLight.intensity = night ? 1.8 : 0.4;
      hemi.intensity = night ? 0.22 : 1.1;
      windowLight.intensity = night ? 0.9 : 2;
      windowLight.color.set(night ? 0x8ea6ff : 0xfff0dc);
      for (const view of [viewA, viewB]) view.material.color.set(night ? 0x5a6a9a : 0xffffff);
      // The passes and the printout glow a little, so they stay readable in the dim room at night. The laptop
      // screen glows more at night.
      glow = night ? 0.25 : 0.12;
      screenGlow = night ? 0.9 : 0.45;
      for (const object of [...passMeshes, print, laptop]) tint(object, object === hovered);
      paper.material.color.set(night ? 0xe4e7ee : 0xffffff);
      renderer.shadowMap.needsUpdate = true;
      invalidate();
    }

    // ── Camera: the stations, a 900 ms move between them, and the mouse orbit on top ──
    const poses = {};
    const cam = { eye: new THREE.Vector3(), target: new THREE.Vector3() };   // the pose before the orbit
    const look = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 };
    const spherical = new THREE.Spherical();
    const probeCamera = new THREE.PerspectiveCamera();

    // Fits a box on the wall into the view from the direction dir; fill is the share of the view it takes.
    function fit(box, dir = new THREE.Vector3(0, 0, 1), fill = 0.96) {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max((box.y1 - box.y0) / 2 / t, (box.x1 - box.x0) / 2 / (t * camera.aspect)) / fill;
      const target = new THREE.Vector3((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, box.z ?? 0.02);
      return { eye: dir.clone().normalize().multiplyScalar(d).add(target), target };
    }

    // Where a point shows in a pose, in normalised device coordinates.
    function ndcIn(pose, p) {
      probeCamera.fov = camera.fov;
      probeCamera.aspect = camera.aspect;
      probeCamera.updateProjectionMatrix();
      probeCamera.position.copy(pose.eye);
      probeCamera.lookAt(pose.target);
      probeCamera.updateMatrixWorld();
      return p.clone().project(probeCamera);
    }

    // The desk station: up and back from the desk's front edge, the front edge low in the view, and the passes
    // inside the width.
    function deskPose() {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const span = new THREE.Box3();
      for (const mesh of passMeshes) span.expandByObject(mesh);
      let pose;
      for (let scale = 1, i = 0; i < 16; i++, scale *= 1.05) {
        const eye = new THREE.Vector3(DESK.x, DESK.top + DESK_EYE.up * scale, DX.z1 + DESK_EYE.back * scale);
        const pitch = Math.atan2(eye.y - DESK.top, eye.z - DX.z1) - Math.atan(0.9 * t);
        pose = { eye, target: eye.clone().add(new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch)).multiplyScalar(eye.z / Math.cos(pitch))) };
        const wide = [span.min.x, span.max.x].some((x) => Math.abs(ndcIn(pose, new THREE.Vector3(x, DESK.top, span.max.z)).x) > 0.95);
        if (!wide) break;
      }
      return pose;
    }

    // The paper station: the eye on the line from the window's centre through the rest eye, so a landmark shows where
    // it shows at rest, far enough for the window to fit the right part of the view; the view turns until it does.
    function paperPose() {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const centre = new THREE.Vector3(CX, (WIN.y0 - 0.12 + WIN.y1 + CASING) / 2, 0);
      const w = WIN.x1 - WIN.x0 + 2 * (CASING + 0.05), h = WIN.y1 - WIN.y0 + CASING + 0.12;
      const d = Math.max(w / (0.8 * t * camera.aspect), h / (1.55 * t));
      const eye = poses.rest.eye.clone().sub(centre).normalize().multiplyScalar(d).add(centre);
      const pose = { eye, target: centre.clone() };
      for (let i = 0; i < 6; i++) {
        const p = ndcIn(pose, centre);
        pose.target.x -= (1 - 0.8 / 2 - 0.04 - p.x) * d * t * camera.aspect;
        pose.target.y -= (0.04 - p.y) * d * t;
      }
      return pose;
    }

    // The laptop station: in front of the screen and high enough that the top of the view ends on the sash's bottom
    // rail, so the city never shows from this close. The screen fills about half the view.
    function laptopPose() {
      const half = THREE.MathUtils.degToRad(camera.fov / 2), t = Math.tan(half);
      const centre = new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3());
      const s = LAPTOP.scale;
      const d = Math.max((0.367 * s) / (0.95 * t), (0.449 * s) / (1.3 * t * camera.aspect));
      let eye;
      for (let e = LAPTOP.tilt; e < 1.2; e += 0.02) {
        eye = new THREE.Vector3(0, Math.sin(e), Math.cos(e)).multiplyScalar(d).add(centre);
        if (eye.y - (eye.z - FRAME_Z) * Math.tan(e - half) <= WIN.y0 + F) break;
      }
      return { eye, target: centre };
    }

    function computePoses() {
      scene.updateMatrixWorld();
      // Rest: the desk, the window and the plant on the right two thirds; the intro line takes the left.
      const right = 2.25, left = DX.x0 - 0.1;
      poses.rest = fit({ x0: right - (right - left) / 0.64, x1: right, y0: 0.32, y1: 2.5, z: 0 }, new THREE.Vector3(0.7, 0.25, 3.1), 1);
      poses.desk = deskPose();
      poses.paper = paperPose();
      poses.laptop = laptopPose();
    }

    function poseFor(state) {
      return state.pass ? poses.paper : poses[state.station];
    }

    // The mouse orbits the eye about the target by up to 3 degrees, so the view behind the window shifts.
    function orbitEye(eye, target, yaw, pitch, out) {
      spherical.setFromVector3(out.copy(eye).sub(target));
      spherical.phi -= pitch;
      spherical.theta += yaw;
      return out.setFromSpherical(spherical).add(target);
    }

    function placeCamera(eye, target, yaw, pitch) {
      orbitEye(eye, target, yaw, pitch, camera.position);
      camera.lookAt(target);
      camera.updateMatrixWorld();
    }

    let camTween = null;
    function moveTo(pose) {
      if (camTween) tweens.delete(camTween);
      const eye0 = cam.eye.clone(), target0 = cam.target.clone();
      camTween = tween(MOVE_MS, (k) => {
        const e = easeInOut(k);
        cam.eye.lerpVectors(eye0, pose.eye, e);
        cam.target.lerpVectors(target0, pose.target, e);
      }, () => { camTween = null; });
    }

    // A chosen pass lifts a little off the desk and tilts towards the eye.
    const lifts = new Map();
    function lift(id, up) {
      if (!id) return;
      const mesh = passById.get(id).mesh, holder = mesh.parent;
      tweens.delete(lifts.get(id));
      const y0 = holder.position.y, r0 = mesh.rotation.x;
      lifts.set(id, tween(300, (k) => {
        const e = easeOut(k);
        holder.position.y = y0 + ((up ? holder.userData.base + PASS_LIFT : holder.userData.base) - y0) * e;
        mesh.rotation.x = r0 + ((up ? -Math.PI / 2 + 0.14 : -Math.PI / 2) - r0) * e;
      }));
    }

    // ── Render on demand ──
    const tweens = new Set();
    function tween(ms, step, done) {
      const t = { from: performance.now(), ms, step, done };
      tweens.add(t);
      invalidate();
      return t;
    }

    let queued = false, inView = true, last = 0, pointerDirty = false;
    function invalidate() {
      if (queued || signal.aborted) return;
      queued = true;
      requestAnimationFrame(frame);
    }

    function frame(now) {
      queued = false;
      if (!inView) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      for (const t of tweens) {
        const k = Math.min(1, Math.max(0, (now - t.from) / t.ms));
        t.step(k);
        if (k >= 1) { tweens.delete(t); t.done?.(); }
      }
      const damp = 1 - Math.exp(-dt * 6);
      look.yaw += (look.toYaw - look.yaw) * damp;
      look.pitch += (look.toPitch - look.pitch) * damp;
      const turning = Math.abs(look.toYaw - look.yaw) > 1e-4 || Math.abs(look.toPitch - look.pitch) > 1e-4;
      placeCamera(cam.eye, cam.target, look.yaw, look.pitch);
      if (pointerDirty || turning || tweens.size) { pointerDirty = false; setHovered(pick()); }
      renderer.render(scene, camera);
      if (tweens.size || turning) invalidate();
      else last = 0;
    }

    // ── Hover and click ──
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerIn = false, hovered = null;
    const targets = [paper, ...passMeshes, print, laptop, lamp, ...deskParts];

    function pick() {
      if (!pointerIn) return null;
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        let o = hit.object;
        while (o && !o.userData.kind) o = o.parent;
        if (!o || (o === paper && !paperState.id)) continue;
        return { kind: o.userData.kind, object: o.userData.kind === 'screen' ? laptop : o, id: o.userData.id, uv: hit.uv };
      }
      return null;
    }

    function tint(object, on) {
      if (object === lamp) {
        lamp.traverse((o) => { if (o.isMesh) o.material.emissive.setHex(on ? 0x3a2410 : 0x000000); });
      } else if (object === laptop) {
        laptop.traverse((o) => { if (o.isMesh && o !== screen) o.material.emissive.setScalar(on ? 0.12 : 0); });
        screen.material.emissiveIntensity = screenGlow + (on ? 0.12 : 0);
      } else {
        object.material.emissive.setScalar(glow + (on ? 0.12 : 0));
      }
    }

    // A light tint marks what a click would act on; with the paper open, a click only closes it.
    function setHovered(hit) {
      const next = !paper.visible && hit && ['pass', 'lamp', 'laptop', 'screen', 'print'].includes(hit.kind) ? hit.object : null;
      if (next === hovered) return;
      if (hovered) tint(hovered, false);
      if (next) tint(next, true);
      hovered = next;
    }

    function setPointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      pointerIn = true;
    }

    section.addEventListener('pointermove', (event) => {
      setPointer(event);
      look.toYaw = pointer.x * MAX_TILT;
      look.toPitch = pointer.y * MAX_TILT;
      pointerDirty = true;
      invalidate();
    }, { signal });
    section.addEventListener('pointerleave', () => {
      pointerIn = false;
      look.toYaw = look.toPitch = 0;
      pointerDirty = true;
      invalidate();
    }, { signal });

    // Two clicks, always: from rest a click on the desk or a pass goes to the desk, and only there does a pass open.
    canvas.addEventListener('click', (event) => {
      setPointer(event);
      const hit = pick();
      if (state.pass) {
        if (hit?.kind === 'paper' && hit.uv) clickPaper(hit.uv);
        else go('desk');
        return;
      }
      if (!hit) return;
      const at = state.station;
      if (hit.kind === 'lamp') document.querySelector('[data-action="toggle-theme"]')?.click();
      else if (hit.kind === 'screen' && at === 'laptop') aiTrigger.click();
      else if ((hit.kind === 'laptop' || hit.kind === 'screen') && at !== 'laptop') go('laptop');
      else if (hit.kind === 'pass' && at === 'desk') go(`desk/${hit.id}`);
      else if (hit.kind === 'print' && at === 'desk') cvLink.click();
      else if (['pass', 'print', 'desk'].includes(hit.kind) && at !== 'desk') go('desk');
    }, { signal });

    // ── Stations and URLs: rest has no hash, the desk is #desk, a chosen pass is #desk/<id>, the laptop is #laptop ──
    const state = { station: 'rest', pass: null };
    function readHash() {
      const m = window.location.hash.match(/^#(desk|laptop)(?:\/([a-z]+))?$/);
      if (!m) return { station: 'rest', pass: null };
      return { station: m[1], pass: m[1] === 'desk' && passById.has(m[2]) ? m[2] : null };
    }

    // Entering a station from rest adds one history entry; every later move replaces it, so Back returns to rest.
    function go(hash) {
      if (state.station === 'rest') { window.location.hash = hash; return; }
      window.history.replaceState(null, '', `#${hash}`);
      apply();
    }

    // One level back, for Esc and the Back button: a paper closes to the desk, and a station returns to rest.
    function back() {
      if (state.pass) go('desk');
      else if (state.station !== 'rest') window.history.back();
    }

    function apply() {
      const next = readHash();
      if (next.station === state.station && next.pass === state.pass) return;
      const was = state.pass;
      Object.assign(state, next);
      section.classList.toggle('is-away', state.station !== 'rest');
      backButton.hidden = state.station === 'rest';
      if (was !== state.pass) { lift(was, false); lift(state.pass, true); }
      showPaper(state.pass);
      if (state.pass) {
        const { pass } = passById.get(state.pass);
        showView(pass.view);
        announce(pass);
      }
      moveTo(poseFor(state));
    }

    window.addEventListener('hashchange', apply, { signal });
    backButton.addEventListener('click', back, { signal });
    document.addEventListener('keydown', (event) => {
      if (state.station === 'rest' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { back(); return; }
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step && paper.visible && !event.target.closest?.('input, textarea, select, [contenteditable]')) {
        event.preventDefault();
        turnPage(step);
      }
    }, { signal });

    // ── The hidden HTML copy: one button per pass, the laptop and the CV, and the chosen paper in a live region ──
    // After a pass is chosen, a link to its full role follows the pass buttons, like the link on the paper.
    const fullRole = document.createElement('a');
    fullRole.className = 'ed-room__pass';
    fullRole.textContent = LINK_TEXT;
    fullRole.hidden = true;
    const control = (text, onClick) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ed-room__pass';
      button.textContent = text;
      button.addEventListener('click', onClick, { signal });
      item.appendChild(button);
      return item;
    };
    const linkItem = document.createElement('li');
    linkItem.appendChild(fullRole);
    list.replaceChildren(
      ...passes.map((pass) => control(pass.name, () => go(`desk/${pass.id}`))),
      linkItem,
      control('Evaluate role fit', () => aiTrigger.click()),
      control('View CV', () => cvLink.click()),
    );

    function announce(pass) {
      const blocks = [];
      for (const leg of pass.legs) {
        blocks.push(`${[leg.company, roleLine(leg), ...leg.dates].filter(Boolean).join(', ')}.`);
        if (leg.summary) blocks.push(leg.summary);
        for (const item of leg.items) blocks.push([item.head, item.text, item.bullet].filter(Boolean).join(': '));
      }
      live.replaceChildren(...blocks.map((text) => Object.assign(document.createElement('p'), { textContent: text })));
      fullRole.href = `experience.html#${pass.link}`;
      fullRole.hidden = false;
    }

    // ── Observers ──
    const resize = new ResizeObserver(() => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      computePoses();
      placeView(viewA, viewShown, viewA.material.map);
      if (viewB.visible) placeView(viewB, viewB.userData.file, viewB.material.map);
      if (paperState.id) layoutPaper(paperState.id, paperState.page);
      if (camTween) tweens.delete(camTween);
      camTween = null;
      const pose = poseFor(state);
      cam.eye.copy(pose.eye);
      cam.target.copy(pose.target);
      invalidate();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) { last = 0; invalidate(); }
    });
    const theme = new MutationObserver(applyLighting);
    signal.addEventListener('abort', () => { resize.disconnect(); visibility.disconnect(); theme.disconnect(); });

    // ── First frame ──
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    computePoses();
    placeView(viewA, HOME_VIEW, homeTexture);
    applyLighting();
    cam.eye.copy(poses.rest.eye);
    cam.target.copy(poses.rest.target);
    // A load with #desk, #desk/<id> or #laptop opens that state above a rest entry, so Esc and Back return to rest.
    const opened = readHash();
    if (opened.station !== 'rest') {
      const hash = window.location.hash;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      window.history.pushState(null, '', hash);
      apply();
      if (camTween) { tweens.delete(camTween); camTween = null; }
      const pose = poseFor(state);
      cam.eye.copy(pose.eye);
      cam.target.copy(pose.target);
    }
    placeCamera(cam.eye, cam.target, 0, 0);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    section.classList.add('is-ready');
    resize.observe(stage);
    visibility.observe(section);
    theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    // ── Test hooks for the headless checks ──
    const ndc = new THREE.Vector3();
    const probe = new THREE.Raycaster();
    const isShown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    // The landmark counts as visible when its top, middle and base are on screen and a ray from the eye to
    // each reaches the view first, past the frame, the mullions and the walls. margin is the smallest
    // distance from a landmark point to its pane's edge, measured at the frame.
    function landmarkVisible() {
      const { landmark, pane } = viewA.userData;
      let margin = Infinity;
      const visible = landmark.every((p) => {
        ndc.copy(p).project(camera);
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return false;
        const dir = p.clone().sub(camera.position).normalize();
        probe.set(camera.position, dir);
        const hit = probe.intersectObjects(scene.children, true).find((h) => h.object !== paper && (isShown(h.object) || h.object === viewB));
        const atFrame = camera.position.clone().addScaledVector(dir, (FRAME_Z - camera.position.z) / dir.z);
        margin = Math.min(margin, atFrame.x - pane.x0, pane.x1 - atFrame.x, atFrame.y - pane.y0, pane.y1 - atFrame.y);
        return hit && (hit.object === viewA || hit.object === viewB);
      });
      return { visible, margin: +margin.toFixed(3) };
    }

    // Checks a view at a station over the corners of the orbit, then puts the shown view back.
    async function landmarkSweep(file = viewShown, station = 'rest') {
      const texture = await loadView(file);
      placeView(viewA, file, texture);
      const { pane, heightAtFrame, covers } = viewA.userData;
      const out = { file, station, pane: PANES.indexOf(pane) ? 'right' : 'left', heightAtFrame, covers, corners: {} };
      const pose = poses[station];
      for (const yaw of [-3, 0, 3]) for (const pitch of [-3, 0, 3]) {
        placeCamera(pose.eye, pose.target, THREE.MathUtils.degToRad(yaw), THREE.MathUtils.degToRad(pitch));
        out.corners[`${yaw},${pitch}`] = landmarkVisible();
      }
      placeView(viewA, viewShown, await loadView(viewShown));
      placeCamera(cam.eye, cam.target, look.yaw, look.pitch);
      invalidate();
      return out;
    }

    // The projected size of the em box of a text line, in CSS px: from the baseline up by the font size, in the
    // plane's own units (w x h, centred on its origin).
    function projectedEm(mesh, w, h, x, base, size) {
      const a = new THREE.Vector3(x - w / 2, h / 2 - base, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      const b = new THREE.Vector3(x - w / 2, h / 2 - base + size, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      return Math.hypot((a.x - b.x) * canvas.clientWidth, (a.y - b.y) * canvas.clientHeight) / 2;
    }
    const capRatio = (family) => { measure.font = `100px ${family}`; return +(measure.measureText('H').actualBoundingBoxAscent / 100).toFixed(3); };
    // Each pass's marked lines, the smallest text on the paper's page, and the title on the laptop screen.
    function textPx() {
      const result = { capRatio: { sans: capRatio(SANS), hand: capRatio(HAND) }, passes: {} };
      for (const [id, { mesh }] of passById) {
        const out = result.passes[id] = {};
        for (const m of mesh.userData.layout.marks) out[m.mark] = Math.min(out[m.mark] ?? Infinity, +projectedEm(mesh, PASS_W, PASS_H, m.x + 0.03, m.base, m.size).toFixed(2));
      }
      if (paper.visible && paperState.notes) {
        const { W, H, pages } = paperState.notes, S = NOTE.shadow;
        let least = Infinity;
        pages[paperState.page].forEach((line, row) => {
          if (line) least = Math.min(least, projectedEm(paper, 1, 1, (S + line.x) / (W + 2 * S), (S + noteBase(row)) / (H + 2 * S), line.size / (H + 2 * S)));
        });
        result.paper = { smallest: +least.toFixed(2), page: paperState.page + 1, pages: pages.length };
      }
      const top = new THREE.Vector3(0, 0.425, 0.0064).applyMatrix4(screen.matrixWorld).project(camera);
      const bottom = new THREE.Vector3(0, 0.058, 0.0064).applyMatrix4(screen.matrixWorld).project(camera);
      result.screenTitle = +((Math.hypot((top.x - bottom.x) * canvas.clientWidth, (top.y - bottom.y) * canvas.clientHeight) / 2) * screenArt.title).toFixed(2);
      return result;
    }

    function screenPoint(p) {
      const v = p.clone().project(camera), rect = canvas.getBoundingClientRect();
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    }
    // A point on the paper, from CSS px on the paper.
    const paperPoint = (x, y) => {
      const { W, H } = paperState.notes, S = NOTE.shadow;
      return screenPoint(new THREE.Vector3((S + x) / (W + 2 * S) - 0.5, 0.5 - (S + y) / (H + 2 * S), 0).applyMatrix4(paper.matrixWorld));
    };
    const zonePoint = (name) => { const z = paperState.zones[name]; return z ? paperPoint((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2) : null; };

    window.__room = {
      state: () => ({ ...state, settled: tweens.size === 0, view: viewShown, page: paperState.page, hover: hovered?.userData.kind ?? null }),
      landmarkVisible,
      landmarkSweep,
      textPx,
      passPoint: (id) => screenPoint(passById.get(id).mesh.localToWorld(new THREE.Vector3(-PASS_W / 4, PASS_H / 4, 0))),
      screenPoint: () => screenPoint(new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3())),
      printPoint: () => screenPoint(print.getWorldPosition(new THREE.Vector3())),
      deskPoint: () => screenPoint(new THREE.Vector3(DX.x1 - 0.12, DESK.top, DX.z0 + 0.12)),
      lampPoint: () => screenPoint(lampLight.getWorldPosition(new THREE.Vector3())),
      linkPoint: () => zonePoint('link'),
      paperRect: () => {
        if (!paper.visible) return null;
        const [a, b] = [[-0.5, 0.5], [0.5, -0.5]].map(([x, y]) => screenPoint(new THREE.Vector3(x, y, 0).applyMatrix4(paper.matrixWorld)));
        return { left: a.x, top: a.y, right: b.x, bottom: b.y };
      },
      landmarkScreen: () => viewA.userData.landmark.map((p) => screenPoint(p)),
      arrowPoint: (side) => zonePoint(side),
      info: () => ({ ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs.length }),
    };
  }
}

// The view plane reaches past its image, where the clamped edge texels repeat. A blurred outer row and column
// make that area a smooth band of sky or ground instead of streaks, such as a TV tower's tip repeated upwards.
function softEdges(image) {
  const c = document.createElement('canvas');
  const w = c.width = image.width, h = c.height = image.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0);
  for (const [x, y, n, horizontal] of [[0, 0, w, true], [0, h - 1, w, true], [0, 0, h, false], [w - 1, 0, h, false]]) {
    const pixels = g.getImageData(x, y, horizontal ? n : 1, horizontal ? 1 : n);
    const d = pixels.data, src = Float32Array.from(d), R = 48;
    for (let i = 0; i < n; i++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) { sum += src[j * 4 + ch]; count++; }
        d[i * 4 + ch] = sum / count;
      }
    }
    g.putImageData(pixels, x, y);
  }
  return c;
}

// The views load once each; a failed load tries again on the next request.
const viewTextures = new Map();
function loadView(file) {
  if (!viewTextures.has(file)) {
    viewTextures.set(file, new THREE.ImageLoader().loadAsync(new URL(`views/${file}`, import.meta.url).href).then((image) => {
      const texture = new THREE.CanvasTexture(softEdges(image));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }, (error) => { viewTextures.delete(file); throw new Error(`views/${file} did not load`, { cause: error }); }));
  }
  return viewTextures.get(file);
}
