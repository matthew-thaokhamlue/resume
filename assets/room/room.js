/*
 * room.js — the 3D room on the home page: a wide room with a wooden window above a long desk. On the desk lie five
 * boarding passes, a laptop, a CV printout, a letter tray with postcards and a telephone. An awards shelf hangs on
 * the right wall and framed posters on the left wall. A chosen item shows its text on a lined paper held in front of
 * the camera. room-boot.js imports this module behind ?room=1 and calls start(section). start() resolves after the
 * first frame. Until then any failure removes every listener and rejects, and room-boot.js hides the room. All text
 * comes from the site's own pages: experience.html, certificates.html and portfolio.html, read the same way as
 * assets/js/ai-match.js, and the home page itself. Where the home page has a link or a button, the room clicks it.
 */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';

const NAME = 'Matthew Thaokhamlue';
const LINK_TEXT = 'The full role on the Experience page';
// The passes, left to right on the desk: their role sections in experience.html, the print and the view.
const PASSES = [
  { id: 'sema', roles: ['role-sema'], code: 'SFO', city: 'San Francisco', view: 'sanfrancisco-sema-day.webp' },
  { id: 'lab', roles: ['role-labtwin', 'role-labforward'], code: 'BER', city: 'Berlin', view: 'berlin-lab-day.webp' },
  { id: 'thryve', roles: ['role-thryve'], code: 'BER', city: 'Berlin', view: 'berlin-thryve-day.webp' },
  { id: 'ey', roles: ['role-ey'], code: 'BKK', city: 'Bangkok', view: 'bangkok-ey-day.webp' },
  { id: 'education', roles: ['role-education'], code: 'CNX → BER', city: 'Chiang Mai → Berlin', view: 'chiangmai-education-day.webp' },
];
// A pass prints a short company name: the legal suffix goes, and two passes have a short form.
const SHORT = { ey: 'EY', education: 'Education' };
// The credentials on the shelf, by their reveal ids in certificates.html: five framed certificates beside the DAAD
// scholarship (read from experience.html), and nine medals on three hooks, one hook per issuer.
const CERTIFICATES = ['credential-1', 'credential-2', 'credential-5', 'credential-10', 'credential-14'];
const MEDALS = [
  { color: '#2f8a7e', ids: ['credential-3', 'credential-4', 'credential-13'] },                    // Google
  { color: '#2f69b3', ids: ['credential-6', 'credential-7', 'credential-8', 'credential-9'] },      // Microsoft Azure
  { color: '#cf7f26', ids: ['credential-11', 'credential-12'] },                                   // AWS
];
// The posters on the left wall, by their reveal ids in portfolio.html (project-<id>), in reading order as seen from
// the room. A shot is a screenshot that the room sets on a sunset poster.
const POSTERS = [
  { id: 'labforward', image: 'poster-labforward.webp' },
  { id: 'labtwin', image: 'poster-labtwin.webp' },
  { id: 'thryve', image: 'poster-thryve.webp' },
  { id: 'opppaths', image: 'shot-opppaths.webp', shot: true },
  { id: 'remarcable', image: 'shot-remarcable.webp', shot: true },
  { id: 'dataverse', image: 'poster-dataverse.webp' },
  { id: 'training', image: 'poster-training.webp' },
];
// Each window view with its landmark as fractions of the image: u from the left, v from the top (top to base).
// A bridge spans its two towers in u. The night image is an edit of the day image with the same composition.
const HOME_VIEW = 'berlin-home-day.webp';
const VIEWS = {
  'berlin-home-day.webp': { u: [0.706, 0.706], v: [0.105, 0.27], night: 'berlin-home-night.webp' },          // the TV tower
  'sanfrancisco-sema-day.webp': { u: [0.42, 0.59], v: [0.11, 0.32], night: 'sanfrancisco-sema-night.webp' }, // the Golden Gate Bridge
  'berlin-lab-day.webp': { u: [0.51, 0.51], v: [0, 0.4], night: 'berlin-lab-night.webp' },                   // the TV tower
  'berlin-thryve-day.webp': { u: [0.44, 0.56], v: [0.15, 0.44], night: 'berlin-thryve-night.webp' },         // the Oberbaum Bridge
  'bangkok-ey-day.webp': { u: [0.5, 0.5], v: [0.04, 0.46], night: 'bangkok-ey-night.webp' },                 // Wat Arun
  'chiangmai-education-day.webp': { u: [0.51, 0.51], v: [0.1, 0.18], night: 'chiangmai-education-night.webp' }, // the Doi Suthep chedi
};

// Units are metres. The back wall's room-side face is z = 0, and x runs to the right.
const WALL_H = 2.8, WALL_T = 0.2;
const ROOM = { x0: -1.45, x1: 2.55, z1: 4.6 };
const WIN = { x0: -0.2, x1: 1.3, y0: 1.0, y1: 2.3 };   // the opening in the back wall
const LINING = 0.025, CASING = 0.075, SILL_OUT = 0.16, FRAME_Z = -0.12, F = 0.06, MUL = 0.042;
// The sill top sits above the opening's bottom face, so the two never share a plane.
const SILL_UP = 0.006;
const DESK = { x: 0.55, z: 0.47, w: 2.1, d: 0.9, top: 0.78 };
// The passes lie in a row along the front of the desk with small gaps: a stub, a perforation and a body.
const PASS = { w: 0.264, stub: 0.06, gap: 0.026, band: 0.012, r: 0.01, pad: 0.012, code: 0.05, company: 0.032, lift: 0.03 };
const LAPTOP = { x: 0.55, z: 0.37, scale: 0.55, tilt: 0.2 };   // tilt: the lid leans back by this angle in radians
const PRINT = { x: 0.04, z: 0.35, w: 0.21, h: 0.297, turn: 0.16 };
const TRAY = { x: -0.31, z: 0.4, w: 0.27, d: 0.2, turn: -0.1 };
const CARD = { w: 0.17, h: 0.115 };
const PHONE = { x: 1.2, z: 0.52, turn: -0.45 };
// The awards shelf on the right wall and the poster wall on the left wall, as ranges along the wall (z).
const SHELF = { z0: 0.66, z1: 2.46, low: 1.0, high: 1.42, depth: 0.25, hooks: 2.13 };
const CERT = { w: 0.28, h: 0.198, frame: 0.012 };
const POSTER = { w: 0.4, h: 0.56, frame: 0.014, rows: [1.98, 1.13], step: 0.55, z: 1.2 };
// Text sizes in metres. Textures carry TEX_PPM px per metre.
const TEX_PPM = 1750;
const SANS = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
const INK = '#1d1b18', INK_SOFT = '#45413b', CLAY = '#c45a38';
// The window view: an image plane behind the window, so the eye's orbit gives parallax. MAX_VIEW_H is the largest
// image height on that plane; VIEW_MARGIN keeps a landmark off the wood.
const VIEW_Z = -5, MAX_VIEW_H = 3.73, VIEW_PAD = 4, VIEW_MARGIN = 0.012;
// The mouse orbit turns the eye by up to MAX_TILT, and a pose farther than ORBIT_D from its target turns less, so the
// eye never travels farther than at ORBIT_D. The far rest overview then keeps the window's parallax small.
const MAX_TILT = THREE.MathUtils.degToRad(3), ORBIT_D = 3.1;
const MOVE_MS = 900, FADE_MS = 400, NIGHT_FADE_MS = 600, FLIP_MS = 450;
// The desk station: the eye sits up and back from the desk's front edge, for a stage REF_H px tall. A shorter stage
// brings it closer, so the pass text keeps its size on screen; a narrow stage moves it further back.
const DESK_EYE = { up: 0.94, back: 0.86, refH: 820 };
// Rest: the whole room from beyond its open front, so both side walls show.
const REST = { eye: [0.55, 1.62, 5.3], target: [0.55, 1.28, 0] };

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
const slug = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const noArrow = (text) => text.replace(/\s*→$/, '');

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function fetchPage(name) {
  const response = await fetch(new URL(name, document.baseURI));
  if (!response.ok) throw new Error(`${name} returned ${response.status}`);
  return new DOMParser().parseFromString(await response.text(), 'text/html');
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
    const sentences = stages[0].text.split(/(?<=\.)\s+/).map((s) => s.replace(/\.$/, ''));
    return {
      company: stages.map((s) => s.head).join(' & '), role: stages[0].text.split(/\.\s/)[0], dates: [], summary: '', items: stages, link: id,
      degrees: sentences.filter((s) => /^(Master|Bachelor)/.test(s)), daad: sentences.find((s) => s.includes('DAAD')),
    };
  }
  const company = clean(section.querySelector('[data-role-company]'));
  const role = clean(section.querySelector('[data-role-title]'));
  if (!company || !role) throw new Error(`#${id} lost its company or role`);
  // The meta reads "dates · place"; the paper and the tooltip print the dates only.
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

function readPasses(doc) {
  return PASSES.map((pass) => {
    const legs = pass.roles.map((id) => readRole(doc, id));
    const name = legs.map((leg) => [leg.company, roleLine(leg), leg.dates.join(' · ')].filter(Boolean).join(', ')).join('; ');
    const short = SHORT[pass.id] ?? legs.map((leg) => leg.company.replace(/\s+(Technologies Inc\.|GmbH)$/, '')).join(' → ');
    return { ...pass, legs, name, short, link: legs[legs.length - 1].link };
  });
}

// A pass's tooltip: each leg's company with its role and dates, or, for education, the two degrees.
function passTip(pass) {
  const rows = [];
  for (const leg of pass.legs) {
    rows.push(['b', leg.company]);
    if (leg.degrees) for (const d of leg.degrees) rows.push(['span', d]);
    else {
      const role = roleLine(leg);
      if (role) rows.push(['span', role]);
      for (const part of leg.dates) rows.push(['span', part]);
    }
  }
  return rows;
}

// A pass's paper: each leg's company, role and dates, the summary, every bullet and the Sema subheads.
function passDoc(pass) {
  const blocks = [];
  pass.legs.forEach((leg, i) => {
    if (i) blocks.push({ gap: 2 });
    blocks.push({ title: leg.company });
    const role = roleLine(leg);
    if (leg.dates.length && role) blocks.push({ line: role });
    for (const part of leg.dates) blocks.push({ line: part });
    if (leg.summary) blocks.push({ gap: 1 }, { text: leg.summary });
    for (const item of leg.items) {
      if (item.head) blocks.push({ head: item.head });
      if (item.text) blocks.push({ text: item.text });
      if (item.bullet) blocks.push({ bullet: item.bullet });
    }
  });
  return { blocks, links: [{ text: LINK_TEXT, href: `experience.html#${pass.link}` }] };
}

// ── Reveals from the site's pages: the kicker, title and meta, the body as paper blocks, and the links ──

function readReveal(dialog, { side = false } = {}) {
  const body = dialog?.querySelector('.ed-reveal__body');
  if (!body) throw new Error(`#${dialog?.id || 'a reveal'} lost its body`);
  const blocks = [];
  for (const el of body.querySelectorAll('p, li, h3, h4')) {
    const link = el.querySelector('a');
    if (link && clean(el) === clean(link)) continue;   // a paragraph that only holds a link
    blocks.push(el.matches('h3, h4') ? { head: clean(el) } : el.matches('li') ? { bullet: clean(el) } : { text: clean(el) });
  }
  const aside = side && dialog.querySelector('.ed-reveal__side');
  if (aside) {
    blocks.push({ head: clean(aside.querySelector('h3')) });
    for (const li of aside.querySelectorAll('li')) blocks.push({ bullet: clean(li) });
  }
  const links = [...body.querySelectorAll('a.ed-reveal__link')].map((a) => ({
    text: noArrow(clean(a)), href: a.getAttribute('href'), external: a.getAttribute('target') === '_blank',
    ga: a.dataset.gaEvent ? { event: a.dataset.gaEvent, params: JSON.parse(a.dataset.gaParams || '{}') } : null,
  }));
  const title = clean(dialog.querySelector('.ed-reveal__title'));
  if (!title) throw new Error(`#${dialog.id} lost its title`);
  return { kicker: clean(dialog.querySelector('.ed-reveal__kicker')), title, meta: clean(dialog.querySelector('.ed-reveal__meta')), blocks, links };
}

const revealDoc = (r, lines, links = r.links) => ({
  blocks: [{ title: r.title }, ...lines.filter(Boolean).map((line) => ({ line })), { gap: 1 }, ...r.blocks], links,
});

// The words a medal leaves out: its issuer, and what every certificate is.
const medalLabel = (title) => title.replace(/\b(Google|Microsoft|Azure|AWS|Certificate|Professional|Associate)\b/g, '').replace(/\s+/g, ' ').trim();

// ── Text on canvas: a face of w x h metres, drawn at ppm px per metre ──

const measure = document.createElement('canvas').getContext('2d');

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

class Face {
  constructor(w, h, ppm = TEX_PPM) {
    Object.assign(this, { w, h, ppm, marks: [] });
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * ppm);
    this.canvas.height = Math.round(h * ppm);
    this.g = this.canvas.getContext('2d');
  }

  // Writes text from the baseline base down, in at most lines lines no wider than maxW; the size shrinks until it
  // fits. Each line counts for the text-size check under mark. Returns the baseline after the last line.
  write(text, x, base, size, { weight = 400, family = SANS, color = INK, align = 'left', maxW = this.w - x, lines = 1, lead = 1.2, mark } = {}) {
    const { g, ppm } = this;
    let rows;
    for (;;) {
      const f = `${weight} ${size * ppm}px ${family}`;
      rows = wrap(text, f, maxW * ppm);
      measure.font = f;
      if ((rows.length <= lines && Math.max(...rows.map((r) => measure.measureText(r).width)) <= maxW * ppm) || size < 0.003) break;
      size *= 0.95;
    }
    g.font = `${weight} ${size * ppm}px ${family}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    rows.forEach((row, i) => {
      const b = base + i * size * lead;
      g.fillText(row, x * ppm, b * ppm);
      if (mark) this.marks.push({ mark, x: align === 'center' ? x : x + Math.min(0.02, maxW / 4), base: b, size });
    });
    return base + rows.length * size * lead;
  }
}

// The front of a pass: an orange stub with a plane and barcode stripes, a dashed perforation, and a cream body under
// an orange band, with the airport code and the short company name.
function passFace(pass, h) {
  const f = new Face(PASS.w, h, 2400), { g, ppm: p } = f;
  const W = f.canvas.width, H = f.canvas.height, S = PASS.stub * p;
  g.save();
  g.beginPath();
  g.roundRect(0, 0, W, H, PASS.r * p);
  g.clip();
  g.fillStyle = '#f6efe7';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#f5b26b';
  g.fillRect(0, 0, S, H);
  g.fillStyle = '#ec8a45';
  g.fillRect(S, 0, W - S, PASS.band * p);
  // A plane seen from above, its nose up and to the right.
  const plane = [[0.5, 0], [0.44, -0.05], [0.1, -0.06], [-0.1, -0.44], [-0.22, -0.44], [-0.1, -0.06], [-0.33, -0.06], [-0.42, -0.2], [-0.5, -0.2], [-0.45, 0]];
  g.save();
  g.translate(S / 2, H * 0.27);
  g.rotate(-Math.PI / 4);
  g.scale(S * 0.62, S * 0.62);
  g.beginPath();
  for (const [x, y] of plane) g.lineTo(x, y);
  for (const [x, y] of plane.slice().reverse()) g.lineTo(x, -y);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
  // Barcode stripes, decoration only.
  const rand = random(PASSES.findIndex((q) => q.id === pass.id) + 21);
  g.fillStyle = 'rgba(59, 38, 22, 0.82)';
  for (let x = S * 0.2; x < S * 0.8;) {
    const w = (0.0006 + rand() * 0.0016) * p;
    g.fillRect(x, H * 0.56, w, H * 0.32);
    x += w + (0.0005 + rand() * 0.0012) * p;
  }
  // The perforation: a dashed line with a half-round notch at each end.
  g.setLineDash([0.005 * p, 0.0045 * p]);
  g.strokeStyle = 'rgba(70, 48, 30, 0.5)';
  g.lineWidth = 0.0012 * p;
  g.beginPath();
  g.moveTo(S, 0.01 * p);
  g.lineTo(S, H - 0.01 * p);
  g.stroke();
  g.globalCompositeOperation = 'destination-out';
  for (const y of [0, H]) { g.beginPath(); g.arc(S, y, 0.0065 * p, 0, Math.PI * 2); g.fill(); }
  g.restore();
  const x = PASS.stub + PASS.pad, maxW = PASS.w - x - PASS.pad, codeBase = PASS.band + 0.006 + PASS.code * 0.74;
  f.write(pass.code, x, codeBase, PASS.code, { weight: 600, maxW, mark: 'code' });
  f.write(pass.short, x, codeBase + 0.01 + PASS.company * 0.82, PASS.company, { weight: 500, color: INK_SOFT, maxW, lines: 2, lead: 1.08, mark: 'company' });
  return f;
}

// The height a pass needs for its text, so the row can share one height.
function passHeight(pass) {
  const maxW = (PASS.w - PASS.stub - 2 * PASS.pad) * 2400;
  const rows = Math.min(2, wrap(pass.short, `500 ${PASS.company * 2400}px ${SANS}`, maxW).length);
  return PASS.band + 0.006 + PASS.code * 0.74 + 0.01 + PASS.company * (0.82 + 1.08 * (rows - 1) + 0.3) + 0.008;
}

// The CV printout: the title and the name, then grey bars for the printed lines.
function printFace() {
  const f = new Face(PRINT.w, PRINT.h), { g, ppm: p } = f;
  g.fillStyle = '#fdfcf8';
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  const x = 0.022, rand = random(7);
  f.write('CV', x, 0.062, 0.05, { weight: 600 });
  f.write(NAME, x, 0.0873, 0.0145, { weight: 500 });
  let y = 0.105;
  g.fillStyle = '#d8d2c8';
  for (let i = 0; i < 17; i++) {
    if (i % 6 === 0) { g.fillStyle = '#b9b2a6'; g.fillRect(x * p, y * p, 0.06 * p, 0.005 * p); g.fillStyle = '#d8d2c8'; y += 0.012; }
    g.fillRect(x * p, y * p, (PRINT.w - 2 * x) * (0.6 + rand() * 0.4) * p, 0.0032 * p);
    y += 0.0095;
  }
  return f;
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

// A trophy's plaque: brass, with the result's value and company engraved.
function plaqueFace(result) {
  const f = new Face(0.13, 0.044, 3000), { g } = f;
  const grad = g.createLinearGradient(0, 0, f.canvas.width, f.canvas.height);
  grad.addColorStop(0, '#b8913f');
  grad.addColorStop(0.5, '#ead08a');
  grad.addColorStop(1, '#b8913f');
  g.fillStyle = grad;
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  f.write(result.value, f.w / 2, 0.0205, 0.0185, { weight: 600, color: '#2a2010', align: 'center', maxW: 0.12, mark: 'plaque' });
  f.write(result.company, f.w / 2, 0.0365, 0.0115, { weight: 500, color: '#3a2c14', align: 'center', maxW: 0.12, mark: 'plaque-company' });
  return f;
}

// A classic certificate: a cream sheet, blue and gold swooshes at two corners, a gold border, a round seal, and
// the title, the issuer and the name. No issuer logo.
function certificateFace(title, issuer) {
  const f = new Face(CERT.w, CERT.h, 2400), { g } = f;
  const W = f.canvas.width, H = f.canvas.height;
  g.fillStyle = '#f8f1e1';
  g.fillRect(0, 0, W, H);
  const swoosh = (flip) => {
    g.save();
    if (flip) { g.translate(W, H); g.rotate(Math.PI); }
    for (const [color, a, b] of [['#1f3a6b', 0.0, 0.0], ['#c79a3a', 0.035, 0.05], ['#2e5597', 0.06, 0.09]]) {
      g.beginPath();
      g.moveTo(0, H * (0.42 - a));
      g.bezierCurveTo(W * 0.12, H * (0.3 - a), W * 0.2, H * (0.1 - b / 2), W * (0.46 - b), 0);
      g.lineTo(0, 0);
      g.closePath();
      g.fillStyle = color;
      g.globalAlpha = 0.95;
      g.fill();
    }
    g.restore();
  };
  swoosh(false);
  swoosh(true);
  g.strokeStyle = '#c79a3a';
  g.lineWidth = W * 0.004;
  g.strokeRect(W * 0.04, H * 0.055, W * 0.92, H * 0.89);
  // The seal: a gold star-edged disc with two ribbon tails.
  const sx = W * 0.83, sy = H * 0.73, r = H * 0.1;
  g.fillStyle = '#1f3a6b';
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(sx + d * r * 0.3, sy); g.lineTo(sx + d * r * 0.75, sy + r * 1.7); g.lineTo(sx + d * r * 0.45, sy + r * 1.45); g.lineTo(sx + d * r * 0.15, sy + r * 1.7); g.closePath(); g.fill(); }
  g.beginPath();
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, rr = i % 2 ? r : r * 0.88; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
  const gold = g.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
  gold.addColorStop(0, '#f3dc94');
  gold.addColorStop(1, '#b8862c');
  g.fillStyle = gold;
  g.fill();
  g.strokeStyle = 'rgba(90, 60, 10, 0.5)';
  g.lineWidth = W * 0.003;
  g.beginPath();
  g.arc(sx, sy, r * 0.68, 0, Math.PI * 2);
  g.stroke();
  const base = f.write(title, f.w / 2, 0.07, 0.022, { weight: 600, color: '#1d2a44', align: 'center', maxW: 0.22, lines: 3, lead: 1.1, mark: 'title' });
  f.write(NAME, f.w / 2, base + 0.014, 0.018, { family: HAND, color: '#2a3550', align: 'center', maxW: 0.17, mark: 'name' });
  f.write(issuer, f.w * 0.08, f.h * 0.88, 0.0135, { weight: 500, color: '#5b4a2a', maxW: 0.15, mark: 'issuer' });
  return f;
}

// A medal's face: a coloured disc in a gold ring with a short label.
function medalFace(label, color) {
  const f = new Face(0.124, 0.124, 2400), { g } = f;
  const W = f.canvas.width, R = W / 2;
  g.beginPath();
  g.arc(R, R, R * 0.98, 0, Math.PI * 2);
  g.fillStyle = '#d4a845';
  g.fill();
  g.beginPath();
  g.arc(R, R, R * 0.84, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  g.lineWidth = W * 0.012;
  g.beginPath();
  g.arc(R, R, R * 0.74, 0, Math.PI * 2);
  g.stroke();
  const rows = Math.min(2, wrap(label, `600 ${0.02 * f.ppm}px ${SANS}`, 0.084 * f.ppm).length);
  f.write(label, f.w / 2, f.h / 2 + 0.007 - (rows - 1) * 0.011, 0.02, { weight: 600, color: '#ffffff', align: 'center', maxW: 0.086, lines: 2, lead: 1.1, mark: 'label' });
  return f;
}

// A poster in its white mat. A shot is set on a sunset gradient, inset in a rounded rectangle with a soft shadow
// and a thin light border.
function posterFace(image, shot) {
  const f = new Face(POSTER.w, POSTER.h, 1300), { g, ppm: p } = f;
  g.fillStyle = '#fbfaf7';
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  const mat = 0.04, iw = (POSTER.w - 2 * mat) * p, ih = iw * 1.5, ix = mat * p, iy = (f.canvas.height - ih) / 2;
  if (shot) {
    const grad = g.createLinearGradient(ix, iy, ix + iw * 0.4, iy + ih);
    grad.addColorStop(0, '#ffd3a1');
    grad.addColorStop(0.45, '#f7a0b4');
    grad.addColorStop(1, '#7d63c4');
    g.fillStyle = grad;
    g.fillRect(ix, iy, iw, ih);
    const sw = iw * 0.84, sh = sw * (image.height / image.width), sx = ix + (iw - sw) / 2, sy = iy + (ih - sh) / 2, r = iw * 0.03;
    g.save();
    g.shadowColor = 'rgba(40, 20, 60, 0.45)';
    g.shadowBlur = iw * 0.06;
    g.shadowOffsetY = iw * 0.02;
    g.beginPath();
    g.roundRect(sx, sy, sw, sh, r);
    g.fillStyle = '#ffffff';
    g.fill();
    g.restore();
    g.save();
    g.beginPath();
    g.roundRect(sx, sy, sw, sh, r);
    g.clip();
    g.drawImage(image, sx, sy, sw, sh);
    g.restore();
    g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    g.lineWidth = iw * 0.006;
    g.beginPath();
    g.roundRect(sx, sy, sw, sh, r);
    g.stroke();
  } else {
    g.drawImage(image, ix, iy, iw, ih);
  }
  // The mat's bevel: a thin shadow along the image's top and left edges.
  g.fillStyle = 'rgba(0, 0, 0, 0.12)';
  g.fillRect(ix, iy, iw, 0.0015 * p);
  g.fillRect(ix, iy, 0.0015 * p, ih);
  return f;
}

// The printed label under a poster: the project title.
function labelFace(title) {
  const f = new Face(POSTER.w - 0.03, 0.078, 2200), { g } = f;
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  const rows = Math.min(2, wrap(title, `500 ${0.026 * f.ppm}px ${SANS}`, (f.w - 0.024) * f.ppm).length);
  f.write(title, 0.012, rows > 1 ? 0.032 : 0.047, 0.026, { weight: 500, maxW: f.w - 0.024, lines: 2, lead: 1.12, mark: 'label' });
  return f;
}

// The front of a postcard: the photo in a stamp frame, the name and the role. Without a photo the stamp shows the
// initials.
function postcardFace(quote, photo) {
  const f = new Face(CARD.w, CARD.h, 2800), { g, ppm: p } = f;
  g.fillStyle = '#fbf6ec';
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  const sx = 0.012 * p, sy = 0.014 * p, sw = 0.05 * p, sh = 0.062 * p, tooth = 0.0022 * p;
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.18)';
  g.shadowBlur = 0.003 * p;
  g.fillStyle = '#ffffff';
  g.fillRect(sx, sy, sw, sh);
  g.restore();
  // The stamp's perforated edge.
  g.fillStyle = '#fbf6ec';
  for (let x = sx; x <= sx + sw; x += tooth * 2.2) for (const y of [sy, sy + sh]) { g.beginPath(); g.arc(x, y, tooth * 0.7, 0, Math.PI * 2); g.fill(); }
  for (let y = sy; y <= sy + sh; y += tooth * 2.2) for (const x of [sx, sx + sw]) { g.beginPath(); g.arc(x, y, tooth * 0.7, 0, Math.PI * 2); g.fill(); }
  const ix = sx + 0.004 * p, iy = sy + 0.004 * p, iw = sw - 0.008 * p, ih = sh - 0.008 * p;
  if (photo) {
    const k = Math.max(iw / photo.width, ih / photo.height);
    const cw = iw / k, ch = ih / k;
    g.drawImage(photo, (photo.width - cw) / 2, (photo.height - ch) / 2, cw, ch, ix, iy, iw, ih);
  } else {
    g.fillStyle = '#e7ddcb';
    g.fillRect(ix, iy, iw, ih);
    const initials = quote.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
    g.fillStyle = '#6b5a3e';
    g.font = `600 ${0.022 * p}px ${SANS}`;
    g.textAlign = 'center';
    g.fillText(initials, ix + iw / 2, iy + ih / 2 + 0.008 * p);
  }
  // Two postmark rings over the stamp's corner.
  g.strokeStyle = 'rgba(80, 70, 60, 0.35)';
  g.lineWidth = 0.0008 * p;
  for (const r of [0.011, 0.014]) { g.beginPath(); g.arc(sx + sw + 0.004 * p, sy + 0.01 * p, r * p, 0, Math.PI * 2); g.stroke(); }
  const x = 0.074, maxW = CARD.w - x - 0.01;
  const base = f.write(quote.name, x, 0.03, 0.0155, { weight: 600, maxW, lines: 2, lead: 1.1, mark: 'name' });
  f.write(quote.role, x, base + 0.003, 0.0105, { color: INK_SOFT, maxW, lines: 3, lead: 1.2, mark: 'role' });
  g.fillStyle = 'rgba(80, 70, 60, 0.25)';
  for (let i = 0; i < 3; i++) g.fillRect(x * p, (0.088 + i * 0.008) * p, maxW * p, 0.0006 * p);
  return f;
}

// ── The lined paper ──

// Lays out a paper for a sheet of W x H CSS px: titles, lines, headings, text, bullets and the links, as pages of
// ruled lines. A heading stays with the line after it, and a wrapped bullet stays on one page when it fits on one.
// A paragraph flows on to the next page, so a long quote starts under its name. A page never starts with a blank
// line.
function layoutNotes(doc, W, H) {
  const textW = W - NOTE.left - NOTE.right;
  const rows = Math.max(6, Math.floor((H - NOTE.top - NOTE.bottom) / NOTE.line));
  const lines = [];
  const blank = (n = 1) => {
    if (!lines.length) return;
    let have = 0;
    while (have < lines.length && !lines[lines.length - 1 - have]) have++;
    for (; have < n; have++) lines.push(null);
  };
  // keep holds a line to the next one; together holds a wrapped block's lines to each other.
  const write = (text, { size = NOTE.body, x = 0, keep = false, together = false, link = -1, lead = '' } = {}) => {
    const wrapped = wrap(text, `${size}px ${HAND}`, textW - x, NOTE.chars);
    wrapped.forEach((t, i) => {
      lines.push({ text: t, size, x: NOTE.left + x, keep: keep || (together && i < wrapped.length - 1), link, lead: i ? '' : lead });
    });
  };
  for (const b of doc.blocks) {
    if (b.gap) blank(b.gap);
    else if (b.title) write(b.title, { size: NOTE.title, keep: true });
    else if (b.line) write(b.line, { keep: true });
    else if (b.head) { blank(); write(b.head, { size: NOTE.head, keep: true }); }
    else if (b.text) write(b.text);
    else if (b.bullet) write(b.bullet, { x: NOTE.bullet, lead: '–', together: true });
  }
  blank();
  doc.links.forEach((link, i) => write(link.text, { link: i, keep: i < doc.links.length - 1 }));

  const pages = [[]];
  lines.forEach((line, i) => {
    let page = pages[pages.length - 1];
    let run = 0;
    while (lines[i + run]?.keep) run++;
    // A held block moves to a new page only when it fits on one.
    if (page.length && (page.length >= rows || (run && run + 1 <= rows && page.length + run + 1 > rows))) { page = []; pages.push(page); }
    if (line || page.length) page.push(line);
  });
  for (const page of pages) while (page.length && !page[page.length - 1]) page.pop();
  return { W, H, rows, pages: pages.filter((page) => page.length) };
}

const noteBase = (row) => NOTE.top + (row + 1) * NOTE.line - 7;

// Draws one page: white paper with a soft shadow, pale blue rules, a double red margin, three punch holes, the
// handwriting and, when there is more than one page, two arrows and the page number. A blank page has the paper
// only: the back of a turning page. Returns the hit zones.
function drawNotes(notes, index, number = index, blank = false) {
  const { W, H, pages } = notes, S = NOTE.shadow;
  const c = document.createElement('canvas');
  c.width = (W + 2 * S) * 2;
  c.height = (H + 2 * S) * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.translate(S, S);
  g.save();
  if (!blank) {
    g.shadowColor = 'rgba(28, 24, 20, 0.32)';
    g.shadowBlur = 16;
    g.shadowOffsetY = 5;
  }
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
  const zones = { links: [] };
  if (blank) return { canvas: c, zones };

  g.fillStyle = PEN;
  g.strokeStyle = PEN;
  g.textBaseline = 'alphabetic';
  pages[index].forEach((line, row) => {
    if (!line) return;
    const base = noteBase(row);
    g.font = `${line.size}px ${HAND}`;
    if (line.lead) g.fillText(line.lead, NOTE.left, base);
    g.fillText(line.text, line.x, base);
    if (line.link >= 0) {
      const w = g.measureText(line.text).width;
      g.fillRect(line.x, base + 3, w, 1.5);
      zones.links.push({ link: line.link, x0: line.x - 4, x1: line.x + w + 4, y0: base - line.size, y1: base + 8 });
    }
  });
  if (pages.length > 1) {
    const y = H - NOTE.bottom / 2 - 2, r = 15;
    const arrows = { prev: W - NOTE.right - 128, next: W - NOTE.right - 16 };
    g.font = `${NOTE.body}px ${HAND}`;
    g.textAlign = 'center';
    g.fillText(`${number + 1} / ${pages.length}`, (arrows.prev + arrows.next) / 2, y + 6);
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

// ── Procedural textures and shapes ──

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

// A coiled telephone cord: a helix wound around the path through points.
function cordGeometry(points, turns, radius) {
  const path = new THREE.CatmullRomCurve3(points);
  const frames = path.computeFrenetFrames(400, false);
  const curve = new THREE.Curve();
  curve.getPoint = (t, out = new THREE.Vector3()) => {
    const i = Math.min(399, Math.floor(t * 400)), a = t * turns * Math.PI * 2;
    return out.copy(path.getPointAt(t)).addScaledVector(frames.normals[i], Math.cos(a) * radius).addScaledVector(frames.binormals[i], Math.sin(a) * radius);
  };
  return new THREE.TubeGeometry(curve, turns * 14, 0.0028, 6);
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
  let renderer = null, tip = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    await build(renderer);
  } catch (error) {
    abort.abort();
    if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    tip?.remove();
    list.replaceChildren();
    live.replaceChildren();
    if (backButton) backButton.hidden = true;
    throw error;
  }

  async function build(renderer) {
    // The home page's own controls and text: the room clicks them, so AI Match, the CV link, LinkedIn and the
    // recommendations work and count as they do on the page.
    const heroTitle = clean(document.getElementById('home-title'));
    const heroSub = clean(document.querySelector('#top .ed-home-sub'));
    const aiTrigger = document.getElementById('ai-match-trigger');
    const cvLink = document.querySelector('#top a[href="cv.html"][data-ga-event="resume_downloaded"]');
    const talkLink = document.querySelector('.ed-topbar a[href*="linkedin.com"][data-ga-event]');
    const recLink = document.querySelector('#recommendations a[href*="linkedin.com"][href*="recommendations"]');
    if (!heroTitle || !heroSub || !aiTrigger || !cvLink) throw new Error('the hero lost its title, subline, AI Match button or CV link');
    if (!talkLink || !recLink) throw new Error('the page lost its LinkedIn or recommendations link');
    if (!backButton) throw new Error('#room lost its Back button');
    const results = [...document.querySelectorAll('.ed-result[data-reveal^="receipt-"]')].map((button) => {
      const id = button.dataset.reveal.replace(/^receipt-/, '');
      return {
        id, value: clean(button.querySelector('b')), label: clean(button.querySelector(':scope > span:not(.ed-chip)')),
        company: clean(button.querySelector('small')), reveal: readReveal(document.getElementById(button.dataset.reveal), { side: true }),
      };
    });
    const quotes = [...document.querySelectorAll('.ed-quote[data-name][data-text]')].map((button) => ({
      id: slug(button.dataset.name), name: button.dataset.name, role: button.dataset.role || '', text: button.dataset.text, image: button.dataset.image,
    }));
    if (!results.length || !quotes.length) throw new Error('the page lost its results or recommendations');

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

    const isNight = () => root.getAttribute('data-theme') === 'dark';
    const hand = new FontFace('Patrick Hand', `url("${new URL('fonts/patrick-hand-latin.woff2', import.meta.url).href}") format("woff2")`);
    const model = (id) => new GLTFLoader().loadAsync(new URL(`models/${id}/${id}_1k.gltf`, import.meta.url).href);
    const image = (url) => new THREE.ImageLoader().loadAsync(url);
    // A postcard without a photo, or with a photo that fails, shows the initials instead.
    const photo = (src) => (src ? image(new URL(src, document.baseURI).href).catch(() => null) : Promise.resolve(null));
    const loads = Promise.all([
      fetchPage('experience.html'),
      fetchPage('certificates.html'),
      fetchPage('portfolio.html'),
      model('desk_lamp_arm_01'),
      model('potted_plant_02'),
      model('classic_laptop'),
      firstView(HOME_VIEW, isNight()),
      Promise.all(POSTERS.map((p) => image(new URL(`posters/${p.image}`, import.meta.url).href))),
      Promise.all(quotes.map((q) => photo(q.image))),
      hand.load().then((face) => document.fonts.add(face)),
      Promise.all(['400', '500', '600'].map((w) => document.fonts.load(`${w} 20px "Instrument Sans"`, 'Aa→–•'))),
    ]);

    // ── The room shell ──
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const flat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
    function box(w, h, d, material, x, y, z, parent = scene) {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      parent.add(mesh);
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
    function woodBox(x0, x1, y0, y1, z0, z1, parent = scene) {
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
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
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
    // The posters hang on the left wall, the awards shelf on the right wall.
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

    // ── The window view: two planes for the cross-fade ──
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

    const [experience, certificatesPage, portfolioPage, lampModel, plantModel, laptopModel, homeView, posterImages, photos] = await loads;
    const passes = readPasses(experience);
    const education = passes.find((p) => p.id === 'education').legs[0];
    if (!education.daad || education.degrees.length < 2) throw new Error('experience.html lost the DAAD line or a degree');

    const texture = (source) => {
      const map = new THREE.CanvasTexture(source);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      return map;
    };
    // A flat face that shows a canvas. It glows a little, like the passes, so it stays readable at night.
    const faces = [];
    function faceMesh(face, { alphaTest = 0, roughness = 0.85, side = THREE.FrontSide, lit = 1 } = {}) {
      const map = texture(face.canvas);
      const material = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0x000000, roughness, alphaTest, side });
      material.userData.lit = lit;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(face.w, face.h), material);
      mesh.receiveShadow = true;
      mesh.userData.face = face;
      faces.push(mesh);
      return mesh;
    }
    // An item that a click opens: its group carries the station and the id, and a second click opens its paper.
    const items = new Map();
    function item(station, id, fields) {
      const group = new THREE.Group();
      group.userData = { kind: 'item', station, id };
      const entry = { station, id, object: group, ...fields };
      if (id) items.set(`${station}/${id}`, entry);
      return entry;
    }

    // ── Props: the Poly Haven lamp, plant and laptop ──
    const lamp = new THREE.Group();
    lamp.position.set(1.45, DESK.top, 0.22);
    lamp.rotation.y = 2.4;
    lamp.scale.setScalar(0.8);
    lamp.userData.kind = 'lamp';
    const lampLight = new THREE.PointLight(0xffb066, 0.4, 0, 2);
    lampLight.position.set(-0.005, 0.66, -0.18);   // just below the bulb, in model space
    const plant = new THREE.Group();
    plant.position.set(2.2, 0, 0.3);
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
    const screenMap = texture(screenArt.canvas);
    screenMap.flipY = false;                       // glTF UVs start at the top
    screenMap.wrapS = THREE.RepeatWrapping;        // the screen's u runs from 1 to 2
    screen.material = new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: screenMap, emissive: 0xffffff, roughness: 0.35 });
    screen.userData.kind = 'screen';
    // The model's texture carries a printed sticker with odd lettering, on the bezel and on the lid's back. Each is
    // painted over with the plastic's own colour, the mean of a ring of pixels around it.
    const bodyMap = laptop.getObjectByProperty('type', 'Mesh')?.material.map;
    if (bodyMap?.image) {
      const img = bodyMap.image, c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      for (const [x0, y0, x1, y1] of [[0.448, 0.476, 0.492, 0.5], [0.556, 0.754, 0.582, 0.806]]) {
        const r = { x: Math.floor(x0 * c.width), y: Math.floor(y0 * c.height), w: Math.ceil((x1 - x0) * c.width), h: Math.ceil((y1 - y0) * c.height) };
        const ring = g.getImageData(r.x - 3, r.y - 3, r.w + 6, r.h + 6).data;
        const sum = [0, 0, 0];
        let n = 0;
        for (let i = 0; i < ring.length; i += 4) {
          const px = (i / 4) % (r.w + 6), py = Math.floor(i / 4 / (r.w + 6));
          if (px > 1 && px < r.w + 4 && py > 1 && py < r.h + 4) continue;
          for (let ch = 0; ch < 3; ch++) sum[ch] += ring[i + ch];
          n++;
        }
        g.fillStyle = `rgb(${sum.map((v) => Math.round(v / n)).join(', ')})`;
        g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      }
      const painted = new THREE.CanvasTexture(c);
      for (const key of ['colorSpace', 'flipY', 'wrapS', 'wrapT', 'channel']) painted[key] = bodyMap[key];
      painted.anisotropy = anisotropy;
      laptop.traverse((o) => { if (o.isMesh && o.material.map === bodyMap) o.material.map = painted; });
    }
    laptop.traverse((o) => { if (o.isMesh && o !== screen && o.material.map) o.material.emissiveMap = o.material.map; });
    laptop.updateMatrixWorld(true);

    // ── The passes: a row along the front of the desk, each a little turned ──
    const PASS_H = Math.max(...passes.map(passHeight));
    const TURN = [2.5, -1.8, 2.2, -2.6, 1.6], SHIFT = [0.004, -0.008, 0.006, -0.005, 0.008];
    const passItems = passes.map((pass, i) => {
      const mesh = faceMesh(passFace(pass, PASS_H), { alphaTest: 0.5, roughness: 0.9 });
      mesh.rotation.x = -Math.PI / 2;
      const entry = item('desk', pass.id, { name: pass.name, doc: passDoc(pass), tip: passTip(pass), pass, mesh });
      const holder = entry.object;
      holder.position.set(DESK.x + (i - (passes.length - 1) / 2) * (PASS.w + PASS.gap), DESK.top + 0.0012 + i * 0.0004, DX.z1 - 0.035 - PASS_H / 2 + SHIFT[i]);
      holder.rotation.y = THREE.MathUtils.degToRad(TURN[i]);
      holder.userData.base = holder.position.y;
      holder.add(mesh);
      scene.add(holder);
      return entry;
    });

    // ── The CV printout beside the laptop, with a paper clip at its top edge ──
    const print = faceMesh(printFace(), { roughness: 0.92 });
    print.rotation.x = -Math.PI / 2;
    print.userData.kind = 'print';
    const printHolder = new THREE.Group();
    printHolder.position.set(PRINT.x, DESK.top + 0.0012, PRINT.z);
    printHolder.rotation.y = PRINT.turn;
    const clip = new THREE.Mesh(clipGeometry(), new THREE.MeshStandardMaterial({ color: 0xb9bfc7, metalness: 0.3, roughness: 0.3 }));
    clip.position.set(-0.05, 0.0009, -PRINT.h / 2 - 0.008);
    printHolder.add(print, clip);
    scene.add(printHolder);

    // ── The awards shelf on the right wall: trophies on the low board, certificates on the high board, medals on
    // three hooks above. Everything faces the room (-x). ──
    const WX = ROOM.x1;
    const shelf = item('awards', null, {});
    const shelfParts = shelf.object;
    for (const z of [SHELF.z0, SHELF.z1]) woodBox(WX - SHELF.depth, WX, SHELF.low - 0.11, SHELF.high + 0.06, z - 0.011, z + 0.011, shelfParts);
    for (const y of [SHELF.low, SHELF.high]) woodBox(WX - SHELF.depth, WX, y - 0.028, y, SHELF.z0 + 0.011, SHELF.z1 - 0.011, shelfParts);
    scene.add(shelfParts);
    const faceRoom = (object) => { object.rotation.y = -Math.PI / 2; return object; };   // local +z turns to -x

    const gold = () => new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.65, roughness: 0.3, side: THREE.DoubleSide });
    const cupProfile = [[0.034, 0], [0.034, 0.006], [0.013, 0.016], [0.009, 0.05], [0.015, 0.058], [0.009, 0.066], [0.011, 0.08], [0.03, 0.098], [0.05, 0.13], [0.058, 0.165], [0.061, 0.172], [0.055, 0.172], [0.05, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
    const cupGeometry = new THREE.LatheGeometry(cupProfile, 40);
    // A handle runs from inside the cup wall below the rim, out and down, and back into the wall where the cup
    // narrows, so both of its ends meet the cup.
    const handleGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.048, 0.158], [0.07, 0.163], [0.088, 0.152], [0.094, 0.132], [0.084, 0.113], [0.06, 0.104], [0.03, 0.105]]
      .map(([x, y]) => new THREE.Vector3(x, y, 0))), 32, 0.0055, 8);
    const trophyItems = results.map((result, i) => {
      const entry = item('awards', `result-${result.id}`, {
        name: `${result.value} · ${result.label}, ${result.company}`,
        tip: [['b', `${result.value} · ${result.label}`], ['span', result.company]],
        doc: revealDoc(result.reveal, [result.reveal.kicker, result.reveal.meta],
          experience.getElementById(`role-${result.id}`) ? [{ text: LINK_TEXT, href: `experience.html#role-${result.id}` }] : []),
      });
      const t = entry.object, metal = gold();
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 0.45 });
      box(0.16, 0.052, 0.12, dark, 0, 0.026, 0, t);
      box(0.11, 0.024, 0.085, dark, 0, 0.064, 0, t);
      const cup = new THREE.Mesh(cupGeometry, metal);
      cup.position.y = 0.076;
      t.add(cup);
      for (const d of [-1, 1]) {
        const handle = new THREE.Mesh(handleGeometry, metal);
        handle.scale.x = d;   // the left handle mirrors the right one
        cup.add(handle);
      }
      const plaque = faceMesh(plaqueFace(result), { roughness: 0.4 });
      plaque.material.metalness = 0.3;
      plaque.position.set(0, 0.026, 0.0605);
      t.add(plaque);
      t.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      t.scale.setScalar(1.12);
      t.position.set(WX - SHELF.depth / 2, SHELF.low, SHELF.z0 + 0.3 + i * ((SHELF.z1 - SHELF.z0 - 0.6) / (results.length - 1)));
      scene.add(faceRoom(t));
      return entry;
    });

    // The five framed certificates and the DAAD scholarship lean on the high board against the wall.
    const credential = (id) => {
      const dialog = certificatesPage.getElementById(id);
      if (!dialog) throw new Error(`certificates.html has no #${id}`);
      return readReveal(dialog);
    };
    const certSpecs = [
      ...CERTIFICATES.map((id) => {
        const r = credential(id), issuer = r.kicker.split(' · ')[0];
        return { id, title: r.title, issuer, name: `${r.title}, ${issuer}`, doc: revealDoc(r, [r.kicker], [...r.links].sort((a, b) => b.external - a.external)) };
      }),
      {
        id: 'daad', title: education.daad, issuer: education.degrees[0].split(', ').pop(), name: `${education.daad}, ${education.degrees[0]}`,
        doc: { blocks: [{ title: education.daad }, { line: education.degrees[0] }], links: [{ text: 'Education on the Experience page', href: 'experience.html#role-education' }] },
      },
    ];
    const certStep = (SHELF.z1 - SHELF.z0 - 0.04) / certSpecs.length;
    const certItems = certSpecs.map((spec, i) => {
      const entry = item('awards', spec.id, { name: spec.name, doc: spec.doc, tip: [['b', spec.title], ['span', spec.issuer]] });
      const c = entry.object;
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.5 });
      box(CERT.w + 2 * CERT.frame, CERT.h + 2 * CERT.frame, 0.014, frameMaterial, 0, 0, -0.007, c);
      const face = faceMesh(certificateFace(spec.title, spec.issuer));
      face.position.z = 0.0008;
      c.add(face);
      // The frame stands on the board and leans back against the wall.
      const lean = 0.13;
      c.position.set(WX - 0.012 - Math.sin(lean) * (CERT.h / 2 + CERT.frame) - 0.006, SHELF.high + Math.cos(lean) * (CERT.h / 2 + CERT.frame), SHELF.z0 + 0.02 + certStep * (i + 0.5));
      faceRoom(c);
      c.rotateX(-lean);
      c.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      scene.add(c);
      return entry;
    });

    // Three brass hooks above the certificates, each with its issuer's medals on ribbons, fanned a little.
    const hookMaterial = new THREE.MeshStandardMaterial({ color: 0xb38b45, metalness: 0.6, roughness: 0.35 });
    const ribbonGeometry = new THREE.PlaneGeometry(0.028, 1);
    ribbonGeometry.translate(0, -0.5, 0);
    const medalItems = [];
    MEDALS.forEach((group, gi) => {
      const z = SHELF.z0 + (SHELF.z1 - SHELF.z0) * (gi + 0.5) / MEDALS.length;
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 12), hookMaterial);
      hook.rotation.z = Math.PI / 2;
      hook.position.set(WX - 0.025, SHELF.hooks, z);
      scene.add(hook);
      group.ids.forEach((id, i) => {
        const r = credential(id), label = medalLabel(r.title);
        const issuer = r.kicker.split(' · ')[0];
        const entry = item('awards', id, { name: `${r.title}, ${issuer}`, doc: revealDoc(r, [r.kicker], [...r.links].sort((a, b) => b.external - a.external)), tip: [['b', r.title], ['span', issuer]] });
        const m = entry.object;
        // Every other medal hangs lower, so neighbours never cover each other.
        const n = group.ids.length, drop = 0.12 + (i % 2) * 0.155;
        const ribbon = new THREE.Mesh(ribbonGeometry, new THREE.MeshStandardMaterial({ color: new THREE.Color(group.color).multiplyScalar(0.8), roughness: 0.8, side: THREE.DoubleSide }));
        ribbon.scale.y = drop;
        m.add(ribbon);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.006, 40), gold());
        disc.rotation.x = Math.PI / 2;
        disc.position.y = -drop - 0.057;
        m.add(disc);
        const face = faceMesh(medalFace(label, group.color), { alphaTest: 0.5, roughness: 0.4 });
        face.position.set(0, -drop - 0.057, 0.0035);
        m.add(face);
        m.position.set(WX - 0.04 - i * 0.004, SHELF.hooks, z);
        faceRoom(m);
        m.rotateZ((i - (n - 1) / 2) * 0.36);
        m.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
        scene.add(m);
        medalItems.push(entry);
      });
    });

    // ── The poster wall on the left wall: seven framed posters in two rows, each with a printed label. Everything
    // faces the room (+x), and the rows read from the room's front towards the window. ──
    const posterItems = POSTERS.map((spec, i) => {
      const dialog = portfolioPage.getElementById(`project-${spec.id}`);
      if (!dialog) throw new Error(`portfolio.html has no #project-${spec.id}`);
      const r = readReveal(dialog);
      const entry = item('projects', spec.id, { name: `${r.title}, ${r.kicker}`, doc: revealDoc(r, [r.kicker, r.meta]), tip: [['b', r.title], ['span', r.kicker]] });
      const p = entry.object;
      box(POSTER.w + 2 * POSTER.frame, POSTER.h + 2 * POSTER.frame, 0.022, new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.5 }), 0, 0, -0.011, p);
      // The left wall gets little light, so a poster glows more than the other faces.
      const face = faceMesh(posterFace(posterImages[i], spec.shot), { lit: 4 });
      face.position.z = 0.0008;
      p.add(face);
      const label = faceMesh(labelFace(r.title));
      label.position.set(0, -POSTER.h / 2 - POSTER.frame - 0.052, -0.0215);
      p.add(label);
      const top = i < 4, col = top ? i : i - 4, count = top ? 4 : 3;
      p.position.set(ROOM.x0 + 0.022, POSTER.rows[top ? 0 : 1], POSTER.z - (col - (count - 1) / 2) * POSTER.step);
      p.rotation.y = Math.PI / 2;   // local +z turns to +x
      scene.add(p);
      return entry;
    });

    // ── The letter tray at the desk's left end, with the postcards ──
    const tray = item('letters', null, {});
    const trayGroup = tray.object;
    trayGroup.position.set(TRAY.x, DESK.top, TRAY.z);
    trayGroup.rotation.y = TRAY.turn;
    woodBox(-TRAY.w / 2, TRAY.w / 2, 0, 0.012, -TRAY.d / 2, TRAY.d / 2, trayGroup);
    for (const s of [-1, 1]) {
      woodBox(-TRAY.w / 2, TRAY.w / 2, 0.012, 0.032, s * TRAY.d / 2 - 0.006, s * TRAY.d / 2 + 0.006, trayGroup);
      woodBox(s * TRAY.w / 2 - 0.006, s * TRAY.w / 2 + 0.006, 0.012, 0.032, -TRAY.d / 2, TRAY.d / 2, trayGroup);
    }
    scene.add(trayGroup);
    trayGroup.updateMatrixWorld(true);
    // Each card has a place in the tray and a place in the fan; #letters fans them out above the desk.
    const FAN = { x: 0.12, y: DESK.top + 0.3, z: 0.62, r: 0.95, step: 0.158, tilt: 0.55 };
    const fanNormal = new THREE.Vector3(0, Math.sin(FAN.tilt), Math.cos(FAN.tilt));
    const fanUp = new THREE.Vector3(0, Math.cos(FAN.tilt), -Math.sin(FAN.tilt));
    const cardItems = quotes.map((quote, i) => {
      const entry = item('letters', quote.id, {
        name: `Recommendation from ${quote.name}, ${quote.role}`,
        tip: [['b', quote.name], ['span', quote.role]],
        doc: { blocks: [{ title: quote.name }, { line: quote.role }, { gap: 1 }, { text: quote.text }], links: [{ text: 'All recommendations on LinkedIn', el: recLink }] },
      });
      const card = entry.object;
      const face = faceMesh(postcardFace(quote, photos[i]), { side: THREE.DoubleSide });
      face.castShadow = true;
      card.add(face);
      const rand = random(40 + i);
      const inTray = new THREE.Object3D();
      inTray.position.set((rand() - 0.5) * 0.02, 0.014 + i * 0.0016, (rand() - 0.5) * 0.016);
      inTray.rotation.set(-Math.PI / 2, 0, (rand() - 0.5) * 0.12);
      inTray.applyMatrix4(trayGroup.matrixWorld);
      const a = (i - (quotes.length - 1) / 2) * (FAN.step / FAN.r);
      const fanned = new THREE.Object3D();
      fanned.position.set(FAN.x + Math.sin(a) * FAN.r, FAN.y, FAN.z).addScaledVector(fanUp, -FAN.r * (1 - Math.cos(a))).addScaledVector(fanNormal, i * 0.003);
      fanned.rotation.set(-FAN.tilt, 0, -a, 'YXZ');
      entry.places = { tray: inTray, fan: fanned };
      card.position.copy(inTray.position);
      card.quaternion.copy(inTray.quaternion);
      scene.add(card);
      return entry;
    });

    // ── The telephone at the desk's right end: a rotary desk phone with a coiled cord ──
    const contact = item('contact', null, {
      name: 'Contact',
      doc: { blocks: [{ title: clean(talkLink) }], links: [{ text: 'LinkedIn', el: talkLink }, { text: 'View CV', el: cvLink }] },
    });
    const phone = contact.object;
    {
      const red = new THREE.MeshStandardMaterial({ color: 0x9a3a24, roughness: 0.32 });
      const cream = new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: 0.5 });
      // The body: a side profile with a sloped front, extruded across and rounded at its edges.
      const H = 0.095, slope = { z0: 0.1, z1: 0.03 };
      const profile = new THREE.Shape().moveTo(-0.1, 0).lineTo(slope.z0, 0).lineTo(slope.z1, H).lineTo(-0.075, H).lineTo(-0.1, 0);
      const bodyGeometry = new THREE.ExtrudeGeometry(profile, { depth: 0.19, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 4, curveSegments: 4 });
      // The bevel grows the shape by 12 mm on every side, so the body moves up by that much to stand on the desk.
      const B = 0.012;
      bodyGeometry.translate(0, B, -0.095);
      bodyGeometry.rotateY(-Math.PI / 2);   // the profile's x runs along z: the front faces +z
      phone.add(new THREE.Mesh(bodyGeometry, red));
      // The dial on the sloped front: a disc with ten finger holes over a dark plate and a cream centre.
      const dialShape = new THREE.Shape().absarc(0, 0, 0.05, 0, Math.PI * 2);
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * 0.35 + i * 0.13 * Math.PI;
        dialShape.holes.push(new THREE.Path().absarc(Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.0082, 0, Math.PI * 2));
      }
      const dial = new THREE.Mesh(new THREE.ExtrudeGeometry(dialShape, { depth: 0.004, bevelEnabled: false, curveSegments: 18 }), new THREE.MeshStandardMaterial({ color: 0xe9e2d4, metalness: 0.3, roughness: 0.3 }));
      const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.006, 24), cream);
      centre.rotation.x = Math.PI / 2;
      centre.position.z = 0.004;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.003, 40), new THREE.MeshStandardMaterial({ color: 0x2b211c, roughness: 0.5 }));
      plate.rotation.x = Math.PI / 2;
      plate.position.z = -0.0015;
      const dialGroup = new THREE.Group();
      dialGroup.add(plate, dial, centre);
      const tilt = Math.atan2(slope.z0 - slope.z1, H);   // the slope leans back by this angle from upright
      const n = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
      dialGroup.position.set(0, H / 2 + B, (slope.z0 + slope.z1) / 2).addScaledVector(n, B + 0.002);
      dialGroup.rotation.x = -tilt;
      phone.add(dialGroup);
      // The cradle's two prongs and the handset lying across them.
      for (const side of [-1, 1]) box(0.024, 0.03, 0.032, red, side * 0.068, H + 2 * B + 0.01, -0.03, phone);
      const handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0.1, 0, 0)), 24, 0.0145, 10), red);
      handle.position.set(0, H + 2 * B + 0.038, -0.03);
      phone.add(handle);
      for (const side of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.022, 0.042, 24), red);
        cup.position.set(side * 0.104, H + 2 * B + 0.024, -0.03);
        phone.add(cup);
      }
      // The coiled cord runs from the handset's left end down to the desk and back into the body's side.
      const cord = new THREE.Mesh(cordGeometry([
        new THREE.Vector3(-0.125, 0.13, -0.03), new THREE.Vector3(-0.16, 0.05, -0.01), new THREE.Vector3(-0.175, 0.007, 0.07),
        new THREE.Vector3(-0.15, 0.007, 0.13), new THREE.Vector3(-0.11, 0.03, 0.06),
      ], 26, 0.006), new THREE.MeshStandardMaterial({ color: 0x8a3220, roughness: 0.4 }));
      phone.add(cord);
      phone.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      phone.position.set(PHONE.x, DESK.top, PHONE.z);
      phone.rotation.y = PHONE.turn;
      scene.add(phone);
    }

    // ── The paper: a sheet held in front of the camera on the left, so the room stays in view on the right ──
    const PAPER_D = 0.5;
    const sheetMaterial = (side) => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, side });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheetMaterial(THREE.FrontSide));
    paper.renderOrder = 10;
    paper.visible = false;
    paper.userData.kind = 'paper';
    camera.add(paper);
    // The turning page: a strip of 24 segments hinged at the paper's left edge, bent as it turns. Its front shows a
    // page, its back the plain ruled paper.
    const FLIP_SEGMENTS = 24;
    const flipGeometry = new THREE.PlaneGeometry(1, 1, FLIP_SEGMENTS, 1);
    const flipFront = new THREE.Mesh(flipGeometry, sheetMaterial(THREE.FrontSide));
    const flipBack = new THREE.Mesh(flipGeometry, sheetMaterial(THREE.BackSide));
    const flip = new THREE.Group();
    for (const m of [flipFront, flipBack]) { m.renderOrder = 11; m.frustumCulled = false; flip.add(m); }
    flip.visible = false;
    camera.add(flip);
    const paperState = { key: null, doc: null, notes: null, page: 0, zones: { links: [] }, x: 0, tween: null, blank: null, flip: null };
    const flipLog = [];
    let flipMs = FLIP_MS;   // a test hook slows the turn for the mid-turn screenshots

    // The paper's size in CSS px for the current stage, and the world size of one CSS px at the paper.
    function noteBox() {
      const w = stage.clientWidth, h = stage.clientHeight;
      return { W: Math.round(Math.min(NOTE_BOX.maxW, w * NOTE_BOX.share - NOTE_BOX.left)), H: Math.round(h - NOTE_BOX.top - NOTE_BOX.bottom), w, h, k: (2 * PAPER_D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h };
    }

    function pageMap(index, number = index) {
      const { canvas: sheet, zones } = drawNotes(paperState.notes, index, number);
      return { map: texture(sheet), zones };
    }

    function setPaperMap({ map, zones }) {
      const old = paper.material.map;
      paper.material.map = map;
      paper.material.needsUpdate = true;
      paperState.zones = zones;
      if (old && old !== flipFront.material.map) old.dispose();
    }

    function placePaper() {
      const { notes } = paperState;
      const { w, h, k } = noteBox(), S = NOTE.shadow;
      paper.scale.set((notes.W + 2 * S) * k, (notes.H + 2 * S) * k, 1);
      paperState.x = (-w / 2 + NOTE_BOX.left - S + notes.W / 2 + S) * k;
      paper.position.set(paperState.x, (h / 2 - NOTE_BOX.top - notes.H / 2) * k, -PAPER_D);
      paper.rotation.z = -0.008;
      // The turning page covers the sheet only, without the shadow around it; its UVs pick the sheet from the canvas.
      flip.position.set(paperState.x - (notes.W / 2) * k, paper.position.y - (notes.W / 2) * k * Math.sin(-0.008), -PAPER_D + 0.0005);
      flip.rotation.z = -0.008;
      // The page lifts by 15 % of its width at most: the hinge sits at the view's left edge, and a page that rises
      // further towards the camera turns out of view.
      flip.scale.set(notes.W * k, notes.H * k, notes.W * k * 0.15);
      const uv = flipGeometry.attributes.uv, n = FLIP_SEGMENTS + 1;
      for (let i = 0; i < uv.count; i++) {
        const u = (i % n) / FLIP_SEGMENTS, v = i < n ? 1 : 0;
        uv.setXY(i, (S + u * notes.W) / (notes.W + 2 * S), (S + v * notes.H) / (notes.H + 2 * S));
      }
      uv.needsUpdate = true;
      paperState.blank?.dispose();
      paperState.blank = texture(drawNotes(notes, 0, 0, true).canvas);
      flipBack.material.map = paperState.blank;
      flipBack.material.needsUpdate = true;
    }

    function layoutPaper(key, page = 0) {
      const box = noteBox();
      paperState.doc = docFor(key);
      paperState.notes = layoutNotes(paperState.doc, box.W, box.H);
      paperState.page = Math.min(page, paperState.notes.pages.length - 1);
      setPaperMap(pageMap(paperState.page));
      placePaper();
    }

    function showPaper(key) {
      if (paperState.key === key) return;
      finishFlip();
      if (paperState.tween) tweens.delete(paperState.tween);
      const k = noteBox().k;
      if (key) {
        layoutPaper(key);
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
      paperState.key = key;
    }

    // Bends the turning page for the angle theta (0 flat on the paper, PI turned over to the left). The free edge
    // leads by lead, so the page curls as it lifts.
    function bendPage(theta, lead) {
      const pos = flipGeometry.attributes.position, n = FLIP_SEGMENTS + 1;
      const xs = [0], zs = [0];
      for (let i = 0; i < FLIP_SEGMENTS; i++) {
        const u = (i + 0.5) / FLIP_SEGMENTS;
        const a = Math.min(Math.PI, Math.max(0, theta + lead * 0.85 * Math.sin(theta) * u * u));
        xs.push(xs[i] + Math.cos(a) / FLIP_SEGMENTS);
        zs.push(zs[i] + Math.sin(a) / FLIP_SEGMENTS);
      }
      for (let i = 0; i < pos.count; i++) { pos.setX(i, xs[i % n]); pos.setY(i, i < n ? 0.5 : -0.5); pos.setZ(i, zs[i % n]); }
      pos.needsUpdate = true;
      const shade = 1 - 0.14 * Math.sin(theta);
      flipFront.material.color.copy(paper.material.color).multiplyScalar(shade);
      flipBack.material.color.copy(paper.material.color).multiplyScalar(shade * 0.96);
    }

    // Completes a running page turn at once.
    function finishFlip() {
      const f = paperState.flip;
      if (!f) return;
      tweens.delete(f.tween);
      f.end();
    }

    // A page turn: the page turns over from its left edge like a notebook page. Next lifts the page and reveals the
    // next one under it; previous brings the page back from the left. The page number changes when the turn ends.
    function turnPage(step) {
      if (!paperState.notes || !paper.visible) return;
      finishFlip();
      const { notes, page } = paperState;
      const next = page + step;
      if (next < 0 || next >= notes.pages.length) return;
      const log = { step, start: performance.now(), end: null };
      flipLog.push(log);
      const turning = step > 0 ? paper.material.map : pageMap(next, page).map;
      if (step > 0) {
        paper.material.map = null;
        setPaperMap(pageMap(next, page));
      }
      flipFront.material.map = turning;
      flipFront.material.needsUpdate = true;
      for (const m of [flipFront, flipBack]) m.material.opacity = paper.material.opacity;
      const from = step > 0 ? 0 : Math.PI, to = step > 0 ? Math.PI : 0;
      bendPage(from, step);
      flip.visible = true;
      const f = paperState.flip = {
        tween: tween(flipMs, (t) => bendPage(from + (to - from) * easeInOut(t), step), () => f.end()),
        end() {
          paperState.flip = null;
          flip.visible = false;
          paperState.page = next;
          setPaperMap(pageMap(next));
          turning.dispose();
          log.end = performance.now();
          invalidate();
        },
      };
    }

    function clickPaper(uv) {
      if (paperState.flip) return;
      const { notes, zones } = paperState, S = NOTE.shadow;
      const x = uv.x * (notes.W + 2 * S) - S, y = (1 - uv.y) * (notes.H + 2 * S) - S;
      const inside = (z) => z && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
      if (inside(zones.prev)) turnPage(-1);
      else if (inside(zones.next)) turnPage(1);
      else {
        const zone = zones.links.find(inside);
        if (zone) follow(paperState.doc.links[zone.link]);
      }
    }

    // A link on a paper: an element of the home page is clicked, so its analytics count; an external link opens
    // in a new tab and, for a credential's verify link, counts the same event as on the Certifications page.
    function follow(link) {
      if (link.el) { link.el.click(); return; }
      const href = new URL(link.href, document.baseURI).href;
      if (!link.external) { window.location.href = href; return; }
      window.open(href, '_blank', 'noopener,noreferrer');
      if (link.ga && typeof window.gtag === 'function') window.gtag('event', link.ga.event, link.ga.params);
    }

    // ── Views: a pass cross-fades the window to its city, and night shows the night image of that city. The last
    // city stays until a reload. A night image loads only at night. ──
    const shown = { key: HOME_VIEW, night: homeView.night, file: homeView.file };
    let viewWanted = { key: HOME_VIEW, night: shown.night }, viewTween = null;
    const fadeLog = [];
    const atZ = (eye, p, z) => eye.clone().lerp(p, (z - eye.z) / (p.z - eye.z));

    // What the window shows, measured at the frame. sights holds the eyes that must see the landmark, at rest and at
    // a pass's paper, each with how far a view point moves at the frame over its orbit. need is the part of the view
    // that the eyes of every station see through the sash, as the rest eye sees it.
    function viewBounds() {
      const E = poses.rest.eye, centre = new THREE.Vector3(CX, (SASH_OPEN.y0 + SASH_OPEN.y1) / 2, FRAME_Z);
      const need = { x0: Infinity, x1: -Infinity, y0: Infinity };
      const sights = [poses.rest, poses.paper].map((pose) => ({ eye: pose.eye, ref: atZ(pose.eye, centre, VIEW_Z), shift: 0 }));
      for (const pose of [poses.rest, poses.desk, poses.paper]) for (const yaw of [-1, 0, 1]) for (const pitch of [-1, 0, 1]) {
        const eye = orbitEye(pose.eye, pose.target, yaw * MAX_TILT, pitch * MAX_TILT, new THREE.Vector3());
        const sight = sights.find((s) => s.eye === pose.eye);
        if (sight) {
          const seen = atZ(eye, sight.ref, FRAME_Z);
          sight.shift = Math.max(sight.shift, Math.abs(seen.x - centre.x), Math.abs(seen.y - centre.y));
        }
        for (const x of [SASH_OPEN.x0, SASH_OPEN.x1]) for (const y of [SASH_OPEN.y0, SASH_OPEN.y1]) {
          const q = atZ(E, atZ(eye, new THREE.Vector3(x, y, FRAME_Z), VIEW_Z), FRAME_Z);
          need.x0 = Math.min(need.x0, q.x);
          need.x1 = Math.max(need.x1, q.x);
          need.y0 = Math.min(need.y0, q.y);
        }
      }
      return { sights, need };
    }

    // Places a view, in frame coordinates as the rest eye sees them. Its landmark sits inside one pane, clear of the
    // wood across the orbit, both at rest and at a pass's paper, at the largest scale up to MAX_VIEW_H. The image also
    // covers what the eyes see through the sash; above the image the blurred top row shows as sky. When both cannot
    // hold, the landmark wins, and covers says so. A night image takes the place of its day image.
    function placeView(mesh, key, texture) {
      const { u, v } = VIEWS[key];
      const aspect = texture.image.width / texture.image.height;
      const { sights, need } = viewBounds();
      // From the frame to the view plane, along rays from the rest eye.
      const E = poses.rest.eye, k = (E.z - VIEW_Z) / (E.z - FRAME_Z);
      // A point at the frame seen from another eye, moved to where the rest eye sees the same view point. The two
      // eyes stand at different distances, so a landmark off the window's centre shows at different places in it.
      const s = (eye) => (eye.z - FRAME_Z) / (eye.z - VIEW_Z);
      const toRest = (p, eye, axis) => E[axis] + (eye[axis] + (p - eye[axis]) / s(eye) - E[axis]) * s(E);
      let best = null;
      for (const pane of PANES) {
        const P = { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
        for (const { eye, shift } of sights) {
          const inset = shift + VIEW_MARGIN;
          P.x0 = Math.max(P.x0, toRest(pane.x0 + inset, eye, 'x'));
          P.x1 = Math.min(P.x1, toRest(pane.x1 - inset, eye, 'x'));
          P.y0 = Math.max(P.y0, toRest(pane.y0 + inset, eye, 'y'));
          P.y1 = Math.min(P.y1, toRest(pane.y1 - inset, eye, 'y'));
        }
        const h = Math.min(MAX_VIEW_H / k, u[1] > u[0] ? (P.x1 - P.x0) / ((u[1] - u[0]) * aspect) : Infinity, (P.y1 - P.y0) / (v[1] - v[0]));
        const least = Math.max((need.x1 - need.x0) / aspect, (need.x1 - P.x1) / ((1 - u[1]) * aspect), (P.x0 - need.x0) / (u[0] * aspect), (P.y0 - need.y0) / (1 - v[1]));
        const covers = least <= h;
        // On a tie the left pane wins, so a landmark sits nearer the middle of the view when the paper takes the left.
        if (!best || covers > best.covers || (covers === best.covers && h > best.h + 0.001)) best = { pane, P, h, covers };
      }
      const { pane, P, h, covers } = best, w = aspect * h;
      const lo = Math.max(P.x0 - u[0] * w, need.x1 - w), hi = Math.min(P.x1 - u[1] * w, need.x0);
      const x0 = lo <= hi ? (lo + hi) / 2 : (P.x0 - u[0] * w + P.x1 - u[1] * w) / 2;
      const y1 = Math.max(P.y0 + v[1] * h, Math.min(P.y1 + v[0] * h, need.y0 + h));
      const px0 = E.x + (x0 - E.x) * k, py1 = E.y + (y1 - E.y) * k, pw = w * k, ph = h * k;
      // The plane reaches VIEW_PAD past the image on every side. Beside the image the image mirrors; above and below
      // it the clamped edge rows show.
      mesh.material.map = texture;
      mesh.scale.set(pw + 2 * VIEW_PAD, ph + 2 * VIEW_PAD, 1);
      mesh.position.set(px0 + pw / 2, py1 - ph / 2, mesh.position.z);
      texture.repeat.set((pw + 2 * VIEW_PAD) / pw, (ph + 2 * VIEW_PAD) / ph);
      texture.offset.set(-VIEW_PAD / pw, -VIEW_PAD / ph);
      const landmark = [];
      for (const uu of new Set(u)) for (const vv of [v[0], (v[0] + v[1]) / 2, v[1]]) landmark.push(new THREE.Vector3(px0 + uu * pw, py1 - vv * ph, VIEW_Z));
      mesh.userData = { ...mesh.userData, key, pane, landmark, heightAtFrame: +h.toFixed(3), covers };
    }

    // At night a view shows its night image; when that fails, the day image with the blue tint.
    const viewTint = (night, file) => (night && !file.includes('-night') ? 0x5a6a9a : 0xffffff);

    async function showView(key = viewWanted.key, ms = FADE_MS) {
      const night = isNight();
      viewWanted = { key, night };
      if (key === shown.key && night === shown.night) return;
      let found;
      try { found = await viewFor(key, night); } catch (error) { console.warn(`Room: the view ${key} did not load.`, error); return; }
      if (viewWanted.key !== key || viewWanted.night !== night || signal.aborted) return;
      if (viewTween) { tweens.delete(viewTween); viewTween = null; }
      placeView(viewB, key, found.texture);
      viewB.material.color.set(viewTint(night, found.file));
      viewB.material.opacity = 0;
      viewB.visible = true;
      Object.assign(shown, { key, night, file: found.file });
      const log = { file: found.file, start: performance.now(), end: null };
      fadeLog.push(log);
      viewTween = tween(ms, (k) => { viewB.material.opacity = k; }, () => {
        placeView(viewA, key, found.texture);
        viewA.material.color.copy(viewB.material.color);
        viewB.visible = false;
        viewTween = null;
        log.end = performance.now();
      });
    }

    // ── Light: html[data-theme="dark"] is night ──
    let glow = 0, screenGlow = 0;
    function applyLighting() {
      const night = isNight();
      sun.intensity = night ? 0 : 3.5;
      lampLight.intensity = night ? 1.8 : 0.4;
      hemi.intensity = night ? 0.22 : 1.1;
      windowLight.intensity = night ? 0.9 : 2;
      windowLight.color.set(night ? 0x8ea6ff : 0xfff0dc);
      // The faces glow a little, so they stay readable in the dim room at night. The laptop screen glows more.
      glow = night ? 0.25 : 0.12;
      screenGlow = night ? 0.9 : 0.45;
      for (const object of tintables) tint(object, object === hovered);
      paper.material.color.set(night ? 0xe4e7ee : 0xffffff);
      renderer.shadowMap.needsUpdate = true;
      if (night !== shown.night) showView(viewWanted.key, NIGHT_FADE_MS);
      invalidate();
    }

    // ── Camera: the stations, a 900 ms move between them, and the mouse orbit on top ──
    const poses = {};
    const itemPoses = new Map();
    const cam = { eye: new THREE.Vector3(), target: new THREE.Vector3() };   // the pose before the orbit
    const look = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 };
    const spherical = new THREE.Spherical();
    const probeCamera = new THREE.PerspectiveCamera();

    // Fits a w x h rectangle centred at c into the view, seen along -n. shift moves it right by that share of the
    // half width, which leaves the left of the view to the paper.
    function frame(c, n, w, h, fill = 0.92, shift = 0) {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) / fill;
      const dir = n.clone().normalize();
      const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
      const target = c.clone().addScaledVector(right, -shift * d * t * camera.aspect);
      return { eye: target.clone().addScaledVector(dir, d), target };
    }

    // An item beside the paper: the item in the right part of the view, with at least 0.5 m around it in view.
    function besidePaper(object, n, place) {
      const b = new THREE.Box3().setFromObject(place || object), size = b.getSize(new THREE.Vector3());
      const across = Math.abs(n.x) > 0.5 ? size.z : size.x;
      return frame(b.getCenter(new THREE.Vector3()), n, Math.max(across, 0.5) / 0.44, Math.max(size.y, 0.5), 0.9, 0.5);
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
      for (const { mesh } of passItems) span.expandByObject(mesh);
      let pose;
      for (let scale = Math.min(1, stage.clientHeight / DESK_EYE.refH), i = 0; i < 16; i++, scale *= 1.05) {
        const eye = new THREE.Vector3(DESK.x, DESK.top + DESK_EYE.up * scale, DX.z1 + DESK_EYE.back * scale);
        const pitch = Math.atan2(eye.y - DESK.top, eye.z - DX.z1) - Math.atan(0.9 * t);
        pose = { eye, target: eye.clone().add(new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch)).multiplyScalar(eye.z / Math.cos(pitch))) };
        const wide = [span.min.x, span.max.x].some((x) => Math.abs(ndcIn(pose, new THREE.Vector3(x, DESK.top, span.max.z)).x) > 0.95);
        if (!wide) break;
      }
      return pose;
    }

    // The paper station of a pass: the eye on the line from the window's centre through the rest eye, so a landmark
    // shows where it shows at rest, far enough for the window to fit the right part of the view; the view turns
    // until it does.
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

    const leftWall = new THREE.Vector3(1, 0, 0), rightWall = new THREE.Vector3(-1, 0, 0);   // the walls' normals
    const phoneNormal = new THREE.Vector3(-0.3, 0.85, 1);
    function computePoses() {
      scene.updateMatrixWorld();
      poses.rest = { eye: new THREE.Vector3(...REST.eye), target: new THREE.Vector3(...REST.target) };
      poses.desk = deskPose();
      poses.paper = paperPose();
      poses.laptop = laptopPose();
      const span = (entries, extra = []) => {
        const b = new THREE.Box3();
        for (const e of entries) b.expandByObject(e.object);
        for (const o of extra) b.expandByObject(o);
        return b;
      };
      const shelfBox = span([...trophyItems, ...certItems, ...medalItems], [shelfParts]);
      poses.awards = frame(shelfBox.getCenter(new THREE.Vector3()).setX(WX), rightWall, shelfBox.max.z - shelfBox.min.z + 0.12, shelfBox.max.y - shelfBox.min.y + 0.1, 0.94);
      const wallBox = span(posterItems);
      poses.projects = frame(wallBox.getCenter(new THREE.Vector3()).setX(ROOM.x0), leftWall, wallBox.max.z - wallBox.min.z + 0.12, wallBox.max.y - wallBox.min.y + 0.1, 0.94);
      const fanBox = new THREE.Box3();
      for (const e of cardItems) fanBox.expandByPoint(e.places.fan.position);
      poses.letters = frame(fanBox.getCenter(new THREE.Vector3()), fanNormal, fanBox.max.x - fanBox.min.x + CARD.w + 0.16, CARD.h + 0.36, 0.95);
      poses.contact = besidePaper(phone, phoneNormal);
      for (const e of [...trophyItems, ...certItems, ...medalItems]) itemPoses.set(e, besidePaper(e.object, rightWall));
      for (const e of posterItems) itemPoses.set(e, besidePaper(e.object, leftWall));
      for (const e of cardItems) {
        const place = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w, CARD.h));
        place.position.copy(e.places.fan.position);
        place.quaternion.copy(e.places.fan.quaternion);
        place.updateMatrixWorld();
        itemPoses.set(e, besidePaper(null, fanNormal, place));
        place.geometry.dispose();
      }
    }

    function poseFor(s) {
      if (s.item) return s.station === 'desk' ? poses.paper : itemPoses.get(items.get(`${s.station}/${s.item}`));
      return poses[s.station];
    }

    // The mouse orbits the eye about the target by up to 3 degrees, so the view behind the window shifts.
    function orbitEye(eye, target, yaw, pitch, out) {
      spherical.setFromVector3(out.copy(eye).sub(target));
      const k = Math.min(1, ORBIT_D / spherical.radius);
      spherical.phi -= pitch * k;
      spherical.theta += yaw * k;
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
      const entry = id && items.get(`desk/${id}`);
      if (!entry) return;
      const { mesh, object: holder } = entry;
      tweens.delete(lifts.get(id));
      const y0 = holder.position.y, r0 = mesh.rotation.x;
      lifts.set(id, tween(300, (k) => {
        const e = easeOut(k);
        holder.position.y = y0 + ((up ? holder.userData.base + PASS.lift : holder.userData.base) - y0) * e;
        mesh.rotation.x = r0 + ((up ? -Math.PI / 2 + 0.14 : -Math.PI / 2) - r0) * e;
      }));
      renderer.shadowMap.needsUpdate = true;
    }

    // #letters fans the postcards out above the desk; leaving it puts them back in the tray. A chosen card comes
    // forward a little.
    let fanned = false, chosenCard = null;
    const cardTweens = new Map();
    function arrangeCards(open, chosen) {
      if (open === fanned && chosen === chosenCard) return;
      const moved = open !== fanned;
      fanned = open;
      chosenCard = chosen;
      cardItems.forEach((entry, i) => {
        const card = entry.object, place = entry.places[open ? 'fan' : 'tray'];
        const p0 = card.position.clone(), q0 = card.quaternion.clone();
        const p1 = place.position.clone();
        if (open && entry.id === chosen) p1.addScaledVector(fanNormal, 0.05);
        tweens.delete(cardTweens.get(entry));
        const delay = moved ? (open ? i : quotes.length - 1 - i) * 0.05 : 0;
        cardTweens.set(entry, tween(moved ? 900 : 300, (k) => {
          const e = easeInOut(Math.min(1, Math.max(0, (k - delay) / (1 - delay))));
          card.position.lerpVectors(p0, p1, e);
          // The card rises above the tray on its way, so it never passes through the desk.
          if (moved) card.position.y += Math.sin(Math.PI * e) * 0.08;
          card.quaternion.slerpQuaternions(q0, place.quaternion, e);
        }, () => { renderer.shadowMap.needsUpdate = true; }));
      });
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
      requestAnimationFrame(renderFrame);
    }

    function renderFrame(now) {
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
      if (cardTweens.size && [...cardTweens.values()].some((t) => tweens.has(t))) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      if (tweens.size || turning) invalidate();
      else last = 0;
    }

    // ── Hover, the pass tooltip and click ──
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerAt = { x: 0, y: 0 };
    let pointerIn = false, hovered = null, tipHeld = false;
    const itemObjects = [...items.values()].map((e) => e.object);
    const targets = [paper, ...itemObjects, shelfParts, trayGroup, phone, print, laptop, lamp, ...deskParts];
    const tintables = [...itemObjects, phone, print, laptop];

    function pick() {
      if (!pointerIn) return null;
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        let o = hit.object;
        while (o && !o.userData.kind) o = o.parent;
        if (!o || (o === paper && !paperState.key)) continue;
        return { kind: o.userData.kind, object: o.userData.kind === 'screen' ? laptop : o, station: o.userData.station, id: o.userData.id, uv: hit.uv };
      }
      return null;
    }

    function tint(object, on) {
      if (object === lamp) {
        lamp.traverse((o) => { if (o.isMesh) o.material.emissive.setHex(on ? 0x3a2410 : 0x000000); });
      } else if (object === laptop) {
        laptop.traverse((o) => { if (o.isMesh && o !== screen) o.material.emissive.setScalar(on ? 0.12 : 0); });
        screen.material.emissive.setScalar(1);
        screen.material.emissiveIntensity = screenGlow + (on ? 0.12 : 0);
      } else {
        object.traverse((o) => { if (o.isMesh && o.material.emissive) o.material.emissive.setScalar(Math.min(0.45, (o.material.userData.lit ?? 0) * glow) + (on ? 0.12 : 0)); });
      }
    }

    // A light tint marks what a click would act on. With a paper open, only the station's other items light up: a
    // click on one opens its paper, and any other click closes the paper. The shelf and the tray share the room's
    // wood, so they take no tint; their items do.
    function setHovered(hit) {
      const lit = hit && (hit.kind !== 'item' || hit.id || hit.object === phone);
      const acts = hit && (paper.visible ? sameStation(hit) : ['item', 'lamp', 'laptop', 'screen', 'print'].includes(hit.kind));
      const next = acts && lit ? hit.object : null;
      showTip(acts ? hit : null);
      if (next === hovered) return;
      if (hovered) tint(hovered, false);
      if (next) tint(next, true);
      hovered = next;
    }

    // The tooltip, next to the pointer while the camera rests: what an object is, in the page's own words, and what a
    // click on it does. A pass shows its company, role and dates. The tray and the shelf take the names of their
    // sections on the page, and the lamp the label of the theme button.
    tip = document.createElement('div');
    tip.className = 'ed-room__tip';
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    section.appendChild(tip);
    const themeButton = document.querySelector('[data-action="toggle-theme"]');
    const groupNames = {
      awards: clean(document.querySelector('.ed-topbar__nav a[href="certificates.html"]')),
      letters: clean(document.getElementById('team-title')),
    };
    const CLOSER = 'Click to go closer', READ = 'Click to read', OPEN = 'Click to open';
    function tipRows(hit) {
      const at = state.station;
      if (hit.kind === 'lamp') return [['b', themeButton?.getAttribute('aria-label') || '']];
      if (hit.kind === 'screen' || hit.kind === 'laptop') return [['b', 'Evaluate role fit'], ['i', at !== 'laptop' ? CLOSER : hit.kind === 'screen' ? OPEN : '']];
      if (hit.kind === 'print') return [['b', clean(cvLink)], ['i', at === 'desk' ? OPEN : CLOSER]];
      if (hit.kind !== 'item') return null;
      if (hit.object === phone) return [['b', clean(talkLink)], ['i', READ]];
      if (!hit.id) return groupNames[hit.station] && hit.station !== at ? [['b', groupNames[hit.station]], ['i', CLOSER]] : null;
      return [...items.get(`${hit.station}/${hit.id}`).tip, ['i', hit.station === at ? READ : CLOSER]];
    }
    let tipKey = null;
    function showTip(hit) {
      const rows = hit && !camTween && !tipHeld ? tipRows(hit) : null;
      if (!rows) { tip.hidden = true; return; }
      const key = rows.flat().join('|');
      if (key !== tipKey) {
        tipKey = key;
        tip.replaceChildren(...rows.filter(([, text]) => text).map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
      }
      tip.hidden = false;
      const box = section.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let x = pointerAt.x - box.left + 18, y = pointerAt.y - box.top + 18;
      if (x + w > box.width - 8) x = pointerAt.x - box.left - w - 18;
      if (y + h > box.height - 8) y = box.height - h - 8;
      tip.style.transform = `translate(${Math.max(8, Math.round(x))}px, ${Math.max(8, Math.round(y))}px)`;
    }

    function setPointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      pointerAt.x = event.clientX;
      pointerAt.y = event.clientY;
      pointerIn = true;
    }

    section.addEventListener('pointermove', (event) => {
      setPointer(event);
      look.toYaw = pointer.x * MAX_TILT;
      look.toPitch = pointer.y * MAX_TILT;
      tipHeld = false;
      pointerDirty = true;
      invalidate();
    }, { signal });
    section.addEventListener('pointerleave', () => {
      pointerIn = false;
      look.toYaw = look.toPitch = 0;
      pointerDirty = true;
      invalidate();
    }, { signal });

    // Two clicks, always: from rest or another station a click on an object goes to its station, and only there does
    // an item open its paper. With a paper open, another item of the station opens its own paper at once. The
    // telephone opens the contact paper at once.
    const sameStation = (hit) => hit?.kind === 'item' && !!hit.id && hit.station === state.station;
    canvas.addEventListener('click', (event) => {
      setPointer(event);
      tipHeld = true;
      tip.hidden = true;
      const hit = pick();
      if (paperState.key) {
        if (hit?.kind === 'paper' && hit.uv) clickPaper(hit.uv);
        else if (sameStation(hit)) go(`${hit.station}/${hit.id}`);
        else back();
        return;
      }
      if (!hit) return;
      const at = state.station;
      if (hit.kind === 'lamp') document.querySelector('[data-action="toggle-theme"]')?.click();
      else if (hit.kind === 'screen' && at === 'laptop') aiTrigger.click();
      else if (hit.kind === 'laptop' || hit.kind === 'screen') go('laptop');
      else if (hit.kind === 'print' && at === 'desk') cvLink.click();
      else if (hit.kind === 'print' || hit.kind === 'desk') { if (at !== 'desk') go('desk'); }
      else if (hit.kind === 'item' && hit.station !== at) go(hit.station);
      else if (hit.kind === 'item' && hit.id) go(`${hit.station}/${hit.id}`);
    }, { signal });

    // ── Stations and URLs: rest has no hash. The stations are #desk, #laptop, #awards (the shelf), #projects (the
    // posters), #letters (the postcards) and #contact (the telephone); a chosen item is #<station>/<id>. ──
    const state = { station: 'rest', item: null };
    const keyOf = (s) => (s.item ? `${s.station}/${s.item}` : s.station === 'contact' ? 'contact' : null);
    const docFor = (key) => (key === 'contact' ? contact.doc : items.get(key).doc);
    function readHash() {
      const m = window.location.hash.match(/^#(desk|laptop|awards|projects|letters|contact)(?:\/([a-z0-9-]+))?$/);
      if (!m) return { station: 'rest', item: null };
      return { station: m[1], item: m[2] && items.has(`${m[1]}/${m[2]}`) ? m[2] : null };
    }

    // Entering a station from rest adds one history entry; every later move replaces it, so Back returns to rest.
    function go(hash) {
      if (state.station === 'rest') { window.location.hash = hash; return; }
      window.history.replaceState(null, '', `#${hash}`);
      apply();
    }

    // One level back, for Esc and the Back button: a paper closes to its station, and a station returns to rest.
    function back() {
      if (state.item) go(state.station);
      else if (state.station !== 'rest') window.history.back();
    }

    function apply() {
      const next = readHash();
      if (next.station === state.station && next.item === state.item) return;
      const was = { ...state };
      Object.assign(state, next);
      section.classList.toggle('is-away', state.station !== 'rest');
      backButton.hidden = state.station === 'rest';
      const pass = (s) => (s.station === 'desk' ? s.item : null);
      if (pass(was) !== pass(state)) { lift(pass(was), false); lift(pass(state), true); }
      arrangeCards(state.station === 'letters', state.station === 'letters' ? state.item : null);
      const key = keyOf(state);
      showPaper(key);
      if (key) announce(key);
      if (pass(state)) showView(items.get(`desk/${state.item}`).pass.view);
      tip.hidden = true;
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

    // ── The hidden HTML copy: one button per item in the room, the laptop and the CV, and the open paper's text in
    // a live region. The open paper's links follow the button that opened it. ──
    const paperLinks = document.createElement('li');
    const control = (text, onClick) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ed-room__pass';
      button.textContent = text;
      button.addEventListener('click', onClick, { signal });
      li.appendChild(button);
      return li;
    };
    const itemControls = new Map();
    const itemControl = (entry) => {
      const li = control(entry.name, () => go(`${entry.station}/${entry.id}`));
      itemControls.set(`${entry.station}/${entry.id}`, li);
      return li;
    };
    const contactControl = control(contact.name, () => go('contact'));
    itemControls.set('contact', contactControl);
    list.replaceChildren(
      ...passItems.map(itemControl),
      control('Evaluate role fit', () => aiTrigger.click()),
      control('View CV', () => cvLink.click()),
      ...[...trophyItems, ...certItems, ...medalItems, ...posterItems, ...cardItems].map(itemControl),
      contactControl,
    );

    function announce(key) {
      const { blocks, links } = docFor(key);
      const paragraphs = [];
      let head = [];
      for (const b of blocks) {
        if (b.title || b.line) { head.push(b.title || b.line); continue; }
        if (head.length) { paragraphs.push(`${head.join(', ')}.`); head = []; }
        if (b.head || b.text || b.bullet) paragraphs.push(b.head || b.text || b.bullet);
      }
      if (head.length) paragraphs.push(`${head.join(', ')}.`);
      live.replaceChildren(...paragraphs.map((text) => Object.assign(document.createElement('p'), { textContent: text })));
      paperLinks.replaceChildren(...links.map((link) => {
        const a = document.createElement('a');
        a.className = 'ed-room__pass';
        a.textContent = link.text;
        a.href = link.el ? link.el.getAttribute('href') : link.href;
        if (link.el || link.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.addEventListener('click', (event) => { event.preventDefault(); follow(link); });
        return a;
      }));
      itemControls.get(key)?.after(paperLinks);
    }

    // ── Observers ──
    const resize = new ResizeObserver(() => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      computePoses();
      placeView(viewA, viewA.userData.key, viewA.material.map);
      if (viewB.visible) placeView(viewB, viewB.userData.key, viewB.material.map);
      finishFlip();
      if (paperState.key) layoutPaper(paperState.key, paperState.page);
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
    placeView(viewA, HOME_VIEW, homeView.texture);
    viewA.material.color.set(viewTint(shown.night, shown.file));
    applyLighting();
    cam.eye.copy(poses.rest.eye);
    cam.target.copy(poses.rest.target);
    // A load with a station or an item hash opens that state above a rest entry, so Esc and Back return to rest.
    const opened = readHash();
    if (opened.station !== 'rest') {
      const hash = window.location.hash;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      window.history.pushState(null, '', hash);
      apply();
      for (const t of [camTween, ...cardTweens.values()]) if (t && tweens.has(t)) { tweens.delete(t); t.step(1); t.done?.(); }
      camTween = null;
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
    async function landmarkSweep(file = shown.key, station = 'rest') {
      const { texture: t } = await viewFor(file, false);
      const keep = { map: viewA.material.map, key: viewA.userData.key };
      placeView(viewA, file, t);
      const { pane, heightAtFrame, covers } = viewA.userData;
      const out = { file, station, pane: PANES.indexOf(pane) ? 'right' : 'left', heightAtFrame, covers, corners: {} };
      const pose = poses[station];
      for (const yaw of [-3, 0, 3]) for (const pitch of [-3, 0, 3]) {
        placeCamera(pose.eye, pose.target, THREE.MathUtils.degToRad(yaw), THREE.MathUtils.degToRad(pitch));
        out.corners[`${yaw},${pitch}`] = landmarkVisible();
      }
      placeView(viewA, keep.key, keep.map);
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
    // The smallest marked text of each kind of face, the smallest text on the paper's page, and the laptop title.
    // A face counts only when it is on screen.
    function textPx() {
      const result = { capRatio: { sans: capRatio(SANS), hand: capRatio(HAND) }, faces: {} };
      scene.updateMatrixWorld();
      for (const mesh of faces) {
        const { face } = mesh.userData;
        let o = mesh;
        while (o && !o.userData.kind) o = o.parent;
        const owner = o?.userData.kind === 'item' ? `${o.userData.station}/${o.userData.id}` : o?.userData.kind;
        for (const m of face.marks) {
          ndc.set(m.x - face.w / 2, face.h / 2 - m.base, 0).applyMatrix4(mesh.matrixWorld).project(camera);
          if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1) continue;
          const px = +projectedEm(mesh, face.w, face.h, m.x, m.base, m.size).toFixed(2);
          const kind = `${owner.split('/')[0]}:${m.mark}`;
          if (!(kind in result.faces) || px < result.faces[kind].px) result.faces[kind] = { px, at: owner };
        }
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
    const centreOf = (o) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    // A point on the paper, from CSS px on the paper.
    const paperPoint = (x, y) => {
      const { W, H } = paperState.notes, S = NOTE.shadow;
      return screenPoint(new THREE.Vector3((S + x) / (W + 2 * S) - 0.5, 0.5 - (S + y) / (H + 2 * S), 0).applyMatrix4(paper.matrixWorld));
    };
    const zonePoint = (z) => (z ? paperPoint((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2) : null);

    window.__room = {
      state: () => ({ ...state, pass: state.station === 'desk' ? state.item : null, settled: tweens.size === 0, view: shown.key, viewFile: shown.file, page: paperState.page, hover: hovered?.userData.kind === 'item' ? `${hovered.userData.station}/${hovered.userData.id}` : hovered?.userData.kind ?? null, tip: !tip.hidden, flipping: !!paperState.flip }),
      landmarkVisible,
      landmarkSweep,
      textPx,
      items: () => [...items.keys()],
      paperText: () => paperState.notes?.pages.flat().filter(Boolean).map((l) => l.text).join(' ') ?? null,
      pageText: (i) => paperState.notes?.pages[i]?.filter(Boolean).map((l) => l.text).join(' ') ?? null,
      flips: () => flipLog.map((f) => ({ step: f.step, ms: f.end && Math.round(f.end - f.start) })),
      setFlipMs: (ms) => { flipMs = ms; },
      fades: () => fadeLog.map((f) => ({ file: f.file, ms: f.end && Math.round(f.end - f.start) })),
      itemPoint: (key) => { const e = items.get(key); return e && screenPoint(e.mesh ? e.mesh.localToWorld(new THREE.Vector3(-PASS.w / 4, PASS_H / 6, 0)) : centreOf(e.object)); },
      passPoint: (id) => window.__room.itemPoint(`desk/${id}`),
      objectPoint: (name) => screenPoint(centreOf({ shelf: shelfParts, tray: trayGroup, phone, plant }[name])),
      screenPoint: () => screenPoint(centreOf(screen)),
      printPoint: () => screenPoint(print.getWorldPosition(new THREE.Vector3())),
      deskPoint: () => screenPoint(new THREE.Vector3(DX.x1 - 0.12, DESK.top, DX.z0 + 0.12)),
      lampPoint: () => screenPoint(lampLight.getWorldPosition(new THREE.Vector3())),
      linkPoint: (i = 0) => zonePoint(paperState.zones.links.find((z) => z.link === i)),
      paperRect: () => {
        if (!paper.visible) return null;
        const [a, b] = [[-0.5, 0.5], [0.5, -0.5]].map(([x, y]) => screenPoint(new THREE.Vector3(x, y, 0).applyMatrix4(paper.matrixWorld)));
        return { left: a.x, top: a.y, right: b.x, bottom: b.y };
      },
      landmarkScreen: () => viewA.userData.landmark.map((p) => screenPoint(p)),
      arrowPoint: (side) => zonePoint(paperState.zones[side]),
      info: () => ({ ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs.length }),
    };
  }
}

// The view plane reaches past its image. Above and below, the clamped edge rows repeat; a blurred outer row makes
// that area a smooth band of sky or ground instead of streaks, such as a TV tower's tip repeated upwards. Beside the
// image the texture mirrors, so the city goes on where a repeated edge column smeared into stripes.
function softEdges(image) {
  const c = document.createElement('canvas');
  const w = c.width = image.width, h = c.height = image.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0);
  for (const [x, y, n, horizontal] of [[0, 0, w, true], [0, h - 1, w, true]]) {
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
      texture.wrapS = THREE.MirroredRepeatWrapping;
      return texture;
    }, (error) => { viewTextures.delete(file); throw new Error(`views/${file} did not load`, { cause: error }); }));
  }
  return viewTextures.get(file);
}

// The image for a view: at night its night file, and the day file when that fails.
async function viewFor(key, night) {
  if (night) {
    try { return { file: VIEWS[key].night, texture: await loadView(VIEWS[key].night) }; } catch (error) {
      console.warn(`Room: the night view for ${key} did not load, so the day view shows with a blue tint.`, error);
    }
  }
  return { file: key, texture: await loadView(key) };
}

// The first view: a failure here fails the room, as the day view did before.
async function firstView(key, night) {
  const { file, texture } = await viewFor(key, night);
  return { file, night, texture };
}
