/* Generador de sigilos "cyber sigilism": trazos finos, simétricos y espinosos.
   Mismo seed = mismo sigilo, así se reusa en el HTML (SVG) y en la pantalla de la PSP (canvas). */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cubic(p0, p1, p2, p3, n = 28) {
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

/* Devuelve polilíneas en espacio [-1,1]; cada una con ancho relativo w. */
export function makeSigil(seed) {
  const r = rng(seed);
  const lines = [{ pts: [[0, -0.98], [0, 0.98]], w: 1.2 }];
  // pinchos del eje central
  for (let i = 0; i < 3; i++) {
    const y = -0.7 + r() * 1.4, l = 0.08 + r() * 0.18;
    lines.push({ pts: [[0, y], [l, y - l * 1.6]], w: 0.7, mirror: true });
  }
  // curvas espejadas con punta
  const n = 4 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const y0 = -0.85 + r() * 1.7;
    const p0 = [0, y0];
    const p1 = [0.15 + r() * 0.7, y0 + (r() - 0.5) * 1.0];
    const p2 = [0.2 + r() * 0.75, y0 + (r() - 0.5) * 1.2];
    const p3 = [0.08 + r() * 0.9, Math.max(-0.98, Math.min(0.98, y0 + (r() - 0.5) * 1.5))];
    lines.push({ pts: cubic(p0, p1, p2, p3), w: 0.45 + r() * 0.8, mirror: true, taper: true });
  }
  // corona / rombo
  const cy = 0.55 + r() * 0.3, cw = 0.08 + r() * 0.12;
  lines.push({ pts: [[0, cy + cw * 1.8], [cw, cy], [0, cy - cw * 1.8], [-cw, cy], [0, cy + cw * 1.8]], w: 0.8 });
  // travesaño tipo guarda de espada
  const gy = -0.2 + r() * 0.4, gw = 0.25 + r() * 0.35;
  lines.push({ pts: cubic([0, gy], [gw * 0.5, gy - 0.05], [gw * 0.8, gy + 0.08], [gw, gy + 0.16], 16), w: 0.9, mirror: true, taper: true });
  // expandir espejos
  const out = [];
  for (const l of lines) {
    out.push(l);
    if (l.mirror) out.push({ ...l, pts: l.pts.map(([x, y]) => [-x, y]) });
  }
  return out;
}

/* Contorno relleno de una polilínea con grosor que se afila hacia la punta */
function ribbon(pts, w, taper) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const k = taper ? Math.pow(1 - i / (pts.length - 1), 0.8) : 1;
    const hw = w * (0.35 + 0.65 * k);
    L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]);
    R.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  return L.concat(R.reverse());
}

export function sigilSVG(seed, stroke = 0.012) {
  const d = makeSigil(seed).map((l) => {
    const poly = ribbon(l.pts, l.w * stroke, l.taper);
    return '<path d="M' + poly.map(([x, y]) => `${(x * 100).toFixed(2)} ${(-y * 100).toFixed(2)}`).join('L') + 'Z"/>';
  }).join('');
  // un <path> por trazo: si se unieran, los cruces con sentido opuesto quedarían huecos
  return `<svg viewBox="-105 -105 210 210" xmlns="http://www.w3.org/2000/svg">${d}</svg>`;
}

export function drawSigil(ctx, seed, cx, cy, size, stroke = 0.012) {
  for (const l of makeSigil(seed)) {
    const poly = ribbon(l.pts, l.w * stroke, l.taper);
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx + x * size, cy - y * size));
    ctx.closePath();
    ctx.fill();
  }
}
