/*
 * room.js — the 3D room on the home page: a wide room with a wooden window above a long desk. On the desk lie five
 * boarding passes in a pile, a laptop, a CV printout, a tray of business cards, a telephone, a radio and a mug of
 * coffee. An awards shelf hangs on the right wall and framed posters on the left wall. A chosen item shows its text on
 * a lined paper held in front of the camera. Objects play short sounds on hover and on click. room-boot.js imports
 * this module behind ?room=1 and calls start(section). start() resolves after the first frame. Until then any failure
 * removes every listener and rejects, and room-boot.js hides the room. All text comes from the site's own pages:
 * experience.html, certificates.html and portfolio.html, read the same way as assets/js/ai-match.js, and the home page
 * itself. Where the home page has a link or a button, the room clicks it.
 */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

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
// The desk's two pedestals, each w wide with four drawers sized by shares from the bottom up. The stiles, the rails
// and the gap round each drawer front, the plinth's top and the feet's height are in metres.
const PEDESTAL = { w: 0.63, shares: [137, 110, 97, 75], stile: 0.028, rail: 0.014, gap: 0.004, plinth: 0.1, feet: 0.058 };
const LEATHER_INSET = 0.045;   // the leather top's inset from the rim
// The passes lie in a row along the front of the desk with small gaps: a stub, a perforation and a body.
const PASS = { w: 0.264, stub: 0.06, gap: 0.026, band: 0.012, r: 0.01, pad: 0.012, code: 0.05, company: 0.032, lift: 0.03 };
const LAPTOP = { x: 0.55, z: 0.37, scale: 0.55, tilt: 0.2 };   // tilt: the lid leans back by this angle in radians
// The CV printout lies at the telephone's front-left, between the laptop and the phone and behind the spread passes.
const PRINT = { x: 0.89, z: 0.55, w: 0.15, h: 0.212, turn: 0.12 };
const TRAY = { x: -0.31, z: 0.47, w: 0.27, d: 0.2, turn: -0.1 };
const CARD = { w: 0.17, h: 0.11 };   // a business card: 85 x 55 mm, at twice the size
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
// The radio stands at the back left corner of the desk, in front of the sill and below it, so it never hides a pane.
const RADIO = { x: -0.3, z: 0.245, turn: 0.22, w: 0.26, h: 0.15, d: 0.12 };
// The coffee mug stands right of the laptop, behind the CV printout and near the lamp. turn points its handle to the
// front right. A full mug holds sips sips.
const MUG = { x: 0.87, z: 0.27, turn: -0.5, r: 0.055, h: 0.095, sips: 5 };
// Steam rises from the coffee: a wisp every STEAM.every ms, each for STEAM.life ms and at most STEAM.opacity opaque,
// at most STEAM.max at once. It rises for STEAM.arrive ms after the camera arrives at #desk and for STEAM.sip ms after
// a sip.
const STEAM = { every: 120, life: 1800, max: 16, rise: 0.15, size: 0.034, opacity: 0.7, arrive: 4000, sip: 3000 };
// The sound effects in sfx/: one hover sound for each kind of object, a page turn and a sip. A click on an object
// plays its hover sound, and a click on the coffee the sip. The same sound plays again only after SFX_GAP ms, at most
// SFX_VOICES play at once, and a sound that is still loading plays when it arrives within SFX_LATE ms.
const SFX = ['hover-pass', 'hover-laptop', 'hover-cv', 'hover-radio', 'hover-phone', 'hover-coffee', 'hover-cards', 'hover-poster',
  'hover-trophy', 'hover-certificate', 'hover-medal', 'hover-lamp', 'flip', 'sip'];
const SFX_GAIN = { hover: 0.25, effect: 0.5 }, SFX_GAP = 150, SFX_VOICES = 2, SFX_LATE = 600;
// The decor. The bookshelf stands in the back left corner, clear of the desk and of the posters' sight lines; the
// tall plant stands in the back right corner, its leaves clear of the shelf's sight lines; the clock hangs right of
// the window. FLOOR.tile is the size of one floorboard texture in metres.
const BOOKSHELF = { x0: -1.25, x1: -0.53, d: 0.25, h: 1.95 };
const TALL_PLANT = { x: 2.28, z: 0.2 };
const CLOCK = { x: 1.88, y: 2.0, r: 0.16 };
const FLOOR = { tile: 1.2 };
const RUG = { x: 0.55, z: 1.65, w: 2.3, d: 1.9 };
// The play order of the five tracks by file number: the ballad, track-5.mp3, plays first.
const PLAY_ORDER = [5, 1, 2, 6, 4];
const TRACKS = PLAY_ORDER.length;
// Music notes rise from the radio while it plays: one every NOTES.every ms, each for NOTES.life ms, at most NOTES.max.
const NOTES = { every: 600, life: 2000, max: 6, rise: 0.3, size: 0.06, fps: 30 };
// The glow tour lights each station's objects in turn for TOUR_STEP_MS, up to PULSE, once the canvas has faded in
// (CANVAS_FADE_MS, as in editorial.css). HOVER is the hover tint.
const HOVER = 0.12, PULSE = 0.3, TOUR_STEP_MS = 600, CANVAS_FADE_MS = 600;

// The lined paper, laid out in CSS px: it hangs at a fixed place in front of the camera, so its size on screen
// never changes. Each line of text sits on a ruled line.
const HAND = '"Patrick Hand", "Comic Sans MS", cursive';
const PEN = '#1d2740';
const NOTE = { body: 19, head: 23, title: 27, line: 32, left: 92, right: 34, top: 66, bottom: 64, chars: 70, bullet: 22, shadow: 18 };
// Where the paper sits on the stage: on the left, below the Back button and above the station links, up to SHARE of
// the width.
const NOTE_BOX = { left: 24, top: 72, bottom: 48, share: 0.52, maxW: 720 };

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
  f.write('CV', x, 0.062, 0.05, { weight: 600, mark: 'title' });
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

// The front of a business card: the name, the job title and the company, and the photo in a round frame. Without a
// photo the frame shows the initials. The role splits at its last " at " into the title and the company.
function cardFace(quote, photo) {
  const f = new Face(CARD.w, CARD.h, 2800), { g, ppm: p } = f;
  const W = f.canvas.width, H = f.canvas.height;
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, W, H);
  g.fillStyle = CLAY;
  g.fillRect(0, 0, 0.005 * p, H);
  const r = 0.022 * p, cx = W - 0.012 * p - r, cy = 0.012 * p + r;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  if (photo) {
    const k = Math.max((2 * r) / photo.width, (2 * r) / photo.height), cw = (2 * r) / k, ch = (2 * r) / k;
    g.drawImage(photo, (photo.width - cw) / 2, (photo.height - ch) / 2, cw, ch, cx - r, cy - r, 2 * r, 2 * r);
  } else {
    g.fillStyle = '#ece4d6';
    g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.fillStyle = '#6b5a3e';
    g.font = `600 ${0.017 * p}px ${SANS}`;
    g.textAlign = 'center';
    g.fillText(quote.name.split(' ').map((w) => w[0]).join('').slice(0, 2), cx, cy + 0.006 * p);
  }
  g.restore();
  g.strokeStyle = 'rgba(29, 27, 24, 0.18)';
  g.lineWidth = 0.0006 * p;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  const at = quote.role.lastIndexOf(' at ');
  const title = at < 0 ? quote.role : quote.role.slice(0, at), company = at < 0 ? '' : quote.role.slice(at + 4);
  const x = 0.016, wide = CARD.w - x - 0.014;
  const next = f.write(quote.name, x, 0.03, 0.016, { weight: 600, maxW: (cx - r) / p - 0.008 - x, lines: 2, lead: 1.08, mark: 'name' });
  // A short clay rule under the name, then the title, and the company at the foot of the card.
  const rule = next - 0.016 * 1.08 + 0.0065;
  g.fillStyle = CLAY;
  g.fillRect(x * p, rule * p, 0.022 * p, 0.0009 * p);
  f.write(title, x, rule + 0.0135, 0.0105, { color: INK_SOFT, maxW: wide, lines: 2, lead: 1.2, mark: 'role' });
  if (company) f.write(company, x, CARD.h - 0.013, 0.0115, { weight: 600, maxW: wide, mark: 'company' });
  return f;
}

// The radio's speaker grille: gold metal with a fine grid of round holes.
function grilleFace(w, h) {
  const f = new Face(w, h, 2400), { g, ppm: p } = f;
  const grad = g.createLinearGradient(0, 0, f.canvas.width, f.canvas.height);
  grad.addColorStop(0, '#b8924a');
  grad.addColorStop(0.5, '#dcbf7e');
  grad.addColorStop(1, '#b08944');
  g.fillStyle = grad;
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  g.fillStyle = 'rgba(40, 28, 14, 0.78)';
  const step = 0.0042 * p, r = 0.0011 * p;
  for (let y = step / 2; y < f.canvas.height; y += step) for (let x = step / 2; x < f.canvas.width; x += step) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  return f;
}

// The radio's right panel: brushed gold, its streaks running across.
function panelFace(w, h) {
  const f = new Face(w, h, 2400), { g } = f, rand = random(17);
  g.fillStyle = '#d7bb7c';
  g.fillRect(0, 0, f.canvas.width, f.canvas.height);
  for (let y = 0; y < f.canvas.height; y += 2) {
    g.fillStyle = `rgba(${rand() < 0.5 ? '255, 240, 200' : '120, 90, 40'}, ${0.05 + rand() * 0.12})`;
    g.fillRect(0, y, f.canvas.width, 1 + rand() * 2);
  }
  return f;
}

// The tuning dial's ring: dark brown with a ring of cream tick marks, every fifth one longer. No numbers.
function dialFace(r) {
  const f = new Face(2 * r, 2 * r, 2400), { g } = f;
  const R = f.canvas.width / 2;
  g.beginPath();
  g.arc(R, R, R * 0.98, 0, Math.PI * 2);
  g.fillStyle = '#3b2518';
  g.fill();
  g.strokeStyle = '#efe2c4';
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, long = i % 5 === 0;
    g.lineWidth = R * (long ? 0.035 : 0.022);
    g.beginPath();
    g.moveTo(R + Math.cos(a) * R * (long ? 0.74 : 0.8), R + Math.sin(a) * R * (long ? 0.74 : 0.8));
    g.lineTo(R + Math.cos(a) * R * 0.9, R + Math.sin(a) * R * 0.9);
    g.stroke();
  }
  return f;
}

// A music note in white ink, tinted by its sprite: an eighth note, a beamed pair or a sixteenth.
function noteArt(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  const head = (x, y) => { g.save(); g.translate(x, y); g.rotate(-0.38); g.beginPath(); g.ellipse(0, 0, 15, 10.5, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  const stem = (x, top, bottom) => g.fillRect(x - 3, top, 6, bottom - top);
  const flag = (x, y) => {
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 4, y + 16, x + 28, y + 22, x + 20, y + 52);
    g.bezierCurveTo(x + 21, y + 32, x + 10, y + 27, x, y + 24);
    g.closePath();
    g.fill();
  };
  if (kind === 1) {
    head(30, 104);
    head(94, 92);
    stem(41, 24, 102);
    stem(105, 12, 90);
    g.beginPath();
    g.moveTo(38, 24);
    g.lineTo(108, 10);
    g.lineTo(108, 25);
    g.lineTo(38, 39);
    g.closePath();
    g.fill();
  } else {
    head(46, 100);
    stem(58, 12, 98);
    flag(58, 12);
    if (kind === 2) flag(58, 32);
  }
  return c;
}

// The coffee seen from above: dark coffee with a thin light ring of crema at the rim.
function coffeeArt() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), R = 128;
  const grad = g.createRadialGradient(R, R, 0, R, R, R);
  for (const [at, color] of [[0, '#43261a'], [0.6, '#2e180e'], [0.82, '#2a150b'], [0.87, '#6e4527'], [0.92, '#d3a878'], [0.96, '#e4c597'], [1, '#a2724a']]) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// A wisp of steam: a soft white blob, twice as tall as it is wide.
function steamArt() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.translate(32, 64);
  g.scale(1, 2);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.32)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(-32, -32, 64, 64);
  return c;
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

// The colours of a wood: its base, its dark and light bands and its grain lines, and the seed of its pattern. The room
// is walnut; the desk is a warmer, redder mahogany.
const WALNUT = { base: '#93603a', dark: '120, 72, 38', light: '178, 122, 76', grain: '64, 34, 16', seed: 11 };
const MAHOGANY = { base: '#a0503a', dark: '132, 60, 40', light: '172, 88, 60', grain: '108, 44, 28', seed: 13 };
function woodTexture({ base, dark, light, grain, seed } = WALNUT) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const rand = random(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  // Broad colour bands, then fine grain lines; whole sine cycles keep the texture seamless along x.
  for (let i = 0; i < 26; i++) {
    const y0 = rand() * c.height, amp = 4 + rand() * 14, cycles = 1 + Math.floor(rand() * 3), phase = rand() * 6.3, w = 10 + rand() * 40;
    g.strokeStyle = rand() < 0.5 ? `rgba(${dark}, ${0.25 + rand() * 0.3})` : `rgba(${light}, ${0.2 + rand() * 0.3})`;
    g.lineWidth = w;
    for (const dy of [-c.height, 0, c.height]) {
      g.beginPath();
      for (let x = 0; x <= c.width; x += 16) g.lineTo(x, y0 + dy + Math.sin((x / c.width) * cycles * Math.PI * 2 + phase) * amp);
      g.stroke();
    }
  }
  for (let i = 0; i < 220; i++) {
    const y0 = rand() * c.height, amp = 2 + rand() * 10, cycles = 1 + Math.floor(rand() * 3), phase = rand() * 6.3;
    g.strokeStyle = `rgba(${grain}, ${0.15 + rand() * 0.4})`;
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

// ── The decor's canvases and shapes ──

// Light oak floorboards that run along z, eight to a tile. The board ends wrap, so the tile repeats without a seam.
function plankTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d'), rand = random(29), S = c.width, w = S / 8;
  for (let b = 0; b < 8; b++) {
    let y = rand() * S;
    for (const stop = y + S; y < stop;) {
      const len = Math.min(S * (0.4 + rand() * 0.5), stop - y), tone = rand();
      const grain = Array.from({ length: 9 }, () => [rand() * w, 4 + rand() * 18, rand() * 6.3, 0.08 + rand() * 0.18, 1 + rand() * 2]);
      for (const y0 of [y, y - S]) {
        g.save();
        g.beginPath();
        g.rect(b * w, y0, w, len);
        g.clip();
        g.fillStyle = `rgb(${(212 + tone * 22) | 0}, ${(166 + tone * 20) | 0}, ${(116 + tone * 16) | 0})`;
        g.fillRect(b * w, y0, w, len);
        for (const [x, amp, phase, alpha, lw] of grain) {
          g.strokeStyle = `rgba(150, 100, 58, ${alpha})`;
          g.lineWidth = lw;
          g.beginPath();
          for (let yy = y0; yy <= y0 + len; yy += 16) g.lineTo(b * w + x + Math.sin(yy / 90 + phase) * amp * 0.3, yy);
          g.stroke();
        }
        g.fillStyle = 'rgba(96, 62, 34, 0.5)';
        g.fillRect(b * w, y0 + len - 1.5, w, 2);   // the board's end
        g.restore();
      }
      y += len;
    }
    g.fillStyle = 'rgba(96, 62, 34, 0.55)';
    g.fillRect(b * w, 0, 2, S);   // the gap between two boards
  }
  return c;
}

// The desk's leather, w x h metres: olive with faint mottling, a darker worn edge and a thin gold tooled line near the
// edge.
function leatherTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = Math.round((2048 * h) / w);
  const g = c.getContext('2d'), rand = random(43), m = c.width / w;   // m: canvas px per metre
  g.fillStyle = '#70683e';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 500; i++) {
    const x = rand() * c.width, y = rand() * c.height, r = 20 + rand() * 120;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, rand() < 0.5 ? `rgba(40, 40, 18, ${0.03 + rand() * 0.05})` : `rgba(160, 150, 96, ${0.03 + rand() * 0.04})`);
    spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 30000; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(30, 30, 10, 0.08)' : 'rgba(200, 190, 140, 0.06)';
    g.fillRect(rand() * c.width, rand() * c.height, 1.5, 1.5);
  }
  g.strokeStyle = 'rgba(30, 28, 12, 0.35)';
  g.lineWidth = 0.012 * m;
  g.strokeRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24e';
  g.lineWidth = 0.0025 * m;
  g.strokeRect(0.014 * m, 0.014 * m, c.width - 0.028 * m, c.height - 0.028 * m);
  return c;
}

// The rug: warm cream wool with rounded corners, its pile drawn as short light and shaded strokes.
function rugTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const g = c.getContext('2d'), rand = random(31);
  g.beginPath();
  g.roundRect(6, 6, c.width - 12, c.height - 12, 40);
  g.fillStyle = '#e9d6b8';
  g.fill();
  g.clip();
  g.lineCap = 'round';
  for (let i = 0; i < 60000; i++) {
    const x = rand() * c.width, y = rand() * c.height, a = rand() * Math.PI * 2, len = 2 + rand() * 4;
    g.strokeStyle = rand() < 0.55 ? `rgba(255, 246, 230, ${0.35 + rand() * 0.4})` : `rgba(150, 118, 82, ${0.1 + rand() * 0.16})`;
    g.lineWidth = 1 + rand() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  return c;
}

// A basket weave: straw strands that pass over and under each other in a checker.
function weaveTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), n = 16;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const across = (i + j) % 2 === 0, x = i * n, y = j * n;
    const grad = across ? g.createLinearGradient(0, y, 0, y + n) : g.createLinearGradient(x, 0, x + n, 0);
    grad.addColorStop(0, '#8a6334');
    grad.addColorStop(0.5, '#d8b77c');
    grad.addColorStop(1, '#8a6334');
    g.fillStyle = grad;
    g.fillRect(x, y, n, n);
  }
  return c;
}

// A broad leaf on a long stalk, like a banana plant's, with its base at the bottom: the blade, its side veins, a pale
// midrib and a few tears at the edge.
function broadLeafArt() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1024;
  const g = c.getContext('2d'), rand = random(37), cx = 128, top = 16, base = 600;
  g.fillStyle = '#5c7d38';
  g.fillRect(cx - 6, base - 10, 12, c.height - base + 10);
  g.beginPath();
  g.moveTo(cx, base);
  g.bezierCurveTo(cx - 150, base - 110, cx - 135, top + 120, cx, top);
  g.bezierCurveTo(cx + 135, top + 120, cx + 150, base - 110, cx, base);
  const grad = g.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, '#3a6428');
  grad.addColorStop(0.5, '#5e9040');
  grad.addColorStop(1, '#36602a');
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(28, 58, 18, 0.35)';
  g.lineWidth = 1.5;
  for (let y = top + 24; y < base; y += 13) for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, y);
    g.quadraticCurveTo(cx + d * 60, y - 12, cx + d * 130, y - 46);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = '#c3d297';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(cx, base + 6);
  g.lineTo(cx, top + 12);
  g.stroke();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const y = top + 90 + rand() * (base - top - 170), d = rand() < 0.5 ? -1 : 1;
    g.beginPath();
    g.moveTo(cx + d * 140, y - 48);
    g.lineTo(cx + d * (26 + rand() * 40), y);
    g.lineTo(cx + d * 140, y - 42);
    g.fill();
  }
  return c;
}

// A heart-shaped leaf, like a pothos leaf, its base at the bottom: green with pale streaks and a midrib.
function heartLeafArt() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), rand = random(41);
  g.beginPath();
  g.moveTo(64, 116);
  g.bezierCurveTo(32, 132, -4, 82, 24, 48);
  g.bezierCurveTo(40, 28, 56, 16, 64, 4);
  g.bezierCurveTo(72, 16, 88, 28, 104, 48);
  g.bezierCurveTo(132, 82, 96, 132, 64, 116);
  const grad = g.createLinearGradient(0, 128, 128, 0);
  grad.addColorStop(0, '#3c7a2e');
  grad.addColorStop(1, '#5f9a3e');
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(214, 226, 150, 0.35)';
  for (let i = 0; i < 6; i++) {
    g.lineWidth = 2 + rand() * 4;
    g.beginPath();
    g.moveTo(64, 112);
    g.quadraticCurveTo(64 + (rand() - 0.5) * 60, 70, 20 + rand() * 88, 20 + rand() * 40);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(200, 222, 150, 0.8)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(64, 116);
  g.lineTo(64, 10);
  g.stroke();
  return c;
}

// The clock face at h:m: cream, a ring of tick marks with every fifth one longer, and the two hands. No numbers.
function drawClock(c, h, m) {
  const g = c.getContext('2d'), R = c.width / 2;
  g.clearRect(0, 0, c.width, c.height);
  g.beginPath();
  g.arc(R, R, R, 0, Math.PI * 2);
  g.fillStyle = '#f6efe2';
  g.fill();
  g.strokeStyle = '#3b2f25';
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, long = i % 5 === 0;
    g.lineWidth = R * (long ? 0.035 : 0.012);
    g.beginPath();
    g.moveTo(R + Math.sin(a) * R * (long ? 0.76 : 0.84), R - Math.cos(a) * R * (long ? 0.76 : 0.84));
    g.lineTo(R + Math.sin(a) * R * 0.9, R - Math.cos(a) * R * 0.9);
    g.stroke();
  }
  g.save();
  g.shadowColor = 'rgba(40, 30, 20, 0.35)';
  g.shadowBlur = R * 0.03;
  g.shadowOffsetY = R * 0.02;
  g.strokeStyle = '#2a2420';
  for (const [a, len, width] of [[((h % 12) + m / 60) / 12, 0.5, 0.055], [m / 60, 0.74, 0.034]]) {
    g.lineWidth = R * width;
    g.beginPath();
    g.moveTo(R - Math.sin(a * Math.PI * 2) * R * 0.1, R + Math.cos(a * Math.PI * 2) * R * 0.1);
    g.lineTo(R + Math.sin(a * Math.PI * 2) * R * len, R - Math.cos(a * Math.PI * 2) * R * len);
    g.stroke();
  }
  g.beginPath();
  g.arc(R, R, R * 0.05, 0, Math.PI * 2);
  g.fillStyle = '#2a2420';
  g.fill();
  g.restore();
}

// A leaf on its stalk: a strip of unit length and width w that rises from the origin along +y and arches over
// towards +z, bend radians at its tip. The blade folds up along its midrib.
function archedLeaf(w, bend, fold) {
  const geometry = new THREE.PlaneGeometry(w, 1, 4, 24);
  geometry.translate(0, 0.5, 0);
  const p = geometry.attributes.position, steps = 96, line = [[0, 0, 0]];
  for (let i = 1; i <= steps; i++) {
    const [y, z] = line[i - 1], a = bend * ((i - 0.5) / steps) ** 2;
    line.push([y + Math.cos(a) / steps, z + Math.sin(a) / steps, a]);
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), [y, z, a] = line[Math.round(p.getY(i) * steps)], lift = fold * Math.abs(x);
    p.setXYZ(i, x, y + lift * Math.sin(a), z - lift * Math.cos(a));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A pot turned on a lathe, radius r and height h, with its inner wall down to the soil.
function potGeometry(r, h) {
  return new THREE.LatheGeometry([[0, 0], [r * 0.74, 0], [r * 0.8, h * 0.06], [r * 0.94, h * 0.8], [r, h * 0.9], [r * 1.02, h], [r * 0.9, h], [r * 0.87, h * 0.86]]
    .map(([x, y]) => new THREE.Vector2(x, y)), 32);
}

// ── The module entry ──

export async function start(section) {
  const stage = section.querySelector('[data-room-stage]');
  const list = section.querySelector('[data-room-passes]');
  const live = section.querySelector('[data-room-live]');
  const backButton = section.querySelector('[data-room-back]');
  const musicBox = section.querySelector('[data-room-music]');
  const stationRow = section.querySelector('[data-room-stations]');
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
    for (const el of [backButton, musicBox, stationRow, ...section.querySelectorAll('[data-room-side]')]) if (el) el.hidden = true;
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
    if (!backButton || !musicBox || !stationRow) throw new Error('#room lost its Back button, music control or station links');
    if (section.querySelectorAll('[data-room-side]').length !== 2) throw new Error('#room lost its sideways arrows');
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
    // A business card without a photo, or with a photo that fails, shows the initials instead.
    const photo = (src) => (src ? image(new URL(src, document.baseURI).href).catch(() => null) : Promise.resolve(null));
    const loads = Promise.all([
      fetchPage('experience.html'),
      fetchPage('certificates.html'),
      fetchPage('portfolio.html'),
      model('desk_lamp_arm_01'),
      model('potted_plant_02'),
      model('classic_laptop'),
      model('potted_plant_04'),
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
    function woodBox(x0, x1, y0, y1, z0, z1, parent = scene, round = 0.009) {
      const size = [x1 - x0, y1 - y0, z1 - z0];
      const geometry = new RoundedBoxGeometry(...size, round > 0.009 ? 4 : 2, Math.min(round, ...size.map((v) => v / 3)));
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
    // The floor: light oak boards, one texture tile per FLOOR.tile metres.
    const plankMap = new THREE.CanvasTexture(plankTexture());
    plankMap.colorSpace = THREE.SRGBColorSpace;
    plankMap.wrapS = plankMap.wrapT = THREE.RepeatWrapping;
    plankMap.repeat.set((ROOM.x1 - ROOM.x0) / FLOOR.tile, (ROOM.z1 + WALL_T) / FLOOR.tile);
    plankMap.anisotropy = anisotropy;
    box(ROOM.x1 - ROOM.x0, 0.02, ROOM.z1 + WALL_T, new THREE.MeshStandardMaterial({ map: plankMap, roughness: 0.6 }), (ROOM.x0 + ROOM.x1) / 2, -0.01, ROOM.z1 / 2 - WALL_T / 2);
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

    const texture = (source) => {
      const map = new THREE.CanvasTexture(source);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      return map;
    };

    // The desk under the window: a mahogany pedestal desk with a leather top. Each pedestal has four drawers and
    // stands on a plinth with bracket feet; a shallow centre drawer sits over an arched kneehole. The wood renders as
    // one mesh, the leather and the brass escutcheons as one each. A click on any part of it counts as the desk.
    const DX = { x0: DESK.x - DESK.w / 2, x1: DESK.x + DESK.w / 2, z0: DESK.z - DESK.d / 2, z1: DESK.z + DESK.d / 2 };
    function buildDesk() {
      const { w: PW, shares, stile, rail, gap, plinth, feet } = PEDESTAL;
      const front = DX.z1 - 0.025, back = DX.z0 + 0.01, under = 0.738;   // the carcase under the top's overhang
      const mahoganyMap = texture(woodTexture(MAHOGANY));
      mahoganyMap.wrapS = mahoganyMap.wrapT = THREE.RepeatWrapping;
      const deskWood = new THREE.Group();
      // A board of the desk. shade darkens it: the panel seen through the gap round each drawer front is dark.
      const board = (x0, x1, y0, y1, z0, z1, round = 0.006, shade = 1) => { woodBox(x0, x1, y0, y1, z0, z1, deskWood, round).userData.shade = shade; };
      // A shape cut from a board of the given depth; its grain runs along x or z at the boards' scale.
      function cutBoard(shape, depth, x, z, alongZ = false) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        if (alongZ) geometry.rotateY(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry);
        mesh.position.set(x, 0, z);
        mesh.userData.metres = true;
        deskWood.add(mesh);
      }
      // The top: a slab with a rounded edge over a thin moulding.
      board(DX.x0, DX.x1, 0.752, DESK.top, DX.z0, DX.z1, 0.008);
      board(DX.x0 + 0.01, DX.x1 - 0.01, under, 0.7525, DX.z0, DX.z1 - 0.01, 0.005);
      // The drawer openings of a pedestal, [y0, y1] from the bottom, with a rail between two.
      const tall = under - plinth - 5 * rail, sum = shares.reduce((a, b) => a + b);
      const rows = [];
      for (let i = 0, y = plinth + rail; i < shares.length; i++) {
        const h = (tall * shares[i]) / sum;
        rows.push([y, y + h]);
        y += h + rail;
      }
      // A drawer front in its opening, a little proud of the frame, with its escutcheon high on the front.
      const keys = [];
      function drawer(x0, x1, [y0, y1]) {
        board(x0 + gap, x1 - gap, y0 + gap, y1 - gap, front - 0.006, front + 0.004, 0.004);
        keys.push([(x0 + x1) / 2, Math.max((y0 + y1) / 2, y1 - 0.045)]);
      }
      // The bracket base of one side, length l: a foot at each end, the apron between them cut away in an ogee.
      const bracket = (l, f = 0.075, c = 0.036) => new THREE.Shape().moveTo(0, 0).lineTo(f, 0)
        .bezierCurveTo(f + 0.006, c * 0.8, f + 0.014, c * 0.3, f + 0.03, c).lineTo(l - f - 0.03, c)
        .bezierCurveTo(l - f - 0.014, c * 0.3, l - f - 0.006, c * 0.8, l - f, 0)
        .lineTo(l, 0).lineTo(l, feet).lineTo(0, feet).closePath();
      for (const x0 of [DX.x0 + 0.025, DX.x1 - 0.025 - PW]) {
        const x1 = x0 + PW, sx0 = x0 + stile, sx1 = x1 - stile;
        board(x0, x1, plinth, under, front - 0.02, front - 0.01, 0.002, 0.35);
        for (const x of [x0, x1 - 0.02]) board(x, x + 0.02, plinth, under, back, front - 0.01);
        for (const x of [x0, sx1]) board(x, x + stile, plinth, under, front - 0.01, front, 0.003);
        board(sx0, sx1, plinth, plinth + rail, front - 0.01, front, 0.003);
        for (const [, y1] of rows) board(sx0, sx1, y1, y1 + rail, front - 0.01, front, 0.003);
        for (const row of rows) drawer(sx0, sx1, row);
        // The plinth, and under it the bracket feet round a dark core that shows through the cut-outs.
        const px0 = x0 - 0.012, px1 = x1 + 0.012, pz1 = front + 0.012;
        board(px0, px1, feet, plinth, back, pz1, 0.008);
        board(x0 + 0.02, x1 - 0.02, 0.004, feet, back, front - 0.01, 0.002, 0.25);
        cutBoard(bracket(px1 - px0), 0.018, px0, pz1 - 0.018);
        cutBoard(bracket(pz1 - back), 0.018, px0 + 0.018, back, true);
        cutBoard(bracket(pz1 - back), 0.018, px1, back, true);
      }
      // The centre drawer between the pedestals, and under it the apron with its arch: a flat top and round corners.
      const kx0 = DX.x0 + 0.025 + PW, kx1 = DX.x1 - 0.025 - PW, frieze = rows[shares.length - 2][1], r = 0.1;
      board(kx0, kx1, frieze, under, front - 0.02, front - 0.01, 0.002, 0.35);
      for (const y of [frieze, under - rail]) board(kx0, kx1, y, y + rail, front - 0.01, front, 0.003);
      drawer(kx0, kx1, rows[shares.length - 1]);
      const w = kx1 - kx0, low = frieze - 0.035 - r;
      cutBoard(new THREE.Shape().moveTo(0, frieze).lineTo(w, frieze).lineTo(w, low)
        .absarc(w - r, low, r, 0, Math.PI / 2, false).lineTo(r, low + r)
        .absarc(r, low, r, Math.PI / 2, Math.PI, false).closePath(), 0.018, kx0, front - 0.018);
      board(kx0, kx1, feet, frieze, back, back + 0.015, 0.003, 0.7);   // the kneehole's back
      deskWood.updateMatrixWorld(true);
      const deskMesh = new THREE.Mesh(mergeGeometries(deskWood.children.map((m) => {
        const geometry = m.geometry.applyMatrix4(m.matrixWorld), p = geometry.attributes.position;
        if (m.userData.metres) for (let i = 0; i < p.count; i++) geometry.attributes.uv.setXY(i, (p.getX(i) + p.getZ(i)) / 0.9, p.getY(i) / 0.16);
        return geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(p.count * 3).fill(m.userData.shade ?? 1), 3));
      })), new THREE.MeshStandardMaterial({ map: mahoganyMap, vertexColors: true, roughness: 0.5 }));
      // The leather lies inside the rim, a hair above the wood and below everything on the desk.
      const leatherSize = [DESK.w - 2 * LEATHER_INSET, DESK.d - 2 * LEATHER_INSET];
      const leather = new THREE.Mesh(new THREE.PlaneGeometry(...leatherSize).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: texture(leatherTexture(...leatherSize)), roughness: 0.7 }));
      leather.position.set(DESK.x, DESK.top + 0.0004, DESK.z);
      // A brass escutcheon on each drawer: a round plate with a dark keyhole.
      const plate = new THREE.CylinderGeometry(0.017, 0.017, 0.002, 24).rotateX(Math.PI / 2);
      const keyhole = new THREE.ShapeGeometry(new THREE.Shape().moveTo(-0.0024, -0.0065).lineTo(0.0024, -0.0065)
        .absarc(0, 0.0025, 0.003, -1.1, Math.PI + 1.1, false).closePath()).translate(0, 0, 0.0011);
      for (const [geometry, shade] of [[plate, 1], [keyhole, 0.08]]) geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geometry.attributes.position.count * 3).fill(shade), 3));
      const brass = new THREE.InstancedMesh(mergeGeometries([plate, keyhole]), new THREE.MeshStandardMaterial({ color: 0xe2b85e, metalness: 0.08, roughness: 0.35, vertexColors: true }), keys.length);
      keys.forEach(([x, y], i) => brass.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, front + 0.005)));
      return [deskMesh, leather, brass];
    }
    const deskParts = buildDesk();
    for (const part of deskParts) part.userData.kind = 'desk';
    scene.add(...deskParts);

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

    const [experience, certificatesPage, portfolioPage, lampModel, plantModel, laptopModel, succulentModel, homeView, posterImages, photos] = await loads;
    const passes = readPasses(experience);
    const education = passes.find((p) => p.id === 'education').legs[0];
    if (!education.daad || education.degrees.length < 2) throw new Error('experience.html lost the DAAD line or a degree');

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
    // An item that a click opens: its group carries the station, the id and its sound, and a second click opens its
    // paper.
    const items = new Map();
    function item(station, id, fields) {
      const group = new THREE.Group();
      group.userData = { kind: 'item', station, id, sound: fields.sound };
      const entry = { station, id, object: group, ...fields };
      if (id) items.set(`${station}/${id}`, entry);
      return entry;
    }

    // ── Props: the Poly Haven lamp, plant and laptop ──
    const lamp = new THREE.Group();
    lamp.position.set(1.45, DESK.top, 0.22);
    lamp.rotation.y = 2.4;
    lamp.scale.setScalar(0.8);
    lamp.userData = { kind: 'lamp', sound: 'hover-lamp' };
    const lampLight = new THREE.PointLight(0xffb066, 0.4, 0, 2);
    lampLight.position.set(-0.005, 0.66, -0.18);   // just below the bulb, in model space
    const plant = new THREE.Group();
    plant.position.set(2.2, 0, 1.25);
    plant.rotation.y = 0.5;
    const laptop = new THREE.Group();
    laptop.position.set(LAPTOP.x, DESK.top, LAPTOP.z);
    laptop.scale.setScalar(LAPTOP.scale);
    laptop.userData = { kind: 'laptop', sound: 'hover-laptop' };
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

    // ── The radio at the desk's back left corner, built in code: a walnut box with rounded edges, a gold speaker grille
    // on its left two thirds, and a brushed gold panel with a large tuning dial and three small knurled knobs. It
    // stands on four dark feet and carries a thin telescopic antenna. A red LED above the grille glows while it plays. ──
    const radio = new THREE.Group();
    radio.userData = { kind: 'radio', sound: 'hover-radio' };
    const FOOT = 0.009, BORDER = 0.02;
    const walnut = wood.clone();
    walnut.color.setHex(0x7a5848);   // the room's grain, darkened to walnut
    const radioBox = woodBox(-RADIO.w / 2, RADIO.w / 2, FOOT, FOOT + RADIO.h, -RADIO.d / 2, RADIO.d / 2, radio, 0.024);
    radioBox.material = walnut;
    const radioGold = (roughness = 0.35) => new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 0.7, roughness });
    const radioFront = RADIO.d / 2 + 0.0008, faceH = RADIO.h - 2 * BORDER, faceY = FOOT + RADIO.h / 2;
    const grilleW = (RADIO.w - 2 * BORDER) * 0.64, panelW = RADIO.w - 2 * BORDER - grilleW;
    const grille = faceMesh(grilleFace(grilleW, faceH), { roughness: 0.5 });
    grille.material.metalness = 0.5;
    grille.position.set(-RADIO.w / 2 + BORDER + grilleW / 2, faceY, radioFront);
    const radioPanel = faceMesh(panelFace(panelW, faceH), { roughness: 0.4 });
    radioPanel.material.metalness = 0.55;
    const panelX = RADIO.w / 2 - BORDER - panelW / 2;
    radioPanel.position.set(panelX, faceY, radioFront);
    radio.add(grille, radioPanel);
    // The tuning dial: a dark ring of tick marks around a large gold knob with a small pointer.
    const dialY = faceY + faceH * 0.14, dialR = Math.min(panelW, faceH) * 0.36;
    const ring = faceMesh(dialFace(dialR), { alphaTest: 0.5, roughness: 0.6 });
    ring.position.set(panelX, dialY, radioFront + 0.0006);
    const dialKnob = new THREE.Mesh(new THREE.CylinderGeometry(dialR * 0.66, dialR * 0.7, 0.012, 48), radioGold(0.25));
    dialKnob.rotation.x = Math.PI / 2;
    dialKnob.position.set(panelX, dialY, radioFront + 0.006);
    const dialPointer = new THREE.Mesh(new THREE.BoxGeometry(0.004, dialR * 0.3, 0.006), radioGold(0.25));
    dialPointer.position.set(panelX + dialR * 0.45, dialY + dialR * 0.45, radioFront + 0.012);
    dialPointer.rotation.z = -Math.PI / 4;
    radio.add(ring, dialKnob, dialPointer);
    // Three small knurled knobs in a row below the dial; their flat-shaded facets read as knurling.
    const knurled = new THREE.CylinderGeometry(0.0085, 0.0085, 0.009, 18);
    for (const k of [-1, 0, 1]) {
      const small = new THREE.Mesh(knurled, new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 0.7, roughness: 0.35, flatShading: true }));
      small.rotation.x = Math.PI / 2;
      small.position.set(panelX + k * panelW * 0.3, faceY - faceH * 0.32, radioFront + 0.0045);
      radio.add(small);
    }
    // Four small dark feet.
    const feet = new THREE.MeshStandardMaterial({ color: 0x1e1a17, roughness: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, FOOT, 0.022, feet, sx * (RADIO.w / 2 - 0.035), FOOT / 2, sz * (RADIO.d / 2 - 0.025), radio);
    // The telescopic antenna: three thinner and thinner chrome sections from the top's back right, leaning left.
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.85, roughness: 0.25 });
    const antenna = new THREE.Group();
    let along = 0;
    for (const [r, len] of [[0.0026, 0.1], [0.002, 0.09], [0.0015, 0.08]]) {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), chrome);
      part.position.y = along + len / 2;
      antenna.add(part);
      along += len - 0.004;
    }
    const tipCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.008, 10), chrome);
    tipCap.position.y = along + 0.002;
    antenna.add(tipCap);
    antenna.position.set(RADIO.w / 2 - 0.04, FOOT + RADIO.h - 0.004, -RADIO.d / 2 + 0.025);
    antenna.rotation.z = 0.62;
    radio.add(antenna);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 12, 8), new THREE.MeshStandardMaterial({ color: 0x4a0c08, emissive: 0xff2414, emissiveIntensity: 0, roughness: 0.3 }));
    led.position.set(-RADIO.w / 2 + BORDER + grilleW - 0.008, faceY + faceH / 2 - 0.008, radioFront + 0.002);
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 64;
    const hg = haloCanvas.getContext('2d'), halo = hg.createRadialGradient(32, 32, 0, 32, 32, 32);
    halo.addColorStop(0, 'rgba(255, 30, 15, 0.9)');
    halo.addColorStop(0.35, 'rgba(230, 20, 10, 0.35)');
    halo.addColorStop(1, 'rgba(200, 10, 5, 0)');
    hg.fillStyle = halo;
    hg.fillRect(0, 0, 64, 64);
    const ledHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCanvas), depthWrite: false, toneMapped: false }));
    ledHalo.scale.setScalar(0.03);
    ledHalo.visible = false;
    ledHalo.raycast = () => {};   // light only: a click or a landmark check passes through it
    led.add(ledHalo);
    radio.add(led);
    radio.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    radio.position.set(RADIO.x, DESK.top, RADIO.z);
    radio.rotation.y = RADIO.turn;
    scene.add(radio);
    radio.updateMatrixWorld(true);
    const grilleSpot = grille.localToWorld(new THREE.Vector3(0, 0, 0.01));   // where the music notes start

    // ── The passes: one pile at the front left of the desk, Sema on top. Each pass lies shifted up and to the right of
    // the one below it and turned a little, so the top one shows whole. #desk fans them out into a row along the front
    // of the desk, each a little turned; leaving the desk stacks them back. ──
    const PASS_H = Math.max(...passes.map(passHeight));
    const TURN = [2.5, -1.8, 2.2, -2.6, 1.6], SHIFT = [0.004, -0.008, 0.006, -0.005, 0.008];
    const PILE = { x: -0.22, z: 0.78, dx: 0.046, dz: 0.004, turn: 14, dturn: -6 };
    const passItems = passes.map((pass, i) => {
      const mesh = faceMesh(passFace(pass, PASS_H), { alphaTest: 0.5, roughness: 0.9 });
      mesh.rotation.x = -Math.PI / 2;
      const entry = item('desk', pass.id, { name: pass.name, doc: passDoc(pass), tip: passTip(pass), pass, mesh, sound: 'hover-pass' });
      const holder = entry.object;
      const row = new THREE.Object3D();
      row.position.set(DESK.x + (i - (passes.length - 1) / 2) * (PASS.w + PASS.gap), DESK.top + 0.0012 + i * 0.0004, DX.z1 - 0.035 - PASS_H / 2 + SHIFT[i]);
      row.rotation.y = THREE.MathUtils.degToRad(TURN[i]);
      const level = passes.length - 1 - i;   // the pass's level in the pile, from the bottom
      const pile = new THREE.Object3D();
      pile.position.set(PILE.x + level * PILE.dx, DESK.top + 0.0012 + level * 0.0016, PILE.z + level * PILE.dz);
      pile.rotation.y = THREE.MathUtils.degToRad(PILE.turn + level * PILE.dturn);
      entry.places = { row, pile };
      holder.position.copy(pile.position);
      holder.quaternion.copy(pile.quaternion);
      holder.add(mesh);
      scene.add(holder);
      return entry;
    });

    // ── The CV printout in front of the telephone, with a paper clip at its top edge ──
    const print = faceMesh(printFace(), { roughness: 0.92 });
    print.rotation.x = -Math.PI / 2;
    Object.assign(print.userData, { kind: 'print', sound: 'hover-cv' });
    const printHolder = new THREE.Group();
    printHolder.position.set(PRINT.x, DESK.top + 0.0012, PRINT.z);
    printHolder.rotation.y = PRINT.turn;
    const clip = new THREE.Mesh(clipGeometry(), new THREE.MeshStandardMaterial({ color: 0xb9bfc7, metalness: 0.3, roughness: 0.3 }));
    clip.position.set(-0.05, 0.0009, -PRINT.h / 2 - 0.008);
    printHolder.add(print, clip);
    scene.add(printHolder);

    // ── The coffee mug right of the laptop: glazed red outside and cream inside, with a handle, and coffee whose level
    // drops a step with each sip. It sips by tilting towards the eye, hinged at its base's front edge. ──
    const mug = new THREE.Group();
    mug.userData = { kind: 'mug', sound: 'hover-coffee' };
    mug.position.set(MUG.x, DESK.top, MUG.z);
    const mugTilt = new THREE.Group();
    mugTilt.position.z = MUG.r;
    const coffeeTop = MUG.h - 0.014, coffeeBottom = 0.016;   // the coffee's height when full and just before empty
    const coffeeSurface = new THREE.Mesh(new THREE.CircleGeometry(MUG.r - 0.0056, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: texture(coffeeArt()), roughness: 0.2 }));
    {
      const { r: R, h: H } = MUG, t = 0.005, floor = 0.012;
      const lathe = (points) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 40);
      const glaze = new THREE.MeshStandardMaterial({ color: 0xb3241e, roughness: 0.16 });
      const body = new THREE.Group();
      body.position.z = -MUG.r;
      body.rotation.y = MUG.turn;
      body.add(new THREE.Mesh(lathe([[0, 0], [R * 0.8, 0], [R * 0.95, 0.004], [R, 0.014], [R, H - 0.003], [R - 0.0012, H], [R - t + 0.0012, H]]), glaze));
      body.add(new THREE.Mesh(lathe([[R - t + 0.0012, H], [R - t, H - 0.003], [R - t, floor + 0.006], [R - t - 0.006, floor], [0, floor]]),
        new THREE.MeshStandardMaterial({ color: 0xf1e7d6, roughness: 0.2 })));
      // The handle: a loop on the mug's local +x side, both ends set into the wall.
      body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[R - 0.003, H * 0.8], [R + 0.022, H * 0.82], [R + 0.037, H * 0.66], [R + 0.035, H * 0.4], [R + 0.019, H * 0.26], [R - 0.003, H * 0.24]]
        .map(([x, y]) => new THREE.Vector3(x, y, 0))), 32, 0.0062, 8), glaze));
      body.add(coffeeSurface);
      mugTilt.add(body);
      mug.add(mugTilt);
      mug.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      scene.add(mug);
    }
    // The coffee at a level of sips, 0 to MUG.sips: an empty mug shows its cream inside. From #desk the eye sees only
    // the top half of the inside, so the first sips take the level down less and every step shows.
    function setCoffee(sips) {
      coffeeSurface.visible = sips > 0.01;
      coffeeSurface.position.y = coffeeBottom + (coffeeTop - coffeeBottom) * Math.sqrt(sips / MUG.sips);
    }
    const coffee = { left: MUG.sips, anim: null, steamUntil: 0 };
    setCoffee(coffee.left);

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
        sound: 'hover-trophy',
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
      const entry = item('awards', spec.id, { name: spec.name, doc: spec.doc, tip: [['b', spec.title], ['span', spec.issuer]], sound: 'hover-certificate' });
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
        const entry = item('awards', id, {
          name: `${r.title}, ${issuer}`, doc: revealDoc(r, [r.kicker], [...r.links].sort((a, b) => b.external - a.external)), tip: [['b', r.title], ['span', issuer]], sound: 'hover-medal',
        });
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
      const entry = item('projects', spec.id, { name: `${r.title}, ${r.kicker}`, doc: revealDoc(r, [r.kicker, r.meta]), tip: [['b', r.title], ['span', r.kicker]], sound: 'hover-poster' });
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

    // ── The tray at the desk's left end, with a business card for each recommendation ──
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
        sound: 'hover-cards',
      });
      const card = entry.object;
      const face = faceMesh(cardFace(quote, photos[i]), { side: THREE.DoubleSide });
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
      sound: 'hover-phone',
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
      // The dial on the sloped front: a disc with ten finger holes over a dark plate and a cream centre. The holes sit
      // 30 degrees apart, clear of each other, and leave a gap at the lower right for the finger stop.
      const dialShape = new THREE.Shape().absarc(0, 0, 0.05, 0, Math.PI * 2);
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * 0.17 + i * (Math.PI / 6);
        dialShape.holes.push(new THREE.Path().absarc(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0.0072, 0, Math.PI * 2));
      }
      const dial = new THREE.Mesh(new THREE.ExtrudeGeometry(dialShape, { depth: 0.004, bevelEnabled: false, curveSegments: 18 }), new THREE.MeshStandardMaterial({ color: 0xe9e2d4, metalness: 0.3, roughness: 0.3 }));
      const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.006, 24), cream);
      centre.rotation.x = Math.PI / 2;
      centre.position.z = 0.004;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.003, 40), new THREE.MeshStandardMaterial({ color: 0x2b211c, roughness: 0.5 }));
      plate.rotation.x = Math.PI / 2;
      plate.position.z = -0.0015;
      const stop = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.004, 0.004, 2, 0.0015), new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.6, roughness: 0.3 }));
      stop.position.set(Math.cos(-0.26) * 0.047, Math.sin(-0.26) * 0.047, 0.006);
      stop.rotation.z = -0.26;
      const dialGroup = new THREE.Group();
      dialGroup.add(plate, dial, centre, stop);
      const tilt = Math.atan2(slope.z0 - slope.z1, H);   // the slope leans back by this angle from upright
      const n = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
      dialGroup.position.set(0, H / 2 + B, (slope.z0 + slope.z1) / 2).addScaledVector(n, B + 0.002);
      dialGroup.rotation.x = -tilt;
      phone.add(dialGroup);
      // The cradle's two prongs and the handset lying across them.
      const prong = new RoundedBoxGeometry(0.022, 0.03, 0.03, 2, 0.007);
      for (const side of [-1, 1]) {
        const mesh = new THREE.Mesh(prong, red);
        mesh.position.set(side * 0.068, H + 2 * B + 0.008, -0.03);
        phone.add(mesh);
      }
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

    // ── Decor: skirting boards, the rug, the bookshelf, the plants and the wall clock. None of it is clickable. It
    // sits in one group, so the landmark check sees it and the hover and click checks never do. ──
    const decor = new THREE.Group();
    scene.add(decor);
    const sillTop = WIN.y0 + SILL_UP;
    // The skirting, the bookshelf's boards and the clock's rim share the room's wood and render as one mesh.
    const woodParts = new THREE.Group();
    woodBox(ROOM.x0, ROOM.x1, 0, 0.08, 0, 0.014, woodParts, 0.004);
    for (const x of [ROOM.x0, ROOM.x1 - 0.014]) woodBox(x, x + 0.014, 0, 0.08, 0, ROOM.z1, woodParts, 0.004);
    const B = BOOKSHELF, side = 0.022, board = 0.022, cell = (B.h - 0.06 - 6 * board) / 5;
    for (const x of [B.x0, B.x1 - side]) woodBox(x, x + side, 0, B.h, 0, B.d, woodParts);
    woodBox(B.x0 + side, B.x1 - side, 0.01, B.h - 0.01, 0, 0.012, woodParts);
    woodBox(B.x0 + side, B.x1 - side, 0, 0.06, B.d - 0.03, B.d - 0.012, woodParts);
    // floors[i] is the top of board i, from the bottom board to the top of the shelf.
    const floors = [];
    for (let i = 0; i < 6; i++) {
      const y = 0.06 + i * (cell + board);
      woodBox(B.x0 + side, B.x1 - side, y, y + board, 0.012, B.d, woodParts);
      floors.push(y + board);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CLOCK.r, 0.02, 10, 48).toNonIndexed(), wood);   // the boards carry no index
    rim.position.set(CLOCK.x, CLOCK.y, 0.02);
    woodParts.add(rim);
    woodParts.updateMatrixWorld(true);
    decor.add(new THREE.Mesh(mergeGeometries(woodParts.children.map((m) => m.geometry.applyMatrix4(m.matrixWorld))), wood));

    // The books: one instanced box, each with its own size and colour, its spine to the room with two faint bands and
    // no text. They stand in rows, the last one of a row may lean on its neighbour, and one short stack lies flat.
    const spineArt = document.createElement('canvas');
    spineArt.width = 32;
    spineArt.height = 128;
    const sg = spineArt.getContext('2d');
    sg.fillStyle = '#ffffff';
    sg.fillRect(0, 0, 32, 128);
    sg.fillStyle = 'rgba(60, 40, 20, 0.22)';
    for (const y of [12, 108]) sg.fillRect(0, y, 32, 5);
    const books = [], bookRand = random(53), BOOK_COLORS = [0xb5654a, 0x3f7d78, 0x94a888, 0xe9dfc8, 0xdc9a5f];
    const inner = { x0: B.x0 + side + 0.004, x1: B.x1 - side - 0.004 };
    const book = (x, y, size, lean = 0) => books.push({ position: new THREE.Vector3(x, y, B.d - 0.02 - size.z / 2), lean, size, turn: (bookRand() - 0.5) * 0.05 });
    const bookSize = () => new THREE.Vector3(0.02 + bookRand() * 0.022, 0.19 + bookRand() * 0.11, 0.15 + bookRand() * 0.05);
    // A row of upright books from x0 up to x1 on the board at floor; returns where the row ends.
    function row(x0, x1, floor) {
      let x = x0;
      for (let size = bookSize(); x + size.x <= x1; size = bookSize()) {
        book(x + size.x / 2, floor + size.y / 2, size);
        x += size.x + 0.0015;
      }
      return x;
    }
    // A book that leans by angle on the book that ends at x: it stands on its lower left edge, its top on the neighbour.
    function leaning(x, floor, angle) {
      const size = bookSize(), px = x + size.y * Math.sin(angle);
      book(px + (size.x / 2) * Math.cos(angle) - (size.y / 2) * Math.sin(angle), floor + (size.x / 2) * Math.sin(angle) + (size.y / 2) * Math.cos(angle), size, angle);
      return px + size.x * Math.cos(angle);
    }
    leaning(row(inner.x1 - 0.12, inner.x1 - 0.1, floors[0]) + 0.06, floors[0], 0.12);
    leaning(row(inner.x0, inner.x0 + 0.5, floors[1]), floors[1], 0.28);
    leaning(row(inner.x0, inner.x0 + 0.36, floors[2]), floors[2], 0.22);
    row(inner.x1 - 0.13, inner.x1, floors[2]);
    row(inner.x0, inner.x0 + 0.2, floors[3]);
    let stackTop = floors[3];
    for (let i = 0; i < 3; i++) {
      const size = new THREE.Vector3(0.21 + bookRand() * 0.03, 0.026 + bookRand() * 0.01, 0.15 + bookRand() * 0.03);
      books.push({ position: new THREE.Vector3(inner.x0 + 0.35, stackTop + size.y / 2, B.d - 0.02 - size.z / 2), lean: 0, size, turn: (bookRand() - 0.5) * 0.16 });
      stackTop += size.y;
    }
    row(inner.x1 - 0.2, inner.x1, floors[3]);
    leaning(row(inner.x0, inner.x0 + 0.4, floors[4]), floors[4], 0.2);
    const bookMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: texture(spineArt), roughness: 0.8 }), books.length);
    books.forEach((b, i) => {
      bookMesh.setMatrixAt(i, new THREE.Matrix4().compose(b.position, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.turn, b.lean)), b.size));
      bookMesh.setColorAt(i, new THREE.Color(BOOK_COLORS[i % BOOK_COLORS.length]).multiplyScalar(0.85 + bookRand() * 0.2));
    });
    decor.add(bookMesh);

    // Two small round clay vases, one on the flat stack and one at the top shelf's right end.
    const clay = new THREE.MeshStandardMaterial({ color: 0xb86a45, roughness: 0.85 });
    const vaseGeometry = new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.046, 0.015], [0.054, 0.045], [0.048, 0.075], [0.028, 0.095], [0.017, 0.105], [0.02, 0.12]]
      .map(([x, y]) => new THREE.Vector2(x, y)), 28);
    const vases = new THREE.InstancedMesh(vaseGeometry, clay, 2);
    vases.setMatrixAt(0, new THREE.Matrix4().setPosition(inner.x0 + 0.35, stackTop, B.d - 0.1));
    vases.setMatrixAt(1, new THREE.Matrix4().makeScale(0.9, 1.1, 0.9).setPosition(inner.x1 - 0.12, floors[4], B.d - 0.1));
    decor.add(vases);
    // A woven basket on the bottom board.
    const weaveMap = texture(weaveTexture());
    weaveMap.wrapS = weaveMap.wrapT = THREE.RepeatWrapping;
    weaveMap.repeat.set(7, 1);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.75, Math.SQRT1_2, 1, 4, 1, true, Math.PI / 4), new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.9, side: THREE.DoubleSide }));
    basket.scale.set(0.42, 0.19, 0.2);
    basket.position.set(inner.x0 + 0.23, floors[0] + 0.095, B.d - 0.13);
    decor.add(basket);

    // The trailing plants: heart leaves along vines that hang from a clay pot. All their leaves are one instanced mesh,
    // all their vines one mesh, and all their pots one instanced mesh.
    const leafPlaces = [], vineParts = [], pots = [], soils = [];
    function placeLeaf(base, dir, face, size) {
      const y = dir.clone().normalize(), z = face.clone().addScaledVector(y, -face.dot(y)).normalize(), x = new THREE.Vector3().crossVectors(y, z);
      leafPlaces.push(new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(size, size, size)).setPosition(base));
    }
    // A pot of radius r standing at at, with leaves around its rim and vines that hang through the points of vines
    // (relative to the rim's centre). Its leaves turn towards face.
    function trailing(at, r, vines, face, seed) {
      const rand = random(seed), h = r * 1.4, rim = at.clone().setY(at.y + h * 0.88);
      pots.push(new THREE.Matrix4().makeScale(r, h, r).setPosition(at));
      soils.push(new THREE.Matrix4().makeScale(r * 0.87, 1, r * 0.87).setPosition(rim));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rand() * 0.5, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        placeLeaf(rim.clone().addScaledVector(out, r * (0.2 + rand() * 0.4)), out.clone().setY(0.6 + rand() * 0.8), face.clone().setY(0.8), (0.055 + rand() * 0.025) * Math.min(1, r / 0.06));
      }
      for (const points of vines) {
        const curve = new THREE.CatmullRomCurve3([rim.clone(), ...points.map(([x, y, z]) => rim.clone().add(new THREE.Vector3(x, y, z)))]);
        vineParts.push(new THREE.TubeGeometry(curve, 32, 0.0022, 4));
        const n = Math.floor(curve.getLength() / 0.034);
        for (let i = 1; i <= n; i++) {
          const t = i / n, tangent = curve.getTangentAt(t);
          const across = new THREE.Vector3().crossVectors(tangent, face).normalize().multiplyScalar(i % 2 ? 1 : -1);
          const turn = face.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).multiplyScalar(0.6));
          placeLeaf(curve.getPointAt(t), across.addScaledVector(face, 0.5).addScaledVector(tangent, 0.4), turn, (0.042 + rand() * 0.02) * (1 - t * 0.3));
        }
      }
    }
    // On top of the bookshelf, its vines down the right side and over the front edge.
    trailing(new THREE.Vector3(B.x1 - 0.17, B.h, B.d / 2), 0.07, [
      [[0.12, 0.0, 0.05], [0.2, -0.12, 0.08], [0.22, -0.4, 0.06], [0.21, -0.72, 0.1]],
      [[0.1, 0.01, 0.0], [0.21, -0.1, -0.02], [0.23, -0.3, 0.02], [0.22, -0.5, 0.0]],
      [[0.08, 0.0, 0.1], [0.18, -0.1, 0.16], [0.2, -0.28, 0.17]],
      [[0.0, 0.0, 0.1], [0.0, -0.08, 0.17], [0.02, -0.22, 0.18]],
      [[-0.12, 0.0, 0.06], [-0.24, -0.02, 0.12], [-0.3, -0.12, 0.17]],
    ], new THREE.Vector3(0, 0, 1), 61);
    // At the room's end of the awards shelf's low board, its vines down the outside of the end board.
    trailing(new THREE.Vector3(WX - 0.075, SHELF.low, SHELF.z1 - 0.052), 0.048, [
      [[0.0, 0.0, 0.07], [-0.02, -0.08, 0.1], [-0.03, -0.3, 0.1], [-0.05, -0.52, 0.12]],
      [[-0.04, 0.0, 0.07], [-0.07, -0.1, 0.1], [-0.08, -0.28, 0.11]],
      [[0.02, 0.0, 0.06], [0.03, -0.12, 0.09], [0.04, -0.4, 0.09], [0.03, -0.62, 0.11]],
    ], new THREE.Vector3(-1, 0, 0.5).normalize(), 67);
    // On the window sill, right of the right pane, its vines over the sill's edge.
    trailing(new THREE.Vector3(1.255, sillTop, 0.06), 0.042, [
      [[0.0, 0.0, 0.06], [0.0, -0.04, 0.11], [-0.01, -0.14, 0.12]],
      [[0.03, 0.0, 0.05], [0.04, -0.05, 0.11], [0.05, -0.2, 0.12]],
    ], new THREE.Vector3(0, 0.2, 1).normalize(), 71);

    // The tall plant in the back right corner: broad arching leaves on long stalks in a cream ceramic pot. Its leaves
    // point into the room and along the back wall, never towards the awards shelf.
    const tallPot = new THREE.Mesh(potGeometry(0.18, 0.42), new THREE.MeshStandardMaterial({ color: 0xece3d2, roughness: 0.45, side: THREE.DoubleSide }));
    tallPot.position.set(TALL_PLANT.x, 0, TALL_PLANT.z);
    decor.add(tallPot);
    const soilTop = new THREE.Vector3(TALL_PLANT.x, 0.42 * 0.86, TALL_PLANT.z);
    soils.push(new THREE.Matrix4().makeScale(0.18 * 0.87, 1, 0.18 * 0.87).setPosition(soilTop));
    // Each leaf: its turn about the stalk's base, its tilt out (+) or back (-), and its length.
    const BROAD = [[0, -0.42, 1.3], [-0.35, -0.3, 1.22], [0.3, -0.36, 1.1], [0.65, -0.28, 0.95], [-0.85, -0.12, 1.28], [-1.3, 0.12, 1.18],
      [-1.75, 0.22, 1.02], [-2.2, 0.08, 1.12], [-2.7, -0.2, 0.98], [-0.6, -0.5, 1.38], [-1.55, -0.32, 1.32]];
    const broadLeaves = new THREE.InstancedMesh(archedLeaf(0.25, 0.9, 0.25), new THREE.MeshStandardMaterial({ map: texture(broadLeafArt()), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.65 }), BROAD.length);
    BROAD.forEach(([turn, tilt, length], i) => {
      broadLeaves.setMatrixAt(i, new THREE.Matrix4().compose(soilTop.clone().add(new THREE.Vector3(Math.sin(turn) * 0.03, 0, Math.cos(turn) * 0.03)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, turn, 0, 'YXZ')), new THREE.Vector3(length, length, length)));
    });
    decor.add(broadLeaves);

    // A small succulent in a cream pot at the sill's right end, and a smaller one by the mullion: the Poly Haven model,
    // its four parts merged into one mesh.
    succulentModel.scene.updateMatrixWorld(true);
    const succulentParts = [];
    let succulentMaterial = null;
    succulentModel.scene.traverse((o) => { if (o.isMesh) { succulentParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); succulentMaterial = o.material; } });
    const succulentGeometry = mergeGeometries(succulentParts);
    for (const [x, scale, turn] of [[1.37, 0.68, 0.4], [CX + 0.11, 0.5, 2.1]]) {
      const pot = new THREE.Mesh(succulentGeometry, succulentMaterial);
      pot.position.set(x, sillTop, 0.06);
      pot.scale.setScalar(scale);
      pot.rotation.y = turn;
      decor.add(pot);
    }

    const terracotta = new THREE.InstancedMesh(potGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xb8643f, roughness: 0.85, side: THREE.DoubleSide }), pots.length);
    pots.forEach((m, i) => terracotta.setMatrixAt(i, m));
    const soil = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 1 }), soils.length);
    soils.forEach((m, i) => soil.setMatrixAt(i, m));
    const heartLeaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: texture(heartLeafArt()), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }), leafPlaces.length);
    leafPlaces.forEach((m, i) => heartLeaves.setMatrixAt(i, m));
    const vines = new THREE.Mesh(mergeGeometries(vineParts), new THREE.MeshStandardMaterial({ color: 0x4f6e2c, roughness: 0.8 }));
    decor.add(terracotta, soil, heartLeaves, vines);

    // The rug in front of the desk: cream wool on the floor.
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(RUG.w, RUG.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: texture(rugTexture()), alphaTest: 0.5, roughness: 1 }));
    rug.position.set(RUG.x, 0.004, RUG.z);
    decor.add(rug);

    // The wall clock right of the window. Its face shows the visitor's local time, redrawn once a minute.
    const clockArt = document.createElement('canvas');
    clockArt.width = clockArt.height = 512;
    const clockNow = new Date();
    drawClock(clockArt, clockNow.getHours(), clockNow.getMinutes());
    const clockMap = texture(clockArt);
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(CLOCK.r - 0.004, 48), new THREE.MeshStandardMaterial({ map: clockMap, roughness: 0.5 }));
    clockFace.position.set(CLOCK.x, CLOCK.y, 0.012);
    decor.add(clockFace);
    decor.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    rug.castShadow = clockFace.castShadow = false;

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
      section.style.setProperty('--ed-room-paper-right', `${NOTE_BOX.left + notes.W}px`);
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
      section.classList.toggle('has-paper', !!key);
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
      playSound('flip');
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
      for (const object of tintables) tint(object);
      paper.material.color.set(night ? 0xe4e7ee : 0xffffff);
      tintNotes();
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
      // The passes as they lie in the row, wherever they are now.
      const span = new THREE.Box3();
      for (const { mesh, places } of passItems) {
        const ghost = new THREE.Object3D();
        ghost.position.copy(places.row.position);
        ghost.quaternion.copy(places.row.quaternion);
        ghost.updateMatrixWorld(true);
        const w = PASS.w / 2, h = mesh.geometry.parameters.height / 2;
        for (const [x, z] of [[-w, -h], [w, -h], [-w, h], [w, h]]) span.expandByPoint(new THREE.Vector3(x, 0, z).applyMatrix4(ghost.matrixWorld));
      }
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
      }, () => {
        camTween = null;
        if (state.station === 'desk' && !state.item) steamFor(STEAM.arrive);
      });
    }

    // A chosen pass lifts a little off the desk and tilts towards the eye. It moves inside its holder, so a lift and
    // a move between the pile and the row never fight.
    const lifts = new Map();
    function lift(id, up) {
      const entry = id && items.get(`desk/${id}`);
      if (!entry) return;
      const { mesh } = entry;
      tweens.delete(lifts.get(id));
      const y0 = mesh.position.y, r0 = mesh.rotation.x;
      lifts.set(id, tween(300, (k) => {
        const e = easeOut(k);
        mesh.position.y = y0 + ((up ? PASS.lift : 0) - y0) * e;
        mesh.rotation.x = r0 + ((up ? -Math.PI / 2 + 0.14 : -Math.PI / 2) - r0) * e;
      }));
      renderer.shadowMap.needsUpdate = true;
    }

    // Piles first: at #desk the passes stay in their pile and at #letters the cards stay in the tray, until a click on
    // the pile spreads them or a paper opens. Leaving the station stacks them again.
    const spreadOut = { desk: false, letters: false };
    function spreadPile(station) {
      spreadOut[station] = true;
      if (station === 'desk') arrangePasses(true);
      else arrangeCards(true, null);
      pointerDirty = true;
    }

    // Spreading fans the passes out of the pile into the row, the top one first; stacking them puts them back, the
    // bottom one first. Each rises a little on its way, as the business cards do.
    let spread = false;
    const passTweens = new Map();
    function arrangePasses(open) {
      if (open === spread) return;
      spread = open;
      passItems.forEach((entry, i) => {
        const holder = entry.object, place = entry.places[open ? 'row' : 'pile'];
        const p0 = holder.position.clone(), q0 = holder.quaternion.clone();
        tweens.delete(passTweens.get(entry));
        const delay = (open ? i : passes.length - 1 - i) * 0.06;
        passTweens.set(entry, tween(900, (k) => {
          const e = easeInOut(Math.min(1, Math.max(0, (k - delay) / (1 - delay))));
          holder.position.lerpVectors(p0, place.position, e);
          holder.position.y += Math.sin(Math.PI * e) * 0.06;
          holder.quaternion.slerpQuaternions(q0, place.quaternion, e);
        }, () => { renderer.shadowMap.needsUpdate = true; }));
      });
    }

    // Spreading the cards fans them out above the desk; stacking them puts them back in the tray. A chosen card comes
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
      if (pointerDirty || turning || tweens.size) { pointerDirty = false; setHovered(pick()); pointerMoved = false; }
      if ([...cardTweens.values(), ...passTweens.values()].some((t) => tweens.has(t))) renderer.shadowMap.needsUpdate = true;
      const singing = updateNotes(now), brewing = updateMug(now);
      renderer.render(scene, camera);
      clearTimeout(noteTimer);
      if (tweens.size || turning) invalidate();
      else if (singing || brewing) noteTimer = setTimeout(invalidate, 1000 / NOTES.fps);
      else last = 0;
    }

    // ── Hover, the pass tooltip and click ──
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerAt = { x: 0, y: 0 };
    let pointerIn = false, hovered = null, hoveredPile = null, tipHeld = false, pointerKind = 'mouse', pointerMoved = false;
    const itemObjects = [...items.values()].map((e) => e.object);
    const targets = [paper, ...itemObjects, shelfParts, trayGroup, phone, print, laptop, lamp, radio, mug, ...deskParts];
    const tintables = [...itemObjects, phone, print, laptop, radio, mug];
    // The objects of each station, in the order of the station links and of the glow tour.
    const stationObjects = {
      desk: passItems.map((e) => e.object), laptop: [laptop], projects: posterItems.map((e) => e.object),
      awards: [...trophyItems, ...certItems, ...medalItems].map((e) => e.object), letters: cardItems.map((e) => e.object), contact: [phone],
    };
    let linked = [], pulse = null;   // the objects a station link lights, and the glow tour's pulse
    // A pile counts as one object while it is stacked: the passes, and the cards with their tray.
    const piles = { desk: stationObjects.desk, letters: stationObjects.letters };
    const stacked = (hit) => hit?.kind === 'item' && !!piles[hit.station] && !spreadOut[hit.station];

    const pick = () => (pointerIn ? pickAt(pointer) : null);
    // The object at a point of the canvas, in normalised device coordinates.
    function pickAt(ndc) {
      raycaster.setFromCamera(ndc, camera);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        let o = hit.object;
        while (o && !o.userData.kind) o = o.parent;
        if (!o || (o === paper && !paperState.key)) continue;
        return { kind: o.userData.kind, object: o.userData.kind === 'screen' ? laptop : o, station: o.userData.station, id: o.userData.id, uv: hit.uv };
      }
      return null;
    }

    // An object takes the grey hover tint when it is hovered or its station link has the pointer or the focus, and the
    // glow tour's warm pulse on its turn. The LED keeps its own glow.
    function tint(object) {
      const lift = object === hovered || linked.includes(object) || hoveredPile?.includes(object) ? HOVER : 0;
      const warm = pulse?.objects.includes(object) ? pulse.amount : 0;
      const set = (color, grey) => color.setRGB(grey + warm, grey + warm * 0.82, grey + warm * 0.55);
      if (object === lamp) {
        lamp.traverse((o) => { if (o.isMesh) o.material.emissive.setHex(lift ? 0x3a2410 : 0x000000); });
      } else if (object === laptop) {
        laptop.traverse((o) => { if (o.isMesh && o !== screen) set(o.material.emissive, lift); });
        screen.material.emissive.setScalar(1);
        screen.material.emissiveIntensity = screenGlow + lift + warm;
      } else {
        object.traverse((o) => { if (o.isMesh && o !== led && o.material.emissive) set(o.material.emissive, Math.min(0.45, (o.material.userData.lit ?? 0) * glow) + lift); });
      }
    }
    function tintAll() {
      for (const object of tintables) tint(object);
      invalidate();
    }

    // A light tint marks what a click would act on. With a paper open, only the station's other items light up: a
    // click on one opens its paper, and any other click closes the paper. The shelf and the tray share the room's
    // wood, so they take no tint; their items do. A stacked pile lights as a whole. The pointer entering an object
    // plays the object's hover sound: only after a move of the pointer itself, while the camera rests, and never for
    // touch.
    function setHovered(hit) {
      const pile = stacked(hit) ? piles[hit.station] : null;
      const lit = hit && (pile || hit.kind !== 'item' || hit.id || hit.object === phone);
      const acts = hit && (paper.visible ? sameStation(hit) : ['item', 'lamp', 'laptop', 'screen', 'print', 'radio', 'mug'].includes(hit.kind));
      const next = acts && lit ? (pile ? pile[0] : hit.object) : null, nextPile = next && pile;
      showTip(acts ? hit : null);
      if (next === hovered && nextPile === hoveredPile) return;
      const was = hoveredPile ?? [hovered];
      if (next && next !== hovered && pointerMoved && !camTween && pointerKind !== 'touch') playSound(next.userData.sound);
      hovered = next;
      hoveredPile = nextPile;
      for (const object of [...was, ...(hoveredPile ?? [hovered])]) if (object) tint(object);
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
    const CLOSER = 'Click to go closer', READ = 'Click to read', OPEN = 'Click to open', SPREAD = 'Click to spread';
    const pileNames = { desk: ['Boarding passes', 'passes'], letters: [groupNames.letters, 'cards'] };
    function tipRows(hit) {
      const at = state.station;
      if (hit.kind === 'lamp') return [['b', themeButton?.getAttribute('aria-label') || '']];
      if (hit.kind === 'screen' || hit.kind === 'laptop') return [['b', 'Evaluate role fit'], ['i', at !== 'laptop' ? CLOSER : hit.kind === 'screen' ? OPEN : '']];
      if (hit.kind === 'print') return [['b', clean(cvLink)], ['i', at === 'desk' ? OPEN : CLOSER]];
      if (hit.kind === 'radio') return [['b', 'Music'], ['span', `Track ${music.track + 1} / ${TRACKS}`], ['i', music.playing ? 'Click to pause' : 'Click to play']];
      if (hit.kind === 'mug') return [['b', 'Coffee'], ['span', cupLevel()], ['i', at !== 'desk' ? CLOSER : coffee.left ? 'Click to sip' : 'Click to refill']];
      if (hit.kind !== 'item') return null;
      if (hit.object === phone) return [['b', clean(talkLink)], ['i', READ]];
      if (stacked(hit)) return [['b', pileNames[hit.station][0]], ['span', `${piles[hit.station].length} ${pileNames[hit.station][1]}`], ['i', hit.station === at ? SPREAD : CLOSER]];
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

    const ndcOf = (event, out) => {
      const rect = canvas.getBoundingClientRect();
      return out.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    };
    function setPointer(event) {
      ndcOf(event, pointer);
      pointerAt.x = event.clientX;
      pointerAt.y = event.clientY;
      pointerIn = event.target === canvas;   // over a button of the room, nothing in 3D is hovered
    }

    section.addEventListener('pointermove', (event) => {
      setPointer(event);
      look.toYaw = pointer.x * MAX_TILT;
      look.toPitch = pointer.y * MAX_TILT;
      tipHeld = false;
      pointerKind = event.pointerType;
      pointerDirty = pointerMoved = true;
      invalidate();
    }, { signal });
    section.addEventListener('pointerleave', () => {
      pointerIn = false;
      look.toYaw = look.toPitch = 0;
      pointerDirty = true;
      invalidate();
    }, { signal });

    // Two clicks, always: from rest or another station a click on an object goes to its station, and only there does
    // an item open its paper. At #desk and #letters a click on the stacked pile spreads it first. With a paper open,
    // another item of the station opens its own paper at once. The telephone opens the contact paper at once. The
    // radio plays or pauses the music at any station. The coffee goes to #desk, and there each click takes a sip. A
    // click on empty space goes one level back, as Esc does. A click on an object plays the object's sound.
    const sameStation = (hit) => hit?.kind === 'item' && !!hit.id && hit.station === state.station;
    const soundOf = (hit) => (!hit ? null : hit.kind === 'mug' ? 'sip' : (stacked(hit) ? piles[hit.station][0] : hit.object).userData.sound);
    canvas.addEventListener('click', (event) => {
      setPointer(event);
      tipHeld = true;
      tip.hidden = true;
      const hit = pick();
      playSound(soundOf(hit));
      if (paperState.key) {
        if (hit?.kind === 'paper' && hit.uv) clickPaper(hit.uv);
        else if (sameStation(hit)) go(`${hit.station}/${hit.id}`);
        else back();
        return;
      }
      if (!hit) { back(); return; }
      const at = state.station;
      if (hit.kind === 'lamp') document.querySelector('[data-action="toggle-theme"]')?.click();
      else if (hit.kind === 'radio') toggleMusic();
      else if (hit.kind === 'screen' && at === 'laptop') aiTrigger.click();
      else if (hit.kind === 'laptop' || hit.kind === 'screen') go('laptop');
      else if (hit.kind === 'mug') { if (at === 'desk') sip(); else go('desk'); }
      else if (hit.kind === 'print' && at === 'desk') cvLink.click();
      else if (hit.kind === 'print' || hit.kind === 'desk') { if (at !== 'desk') go('desk'); }
      else if (hit.kind === 'item' && hit.station !== at) go(hit.station);
      else if (stacked(hit)) spreadPile(at);
      else if (hit.kind === 'item' && hit.id) go(`${hit.station}/${hit.id}`);
    }, { signal });

    // ── Stations and URLs: rest has no hash. The stations are #desk, #laptop, #awards (the shelf), #projects (the
    // posters), #letters (the business cards) and #contact (the telephone); a chosen item is #<station>/<id>. ──
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

    // One level back, for Esc, the Back button and a click on empty space: a paper closes to its station, the stations
    // by the desk (the laptop, the business cards and the telephone) return to the desk, and the desk and the walls
    // return to rest. Only the move to rest leaves the history entry, so the browser's Back still reaches rest.
    const BY_DESK = ['laptop', 'letters', 'contact'];
    function back() {
      if (state.item) go(state.station);
      else if (BY_DESK.includes(state.station)) go('desk');
      else if (state.station !== 'rest') window.history.back();
    }

    // Analytics count each station and each paper once per open, only after the visitor's consent (window.gtag).
    const track = (event, params) => { if (typeof window.gtag === 'function') window.gtag('event', event, params); };

    function apply() {
      const next = readHash();
      if (next.station === state.station && next.item === state.item) return;
      const was = { ...state };
      Object.assign(state, next);
      if (state.station !== 'rest' && state.station !== was.station) track('room_station_opened', { station: state.station });
      if (state.item && (state.item !== was.item || state.station !== was.station)) track('room_item_opened', { station: state.station, item: state.item });
      section.classList.toggle('is-away', state.station !== 'rest');
      backButton.hidden = state.station === 'rest';
      for (const link of stationLinks) {
        if (link.dataset.roomStation === state.station) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
      const pass = (s) => (s.station === 'desk' ? s.item : null);
      if (pass(was) !== pass(state)) { lift(pass(was), false); lift(pass(state), true); }
      // A paper spreads its pile; leaving a station stacks it.
      for (const station of ['desk', 'letters']) spreadOut[station] = state.station === station && (spreadOut[station] || !!state.item);
      arrangePasses(spreadOut.desk);
      arrangeCards(spreadOut.letters, state.station === 'letters' ? state.item : null);
      const key = keyOf(state);
      showPaper(key);
      if (key) announce(key);
      if (pass(state)) showView(items.get(`desk/${state.item}`).pass.view);
      tip.hidden = true;
      showSides();
      moveTo(poseFor(state));
    }

    // ── Sideways: the three walls form one row, Projects, the desk and Awards. #laptop, #letters and #contact share
    // the desk's neighbours. The arrows and the Left and Right keys go there; a move replaces the history entry, as
    // any move from a station does. ──
    const SIDES = { projects: [null, 'desk'], desk: ['projects', 'awards'], awards: ['desk', null] };
    const sidesOf = (station) => (station === 'rest' ? [null, null] : SIDES[station] ?? SIDES.desk);
    const sideButtons = ['left', 'right'].map((side) => section.querySelector(`[data-room-side="${side}"]`));
    // The arrows call the desk "Desk"; the links row names it after the passes.
    const stationName = (station) => (station === 'desk' ? 'Desk' : clean(stationRow.querySelector(`[data-room-station="${station}"]`)));
    function showSides() {
      sidesOf(state.station).forEach((to, i) => {
        sideButtons[i].hidden = !to;
        if (!to) return;
        sideButtons[i].querySelector('[data-room-side-label]').textContent = stationName(to);
        sideButtons[i].setAttribute('aria-label', `Go to ${stationName(to)}`);
      });
    }
    // An arrow that hides under the focus hands it to the other arrow.
    sideButtons.forEach((button, i) => button.addEventListener('click', () => {
      const to = sidesOf(state.station)[i];
      if (!to) return;
      go(to);
      if (button.hidden) sideButtons[1 - i].focus();
    }, { signal }));

    window.addEventListener('hashchange', apply, { signal });
    backButton.addEventListener('click', back, { signal });
    document.addEventListener('keydown', (event) => {
      if (state.station === 'rest' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { back(); return; }
      // Left and Right turn the open paper's pages; with no paper open they move sideways.
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!step || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const to = sidesOf(state.station)[step < 0 ? 0 : 1];
      if (paperState.key) { event.preventDefault(); turnPage(step); }
      else if (to) { event.preventDefault(); go(to); }
    }, { signal });

    // ── The hidden HTML copy: one button per item in the room, the laptop, the CV and the coffee, and the open paper's
    // text in a live region. The station links are the visible row. The open paper's links follow the button that
    // opened it, or start the list for the contact paper, whose station link comes right before it. ──
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
    const coffeeControl = control('Sip the coffee', () => { playSound('sip'); sip(); });
    list.replaceChildren(
      ...passItems.map(itemControl),
      control('Evaluate role fit', () => aiTrigger.click()),
      control('View CV', () => cvLink.click()),
      coffeeControl,
      ...[...trophyItems, ...certItems, ...medalItems, ...posterItems, ...cardItems].map(itemControl),
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
      if (itemControls.has(key)) itemControls.get(key).after(paperLinks);
      else list.prepend(paperLinks);
    }

    // ── The station links: a click goes to the station the way a click on its objects does, and the pointer or the
    // focus on a link lights the station's objects. ──
    const stationLinks = [...stationRow.querySelectorAll('[data-room-station]')];
    for (const link of stationLinks) {
      const objects = stationObjects[link.dataset.roomStation];
      if (!objects) throw new Error(`the station link ${link.dataset.roomStation} names no station`);
      const light = (on) => { linked = on ? objects : []; tintAll(); };
      link.addEventListener('click', () => go(link.dataset.roomStation), { signal });
      for (const type of ['pointerenter', 'focus']) link.addEventListener(type, () => light(true), { signal });
      for (const type of ['pointerleave', 'blur']) link.addEventListener(type, () => light(false), { signal });
    }

    // ── Music: five tracks that loop in PLAY_ORDER. The Audio element exists only after a press, so no music byte
    // loads before it: the visitor's first press in the room, or a press on the radio or a music button. room.music
    // keeps the track's file number, the position and whether the visitor paused; a visitor who paused is offered
    // "Resume music" and never hears music start without pressing Play. A stored track that is no longer in the play
    // order, or a store from before the file number, starts the first track from its beginning. ──
    const playLabel = musicBox.querySelector('[data-room-play-label]');
    const trackLabel = musicBox.querySelector('[data-room-track]');
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('room.music')); } catch { saved = null; }
    const savedTrack = PLAY_ORDER.indexOf(saved?.file);
    const music = {
      track: Math.max(0, savedTrack), time: savedTrack < 0 ? 0 : Math.max(0, Number(saved?.time) || 0), paused: saved?.paused === true, playing: false,
    };
    music.resume = music.paused;
    let audio = null, savedSecond = -1;
    const trackUrl = (i) => new URL(`music/track-${PLAY_ORDER[i]}.mp3`, import.meta.url).href;

    function saveMusic() {
      if (audio) music.time = audio.currentTime;
      try { localStorage.setItem('room.music', JSON.stringify({ file: PLAY_ORDER[music.track], time: Math.round(music.time * 10) / 10, paused: music.paused })); } catch { /* storage blocked */ }
    }
    // The control, the LED and the radio's tooltip follow the player.
    function showMusic() {
      music.playing = !!audio && !audio.paused;
      musicBox.classList.toggle('is-playing', music.playing);
      playLabel.textContent = music.playing ? 'Pause music' : music.resume ? 'Resume music' : 'Play music';
      trackLabel.textContent = `Track ${music.track + 1} / ${TRACKS}`;
      led.material.emissiveIntensity = music.playing ? 1.5 : 0;
      ledHalo.visible = music.playing;
      pointerDirty = true;
      invalidate();
    }
    // The player, made by the first press.
    function player() {
      if (audio) return audio;
      audio = new Audio();
      audio.preload = 'none';
      audio.src = trackUrl(music.track);
      // With preload none the browser ignores a start position set before it knows the track, so the stored position
      // is set once the track's metadata arrives.
      const at = music.time;
      if (at > 0) audio.addEventListener('loadedmetadata', () => { if (audio.src === trackUrl(music.track)) audio.currentTime = at; }, { signal, once: true });
      audio.addEventListener('ended', () => setTrack(music.track + 1, true), { signal });
      audio.addEventListener('timeupdate', () => {
        const second = Math.floor(audio.currentTime);
        if (second !== savedSecond) { savedSecond = second; saveMusic(); }
      }, { signal });
      for (const type of ['play', 'pause']) audio.addEventListener(type, showMusic, { signal });
      return audio;
    }
    function play() {
      music.resume = music.paused = false;
      audio.play().catch((error) => { console.warn('Room: the music did not play.', error); showMusic(); });
      saveMusic();
    }
    // A new track starts at its beginning; while the music is paused, nothing loads until the next press.
    function setTrack(index, playing) {
      music.track = (index + TRACKS) % TRACKS;
      music.time = 0;
      if (audio) audio.src = trackUrl(music.track);
      if (playing) play();
      saveMusic();
      showMusic();
    }
    function toggleMusic() {
      if (player().paused) play();
      else { audio.pause(); music.paused = true; saveMusic(); }
    }
    function nextTrack() {
      setTrack(music.track + 1, !!audio && !audio.paused);
    }
    musicBox.querySelector('[data-room-play]').addEventListener('click', toggleMusic, { signal });
    musicBox.querySelector('[data-room-next]').addEventListener('click', nextTrack, { signal });
    // The visitor's first press in the room, a click anywhere in it or a key, starts the music alongside what the press
    // does: once per page load, and only when the visitor never paused it. The Play button starts it by its own click.
    // Esc gives the page no right to play sound, so it waits for the next press. Every other press also wakes the sound
    // effects.
    let firstPress = false;
    function firstPlay(event) {
      if (event.key !== 'Escape') wakeSounds(event);
      if (firstPress || event.key === 'Escape') return;
      firstPress = true;
      if (music.paused || event.target.closest?.('[data-room-play]')) return;
      player();
      play();
    }
    section.addEventListener('pointerdown', firstPlay, { signal, capture: true });
    section.addEventListener('keydown', firstPlay, { signal, capture: true });

    // ── Sound effects: one AudioContext, made by the visitor's first press in the room and resumed by later presses,
    // so no sound plays and no file under sfx/ loads before it. The files then load and decode once each; when that
    // press is a click on an object, the object's sound loads first. room.sfx keeps "off" when the visitor turns them
    // off; the music stays as it is. ──
    const sfx = { ctx: null, on: true, loads: new Map(), buffers: new Map(), last: new Map(), voices: [], log: [], loading: false };
    try { sfx.on = localStorage.getItem('room.sfx') !== 'off'; } catch { sfx.on = true; }
    const sfxButton = musicBox.querySelector('[data-room-sfx]');
    const sfxLabel = sfxButton.querySelector('[data-room-sfx-label]');
    function wakeSounds(event) {
      if (sfx.ctx) { if (sfx.ctx.state === 'suspended') sfx.ctx.resume().catch(() => {}); return; }
      try { sfx.ctx = new AudioContext(); } catch (error) { console.warn('Room: the sound effects did not start.', error); return; }
      const first = event.type === 'pointerdown' && event.target === canvas ? soundOf(pickAt(ndcOf(event, new THREE.Vector2()))) : null;
      loadSounds(first);
    }
    function loadSound(name) {
      if (!sfx.loads.has(name)) {
        sfx.loads.set(name, fetch(new URL(`sfx/${name}.mp3`, import.meta.url).href)
          .then((response) => { if (!response.ok) throw new Error(`sfx/${name}.mp3 returned ${response.status}`); return response.arrayBuffer(); })
          .then((data) => sfx.ctx.decodeAudioData(data))
          .then((buffer) => { sfx.buffers.set(name, buffer); return buffer; }, (error) => { sfx.loads.delete(name); console.warn(`Room: the sound ${name} did not load.`, error); return null; }));
      }
      return sfx.loads.get(name);
    }
    // Loads every sound once the context exists and the sounds are on; first, when given, loads before the rest.
    function loadSounds(first) {
      if (!sfx.ctx || !sfx.on || sfx.loading) return;
      sfx.loading = true;
      const rest = () => { for (const name of SFX) loadSound(name); };
      if (first) loadSound(first).then(rest); else rest();
    }
    // Plays a sound now, or when it arrives if it is still loading. Returns whether it will play.
    function playSound(name) {
      if (!name || !sfx.on || !sfx.ctx) return false;
      const asked = performance.now();
      if (asked - (sfx.last.get(name) ?? -Infinity) < SFX_GAP) return false;
      sfx.last.set(name, asked);
      const voice = (buffer) => {
        if (!buffer || !sfx.on || sfx.ctx.state !== 'running' || performance.now() - asked > SFX_LATE) return;
        if (sfx.voices.length >= SFX_VOICES) fadeVoice(sfx.voices.shift());
        const source = sfx.ctx.createBufferSource(), gain = sfx.ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = name.startsWith('hover-') ? SFX_GAIN.hover : SFX_GAIN.effect;
        source.connect(gain).connect(sfx.ctx.destination);
        const playing = { source, gain };
        source.addEventListener('ended', () => { const i = sfx.voices.indexOf(playing); if (i >= 0) sfx.voices.splice(i, 1); });
        sfx.voices.push(playing);
        source.start();
        sfx.log.push({ name, at: Math.round(asked), waited: Math.round(performance.now() - asked) });
      };
      if (sfx.buffers.has(name)) voice(sfx.buffers.get(name));
      else loadSound(name).then(voice);
      return true;
    }
    // A sound that makes room for another fades out over a few milliseconds, so it stops without a click.
    function fadeVoice({ source, gain }) {
      gain.gain.setTargetAtTime(0, sfx.ctx.currentTime, 0.015);
      source.stop(sfx.ctx.currentTime + 0.08);
    }
    function showSounds() {
      sfxButton.setAttribute('aria-pressed', String(sfx.on));
      sfxLabel.textContent = sfx.on ? 'Sounds on' : 'Sounds off';
    }
    sfxButton.addEventListener('click', () => {
      sfx.on = !sfx.on;
      try { localStorage.setItem('room.sfx', sfx.on ? 'on' : 'off'); } catch { /* storage blocked */ }
      if (sfx.on) loadSounds(null);
      else while (sfx.voices.length) fadeVoice(sfx.voices.shift());
      showSounds();
    }, { signal });
    showSounds();

    // ── Music notes: while the music plays, notes rise from the radio's grille, drift sideways with a wobble and fade
    // out. They and the coffee's steam are the only things that draw frames without a change of state, at up to
    // NOTES.fps, until the last one has faded after a pause. ──
    const noteMaps = [0, 1, 2].map((kind) => texture(noteArt(kind)));
    const notes = [];
    const noteInk = new THREE.Color();
    let lastNote = -Infinity, noteTimer = 0, noteCount = 0;
    const noteUp = new THREE.Vector3(0, 1, 0), noteSide = new THREE.Vector3(1, 0, 0).applyQuaternion(radio.quaternion);
    function updateNotes(now) {
      if (music.playing && now - lastNote >= NOTES.every && notes.length < NOTES.max) {
        lastNote = now;
        const rand = random(++noteCount);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteMaps[noteCount % 3], color: noteInk, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
        sprite.raycast = () => {};   // decoration only: clicks and landmark checks pass through
        sprite.scale.setScalar(NOTES.size * (0.85 + rand() * 0.3));
        scene.add(sprite);
        notes.push({ sprite, born: now, start: grilleSpot.clone().addScaledVector(noteSide, (rand() - 0.5) * 0.08), drift: (rand() - 0.5) * 0.12, phase: rand() * 6.3 });
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i], age = (now - n.born) / NOTES.life;
        if (age >= 1) { scene.remove(n.sprite); n.sprite.material.dispose(); notes.splice(i, 1); continue; }
        n.sprite.position.copy(n.start).addScaledVector(noteUp, NOTES.rise * age).addScaledVector(noteSide, n.drift * age + Math.sin(n.phase + age * 9) * 0.01);
        n.sprite.material.rotation = Math.sin(n.phase + age * 7) * 0.25;
        n.sprite.material.opacity = Math.min(1, age * 6) * Math.min(1, (1 - age) * 2.5);
      }
      return music.playing || notes.length > 0;
    }
    function tintNotes() {
      noteInk.set(isNight() ? 0xf2ede4 : 0x2a2420);
      for (const n of notes) n.sprite.material.color.copy(noteInk);
    }

    // ── The coffee: a sip takes the level down a step while the mug tilts towards the eye and back; a click on the
    // empty mug fills it again with a short rise. Steam rises while the mug holds coffee, for a while after the camera
    // arrives at #desk and after each sip, and then fades out. ──
    const cupLevel = () => (coffee.left === MUG.sips ? 'Full' : !coffee.left ? 'Empty' : `${coffee.left} sip${coffee.left > 1 ? 's' : ''} left`);
    function sip() {
      const from = coffee.left;
      coffee.left = from ? from - 1 : MUG.sips;
      coffee.anim = { start: performance.now(), ms: from ? 500 : 600, from, to: coffee.left };
      if (coffee.left) steamFor(STEAM.sip);
      coffeeControl.firstChild.textContent = coffee.left ? 'Sip the coffee' : 'Refill the coffee';
      pointerDirty = true;
      invalidate();
    }
    function steamFor(ms) {
      coffee.steamUntil = Math.max(coffee.steamUntil, performance.now() + ms);
      invalidate();
    }
    const steamMap = texture(steamArt());
    const wisps = [];
    let lastWisp = -Infinity, wispCount = 0;
    // Moves the mug, its coffee and the steam on to the time now; returns whether they still need frames.
    function updateMug(now) {
      const a = coffee.anim;
      if (a) {
        const k = Math.min(1, Math.max(0, (now - a.start) / a.ms));
        mugTilt.rotation.x = a.to < a.from ? 0.32 * Math.sin(Math.PI * k) : 0;
        setCoffee(a.from + (a.to - a.from) * (a.to < a.from ? easeInOut(k) : easeOut(k)));
        renderer.shadowMap.needsUpdate = true;
        if (k >= 1) coffee.anim = null;
      }
      const steaming = coffee.left > 0 && now < coffee.steamUntil;
      if (steaming && now - lastWisp >= STEAM.every && wisps.length < STEAM.max) {
        lastWisp = now;
        const rand = random(++wispCount + 300);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamMap, color: isNight() ? 0xc9ced8 : 0xffffff, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
        sprite.raycast = () => {};   // decoration only: clicks and landmark checks pass through
        scene.add(sprite);
        const r = (MUG.r - 0.02) * Math.sqrt(rand()), a = rand() * Math.PI * 2;
        wisps.push({ sprite, born: now, start: new THREE.Vector3(MUG.x + Math.cos(a) * r, DESK.top + coffeeSurface.position.y + 0.012, MUG.z + Math.sin(a) * r), drift: (rand() - 0.5) * 0.05, phase: rand() * 6.3 });
      }
      for (let i = wisps.length - 1; i >= 0; i--) {
        const w = wisps[i], age = (now - w.born) / STEAM.life;
        if (age >= 1) { scene.remove(w.sprite); w.sprite.material.dispose(); wisps.splice(i, 1); continue; }
        const s = STEAM.size * (1 + age * 2);
        w.sprite.scale.set(s, 2 * s, 1);
        w.sprite.position.copy(w.start).add(new THREE.Vector3(w.drift * age + Math.sin(w.phase + age * 6) * 0.008, STEAM.rise * age, 0));
        w.sprite.material.opacity = STEAM.opacity * Math.min(1, age * 5) * (1 - age) ** 1.5;
      }
      return !!coffee.anim || steaming || wisps.length > 0;
    }

    // ── The glow tour: on a first visit, each station's objects glow in turn and then the radio, so a
    // visitor sees what a click opens. Any pointer move over the room, click, key press or scroll ends it at once. ──
    const tourLog = { start: null, end: null, endedBy: null, eventAt: null };
    let tourTween = null, tourTimer = 0;
    function startTour() {
      const order = [...Object.entries(stationObjects), ['radio', [radio]]];
      tourLog.start = performance.now();
      tourTween = tween(order.length * TOUR_STEP_MS, (k) => {
        const t = Math.min(order.length - 1e-6, k * order.length), i = Math.floor(t);
        pulse = { name: order[i][0], objects: order[i][1], amount: PULSE * Math.sin(Math.PI * (t - i)) };
        tintAll();
      }, () => endTour({ type: 'done' }));
    }
    function endTour(event) {
      clearTimeout(tourTimer);
      if (!tourTween) return;
      tweens.delete(tourTween);
      tourTween = null;
      pulse = null;
      Object.assign(tourLog, { end: performance.now(), endedBy: event.type, eventAt: event.timeStamp ?? null });
      tintAll();
    }
    section.addEventListener('pointermove', endTour, { signal });
    for (const type of ['pointerdown', 'keydown', 'wheel', 'scroll']) window.addEventListener(type, endTour, { signal, passive: true });

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
      for (const t of [camTween, ...cardTweens.values(), ...passTweens.values()]) if (t && tweens.has(t)) { tweens.delete(t); t.step(1); t.done?.(); }
      camTween = null;
      const pose = poseFor(state);
      cam.eye.copy(pose.eye);
      cam.target.copy(pose.target);
    }
    placeCamera(cam.eye, cam.target, 0, 0);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    section.classList.add('is-ready');
    showMusic();
    musicBox.hidden = stationRow.hidden = false;
    resize.observe(stage);
    visibility.observe(section);
    theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    // The clock's hands move once a minute: one frame at each minute boundary, and no other.
    const clockLog = [];
    const nextMinute = () => 60000 - (Date.now() % 60000) + 20;
    let clockTimer = setTimeout(function tickClock() {
      const now = new Date();
      drawClock(clockArt, now.getHours(), now.getMinutes());
      clockMap.needsUpdate = true;
      clockLog.push(Math.round(performance.now()));
      invalidate();
      clockTimer = setTimeout(tickClock, nextMinute());
    }, nextMinute());
    signal.addEventListener('abort', () => clearTimeout(clockTimer));
    // The glow tour runs on the first visit that opens at rest; with storage blocked, it runs on every such load.
    let toured = null;
    try { toured = localStorage.getItem('room.toured'); } catch { toured = null; }
    if (state.station === 'rest' && !toured) {
      try { localStorage.setItem('room.toured', '1'); } catch { /* storage blocked */ }
      tourTimer = setTimeout(startTour, CANVAS_FADE_MS);
    }

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

    // Which items the decor hides: rays from each pose's eye, over the corners of the orbit, to the centre and the
    // eight inset corners of each item's box. A ray counts when it meets the decor before its point. The passes count
    // at rest and at the desk, where they show; their paper pose looks at the window. The desk's other objects count at
    // rest and at the desk too. With blocker set to the mug, the same rays find what the coffee mug hides.
    function decorBlocks(blocker = decor) {
      const out = [], ray = new THREE.Raycaster(), p = new THREE.Vector3(), corner = new THREE.Vector3();
      const all = [...items.values()].map((e) => [`${e.station}/${e.id}`, e.object]);
      const check = (name, pose, list) => {
        list = list.filter(([, object]) => object !== blocker);
        for (const yaw of [-3, 0, 3]) for (const pitch of [-3, 0, 3]) {
          placeCamera(pose.eye, pose.target, THREE.MathUtils.degToRad(yaw), THREE.MathUtils.degToRad(pitch));
          for (const [key, object] of list) {
            const box = new THREE.Box3().setFromObject(object), c = box.getCenter(new THREE.Vector3()), half = box.getSize(new THREE.Vector3()).multiplyScalar(0.46);
            let hidden = 0;
            for (let i = 0; i < 9; i++) {
              corner.set(i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1).multiply(half);
              p.copy(c).add(i === 8 ? corner.set(0, 0, 0) : corner).sub(camera.position);
              ray.set(camera.position, p.clone().normalize());
              ray.far = p.length() - 0.002;
              if (ray.intersectObject(blocker, true).length) hidden++;
            }
            if (hidden) out.push({ pose: name, yaw, pitch, item: key, hidden });
          }
        }
      };
      const deskObjects = [['phone', phone], ['laptop', screen], ['print', print], ['lamp', lamp], ['radio', radio], ['mug', mug]];
      check('rest', poses.rest, [...all, ...deskObjects]);
      for (const station of ['desk', 'awards', 'projects', 'letters']) check(station, poses[station], all.filter(([key]) => key.startsWith(`${station}/`)));
      check('desk', poses.desk, deskObjects);
      check('laptop', poses.laptop, [['laptop', screen]]);
      check('contact', poses.contact, [['phone', phone]]);
      for (const [key, object] of all) if (!key.startsWith('desk/')) check(key, itemPoses.get(items.get(key)), [[key, object]]);
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
      state: () => ({ ...state, spread: { ...spreadOut }, pass: state.station === 'desk' ? state.item : null, settled: tweens.size === 0, view: shown.key, viewFile: shown.file, page: paperState.page, hover: hovered?.userData.kind === 'item' ? `${hovered.userData.station}/${hovered.userData.id}` : hovered?.userData.kind ?? null, tip: !tip.hidden, flipping: !!paperState.flip, linked: Object.keys(stationObjects).find((s) => stationObjects[s] === linked) ?? null, touring: !!tourTween, glowing: pulse && { name: pulse.name, amount: +pulse.amount.toFixed(2) }, coffee: coffee.left }),
      tour: () => ({ ...tourLog }),
      music: () => ({ track: music.track + 1, playing: music.playing, time: audio ? +audio.currentTime.toFixed(2) : music.time, src: audio?.currentSrc || null, label: playLabel.textContent, trackText: trackLabel.textContent, led: led.material.emissiveIntensity }),
      seekMusic: (s) => { if (audio) audio.currentTime = s; },
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
      objectPoint: (name) => screenPoint(centreOf({ shelf: shelfParts, tray: trayGroup, phone, plant, radio, mug }[name])),
      // The coffee: sips left, the wisps of steam in the air, and the mug's height on screen in CSS px.
      coffee: () => {
        const b = new THREE.Box3().setFromObject(mug), top = screenPoint(b.max.clone().setX(MUG.x).setZ(MUG.z)), base = screenPoint(new THREE.Vector3(MUG.x, b.min.y, MUG.z));
        return { left: coffee.left, level: cupLevel(), sipping: !!coffee.anim, steam: wisps.length, steaming: coffee.left > 0 && performance.now() < coffee.steamUntil, heightPx: Math.round(Math.hypot(top.x - base.x, top.y - base.y)), button: coffeeControl.textContent };
      },
      // Keeps the steam rising for ms, for screenshots.
      steam: (ms) => steamFor(ms),
      // The sound effects: the context's state, the decoded files, what played (a hover, a click, a turn or a sip) and
      // the toggle. sound(name) asks for one sound, as an object would.
      sounds: () => ({ state: sfx.ctx?.state ?? null, rate: sfx.ctx?.sampleRate ?? null, on: sfx.on, decoded: [...sfx.buffers.keys()], played: sfx.log.slice(), voices: sfx.voices.length, pressed: sfxButton.getAttribute('aria-pressed'), label: sfxLabel.textContent }),
      sound: (name) => playSound(name),
      // A point on the canvas where a click meets nothing, away from the paper and the room's controls.
      emptyPoint: () => {
        const rect = canvas.getBoundingClientRect(), v = new THREE.Vector2();
        for (let j = 3; j <= 9; j++) for (let i = 21; i >= 3; i--) {
          const x = rect.left + (i / 24) * rect.width, y = rect.top + (j / 12) * rect.height;
          if (!pickAt(v.set((i / 24) * 2 - 1, 1 - (j / 12) * 2)) && document.elementFromPoint(x, y) === canvas) return { x, y };
        }
        return null;
      },
      notes: () => notes.length,
      radioPoint: () => screenPoint(grilleSpot),
      // Frames the pile of passes from above and in front for a close screenshot; any move of the room puts the camera back.
      lookAtPile: () => {
        const c = new THREE.Box3();
        for (const e of passItems) c.expandByObject(e.mesh);
        const centre = c.getCenter(new THREE.Vector3());
        cam.target.copy(centre);
        cam.eye.copy(centre).add(new THREE.Vector3(0, 0.42, 0.34));
        invalidate();
      },
      decorBlocks: () => decorBlocks(),
      mugBlocks: () => decorBlocks(mug),
      clock: () => clockLog.slice(),
      // Frames the right pedestal and the leather from in front and above for a close screenshot.
      lookAtDesk: () => {
        cam.target.set(1.05, 0.5, 0.6);
        cam.eye.set(1.75, 1.2, 2.05);
        invalidate();
      },
      // Frames the bookshelf from in front for a close screenshot; any move of the room puts the camera back.
      lookAtBookshelf: () => {
        cam.target.set((BOOKSHELF.x0 + BOOKSHELF.x1) / 2, 1.08, 0.1);
        cam.eye.set((BOOKSHELF.x0 + BOOKSHELF.x1) / 2 + 0.3, 1.25, 3.1);
        invalidate();
      },
      screenPoint: () => screenPoint(centreOf(screen)),
      // A point on the CV printout: u and v run from -1 to 1 across its width and up its height; 0, 0 is its centre.
      printPoint: (u = 0, v = 0) => screenPoint(print.localToWorld(new THREE.Vector3((u * PRINT.w) / 2, (v * PRINT.h) / 2, 0))),
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
