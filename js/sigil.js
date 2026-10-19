/* Generador de sigilos "cyber sigilism": silueta simétrica llena de púas, estrellas de cuatro puntas,
   trazos cortados en tramos que terminan en aguja, llamas con espinas y cadenas de puntos.
   Mismo seed = mismo sigilo, así se reusa en el HTML (SVG) y en la pantalla de la PSP (canvas). */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cubic(p0, p1, p2, p3, n = 32) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Estrella de cuatro puntas (✦) con lados cóncavos; ry > rx la estira en vertical */
function star(cx, cy, rx, ry = rx) {
  const tips = [[cx, cy + ry], [cx + rx, cy], [cx, cy - ry], [cx - rx, cy]];
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const a = tips[k], b = tips[(k + 1) % 4];
    const c = [cx + (a[0] + b[0] - 2 * cx) * 0.09, cy + (a[1] + b[1] - 2 * cy) * 0.09];   // control cerca del centro = lados hundidos
    for (let i = 0; i < 8; i++) {
      const t = i / 8, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
  }
  return { shape: true, pts };
}

function dot(cx, cy, rad) {
  const pts = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return { shape: true, pts };
}

/* Corta un trazo en tramos con huecos; cada tramo termina en aguja por los dos lados */
function dashed(pts, w, r, on = 0.28, gap = 0.035) {
  const out = [], n = pts.length - 1;
  let t = 0;
  while (t < 1) {
    const len = on * (0.6 + r() * 0.8);
    const a = Math.round(t * n), b = Math.min(n, Math.round((t + len) * n));
    if (b - a >= 2) out.push({ pts: pts.slice(a, b + 1), w, taper: 'both' });
    t += len + gap;
  }
  return out;
}

/* Espinas a lo largo de un trazo: salen inclinadas hacia la punta del trazo */
function thorns(pts, r, count, len, side) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const i = Math.floor((0.15 + 0.75 * ((k + 0.5) / count) + (r() - 0.5) * 0.06) * (pts.length - 1));
    const a = pts[i], b = pts[Math.min(pts.length - 1, i + 2)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const s = side * (k % 2 ? -1 : 1);
    const ang = 0.5 + r() * 0.4;
    const ex = dx * Math.cos(ang) - dy * Math.sin(ang) * s;
    const ey = dy * Math.cos(ang) + dx * Math.sin(ang) * s;
    const L = len * (0.6 + r() * 0.8);
    const tip = [a[0] + ex * L, a[1] + ey * L];
    const mid = [a[0] + ex * L * 0.5 + dx * L * 0.15, a[1] + ey * L * 0.5 + dy * L * 0.15];
    out.push({ pts: cubic(a, mid, mid, tip, 8), w: 0.7, taper: 'tip' });
  }
  return out;
}

/* Aguja recta desde (x,y) en dirección (dx,dy) con largo L */
const needle = (x, y, dx, dy, L, w = 0.9) => ({ pts: cubic([x, y], [x + dx * L * 0.33, y + dy * L * 0.33], [x + dx * L * 0.66, y + dy * L * 0.66], [x + dx * L, y + dy * L], 10), w, taper: 'tip' });

/* Devuelve trazos en espacio [-1,1]: { pts, w, taper } o formas rellenas { shape: true, pts }.
   taper: 'tip' = grueso en la base y aguja al final · 'both' = hinchado al medio y aguja en los dos extremos */
export function makeSigil(seed) {
  const r = rng(seed);
  const L = [];
  const M = (o) => ({ ...o, mirror: true });

  // eje cortado en tramos, con estrellas en las puntas
  L.push(...dashed(cubic([0, 0.97], [0, 0.4], [0, -0.4], [0, -0.97], 60), 1.3, r, 0.34, 0.03));
  L.push(star(0, 0.97, 0.035, 0.09), star(0, -0.97, 0.035, 0.09));

  // nudo central: estrella grande con agujas horizontales largas (la cruz de las referencias)
  const ky = -0.15 + r() * 0.5, ks = 0.07 + r() * 0.05;
  L.push(star(0, ky, ks * 1.1, ks * 1.6));
  const arm = 0.45 + r() * 0.45;
  L.push(M(needle(ks * 0.9, ky, 1, 0, arm, 1.1)));
  L.push(M(star(ks + arm * (0.55 + r() * 0.25), ky, 0.03, 0.05)));
  // agujas diagonales del nudo (estallido)
  if (r() < 0.6) {
    const a = 0.5 + r() * 0.4, l = 0.18 + r() * 0.2;
    L.push(M(needle(0.02, ky + 0.02, Math.cos(a), Math.sin(a), l, 0.7)), M(needle(0.02, ky - 0.02, Math.cos(a), -Math.sin(a), l * 0.8, 0.7)));
  }

  // hojas paralelas al eje: líneas largas cortadas en tramos
  for (let i = 0; i < 2 + ((r() * 2) | 0); i++) {
    const x = 0.05 + i * (0.05 + r() * 0.05), ya = 0.25 + r() * 0.7, yb = Math.max(-0.95, ya - 0.7 - r() * 0.9), bow = (r() - 0.4) * 0.1;
    const pts = cubic([x * 0.7, ya], [x + bow, ya - (ya - yb) * 0.33], [x + bow, ya - (ya - yb) * 0.66], [x * 0.8, yb], 40);
    L.push(...dashed(pts, 0.6, r, 0.3, 0.05).map(M));
  }

  // llamas con espinas: salen del eje en diagonal y terminan en punta afuera
  const n = 3 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const y0 = 0.75 - (i + r() * 0.7) * (1.55 / n);
    const dir = r() < 0.5 ? 1 : -1;
    const reach = 0.3 + r() * 0.55, rise = 0.2 + r() * 0.45;
    const pts = cubic([0.01, y0], [reach * 0.18, y0 + dir * rise * (0.55 + r() * 0.3)],
      [reach * (0.55 + r() * 0.2), y0 + dir * rise * (0.95 + r() * 0.25)], [reach, clamp(y0 + dir * rise * (0.45 + r() * 0.5), -0.98, 0.98)]);
    if (r() < 0.35) L.push(...dashed(pts, 1.2, r, 0.4, 0.05).map(M));
    else L.push(M({ pts, w: 1.2 + r() * 0.8, taper: 'tip' }));
    L.push(...thorns(pts, r, 2 + ((r() * 3) | 0), 0.07 + r() * 0.09, -dir).map(M));
    if (r() < 0.45) { const e = pts[pts.length - 1]; L.push(M(star(e[0], e[1], 0.025, 0.045))); }
  }

  // ganchos góticos: rizo cerrado pegado al eje (las "letras" de las referencias)
  for (let i = 0; i < 1 + ((r() * 3) | 0); i++) {
    const y = -0.6 + r() * 1.2, s = 0.06 + r() * 0.06, x = 0.03 + r() * 0.05;
    L.push(M({ pts: cubic([x, y + s], [x + s * 2.2, y + s * 1.2], [x + s * 2.2, y - s * 0.6], [x + s * 0.4, y - s * 0.2], 18), w: 0.8, taper: 'both' }));
  }

  // púas sueltas a lo largo del eje
  for (let i = 0; i < 3 + ((r() * 4) | 0); i++) {
    const y = -0.88 + r() * 1.76, l = 0.06 + r() * 0.12, dir = r() < 0.5 ? 1 : -1;
    L.push(M({ pts: cubic([0.01, y], [l * 0.4, y + dir * l * 0.4], [l * 0.8, y + dir * l * 1.0], [l, y + dir * l * 1.9], 8), w: 0.75, taper: 'tip' }));
  }

  // estrellitas flotando a los lados
  for (let i = 0; i < 1 + ((r() * 3) | 0); i++) L.push(M(star(0.25 + r() * 0.55, -0.8 + r() * 1.6, 0.02 + r() * 0.02, 0.04 + r() * 0.04)));

  // cadena de puntos colgando de un solo lado (rompe la simetría como en las referencias)
  if (r() < 0.6) {
    const side = r() < 0.5 ? 1 : -1, y0 = 0.2 + r() * 0.5, x0 = 0.15 + r() * 0.2;
    const chain = cubic([x0, y0], [x0 + 0.35, y0 - 0.2], [x0 + 0.3, y0 - 0.8], [x0 * 0.4, y0 - 1.15 + r() * 0.2], 14);
    chain.forEach(([x, y], i) => i && L.push(dot(x * side, clamp(y, -0.97, 0.97), 0.011)));
  }

  // expandir espejos
  const out = [];
  for (const l of L) {
    out.push(l);
    if (l.mirror) out.push({ ...l, pts: l.pts.map(([x, y]) => [-x, y]) });
  }
  return out;
}

/* Contorno relleno de una polilínea con grosor variable */
function ribbon(pts, w, taper) {
  const Lp = [], Rp = [], n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const t = i / n;
    const k = taper === 'both' ? Math.pow(Math.sin(Math.PI * t), 0.7)
            : taper === 'tip' ? Math.pow(1 - t, 0.9) * Math.min(1, 0.55 + t * 4)
            : 1;
    const hw = w * k;
    Lp.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]);
    Rp.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  return Lp.concat(Rp.reverse());
}

const outline = (l, stroke) => (l.shape ? l.pts : ribbon(l.pts, l.w * stroke, l.taper));

export function sigilSVG(seed, stroke = 0.012) {
  const d = makeSigil(seed).map((l) =>
    '<path d="M' + outline(l, stroke).map(([x, y]) => `${(x * 100).toFixed(2)} ${(-y * 100).toFixed(2)}`).join('L') + 'Z"/>').join('');
  // un <path> por trazo: si se unieran, los cruces con sentido opuesto quedarían huecos
  return `<svg viewBox="-105 -105 210 210" xmlns="http://www.w3.org/2000/svg">${d}</svg>`;
}

export function drawSigil(ctx, seed, cx, cy, size, stroke = 0.012) {
  for (const l of makeSigil(seed)) {
    const poly = outline(l, stroke);
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx + x * size, cy - y * size));
    ctx.closePath();
    ctx.fill();
  }
}
