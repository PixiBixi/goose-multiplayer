// Generates the .dc.html artboards for the goose-multiplayer design canvas.
// Four aesthetic directions for the same 63-square spiral, plus the leading
// candidate built out as a full desktop table.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = dirname(new URL(import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------- the rules */
const GEESE = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];

const SPECIAL = {
  6: { icon: 'bridge', name: 'Le Pont', tone: 'move', rule: 'File à la case 12.' },
  19: { icon: 'inn', name: "L'Auberge", tone: 'trap', rule: 'Tu passes ton prochain tour.' },
  26: { icon: 'dice', name: 'Les Dés', tone: 'move', rule: 'File à la case 53.' },
  31: { icon: 'well', name: 'Le Puits', tone: 'trap', rule: "Bloqué jusqu'à ce qu'un autre t'y remplace." },
  42: { icon: 'maze', name: 'Le Labyrinthe', tone: 'trap', rule: 'Retour à la case 30.' },
  52: { icon: 'prison', name: 'La Prison', tone: 'trap', rule: "Bloqué jusqu'à ce qu'un autre t'y remplace." },
  53: { icon: 'dice', name: 'Les Dés', tone: 'move', rule: 'Retour à la case 26.' },
  58: { icon: 'skull', name: 'La Mort', tone: 'death', rule: 'Retour à la case 1.' },
};

const toneOf = (n) => (SPECIAL[n] ? SPECIAL[n].tone : GEESE.includes(n) ? 'goose' : 'plain');

/* -------------------------------------------------------------- SVG icons
   Stroke-based, 24px grid, one consistent weight. No emoji anywhere. */
const ICONS = {
  goose: `<circle cx="16.4" cy="6.6" r="2.6"/><path d="M18.9 5.9h3.1l-1.6 1.9"/><path d="M15.4 9c-1.3 1.4-1.6 2.6-3.4 3.3C9.3 13.4 7 15.6 7 18.4V20"/><path d="M4 20h14"/>`,
  bridge: `<path d="M2.5 17.5h19"/><path d="M4.5 17.5c0-4.7 3.4-7.8 7.5-7.8s7.5 3.1 7.5 7.8"/><path d="M8.5 17.5v-4.2M15.5 17.5v-4.2M12 17.5v-5.4"/>`,
  inn: `<path d="M6 7.5h9.5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M15.5 10h2a2.6 2.6 0 0 1 0 5.2h-2"/><path d="M6 11h9.5"/>`,
  well: `<path d="M3.5 8.5 12 3.2l8.5 5.3"/><path d="M7 9.6v3.1M17 9.6v3.1"/><path d="M5.6 12.7h12.8l-1.3 8H6.9z"/><path d="M12 12.7v3.4"/>`,
  maze: `<path d="M3.2 3.2h17.6v17.6H7.6V7.6h9.6v9.6h-5.6v-5.6h2.4"/>`,
  prison: `<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="2.2"/><path d="M9.2 3.8v16.4M14.8 3.8v16.4"/>`,
  skull: `<path d="M12 2.8c-4.5 0-8 3.2-8 7.4 0 2.5 1.2 4.4 3 5.6v2.4a2.6 2.6 0 0 0 2.6 2.6h4.8a2.6 2.6 0 0 0 2.6-2.6v-2.4c1.8-1.2 3-3.1 3-5.6 0-4.2-3.5-7.4-8-7.4z"/><circle cx="8.9" cy="11" r="1.7"/><circle cx="15.1" cy="11" r="1.7"/><path d="M10.4 17.2v3.6M13.6 17.2v3.6"/>`,
  dice: `<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4"/><circle cx="8.4" cy="8.4" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="15.6" cy="15.6" r="1.5"/>`,
  garden: `<path d="M12 21v-5.4"/><path d="M12 15.6c-3.4 0-6-2.4-6-5.4S8.6 4.2 12 4.2s6 3 6 6-2.6 5.4-6 5.4z"/><path d="M9.4 10.8 12 8.4l2.6 2.4"/>`,
};

const icon = (name, size, color, sw = 1.9) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const iconAt = (name, x, y, size, color, sw = 1.9) =>
  `<g transform="translate(${(x - size / 2).toFixed(2)} ${(y - size / 2).toFixed(2)}) scale(${(size / 24).toFixed(4)})" fill="none" stroke="${color}" stroke-width="${((sw * 24) / size).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;

/* ---------------------------------------------------- the spiral geometry
   62 squares wind inward over three turns; square 63, le Jardin, is the
   medallion at the centre. Arc spacing and radial pitch are kept equal so
   the band reads evenly instead of stretching on the outer turn. */
function spiral({ cx, cy, r0, pitch, step, count }) {
  const pts = [];
  let r = r0;
  let th = Math.PI / 2; // enters at the bottom, as on the historic sheets
  for (let i = 0; i < count; i++) {
    pts.push({ n: i + 1, x: cx + r * Math.cos(th), y: cy + r * Math.sin(th), th, r });
    const dth = step / r;
    th -= dth; // counter-clockwise
    r -= (pitch / (2 * Math.PI)) * dth;
  }
  return pts;
}

/* =========================================================== the directions
   Each theme owns its palette, its type and its own way of drawing a square.
   Everything downstream reads from here, so a direction is one object. */

const THEMES = {
  grimoire: {
    key: 'grimoire', dw: 600,
    name: 'Cabinet d’estampes',
    axis: 'Estampe gravée du XVIII siècle',
    fonts:
      'family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400',
    display: `'Cormorant Garamond', 'Iowan Old Style', Georgia, serif`,
    body: `'EB Garamond', Georgia, 'Times New Roman', serif`,
    data: `'EB Garamond', Georgia, serif`,
    ground: '#e6dac2',
    surface: '#efe6d2',
    surfaceEdge: '#c2ac86',
    ink: '#241c14',
    dim: '#6b5b45',
    accent: '#a8331f',
    board: '#efe6d2',
    boardEdge: '#8d7550',
    tone: {
      plain: { bg: '#f4ecda', fg: '#3a2d1c', edge: '#8d7550' },
      goose: { bg: '#4a6b52', fg: '#f6efdd', edge: '#2e4534' },
      move: { bg: '#2f5670', fg: '#f6efdd', edge: '#1d3a4d' },
      trap: { bg: '#c1922f', fg: '#241c14', edge: '#8a6716' },
      death: { bg: '#a8331f', fg: '#f6efdd', edge: '#6f1f11' },
      garden: { bg: '#b08a3c', fg: '#241c14', edge: '#7a5c22' },
    },
    radius: '2px',
    pill: '2px',
    strokeW: 1.6,
    caps: '0.18em',
  },

  neon: {
    key: 'neon', dw: 700,
    name: 'Circuit nocturne',
    axis: 'Arcade néon, piste lumineuse',
    fonts: 'family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700',
    display: `'Space Grotesk', 'Helvetica Neue', Helvetica, sans-serif`,
    body: `'Space Grotesk', 'Helvetica Neue', Helvetica, sans-serif`,
    data: `'JetBrains Mono', ui-monospace, Menlo, monospace`,
    ground: '#06060f',
    surface: '#0c0c1d',
    surfaceEdge: '#232348',
    ink: '#e9e9ff',
    dim: '#7c7ca8',
    accent: '#35f0e0',
    board: '#0a0a18',
    boardEdge: '#232348',
    tone: {
      plain: { bg: '#141430', fg: '#8f8fc4', edge: '#2a2a55' },
      goose: { bg: '#0f3f3c', fg: '#4dffe8', edge: '#35f0e0' },
      move: { bg: '#1a2b5c', fg: '#7aa8ff', edge: '#4d7dff' },
      trap: { bg: '#4a3510', fg: '#ffcc55', edge: '#ffb020' },
      death: { bg: '#4a0f2c', fg: '#ff5e9e', edge: '#ff3d8a' },
      garden: { bg: '#3d2a05', fg: '#ffd76a', edge: '#ffc837' },
    },
    radius: '14px',
    pill: '999px',
    strokeW: 2,
    caps: '0.22em',
  },

  riso: {
    key: 'riso', dw: 400,
    name: 'Risographie',
    axis: 'Aplats sérigraphiés, encres fluo',
    fonts: 'family=Archivo+Black&family=Archivo:wght@400;600&family=Space+Mono:wght@400;700',
    display: `'Archivo Black', 'Helvetica Neue', Impact, sans-serif`,
    body: `'Archivo', 'Helvetica Neue', Helvetica, sans-serif`,
    data: `'Space Mono', ui-monospace, Menlo, monospace`,
    ground: '#f0e9d8',
    surface: '#faf5e8',
    surfaceEdge: '#1b2a4a',
    ink: '#1b2a4a',
    dim: '#5b6a86',
    accent: '#ff4f7b',
    board: '#faf5e8',
    boardEdge: '#1b2a4a',
    tone: {
      plain: { bg: '#faf5e8', fg: '#1b2a4a', edge: '#1b2a4a' },
      goose: { bg: '#1fb3a6', fg: '#0a2320', edge: '#1b2a4a' },
      move: { bg: '#5b7cff', fg: '#f6f2e6', edge: '#1b2a4a' },
      trap: { bg: '#f2a03d', fg: '#2a1c06', edge: '#1b2a4a' },
      death: { bg: '#ff4f7b', fg: '#2a0713', edge: '#1b2a4a' },
      garden: { bg: '#ffd93d', fg: '#1b2a4a', edge: '#1b2a4a' },
    },
    radius: '0px',
    pill: '0px',
    strokeW: 2.4,
    caps: '0.1em',
  },

  bauhaus: {
    key: 'bauhaus', dw: 800,
    name: 'Géométrie stricte',
    axis: 'Suisse, typographie massive, zéro décor',
    fonts: 'family=Syne:wght@600;700;800&family=Space+Grotesk:wght@400;500;700',
    display: `'Syne', 'Helvetica Neue', Helvetica, sans-serif`,
    body: `'Space Grotesk', 'Helvetica Neue', Helvetica, sans-serif`,
    data: `'Space Grotesk', ui-monospace, Menlo, monospace`,
    ground: '#eceae4',
    surface: '#f7f6f2',
    surfaceEdge: '#111111',
    ink: '#111111',
    dim: '#6a6a66',
    accent: '#e03127',
    board: '#f7f6f2',
    boardEdge: '#111111',
    tone: {
      plain: { bg: '#f7f6f2', fg: '#111111', edge: '#111111' },
      goose: { bg: '#111111', fg: '#f7f6f2', edge: '#111111' },
      move: { bg: '#1b4fd8', fg: '#f7f6f2', edge: '#111111' },
      trap: { bg: '#f5c518', fg: '#111111', edge: '#111111' },
      death: { bg: '#e03127', fg: '#f7f6f2', edge: '#111111' },
      garden: { bg: '#e03127', fg: '#f7f6f2', edge: '#111111' },
    },
    radius: '0px',
    pill: '0px',
    strokeW: 2.2,
    caps: '0.14em',
  },
};

// One typo above would silently produce an invalid colour; fix it explicitly.
THEMES.grimoire.tone.move.edge = '#1d3a4d';

/* ------------------------------------------------------------ board render */
function board(th, { size = 560, cellR, pawns = [] } = {}) {
  const R = cellR ?? Math.round(size * 0.039);
  const cx = size / 2;
  const cy = size / 2;
  const pts = spiral({ cx, cy, r0: size / 2 - R - 6, pitch: size * 0.0906, step: size * 0.0906, count: 62 });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const gardenR = R * 3.35;
  const id = th.key;
  let s = `<svg viewBox="0 0 ${size} ${size}" width="100%" style="display:block;max-width:${size}px" role="img" aria-label="Plateau du jeu de l'oie, 63 cases en spirale">`;

  s += `<defs>
    <filter id="glow-${id}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="grain-${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <pattern id="hatch-${id}" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="${th.ink}" stroke-width="1" opacity="0.18" />
    </pattern>
  </defs>`;

  /* the track under the squares */
  if (id === 'neon') {
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.accent}" stroke-width="${R * 2 + 10}" stroke-linecap="round" stroke-linejoin="round" opacity="0.10" filter="url(#glow-${id})"/>`;
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.accent}" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>`;
  } else if (id === 'riso') {
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.tone.move.bg}" stroke-width="${R * 2 + 14}" stroke-linecap="square" stroke-linejoin="round" opacity="0.22" style="mix-blend-mode:multiply"/>`;
  } else if (id === 'bauhaus') {
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.ink}" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>`;
  } else {
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.boardEdge}" stroke-width="${R * 2 + 12}" stroke-linecap="round" stroke-linejoin="round" opacity="0.13"/>`;
    s += `<path d="${path} L${cx},${cy}" fill="none" stroke="${th.boardEdge}" stroke-width="${R * 2 + 12}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.35" stroke-dasharray="1 5"/>`;
  }

  /* le Jardin, the centre */
  const g = th.tone.garden;
  if (id === 'bauhaus') {
    s += `<rect x="${cx - gardenR}" y="${cy - gardenR}" width="${gardenR * 2}" height="${gardenR * 2}" fill="${g.bg}"/>`;
  } else if (id === 'riso') {
    s += `<circle cx="${cx}" cy="${cy}" r="${gardenR}" fill="${g.bg}" stroke="${g.edge}" stroke-width="${th.strokeW}" style="mix-blend-mode:multiply"/>`;
  } else if (id === 'neon') {
    s += `<circle cx="${cx}" cy="${cy}" r="${gardenR}" fill="${g.bg}" stroke="${g.edge}" stroke-width="2" filter="url(#glow-${id})"/>`;
  } else {
    s += `<circle cx="${cx}" cy="${cy}" r="${gardenR}" fill="${g.bg}" stroke="${g.edge}" stroke-width="1.4"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${gardenR - 5}" fill="none" stroke="${g.edge}" stroke-width="0.8" opacity="0.7"/>`;
  }
  s += iconAt('garden', cx, cy - gardenR * 0.22, gardenR * 0.62, g.fg, th.strokeW);
  s += `<text x="${cx}" y="${cy + gardenR * 0.44}" text-anchor="middle" font-family="${th.display}" font-size="${gardenR * 0.36}" font-weight="${th.dw}" fill="${g.fg}">63</text>`;
  s += `<text x="${cx}" y="${cy + gardenR * 0.74}" text-anchor="middle" font-family="${th.body}" font-size="${gardenR * 0.19}" letter-spacing="${th.caps}" fill="${g.fg}" opacity="0.75">JARDIN</text>`;

  /* the 62 squares */
  for (const p of pts) {
    const t = th.tone[toneOf(p.n)];
    const sp = SPECIAL[p.n];
    const marked = sp || toneOf(p.n) === 'goose';
    if (id === 'bauhaus') {
      const a = (p.th * 180) / Math.PI + 90;
      s += `<rect x="${(p.x - R).toFixed(1)}" y="${(p.y - R).toFixed(1)}" width="${R * 2}" height="${R * 2}" fill="${t.bg}" stroke="${t.edge}" stroke-width="1.3" transform="rotate(${a.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
    } else if (id === 'riso') {
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" fill="${t.bg}" stroke="${t.edge}" stroke-width="${th.strokeW}" style="mix-blend-mode:multiply"/>`;
    } else if (id === 'neon') {
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" fill="${t.bg}" stroke="${t.edge}" stroke-width="${marked ? 2 : 1}" ${marked ? `filter="url(#glow-${id})"` : ''}/>`;
    } else {
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" fill="${t.bg}" stroke="${t.edge}" stroke-width="1.3"/>`;
      if (!marked)
        s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" fill="url(#hatch-${id})"/>`;
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R - 3}" fill="none" stroke="${t.edge}" stroke-width="0.6" opacity="0.55"/>`;
    }

    if (marked) {
      s += iconAt(sp ? sp.icon : 'goose', p.x, p.y - R * 0.14, R * 1.05, t.fg, th.strokeW);
      s += `<text x="${p.x.toFixed(1)}" y="${(p.y + R * 0.78).toFixed(1)}" text-anchor="middle" font-family="${th.data}" font-size="${R * 0.42}" font-weight="700" fill="${t.fg}">${p.n}</text>`;
    } else {
      s += `<text x="${p.x.toFixed(1)}" y="${(p.y + R * 0.24).toFixed(1)}" text-anchor="middle" font-family="${th.display}" font-size="${R * 0.68}" font-weight="${th.dw}" fill="${t.fg}">${p.n}</text>`;
    }
  }

  /* pawns orbit their square so a crowded square still shows its number */
  for (const pw of pawns) {
    const p = pts[pw.n - 1];
    const a = (-90 + pw.slot * 58) * (Math.PI / 180);
    const px = p.x + Math.cos(a) * (R + 3);
    const py = p.y + Math.sin(a) * (R + 3);
    const halo = id === 'neon' ? ` filter="url(#glow-${id})"` : '';
    if (id === 'bauhaus') {
      s += `<rect x="${(px - R * 0.52).toFixed(1)}" y="${(py - R * 0.52).toFixed(1)}" width="${(R * 1.04).toFixed(1)}" height="${(R * 1.04).toFixed(1)}" fill="${pw.colour}" stroke="${th.ink}" stroke-width="1.6"/>`;
    } else {
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${R * 0.52}" fill="${pw.colour}" stroke="${th.surface}" stroke-width="2.2"${halo}/>`;
    }
    if (pw.active)
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${R * 0.78}" fill="none" stroke="${th.accent}" stroke-width="2" opacity="0.9"${halo}/>`;
    s += `<text x="${px.toFixed(1)}" y="${(py + R * 0.2).toFixed(1)}" text-anchor="middle" font-family="${th.display}" font-size="${R * 0.5}" font-weight="${th.dw}" fill="${id === 'bauhaus' ? th.surface : th.surface}">${pw.initial}</text>`;
  }

  s += `<text x="${pts[0].x.toFixed(1)}" y="${(pts[0].y + R + 15).toFixed(1)}" text-anchor="middle" font-family="${th.body}" font-size="10" letter-spacing="${th.caps}" fill="${th.dim}">DÉPART</text>`;

  if (id === 'grimoire' || id === 'riso')
    s += `<rect width="${size}" height="${size}" filter="url(#grain-${id})" opacity="${id === 'riso' ? 0.1 : 0.14}" style="mix-blend-mode:multiply;pointer-events:none"/>`;

  s += `</svg>`;
  return s;
}

/* ------------------------------------------------------------- UI pieces */
const PLAYERS = [
  { name: 'Jérémy', initial: 'J', n: 27, presence: '#4ade80' },
  { name: 'Claire', initial: 'C', n: 19, presence: '#4ade80' },
  { name: 'Malo', initial: 'M', n: 31, presence: '#4ade80' },
  { name: 'Anouk', initial: 'A', n: 12, presence: '#fbbf24' },
  { name: 'Théo', initial: 'T', n: 6, presence: '#4ade80' },
];

const pawnColours = (th) => [
  th.tone.death.edge === '#1b2a4a' ? '#ff4f7b' : th.tone.death.bg,
  th.tone.move.bg === '#f7f6f2' ? '#1b4fd8' : th.tone.move.bg,
  '#8b5cf6',
  '#14b8a6',
  th.tone.trap.bg,
];

const plate = (th, { name, initial, colour, presence, note, turn }) => `
<div style="display:flex;align-items:center;gap:0.55rem;padding:0.35rem 0.8rem 0.35rem 0.35rem;border-radius:${th.pill};background:${turn ? th.accent : 'transparent'};border:1.5px solid ${turn ? th.accent : th.surfaceEdge};color:${turn ? (th.key === 'neon' ? '#04140f' : th.key === 'riso' ? '#2a0713' : '#f6efdd') : th.ink};white-space:nowrap">
  <span style="display:grid;place-items:center;width:28px;height:28px;border-radius:${th.key === 'bauhaus' || th.key === 'riso' ? '0' : '50%'};background:${colour};color:${th.surface};font-family:${th.display};font-weight:${th.dw};font-size:0.8rem">${initial}</span>
  <span style="font-family:${th.display};font-weight:${th.dw};font-size:0.95rem">${name}</span>
  <span style="width:7px;height:7px;border-radius:50%;background:${presence};flex:none"></span>
  ${note ? `<span style="font-family:${th.data};font-size:0.72rem;opacity:0.75">${note}</span>` : ''}
</div>`;

const dieFace = (th, value, size = 56) => {
  const L = 16;
  const M = 30;
  const R = 44;
  const map = {
    1: [[M, M]],
    2: [[L, L], [R, R]],
    3: [[L, L], [M, M], [R, R]],
    4: [[L, L], [R, L], [L, R], [R, R]],
    5: [[L, L], [R, L], [M, M], [L, R], [R, R]],
    6: [[L, L], [R, L], [L, M], [R, M], [L, R], [R, R]],
  };
  const rx = th.key === 'bauhaus' || th.key === 'riso' ? 0 : th.key === 'neon' ? 14 : 4;
  const face = th.key === 'neon' ? '#141430' : th.surface;
  const pipC = th.key === 'neon' ? th.accent : th.ink;
  return `<svg viewBox="0 0 60 60" width="${size}" height="${size}"><rect x="1.5" y="1.5" width="57" height="57" rx="${rx}" fill="${face}" stroke="${th.key === 'neon' ? th.accent : th.ink}" stroke-width="2"/>${map[value]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${pipC}"/>`)
    .join('')}</svg>`;
};

const btn = (th, label, primary) => `
<button style="font-family:${th.display};font-weight:${th.dw};min-height:44px;padding:0.6rem 1.4rem;border-radius:${th.pill};border:1.5px solid ${primary ? 'transparent' : th.surfaceEdge};background:${primary ? th.accent : 'transparent'};color:${primary ? (th.key === 'neon' ? '#04140f' : th.key === 'grimoire' || th.key === 'riso' ? '#fff8ec' : '#f7f6f2') : th.ink};font-size:1rem;letter-spacing:${th.key === 'bauhaus' ? '0.04em' : '0'};cursor:pointer;${th.key === 'neon' && primary ? `box-shadow:0 0 24px ${th.accent}66;` : ''}${th.key === 'riso' && primary ? 'box-shadow:4px 4px 0 #1b2a4a;' : ''}">${label}</button>`;

const legend = (th) =>
  [
    ['goose', 'Oie · rejoue'],
    ['move', 'Mouvement'],
    ['trap', 'Piège'],
    ['death', 'Mort'],
    ['garden', 'Jardin'],
  ]
    .map(
      ([k, label]) => `<span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:${th.dim};font-family:${th.body}">
    <span style="width:11px;height:11px;border-radius:${th.key === 'bauhaus' || th.key === 'riso' ? '0' : '3px'};background:${th.tone[k].bg};border:1px solid ${th.tone[k].edge};flex:none"></span>${label}</span>`,
    )
    .join('');

/* ------------------------------------------------------------- page shell */
const helmet = (th, extra = '') => `<helmet>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${th.fonts}&amp;display=swap" />
  <style>
    /* Without this, a flex-basis sets the CONTENT box and borders plus padding
       add on top: the chat rail measured 336px for a 300px basis and pushed the
       artboard 30px past its declared width. */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: ${th.body}; -webkit-font-smoothing: antialiased; }
    h1, h2, h3 { font-family: ${th.display}; margin: 0; line-height: 1.08; }
    a { color: ${th.accent}; }
    a:hover { opacity: 0.75; }
    ${extra}
  </style>
</helmet>`;

const doc = (inner) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${inner}
</x-dc>
</body>
</html>
`;

/* ------------------------------------------------- the direction artboards
   Same table moment in every one: Jérémy has rolled 7, landed on goose 27
   and gets to roll again. Only the aesthetic changes, so the comparison is
   about style and nothing else. */
function directionArtboard(th, blurb) {
  const cols = pawnColours(th);
  const pawns = [
    { n: 27, colour: cols[0], initial: 'J', slot: 0, active: true },
    { n: 19, colour: cols[1], initial: 'C', slot: 1 },
    { n: 31, colour: cols[2], initial: 'M', slot: 2 },
    { n: 12, colour: cols[3], initial: 'A', slot: 3 },
    { n: 6, colour: cols[4], initial: 'T', slot: 4 },
  ];
  const isDark = th.key === 'neon';
  return doc(`${helmet(th)}
<div style="width:900px;height:820px;background:${th.ground};color:${th.ink};padding:32px 36px;display:flex;flex-direction:column;gap:18px;position:relative;overflow:hidden">
  ${
    th.key === 'neon'
      ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 40%, #16163a 0%, #06060f 72%);pointer-events:none"></div>`
      : ''
  }
  ${
    th.key === 'riso'
      ? `<div style="position:absolute;top:-90px;right:-70px;width:340px;height:340px;border-radius:50%;background:#ff4f7b;opacity:0.16;mix-blend-mode:multiply;pointer-events:none"></div>
         <div style="position:absolute;bottom:-120px;left:-80px;width:300px;height:300px;border-radius:50%;background:#1fb3a6;opacity:0.16;mix-blend-mode:multiply;pointer-events:none"></div>`
      : ''
  }
  ${
    th.key === 'bauhaus'
      ? `<div style="position:absolute;top:0;left:0;width:14px;height:100%;background:${th.accent};pointer-events:none"></div>`
      : ''
  }

  <div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem">
    <div style="display:flex;flex-direction:column;gap:0.35rem;max-width:34rem">
      <span style="font-family:${th.body};font-size:0.72rem;letter-spacing:${th.caps};text-transform:uppercase;color:${th.dim}">${th.axis}</span>
      <h1 style="font-size:${th.key === 'grimoire' ? '3.1rem' : '2.5rem'};font-weight:${th.dw};letter-spacing:${th.key === 'bauhaus' ? '-0.03em' : th.key === 'grimoire' ? '0.01em' : '-0.02em'}">${th.name}</h1>
      <p style="margin:0.25rem 0 0;font-size:0.95rem;line-height:1.5;color:${th.dim};max-width:44ch">${blurb}</p>
    </div>
    <div style="display:flex;align-items:center;gap:0.6rem;flex:none">
      ${icon('goose', 34, th.accent, th.strokeW)}
      <span style="font-family:${th.data};font-size:0.85rem;font-weight:700;letter-spacing:0.2em;color:${th.dim}">HKD4P2</span>
    </div>
  </div>

  <div style="position:relative;flex:1 1 auto;min-height:0;display:grid;grid-template-columns:190px minmax(0,1fr) 190px;gap:16px;align-items:center;border-radius:${th.radius};border:1.5px solid ${th.surfaceEdge};background:${isDark ? 'rgb(12 12 29 / 0.6)' : th.surface};padding:18px">
    <div style="display:flex;flex-direction:column;gap:0.6rem;align-items:flex-start">
      ${plate(th, { ...PLAYERS[1], colour: cols[1], note: '19' })}
      ${plate(th, { ...PLAYERS[3], colour: cols[3], note: '12' })}
    </div>
    <div style="display:flex;justify-content:center">${board(th, { size: 460, pawns })}</div>
    <div style="display:flex;flex-direction:column;gap:0.6rem;align-items:flex-end">
      ${plate(th, { ...PLAYERS[2], colour: cols[2], note: 'puits' })}
      ${plate(th, { ...PLAYERS[4], colour: cols[4], note: '6' })}
    </div>
  </div>

  <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:0.8rem">
      ${plate(th, { ...PLAYERS[0], colour: cols[0], turn: true, note: 'à toi' })}
      <div style="display:flex;gap:0.4rem">${dieFace(th, 4, 48)}${dieFace(th, 3, 48)}</div>
      ${btn(th, 'Lancer les dés', true)}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.8rem;justify-content:flex-end">${legend(th)}</div>
  </div>

  <p style="position:relative;margin:0;font-family:${th.body};font-size:0.85rem;font-weight:600;color:${th.accent}">7 · de la case 20 à la case 27, une oie : tu rejoues.</p>
</div>`);
}

/* ------------------------------------------------------- the leading build
   Riso at full desktop fidelity: the board, the seats, the rule strip and
   the running commentary the server sends. */
function mainArtboard(th) {
  const cols = pawnColours(th);
  const pawns = [
    { n: 27, colour: cols[0], initial: 'J', slot: 0, active: true },
    { n: 19, colour: cols[1], initial: 'C', slot: 1 },
    { n: 31, colour: cols[2], initial: 'M', slot: 2 },
    { n: 12, colour: cols[3], initial: 'A', slot: 3 },
    { n: 6, colour: cols[4], initial: 'T', slot: 4 },
  ];
  const ruleChip = (label, on) => `
<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.2rem 0.65rem;border:1.5px solid ${on ? th.ink : th.dim};background:${on ? th.tone.goose.bg : 'transparent'};color:${on ? th.tone.goose.fg : th.dim};font-family:${th.data};font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">${label}</span>`;

  const logLine = (who, text) => `
<p style="margin:0;font-size:0.9rem;line-height:1.45;color:${th.dim}"><strong style="font-family:${th.display};font-weight:${th.dw};color:${th.ink}">${who}</strong> ${text}</p>`;

  return doc(`${helmet(th)}
<div style="width:1440px;height:900px;background:${th.ground};color:${th.ink};padding:26px 30px;display:flex;gap:22px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-140px;left:-120px;width:420px;height:420px;border-radius:50%;background:#1fb3a6;opacity:0.14;mix-blend-mode:multiply;pointer-events:none"></div>
  <div style="position:absolute;bottom:-160px;right:220px;width:380px;height:380px;border-radius:50%;background:#ff4f7b;opacity:0.13;mix-blend-mode:multiply;pointer-events:none"></div>

  <div style="position:relative;flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:14px">

    <div style="display:flex;align-items:center;justify-content:space-between;gap:1.5rem">
      <div style="display:flex;align-items:center;gap:0.8rem">
        <span style="display:grid;place-items:center;width:46px;height:46px;background:${th.accent};box-shadow:4px 4px 0 ${th.ink}">${icon('goose', 28, '#fff8ec', 2.2)}</span>
        <h1 style="font-size:2rem;font-weight:${th.dw};letter-spacing:-0.02em">JEU DE L'OIE</h1>
        <span style="font-family:${th.data};font-size:1rem;font-weight:700;letter-spacing:0.22em;padding:0.2rem 0.6rem;border:1.5px solid ${th.ink};background:${th.tone.garden.bg}">HKD4P2</span>
      </div>
      <div style="display:flex;gap:0.6rem">${btn(th, 'Règles')}${btn(th, 'Quitter')}</div>
    </div>

    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem">
      <span style="font-family:${th.body};font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:${th.dim};margin-right:0.2rem">Règles de table</span>
      ${ruleChip('Arrivée exacte', true)}${ruleChip('Deux dés', true)}${ruleChip('Délivrance', true)}${ruleChip('Ouverture 9', false)}${ruleChip('Cartes action', false)}
    </div>

    <div style="flex:1 1 auto;min-height:0;display:grid;grid-template-columns:190px minmax(0,1fr) 190px;gap:18px;align-items:center;border:2px solid ${th.ink};background:${th.surface};box-shadow:8px 8px 0 ${th.ink};padding:20px">
      <div style="display:flex;flex-direction:column;gap:0.7rem;align-items:flex-start">
        ${plate(th, { ...PLAYERS[1], colour: cols[1], note: 'case 19' })}
        ${plate(th, { ...PLAYERS[3], colour: cols[3], note: 'absent · 72 s' })}
      </div>
      <div style="display:flex;justify-content:center">${board(th, { size: 545, pawns })}</div>
      <div style="display:flex;flex-direction:column;gap:0.7rem;align-items:flex-end">
        ${plate(th, { ...PLAYERS[2], colour: cols[2], note: 'puits · bloqué' })}
        ${plate(th, { ...PLAYERS[4], colour: cols[4], note: 'case 6' })}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:0.9rem">
        ${plate(th, { ...PLAYERS[0], colour: cols[0], turn: true, note: 'à toi de jouer' })}
        <div style="display:flex;gap:0.45rem">${dieFace(th, 4, 54)}${dieFace(th, 3, 54)}</div>
        ${btn(th, 'Lancer les dés', true)}
        <p style="margin:0;font-size:0.9rem;font-weight:600;color:${th.accent};max-width:16rem">7 · case 27, une oie : tu rejoues.</p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.9rem;justify-content:flex-end">${legend(th)}</div>
    </div>
  </div>

  <aside style="position:relative;flex:0 0 300px;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:0.7rem;border:2px solid ${th.ink};background:${th.surface};box-shadow:8px 8px 0 ${th.ink};padding:18px">
    <h2 style="font-size:1.1rem;font-weight:${th.dw};letter-spacing:0.02em">LA PARTIE</h2>
    <div style="flex:1 1 auto;display:flex;flex-direction:column;gap:0.6rem;overflow:hidden">
      ${logLine('Théo', 'tombe sur le pont et file à la case 12.')}
      ${logLine('Malo', "tombe dans le puits. Il y reste jusqu'à ce qu'on l'en sorte.")}
      ${logLine('Claire', "s'arrête à l'auberge : elle passe son tour.")}
      ${logLine('Anouk', 'a perdu la connexion. Sa place est gardée 90 s.')}
      ${logLine('Jérémy', 'fait 7, atteint l\'oie 27 et rejoue.')}
    </div>
    <div style="padding-top:0.7rem;border-top:2px solid ${th.ink};display:flex;flex-direction:column;gap:0.5rem">
      ${logLine('Claire', ': le puits, encore')}
      <div style="display:flex;gap:0.5rem">
        <input placeholder="Écrire au groupe" style="flex:1 1 auto;min-width:0;font-family:${th.body};font-size:0.9rem;min-height:44px;padding:0.6rem 0.8rem;border:1.5px solid ${th.ink};background:${th.ground};color:${th.ink}" />
        ${btn(th, 'Envoyer', true)}
      </div>
    </div>
  </aside>
</div>`);
}

/* ---------------------------------------------------- the grid fallback
   Under ~700px the spiral stops being readable at any usable cell size, so
   the board falls back to a boustrophedon grid. Same squares, same colours,
   a different renderer over the same 63 positions. */
function gridBoard(th, { cols = 7, cell = 46, gap = 5, pawns = [] } = {}) {
  const rows = Math.ceil(63 / cols);
  const w = cols * (cell + gap) + gap;
  const h = rows * (cell + gap) + gap;
  const pos = {};
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;max-width:${w}px" role="img" aria-label="Plateau du jeu de l'oie, 63 cases en serpentin">`;
  for (let n = 1; n <= 63; n++) {
    const i = n - 1;
    const band = Math.floor(i / cols);
    const row = rows - 1 - band;
    const idx = i % cols;
    const col = band % 2 === 0 ? idx : cols - 1 - idx;
    const x = gap + col * (cell + gap);
    const y = gap + row * (cell + gap);
    pos[n] = { x, y };
    const t = n === 63 ? th.tone.garden : th.tone[toneOf(n)];
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${t.bg}" stroke="${t.edge}" stroke-width="1.6" style="mix-blend-mode:multiply"/>`;
    const sp = n === 63 ? { icon: 'garden' } : SPECIAL[n];
    if (sp || toneOf(n) === 'goose') {
      s += iconAt(sp ? sp.icon : 'goose', x + cell / 2, y + cell / 2 - 3, 21, t.fg, th.strokeW);
      s += `<text x="${x + cell / 2}" y="${y + cell - 6}" text-anchor="middle" font-family="${th.data}" font-size="8.5" font-weight="700" fill="${t.fg}">${n}</text>`;
    } else {
      s += `<text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" font-family="${th.display}" font-size="14" font-weight="${th.dw}" fill="${t.fg}">${n}</text>`;
    }
  }
  for (const pw of pawns) {
    const p = pos[pw.n];
    s += `<rect x="${p.x + cell - 20}" y="${p.y + 2}" width="18" height="18" fill="${pw.colour}" stroke="${th.ink}" stroke-width="1.6"/>`;
    s += `<text x="${p.x + cell - 11}" y="${p.y + 15}" text-anchor="middle" font-family="${th.display}" font-size="10" font-weight="${th.dw}" fill="${th.surface}">${pw.initial}</text>`;
  }
  s += `</svg>`;
  return s;
}

const inkBox = (th, extra = '') =>
  `border:2px solid ${th.ink};background:${th.surface};box-shadow:6px 6px 0 ${th.ink};${extra}`;

const eyebrow = (th, text) =>
  `<span style="font-family:${th.body};font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:${th.dim}">${text}</span>`;

/* ---------------------------------------------------------- TableMobile */
function mobileArtboard(th) {
  const cols = pawnColours(th);
  return doc(`${helmet(th)}
<div style="width:390px;height:844px;background:${th.ground};color:${th.ink};padding:14px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-70px;right:-60px;width:240px;height:240px;border-radius:50%;background:#1fb3a6;opacity:0.15;mix-blend-mode:multiply;pointer-events:none"></div>

  <div style="position:relative;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span style="display:grid;place-items:center;width:34px;height:34px;background:${th.accent};box-shadow:3px 3px 0 ${th.ink}">${icon('goose', 20, '#fff8ec', 2.2)}</span>
      <span style="font-family:${th.display};font-weight:${th.dw};font-size:1rem;letter-spacing:-0.01em">JEU DE L'OIE</span>
    </div>
    <span style="font-family:${th.data};font-size:0.78rem;font-weight:700;letter-spacing:0.16em;padding:0.15rem 0.45rem;border:1.5px solid ${th.ink};background:${th.tone.garden.bg}">HKD4P2</span>
  </div>

  <div style="position:relative;flex:1 1 auto;min-height:0;${inkBox(th)}padding:14px;display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;gap:0.4rem;overflow:hidden">
      ${plate(th, { ...PLAYERS[1], colour: cols[1], note: '19' })}
      ${plate(th, { ...PLAYERS[2], colour: cols[2], note: 'puits' })}
    </div>

    <div style="flex:1 1 auto;display:flex;align-items:center;justify-content:center">
      ${gridBoard(th, {
        pawns: [
          { n: 27, colour: cols[0], initial: 'J' },
          { n: 19, colour: cols[1], initial: 'C' },
          { n: 31, colour: cols[2], initial: 'M' },
          { n: 6, colour: cols[4], initial: 'T' },
        ],
      })}
    </div>

    <div style="display:flex;flex-direction:column;align-items:center;gap:0.55rem">
      ${plate(th, { ...PLAYERS[0], colour: cols[0], turn: true, note: 'à toi' })}
      <div style="display:flex;align-items:center;gap:0.55rem">
        ${dieFace(th, 4, 46)}${dieFace(th, 3, 46)}
        ${btn(th, 'Lancer', true)}
      </div>
      <p style="margin:0;font-size:0.82rem;font-weight:600;color:${th.accent};text-align:center">7 · case 27, une oie : tu rejoues.</p>
    </div>
  </div>

  <div style="position:relative;display:flex;gap:0.5rem">
    ${btn(th, 'La partie · 6')}
    ${btn(th, 'Règles')}
  </div>
</div>`);
}

/* ---------------------------------------------------------------- Lobby */
function lobbyArtboard(th) {
  const cols = pawnColours(th);
  const ruleRow = (title, detail, on) => `
<label style="display:flex;align-items:flex-start;gap:0.8rem;padding:0.75rem 0.9rem;border:2px solid ${th.ink};background:${on ? th.surface : 'transparent'};${on ? `box-shadow:4px 4px 0 ${th.ink};` : ''}cursor:pointer">
  <span style="flex:none;margin-top:2px;width:44px;height:24px;border:2px solid ${th.ink};background:${on ? th.tone.goose.bg : th.ground};position:relative">
    <span style="position:absolute;top:2px;${on ? 'right:2px' : 'left:2px'};width:16px;height:16px;background:${th.ink}"></span>
  </span>
  <span style="display:flex;flex-direction:column;gap:0.15rem;min-width:0">
    <span style="font-family:${th.display};font-weight:${th.dw};font-size:0.95rem;color:${th.ink}">${title}</span>
    <span style="font-size:0.85rem;line-height:1.45;color:${th.dim}">${detail}</span>
  </span>
</label>`;

  const seat = (p, colour, host) => `
<div style="display:flex;align-items:center;gap:0.7rem;padding:0.55rem 0.8rem;border:2px solid ${th.ink};background:${th.surface}">
  <span style="display:grid;place-items:center;width:34px;height:34px;background:${colour};color:${th.surface};font-family:${th.display};font-weight:${th.dw};font-size:0.95rem">${p.initial}</span>
  <span style="font-family:${th.display};font-weight:${th.dw};flex:1 1 auto;font-size:0.95rem">${p.name}</span>
  ${host ? `<span style="font-family:${th.data};font-size:0.68rem;font-weight:700;letter-spacing:0.1em;padding:0.1rem 0.4rem;background:${th.tone.garden.bg};border:1.5px solid ${th.ink}">HÔTE</span>` : ''}
  <span style="width:8px;height:8px;border-radius:50%;background:${p.presence};flex:none"></span>
</div>`;

  return doc(`${helmet(th)}
<div style="width:1240px;height:900px;background:${th.ground};color:${th.ink};padding:44px 52px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-130px;right:-90px;width:400px;height:400px;border-radius:50%;background:${th.accent};opacity:0.14;mix-blend-mode:multiply;pointer-events:none"></div>
  <div style="position:absolute;bottom:-150px;left:-100px;width:360px;height:360px;border-radius:50%;background:#1fb3a6;opacity:0.15;mix-blend-mode:multiply;pointer-events:none"></div>

  <div style="position:relative;display:grid;grid-template-columns:26rem minmax(0,1fr);column-gap:3rem;align-items:start">

    <div style="display:flex;flex-direction:column;gap:1.4rem">
      <div style="display:flex;align-items:center;gap:0.8rem">
        <span style="display:grid;place-items:center;width:52px;height:52px;background:${th.accent};box-shadow:5px 5px 0 ${th.ink}">${icon('goose', 32, '#fff8ec', 2.2)}</span>
        <h1 style="font-size:2.4rem;font-weight:${th.dw};letter-spacing:-0.03em">JEU DE L'OIE</h1>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.6rem">
        ${eyebrow(th, 'Code de la table')}
        <div style="display:flex;align-items:center;gap:0.8rem">
          <p style="margin:0;font-family:${th.data};font-size:2rem;font-weight:700;letter-spacing:0.16em;padding:0.2rem 0.7rem;border:2px solid ${th.ink};background:${th.tone.garden.bg};box-shadow:5px 5px 0 ${th.ink}">HKD4P2</p>
          ${btn(th, 'Copier le lien')}
        </div>
        <p style="margin:0;font-size:0.88rem;line-height:1.5;color:${th.dim}">Partage le code ou le lien. Tout le monde rejoint depuis un navigateur, sans compte et sans rien installer.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${eyebrow(th, 'Joueurs · 5 sur 6')}
        ${seat(PLAYERS[0], cols[0], true)}
        ${seat(PLAYERS[1], cols[1])}
        ${seat(PLAYERS[2], cols[2])}
        ${seat(PLAYERS[3], cols[3])}
        ${seat(PLAYERS[4], cols[4])}
        <div style="display:flex;align-items:center;gap:0.7rem;padding:0.55rem 0.8rem;border:2px dashed ${th.dim};color:${th.dim};font-size:0.88rem">
          <span style="display:grid;place-items:center;width:34px;height:34px;border:2px dashed ${th.dim};font-family:${th.display}">+</span>
          Une place libre
        </div>
      </div>

      ${btn(th, 'COMMENCER LA PARTIE', true)}
    </div>

    <div style="display:flex;flex-direction:column;gap:1.1rem;min-width:0">
      <div style="display:flex;flex-direction:column;gap:0.3rem">
        <h2 style="font-size:1.5rem;font-weight:${th.dw};letter-spacing:-0.02em">RÈGLES DE LA TABLE</h2>
        <p style="margin:0;font-size:0.85rem;color:${th.dim}">Seul l'hôte les change, et seulement avant le premier lancer.</p>
      </div>
      ${ruleRow('Arrivée exacte', 'Il faut tomber pile sur 63. Un lancer trop fort fait rebondir en arrière du surplus.', true)}
      ${ruleRow('Deux dés', "Deux dés à six faces. Décoché, on joue à un seul dé et la partie dure deux fois plus longtemps.", true)}
      ${ruleRow('Délivrance du puits et de la prison', "Un joueur bloqué est libéré dès qu'un autre prend sa place. Décoché, il y reste jusqu'à la fin.", true)}
      ${ruleRow('Ouverture 9', 'Un 9 au premier lancer envoie directement à la case 26 si les dés font 6+3, à la case 53 si 5+4.', false)}
      ${ruleRow('Cartes action', "La variante : certaines cases font piocher une carte à jouer contre les autres. Prévu en phase 2.", false)}

      <div style="display:flex;gap:0.9rem;align-items:flex-start;padding:0.9rem 1rem;border-left:8px solid ${th.accent};background:${th.surface};border-top:2px solid ${th.ink};border-right:2px solid ${th.ink};border-bottom:2px solid ${th.ink}">
        <span style="display:flex;flex-direction:column;gap:0.2rem">
          <span style="font-family:${th.display};font-weight:${th.dw};font-size:0.95rem">Partie estimée : 8 à 12 minutes</span>
          <span style="font-size:0.85rem;line-height:1.45;color:${th.dim}">Manche unique. Le premier au jardin gagne, puis la table propose de rejouer avec les mêmes joueurs.</span>
        </span>
      </div>
    </div>
  </div>
</div>`);
}

/* -------------------------------------------------------------- Squares */
function squaresArtboard(th) {
  const card = (label, sub, tone, iconName, rule, extra) => {
    const t = th.tone[tone];
    return `
<div style="display:flex;gap:0.9rem;align-items:flex-start;padding:1rem;border:2px solid ${th.ink};background:${th.surface};box-shadow:5px 5px 0 ${th.ink}">
  <span style="flex:none;display:grid;place-items:center;width:56px;height:56px;background:${t.bg};border:2px solid ${th.ink}">${icon(iconName, 28, t.fg, th.strokeW)}</span>
  <span style="display:flex;flex-direction:column;gap:0.25rem;min-width:0">
    <span style="display:flex;align-items:baseline;gap:0.6rem;flex-wrap:wrap">
      <span style="font-family:${th.display};font-weight:${th.dw};font-size:1.15rem;letter-spacing:-0.01em">${label}</span>
      <span style="font-family:${th.data};font-size:0.75rem;font-weight:700;color:${th.dim}">${sub}</span>
    </span>
    <span style="font-size:0.9rem;line-height:1.5;color:${th.dim}">${rule}</span>
    ${extra ? `<span style="font-family:${th.data};font-size:0.75rem;color:${th.dim};padding-top:0.15rem">${extra}</span>` : ''}
  </span>
</div>`;
  };

  return doc(`${helmet(th)}
<div style="width:1180px;height:960px;background:${th.ground};color:${th.ink};padding:44px 52px;display:flex;flex-direction:column;gap:1.5rem;position:relative;overflow:hidden">
  <div style="position:absolute;top:-120px;left:-90px;width:360px;height:360px;border-radius:50%;background:${th.tone.trap.bg};opacity:0.16;mix-blend-mode:multiply;pointer-events:none"></div>

  <div style="position:relative;display:flex;flex-direction:column;gap:0.5rem">
    ${eyebrow(th, 'Référence')}
    <h1 style="font-size:3rem;font-weight:${th.dw};letter-spacing:-0.035em;max-width:22ch">LES CASES QUI FONT LA PARTIE</h1>
    <p style="margin:0;font-size:1rem;line-height:1.55;color:${th.dim};max-width:56ch">Cinquante-quatre cases ne font rien du tout. Ce sont les neuf autres qui décident, et leur couleur suffit à savoir ce qui t'attend avant même de lire.</p>
  </div>

  <div style="position:relative;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:1rem">
    ${card('Les Oies', '13 cases, de 9 en 9', 'goose', 'goose', "Tu rejoues le même lancer et tu avances d'autant. Deux oies d'affilée et tu traverses la moitié du plateau en un tour.", GEESE.join(' · '))}
    ${card('Le Jardin', 'case 63', 'garden', 'garden', "L'arrivée. Avec l'arrivée exacte, un lancer trop fort te fait rebondir en arrière du surplus.")}
    ${card('Le Pont', 'case 6', 'move', 'bridge', 'File directement à la case 12. Le seul raccourci gratuit du plateau.')}
    ${card("L'Auberge", 'case 19', 'trap', 'inn', 'Tu passes ton prochain tour. Les autres continuent sans toi.')}
    ${card('Les Dés', 'cases 26 et 53', 'move', 'dice', "Les deux cases se renvoient l'une à l'autre : de 26 tu files à 53, de 53 tu reviens à 26.")}
    ${card('Le Puits', 'case 31', 'trap', 'well', "Bloqué jusqu'à ce qu'un autre joueur tombe dedans et prenne ta place.")}
    ${card('Le Labyrinthe', 'case 42', 'trap', 'maze', 'Retour à la case 30. Douze cases perdues, et souvent la partie avec.')}
    ${card('La Prison', 'case 52', 'trap', 'prison', "Même règle que le puits : bloqué jusqu'à ce qu'un autre t'y remplace.")}
    ${card('La Mort', 'case 58', 'death', 'skull', 'Retour à la case 1. Cinq cases avant la fin. Tout est à refaire.')}
  </div>

  <div style="position:relative;margin-top:auto;display:flex;flex-wrap:wrap;gap:1.2rem;padding-top:1rem;border-top:2px solid ${th.ink}">
    ${legend(th)}
    <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:${th.dim};font-family:${th.body}">
      <span style="width:11px;height:11px;background:${th.tone.plain.bg};border:1px solid ${th.tone.plain.edge};flex:none"></span>Case ordinaire</span>
  </div>
</div>`);
}

/* ------------------------------------------------------------------ write */
const BLURBS = {
  grimoire:
    "Le jeu de l'oie EST une estampe : une feuille gravée, vendue au colporteur depuis le XVI siècle. Papier vergé, filets fins, hachures, vermillon et verdigris. Personne d'autre sur le web ne ressemble à ça. Le risque : ça peut sentir le musée si la mise en page ne respire pas.",
  neon: "La spirale devient une piste lumineuse et le plateau un circuit. Fond nuit, halos, monospace. Ça flatte l'écran et le dé qui roule, ça donne de l'énergie à un jeu qui n'en a pas beaucoup. Le risque : le néon est le costume le plus porté du web, il faut le tenir avec rigueur pour ne pas faire générique.",
  riso: "Encres sérigraphiées en surimpression, aplats francs, typographie massive, ombres portées dures. L'énergie d'un jeu de société indé. Lisible partout, du mobile au vidéoprojecteur, et le seul des quatre qui reste aussi bon en petit qu'en grand. Le risque : c'est un parti pris fort, il ne se négocie pas à moitié.",
  bauhaus:
    "Suisse. Une grille, des carrés pivotés le long de la spirale, du noir, un rouge, un bleu, zéro décor. Les chiffres portent tout. Élégant et intemporel, très rapide à rendre. Le risque : austère pour un jeu de plateau familial, et le plaisir tient entièrement à la précision de l'espacement.",
};

const RISO = THEMES.riso;

const files = {
  'Main.dc.html': mainArtboard(RISO),
  'TableMobile.dc.html': mobileArtboard(RISO),
  'Lobby.dc.html': lobbyArtboard(RISO),
  'Squares.dc.html': squaresArtboard(RISO),
  'Grimoire.dc.html': directionArtboard(THEMES.grimoire, BLURBS.grimoire),
  'Neon.dc.html': directionArtboard(THEMES.neon, BLURBS.neon),
  'Bauhaus.dc.html': directionArtboard(THEMES.bauhaus, BLURBS.bauhaus),
  'canvas.json': JSON.stringify(
    {
      pages: [
        { id: 'page-1', name: 'Écrans' },
        { id: 'page-2', name: 'Directions écartées' },
      ],
      artboards: [
        { file: 'Main.dc.html', x: 0, y: 0, w: 1440, h: 900, page: 'page-1', title: 'Table · desktop' },
        { file: 'TableMobile.dc.html', x: 1560, y: 0, w: 390, h: 844, page: 'page-1', title: 'Table · mobile' },
        { file: 'Lobby.dc.html', x: 0, y: 1060, w: 1240, h: 900, page: 'page-1', title: 'Salon' },
        { file: 'Squares.dc.html', x: 1380, y: 1060, w: 1180, h: 960, page: 'page-1', title: 'Cases spéciales' },
        { file: 'Grimoire.dc.html', x: 0, y: 0, w: 900, h: 820, page: 'page-2', title: 'A · Cabinet d’estampes' },
        { file: 'Neon.dc.html', x: 1000, y: 0, w: 900, h: 820, page: 'page-2', title: 'B · Circuit nocturne' },
        { file: 'Bauhaus.dc.html', x: 2000, y: 0, w: 900, h: 820, page: 'page-2', title: 'D · Géométrie stricte' },
      ],
      annotations: [
        {
          id: 'note-main',
          x: 0,
          y: -230,
          w: 560,
          page: 'page-1',
          text: "Direction C · Risographie, retenue.\nLa spirale tient sur desktop ; sous ~700 px elle bascule sur le serpentin 7 colonnes. Mêmes 63 positions, mêmes couleurs, un composant de rendu différent.",
        },
        {
          id: 'note-rejected',
          x: 0,
          y: -190,
          w: 560,
          page: 'page-2',
          text: "Les trois directions non retenues, gardées pour mémoire. Même moment de partie dans chacune : Jérémy fait 7, atteint l'oie 27 et rejoue.",
        },
      ],
      launch: { view: 'canvas', page: 'page-1' },
    },
    null,
    2,
  ),
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(OUT, name), content);
}
console.log('wrote', Object.keys(files).join(', '));
