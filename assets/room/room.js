/*
 * room.js — step 1 of the 3D room on the home page: a wide room with a wooden window above the desk,
 * a cork board with five boarding passes, a paper with the chosen role beside the board, and the view
 * of that role's city in the window. room-boot.js imports this module behind ?room=1 and calls
 * start(section). start() resolves after the first frame. Until then any failure removes every
 * listener and rejects, and room-boot.js hides the room. The role text comes from experience.html,
 * read the same way as assets/js/ai-match.js.
 */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';

const PASSENGER = 'MATTHEW THAOKHAMLUE';
const LINK_TEXT = 'The full role on the Experience page';
// The passes, top to bottom on the board: their role sections in experience.html, the print and the view.
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
const WIN = { x0: -0.2, x1: 1.3, y0: 1.0, y1: 2.3 };   // the opening in the back wall, as wide as the desk
const LINING = 0.025, CASING = 0.075, SILL_OUT = 0.16, FRAME_Z = -0.12, F = 0.06, MUL = 0.042;
const DESK = { x: 0.55, z: 0.4, w: 1.5, d: 0.7, top: 0.78 };
const PASS_W = 0.56, BOARD_PAD = 0.025, PASS_GAP = 0.022;
const BOARD = { x1: WIN.x0 - CASING - 0.035, cy: 1.6 };
BOARD.x0 = BOARD.x1 - PASS_W - 2 * BOARD_PAD;
const PAPER = { w: 0.95, x1: BOARD.x0 - 0.035, z: 0.012, slide: 0.3 };
// Text sizes in metres. EM is the smallest text on a pass and on the paper; at the pass pose it shows
// at about 17 CSS px. Textures carry about twice the CSS px per metre of that pose.
const EM = 0.0205, TEX_PPM = 1750;
const SANS = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const INK = '#1d1b18', INK_SOFT = '#45413b', CLAY = '#c45a38', CLAY_INK = '#a8431f';
// The window view: an image plane behind the window, so the eye's orbit gives parallax. MAX_IMG_H is the
// largest image height as seen at the frame from the rest eye; VIEW_MARGIN keeps a landmark off the wood.
const VIEW_Z = -5, MAX_IMG_H = 1.45, VIEW_PAD = 4, VIEW_MARGIN = 0.012;
const MAX_TILT = THREE.MathUtils.degToRad(3);
const MOVE_MS = 900, FADE_MS = 400;

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

async function loadRoles() {
  const response = await fetch(new URL('experience.html', document.baseURI));
  if (!response.ok) throw new Error(`experience.html returned ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  return PASSES.map((pass) => {
    const legs = pass.roles.map((id) => readRole(doc, id));
    const name = legs.map((leg) => [leg.company, leg.role, leg.dates.join(' · ')].filter(Boolean).join(', ')).join('; ');
    return { ...pass, legs, name, link: legs[legs.length - 1].link };
  });
}

// ── Text on canvas: lay out in metres, record the draw calls, then size and draw the canvas ──

const measure = document.createElement('canvas').getContext('2d');
const font = (size, weight, family) => `${weight} ${size * TEX_PPM}px ${family}`;

function wrap(text, f, maxW) {
  measure.font = f;
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure.measureText(next).width > maxW * TEX_PPM) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

class Sheet {
  constructor(w) { this.w = w; this.y = 0; this.ops = []; this.marks = []; }

  // Writes wrapped text in lines of size * lead; mark names the line for the text-size check.
  text(str, { size, weight = 400, family = SANS, color = INK, x = 0, maxW = this.w - x, lead = 1.3, mark, link }) {
    const f = font(size, weight, family);
    for (const line of wrap(str, f, maxW)) {
      const base = this.y + size * (0.82 + (lead - 1) / 2);
      this.ops.push({ text: line, f, color, x, base, link });
      if (mark) this.marks.push({ mark, size, x, base });
      this.y += size * lead;
    }
  }

  // Writes runs side by side on one baseline when they fit, else each on its own line.
  runs(parts, { x = 0, lead = 1.3 } = {}) {
    let width = 0;
    for (const p of parts) { measure.font = font(p.size, p.weight || 400, p.family || SANS); width += measure.measureText(p.text).width / TEX_PPM; }
    if (width > this.w - 2 * x) { for (const p of parts) this.text(p.text.trim(), { ...p, x }); return; }
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
      if (op.link) {
        const w = g.measureText(op.text).width;
        g.fillRect(op.x * TEX_PPM, op.base * TEX_PPM + 4, w, 3);
        this.link = { x0: op.x * TEX_PPM, x1: op.x * TEX_PPM + w, y0: (op.base - EM * 1.1) * TEX_PPM, y1: (op.base + EM * 0.5) * TEX_PPM };
      }
    }
    return canvas;
  }
}

const BAND = 0.04, PASS_PAD = 0.024;

function layoutPass(pass) {
  const s = new Sheet(PASS_W);
  s.ops.push({ rect: true, x: 0, y: 0, w: PASS_W, h: BAND, color: CLAY });
  const bandBase = BAND / 2 + EM * 0.36;
  s.ops.push({ text: 'BOARDING PASS', f: font(EM, 500, MONO), color: '#ffffff', x: PASS_PAD, base: bandBase });
  s.ops.push({ text: PASSENGER, f: font(EM, 500, MONO), color: '#ffffff', x: PASS_W - PASS_PAD, base: bandBase, align: 'right' });
  s.y = BAND + 0.008;
  s.runs([
    { text: pass.code, size: 0.056, weight: 600, mark: 'code' },
    { text: `  ${pass.city}`, size: 0.024, weight: 500, color: INK_SOFT },
  ], { x: PASS_PAD, lead: 1.08 });
  s.y += 0.004;
  const inner = { x: PASS_PAD, maxW: PASS_W - 2 * PASS_PAD };
  if (pass.legs.length === 1) {
    const [leg] = pass.legs;
    s.text(leg.company, { size: 0.032, weight: 600, lead: 1.15, mark: 'company', ...inner });
    s.text(leg.role, { size: 0.023, lead: 1.2, mark: 'role', ...inner });
    s.y += 0.003;
    for (const part of leg.dates) s.text(part, { size: EM, family: MONO, color: INK_SOFT, lead: 1.28, mark: 'dates', ...inner });
  } else {
    pass.legs.forEach((leg, i) => {
      if (i) s.y += 0.004;
      s.runs([
        { text: leg.company, size: 0.032, weight: 600, mark: 'company' },
        { text: `  ${leg.dates.join(' · ')}`, size: EM, family: MONO, color: INK_SOFT, mark: 'dates' },
      ], { x: PASS_PAD, lead: 1.15 });
      s.text(leg.role, { size: 0.023, lead: 1.2, mark: 'role', ...inner });
    });
  }
  s.y += 0.016;
  return s;
}

// The paper carries the summary and the bullets of each role. The pass beside it names the company and the role,
// so only a pass with two legs repeats them as headings.
function layoutPaper(pass) {
  const PAD = 0.024, BULLET = 0.022;
  const s = new Sheet(PAPER.w);
  s.y = PAD;
  const body = { size: EM, x: PAD, maxW: PAPER.w - 2 * PAD, lead: 1.2, mark: 'body' };
  pass.legs.forEach((leg, i) => {
    if (i) s.y += EM * 0.8;
    if (pass.legs.length > 1) {
      s.text(`${leg.company} · ${leg.role}`, { ...body, weight: 600 });
      s.y += EM * 0.15;
    }
    if (leg.summary) s.text(leg.summary, { ...body, color: INK_SOFT });
    for (const item of leg.items) {
      s.y += EM * 0.14;
      if (item.head) s.text(item.head, { ...body, weight: 600 });
      if (item.text) s.text(item.text, body);
      if (item.bullet) {
        s.ops.push({ text: '•', f: font(EM, 400, SANS), color: CLAY, x: PAD, base: s.y + EM * 0.97 });
        s.text(item.bullet, { ...body, x: PAD + BULLET, maxW: body.maxW - BULLET });
      }
    }
  });
  s.y += EM * 0.45;
  s.text(LINK_TEXT, { ...body, weight: 500, color: CLAY_INK, link: true });
  s.y += PAD * 0.8;
  return s;
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

function corkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const rand = random(5);
  g.fillStyle = '#c29467';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const r = 0.6 + rand() * 2.2, shade = rand();
    g.fillStyle = shade < 0.55 ? `rgba(110, 66, 32, ${0.2 + rand() * 0.45})` : `rgba(232, 196, 150, ${0.2 + rand() * 0.4})`;
    g.beginPath();
    g.arc(rand() * 512, rand() * 512, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ── The module entry ──

export async function start(section) {
  const stage = section.querySelector('[data-room-stage]');
  const list = section.querySelector('[data-room-passes]');
  const live = section.querySelector('[data-room-live]');
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
    throw error;
  }

  async function build(renderer) {
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Only the sun casts shadows, and nothing that casts one moves, so the map renders on a change only.
    renderer.shadowMap.autoUpdate = false;
    stage.appendChild(canvas);
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1a18);
    const camera = new THREE.PerspectiveCamera(45, stage.clientWidth / stage.clientHeight, 0.05, 40);

    const loads = Promise.all([
      loadRoles(),
      ...['desk_lamp_arm_01', 'potted_plant_02'].map((id) => new GLTFLoader().loadAsync(new URL(`models/${id}/${id}_1k.gltf`, import.meta.url).href)),
      loadView(HOME_VIEW),
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

    // The window: a wooden lining in the opening, a casing on the wall, a deep sill, and a sash with one
    // mullion. The two panes are full height, so a tall landmark fits one pane.
    const IN = { x0: WIN.x0 + LINING, x1: WIN.x1 - LINING, y1: WIN.y1 - LINING };
    woodBox(WIN.x0, IN.x0, WIN.y0, WIN.y1, -WALL_T, 0.004);
    woodBox(IN.x1, WIN.x1, WIN.y0, WIN.y1, -WALL_T, 0.004);
    woodBox(WIN.x0, WIN.x1, IN.y1, WIN.y1, -WALL_T, 0.004);
    woodBox(WIN.x0 - CASING, WIN.x0 + 0.006, WIN.y0 - 0.02, WIN.y1 + CASING, 0, 0.024);
    woodBox(WIN.x1 - 0.006, WIN.x1 + CASING, WIN.y0 - 0.02, WIN.y1 + CASING, 0, 0.024);
    woodBox(WIN.x0 - CASING, WIN.x1 + CASING, WIN.y1 - 0.006, WIN.y1 + CASING, 0, 0.026);
    woodBox(WIN.x0 - CASING - 0.05, WIN.x1 + CASING + 0.05, WIN.y0 - 0.036, WIN.y0, -WALL_T, SILL_OUT);
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

    // The desk under the window.
    woodBox(DESK.x - DESK.w / 2, DESK.x + DESK.w / 2, DESK.top - 0.04, DESK.top, DESK.z - DESK.d / 2, DESK.z + DESK.d / 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = DESK.x + sx * (DESK.w / 2 - 0.05), z = DESK.z + sz * (DESK.d / 2 - 0.05);
      woodBox(x - 0.025, x + 0.025, 0, DESK.top - 0.04, z - 0.025, z + 0.025);
    }

    scene.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });

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

    const [passes, lampModel, plantModel, homeTexture] = await loads;

    // ── Props: the Poly Haven lamp and plant ──
    const lamp = new THREE.Group();
    lamp.position.set(1.0, DESK.top, 0.3);
    lamp.rotation.y = 2.4;
    lamp.scale.setScalar(0.8);
    const lampLight = new THREE.PointLight(0xffb066, 0.4, 0, 2);
    lampLight.position.set(-0.005, 0.66, -0.18);   // just below the bulb, in model space
    const plant = new THREE.Group();
    plant.position.set(1.8, 0, 0.45);
    plant.rotation.y = 0.5;
    for (const [anchor, gltf] of [[lamp, lampModel], [plant, plantModel]]) {
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();   // its own copy for the hover tint
        o.castShadow = o.receiveShadow = true;
      });
      anchor.add(gltf.scene);
      scene.add(anchor);
    }
    lamp.add(lampLight);

    // ── The cork board and the passes ──
    const passLayouts = passes.map(layoutPass);
    const PASS_H = Math.max(...passLayouts.map((s) => s.y));
    passLayouts.forEach((s) => { s.y = PASS_H; });
    BOARD.h = passes.length * PASS_H + (passes.length - 1) * PASS_GAP + 2 * BOARD_PAD;
    BOARD.y0 = BOARD.cy - BOARD.h / 2;
    BOARD.y1 = BOARD.cy + BOARD.h / 2;
    const corkMap = new THREE.CanvasTexture(corkTexture());
    corkMap.colorSpace = THREE.SRGBColorSpace;
    corkMap.wrapS = corkMap.wrapT = THREE.RepeatWrapping;
    corkMap.repeat.set((BOARD.x1 - BOARD.x0) / 0.5, BOARD.h / 0.5);
    const cork = box(BOARD.x1 - BOARD.x0, BOARD.h, 0.02, new THREE.MeshStandardMaterial({ map: corkMap, roughness: 0.95 }), (BOARD.x0 + BOARD.x1) / 2, BOARD.cy, 0.01);
    cork.userData.kind = 'board';
    cork.receiveShadow = true;
    const RIM = 0.03;
    woodBox(BOARD.x0 - RIM, BOARD.x1 + RIM, BOARD.y1, BOARD.y1 + RIM, 0, 0.035);
    woodBox(BOARD.x0 - RIM, BOARD.x1 + RIM, BOARD.y0 - RIM, BOARD.y0, 0, 0.035);
    woodBox(BOARD.x0 - RIM, BOARD.x0, BOARD.y0, BOARD.y1, 0, 0.035);
    woodBox(BOARD.x1, BOARD.x1 + RIM, BOARD.y0, BOARD.y1, 0, 0.035);

    const TILT = [-1.4, 1.1, -0.7, 1.5, -1.0], SHIFT = [0, 0.01, -0.008, 0.006, -0.005];
    const pinGeometry = new THREE.SphereGeometry(0.011, 16, 12);
    const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xc45a38, roughness: 0.4 });
    const passMeshes = passes.map((pass, i) => {
      const layout = passLayouts[i];
      const map = new THREE.CanvasTexture(layout.draw('#fbf7ef'));
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      const material = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0x000000, roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PASS_W, PASS_H), material);
      mesh.position.set((BOARD.x0 + BOARD.x1) / 2 + SHIFT[i], BOARD.y1 - BOARD_PAD - PASS_H / 2 - i * (PASS_H + PASS_GAP), 0.021 + i * 0.0004);
      mesh.rotation.z = THREE.MathUtils.degToRad(TILT[i]);
      mesh.userData = { kind: 'pass', id: pass.id, layout };
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.set(-0.04, PASS_H / 2 - 0.018, 0.008);   // between the two band labels
      mesh.add(pin);
      scene.add(mesh);
      return mesh;
    });
    const passById = new Map(passes.map((pass, i) => [pass.id, { pass, mesh: passMeshes[i] }]));

    // ── The paper: it slides out from behind the board when a pass is chosen ──
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.92, transparent: true, opacity: 0 }));
    paper.visible = false;
    paper.userData.kind = 'paper';
    scene.add(paper);
    const paperLayouts = new Map(passes.map((pass) => [pass.id, layoutPaper(pass)]));
    // The paper hangs level with the chosen pass, so the pass pose frames both at the largest size.
    function paperTop(id) {
      const height = paperLayouts.get(id).y, centre = passById.get(id).mesh.position.y;
      return THREE.MathUtils.clamp(centre + height / 2, height + 0.4, WALL_H - 0.12);
    }
    let paperShown = null, paperTween = null, paperLink = null;

    function drawPaper(id) {
      const layout = paperLayouts.get(id);
      const map = new THREE.CanvasTexture(layout.draw('#fffdf8'));
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      paper.material.map?.dispose();
      paper.material.map = paper.material.emissiveMap = map;
      paper.material.needsUpdate = true;
      paper.scale.set(PAPER.w, layout.y, 1);
      paper.position.set(PAPER.x1 - PAPER.w / 2, paperTop(id) - layout.y / 2, PAPER.z);
      paper.userData.layout = layout;
      paperLink = { ...layout.link, w: map.image.width, h: map.image.height };
    }

    function slidePaper(id) {
      if (paperShown === id) return;
      if (paperTween) tweens.delete(paperTween);
      const x1 = PAPER.x1 - PAPER.w / 2;
      if (id) {
        drawPaper(id);
        paper.visible = true;
        paperTween = tween(450, (k) => {
          const e = easeOut(k);
          paper.position.x = x1 + (1 - e) * PAPER.slide;
          paper.material.opacity = e;
        });
      } else if (paper.visible) {
        const from = paper.material.opacity;
        paperTween = tween(250, (k) => {
          paper.position.x = x1 + k * PAPER.slide;
          paper.material.opacity = from * (1 - k);
        }, () => { paper.visible = false; });
      }
      paperShown = id;
    }

    // ── Views: a pass cross-fades the window to its city; the last city stays until a reload ──
    let viewShown = HOME_VIEW, viewWanted = HOME_VIEW, viewTween = null;
    const atZ = (eye, p, z) => eye.clone().lerp(p, (z - eye.z) / (p.z - eye.z));

    // What the window shows, measured at the frame as the rest eye sees it: shift is how far a view point moves
    // over the rest orbit, and need is the part of the view that any rest or tickets eye sees through the sash.
    function viewBounds() {
      const E = poses.rest.eye, centre = new THREE.Vector3(CX, (SASH_OPEN.y0 + SASH_OPEN.y1) / 2, FRAME_Z);
      const ref = atZ(E, centre, VIEW_Z);
      const need = { x0: Infinity, x1: -Infinity, y0: Infinity };
      let shift = 0;
      for (const pose of [poses.rest, poses.tickets]) for (const yaw of [-1, 0, 1]) for (const pitch of [-1, 0, 1]) {
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
    function applyLighting() {
      const night = root.getAttribute('data-theme') === 'dark';
      sun.intensity = night ? 0 : 3.5;
      lampLight.intensity = night ? 1.8 : 0.4;
      hemi.intensity = night ? 0.22 : 1.1;
      windowLight.intensity = night ? 0.9 : 2;
      windowLight.color.set(night ? 0x8ea6ff : 0xfff0dc);
      for (const view of [viewA, viewB]) view.material.color.set(night ? 0x5a6a9a : 0xffffff);
      // The paper glows a little, so the passes and the sheet stay readable in the dim corner and at night.
      glow = night ? 0.25 : 0.12;
      for (const mesh of passMeshes) tint(mesh, mesh === hovered);
      paper.material.emissive.setScalar(glow);
      renderer.shadowMap.needsUpdate = true;
      invalidate();
    }

    // ── Camera: three poses, a 900 ms move between them, and the mouse orbit on top ──
    const poses = {};
    const cam = { eye: new THREE.Vector3(), target: new THREE.Vector3() };   // the pose before the orbit
    const look = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 };
    const spherical = new THREE.Spherical();

    // Fits a box on the wall into the view from the direction dir; fill is the share of the view it takes.
    function fit(box, dir = new THREE.Vector3(0, 0, 1), fill = 0.96) {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max((box.y1 - box.y0) / 2 / t, (box.x1 - box.x0) / 2 / (t * camera.aspect)) / fill;
      const target = new THREE.Vector3((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, box.z ?? 0.02);
      return { eye: dir.clone().normalize().multiplyScalar(d).add(target), target };
    }

    function passPose(id) {
      const { mesh } = passById.get(id);
      const layout = paperLayouts.get(id);
      const passBox = new THREE.Box3().setFromObject(mesh);
      return fit({
        x0: PAPER.x1 - PAPER.w - 0.006, x1: WIN.x0 - 0.03,
        y0: Math.min(paperTop(id) - layout.y, passBox.min.y) - 0.006, y1: Math.max(paperTop(id), passBox.max.y) + 0.006,
      }, undefined, 0.995);
    }

    function computePoses() {
      // Rest: the board, the window and the desk on the right two thirds; the intro line takes the left.
      const right = 2.0, left = BOARD.x0 - 0.12;
      poses.rest = fit({ x0: right - (right - left) / 0.64, x1: right, y0: 0.32, y1: 2.5, z: 0 }, new THREE.Vector3(0.7, 0.25, 3.1), 1);
      poses.tickets = fit({ x0: BOARD.x0 - RIM - 0.05, x1: WIN.x1 + CASING + 0.07, y0: Math.min(BOARD.y0 - RIM, WIN.y0 - 0.12) - 0.04, y1: Math.max(BOARD.y1 + RIM, WIN.y1 + CASING) + 0.04 }, new THREE.Vector3(0, -0.06, 1));
    }

    function poseFor(state) {
      return state.pass ? passPose(state.pass) : poses[state.station];
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
    const targets = [...passMeshes, cork, lamp, paper];

    function pick() {
      if (!pointerIn) return null;
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        let o = hit.object;
        while (o && !o.userData.kind && o !== lamp) o = o.parent;
        if (o === paper && !paper.visible) continue;
        if (o === lamp) return { kind: 'lamp', object: lamp };
        if (o) return { kind: o.userData.kind, object: o, id: o.userData.id, uv: hit.uv };
      }
      return null;
    }

    let glow = 0;
    function tint(object, on) {
      if (object === lamp) {
        lamp.traverse((o) => { if (o.isMesh) o.material.emissive.setHex(on ? 0x3a2410 : 0x000000); });
      } else if (object.userData.kind === 'pass') {
        object.material.emissive.setScalar(glow + (on ? 0.12 : 0));
      }
    }

    function setHovered(hit) {
      const next = hit && (hit.kind === 'pass' || hit.kind === 'lamp') ? hit.object : null;
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
    canvas.addEventListener('click', (event) => {
      setPointer(event);
      const hit = pick();
      if (!hit) return;
      if (hit.kind === 'pass') choose(hit.id);
      else if (hit.kind === 'board' && state.station === 'rest') choose(null);
      else if (hit.kind === 'board' && state.pass) choose(null);
      else if (hit.kind === 'lamp') document.querySelector('[data-action="toggle-theme"]')?.click();
      else if (hit.kind === 'paper' && hit.uv && paperLink) {
        const x = hit.uv.x * paperLink.w, y = (1 - hit.uv.y) * paperLink.h;
        if (x >= paperLink.x0 && x <= paperLink.x1 && y >= paperLink.y0 && y <= paperLink.y1) window.location.href = `experience.html#${passById.get(paperShown).pass.link}`;
      }
    }, { signal });

    // ── Stations and URLs: rest has no hash, the board is #tickets, a chosen pass is #tickets/<id> ──
    const state = { station: 'rest', pass: null };
    function readHash() {
      const m = window.location.hash.match(/^#tickets(?:\/([a-z]+))?$/);
      if (!m) return { station: 'rest', pass: null };
      return { station: 'tickets', pass: passById.has(m[1]) ? m[1] : null };
    }

    // Entering from rest adds one history entry; at the board a new pass replaces it, so Back leaves the board.
    function choose(id) {
      const hash = id ? `tickets/${id}` : 'tickets';
      if (state.station === 'rest') { window.location.hash = hash; return; }
      window.history.replaceState(null, '', `#${hash}`);
      apply();
    }

    function apply() {
      const next = readHash();
      if (next.station === state.station && next.pass === state.pass) return;
      Object.assign(state, next);
      section.classList.toggle('is-away', state.station !== 'rest');
      slidePaper(state.pass);
      if (state.pass) {
        const { pass } = passById.get(state.pass);
        showView(pass.view);
        announce(pass);
      }
      moveTo(poseFor(state));
    }

    window.addEventListener('hashchange', apply, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || state.station === 'rest' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      window.history.back();
    }, { signal });

    // ── The hidden HTML copy: one button per pass, and the chosen paper as text in a live region ──
    // After a pass is chosen, a link to its full role follows the buttons, like the link on the paper.
    const fullRole = document.createElement('a');
    fullRole.className = 'ed-room__pass';
    fullRole.textContent = LINK_TEXT;
    fullRole.hidden = true;
    const linkItem = document.createElement('li');
    linkItem.appendChild(fullRole);
    list.replaceChildren(...passes.map((pass) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ed-room__pass';
      button.textContent = pass.name;
      button.addEventListener('click', () => choose(pass.id), { signal });
      item.appendChild(button);
      return item;
    }), linkItem);

    function announce(pass) {
      const blocks = [];
      for (const leg of pass.legs) {
        if (leg.summary) blocks.push(`${leg.company}, ${leg.role}.`, leg.summary);
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
    // A load with #tickets or #tickets/<id> opens that state above a rest entry, so Esc and Back return to rest.
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
    renderer.render(scene, camera);
    section.classList.add('is-ready');
    resize.observe(stage);
    visibility.observe(section);
    theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    // ── Test hooks for the headless checks ──
    const ndc = new THREE.Vector3();
    const probe = new THREE.Raycaster();
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
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
        const hit = probe.intersectObjects(scene.children, true).find((h) => shown(h.object) || h.object === viewB);
        const atFrame = camera.position.clone().addScaledVector(dir, (FRAME_Z - camera.position.z) / dir.z);
        margin = Math.min(margin, atFrame.x - pane.x0, pane.x1 - atFrame.x, atFrame.y - pane.y0, pane.y1 - atFrame.y);
        return hit && (hit.object === viewA || hit.object === viewB);
      });
      return { visible, margin: +margin.toFixed(3) };
    }

    // Checks a view at the rest pose over the corners of the orbit, then puts the shown view back.
    async function landmarkSweep(file = viewShown) {
      const texture = await loadView(file);
      placeView(viewA, file, texture);
      const { pane, heightAtFrame, covers } = viewA.userData;
      const out = { file, pane: PANES.indexOf(pane) ? 'right' : 'left', heightAtFrame, covers, corners: {} };
      for (const yaw of [-3, 0, 3]) for (const pitch of [-3, 0, 3]) {
        placeCamera(poses.rest.eye, poses.rest.target, THREE.MathUtils.degToRad(yaw), THREE.MathUtils.degToRad(pitch));
        out.corners[`${yaw},${pitch}`] = landmarkVisible();
      }
      placeView(viewA, viewShown, await loadView(viewShown));
      placeCamera(cam.eye, cam.target, look.yaw, look.pitch);
      invalidate();
      return out;
    }

    // The projected size of the em box (and the cap height) of each marked text line, in CSS px.
    const capRatio = (() => { measure.font = font(1, 400, SANS); return measure.measureText('H').actualBoundingBoxAscent / TEX_PPM; })();
    function projectedEm(mesh, w, h, mark) {
      const a = new THREE.Vector3(mark.x + 0.05 - w / 2, h / 2 - mark.base, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      const b = new THREE.Vector3(mark.x + 0.05 - w / 2, h / 2 - mark.base + mark.size, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      return Math.hypot((a.x - b.x) * canvas.clientWidth, (a.y - b.y) * canvas.clientHeight) / 2;
    }
    function textPx(id = state.pass) {
      if (!id) return null;
      const { mesh } = passById.get(id);
      const result = { pass: id, capRatio: +capRatio.toFixed(3) };
      for (const mark of mesh.userData.layout.marks) {
        const px = projectedEm(mesh, PASS_W, PASS_H, mark);
        result[mark.mark] = Math.min(result[mark.mark] ?? Infinity, +px.toFixed(2));
      }
      if (paper.visible && paperShown === id) {
        const layout = paper.userData.layout;
        for (const mark of layout.marks) result.paperBody = Math.min(result.paperBody ?? Infinity, +projectedEm(paper, 1, 1, { ...mark, x: mark.x / PAPER.w, base: mark.base / layout.y, size: mark.size / layout.y }).toFixed(2));
      }
      return result;
    }

    function screenPoint(p) {
      const v = p.project(camera), rect = canvas.getBoundingClientRect();
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    }

    window.__room = {
      state: () => ({ ...state, settled: tweens.size === 0, view: viewShown }),
      landmarkVisible,
      landmarkSweep,
      textPx,
      passPoint: (id) => screenPoint(passById.get(id).mesh.getWorldPosition(new THREE.Vector3())),
      lampPoint: () => screenPoint(lampLight.getWorldPosition(new THREE.Vector3())),
      linkPoint: () => paperLink && screenPoint(new THREE.Vector3((paperLink.x0 + paperLink.x1) / 2 / paperLink.w - 0.5, 0.5 - (paperLink.y0 + paperLink.y1) / 2 / paperLink.h, 0).applyMatrix4(paper.matrixWorld)),
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
