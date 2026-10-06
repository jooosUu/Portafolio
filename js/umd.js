/* Discos UMD (uno por proyecto) y su stand, hechos por código según UMDs reales:
   - Cartucho blanco: arriba redondo siguiendo el disco, abajo plano con esquinas.
   - Ventana transparente al frente; el disco impreso con el arte del proyecto ocupa casi todo
     y lleva un círculo blanco al centro (aquí con josÚ en vez del logo UMD).
   - Esquinas de abajo: josÚ a la izquierda, sigilo a la derecha.
   - Stand negro con ranuras y josÚ en rojo al frente. */
import * as THREE from 'three';
import { CATS, PROJECTS } from './data.js';
import { getLang } from './i18n.js';
import { drawSigil } from './sigil.js';

// medidas reales en cm: 6.4 × 6.5 × 0.42; el disco mide 6 cm de diámetro
export const UMD_W = 6.4, UMD_H = 6.5;
const D = 0.42;
const W2 = UMD_W / 2, YC = UMD_H / 2 - W2;     // centro del arco superior (= centro del disco)
const DISC_R = 2.95;

function outline() {
  const s = new THREE.Shape(), B = -UMD_H / 2, r = 0.4, ch = 0.55;
  s.moveTo(-W2, YC);
  s.absarc(0, YC, W2, Math.PI, 0, true);        // arriba: semicírculo
  s.lineTo(W2, B + ch);                          // lado derecho y chaflán abajo a la derecha
  s.lineTo(W2 - ch, B);
  s.lineTo(-W2 + r, B);                          // abajo plano, esquina izquierda redondeada
  s.quadraticCurveTo(-W2, B, -W2, B + r);
  s.lineTo(-W2, YC);
  return s;
}

// frente con ventana circular (agujero) y tapa trasera sólida
const frameShape = outline();
const hole = new THREE.Path(); hole.absarc(0, YC, DISC_R + 0.06, 0, Math.PI * 2, false); frameShape.holes.push(hole);
const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: D, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.06, bevelSegments: 3, curveSegments: 72 });
frameGeo.translate(0, 0, -D / 2);
const backGeo = new THREE.ShapeGeometry(outline(), 72); backGeo.translate(0, 0, -D / 2 + 0.01);
const windowGeo = new THREE.CircleGeometry(DISC_R + 0.08, 72); windowGeo.translate(0, YC, D / 2 - 0.02);
const discGeo = new THREE.CylinderGeometry(DISC_R, DISC_R, 0.05, 96).rotateX(Math.PI / 2);
const faceGeo = new THREE.CircleGeometry(DISC_R * 0.99, 96);

const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf1f0ec, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 });
const windowMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.08, clearcoat: 1, depthWrite: false, envMapIntensity: 1.8 });
const discMat = new THREE.MeshPhysicalMaterial({ color: 0xd8d8de, metalness: 1, roughness: 0.15, iridescence: 1, iridescenceIOR: 1.8 });

/* textura del frente blanco (UV = coordenadas de la forma): josÚ y sigilo en las esquinas de abajo */
function frontTexture() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 650;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / UMD_W, 1 / UMD_H); tex.offset.set(0.5, 0.5);
  const draw = () => {
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f1f0ec'; ctx.fillRect(0, 0, 640, 650);
    ctx.fillStyle = '#8a8a90'; ctx.font = '46px UnifrakturMaguntia, serif'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('josÚ', 26, 622);
    ctx.save(); ctx.fillStyle = '#8a8a90'; drawSigil(ctx, 7, 590, 598, 30, 0.02); ctx.restore();
    tex.needsUpdate = true;
  };
  draw(); document.fonts.ready.then(draw);
  return tex;
}
const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTexture(), roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 });
const frameMats = [frontMat, whiteMat];          // grupos de ExtrudeGeometry: 0 = tapas, 1 = canto

/* cara impresa del disco: arte del proyecto, círculo blanco central con josÚ, texto en el borde */
function drawDisc(ctx, p, img) {
  const S = ctx.canvas.width, r = S / 2, c = CATS[p.cat], lang = getLang();
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = c.c1; ctx.fillRect(0, 0, S, S);
  if (img && img.naturalWidth && !p.locked) {
    const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
    ctx.drawImage(img, (S - img.naturalWidth * k) / 2, (S - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.35, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  } else {
    const g = ctx.createRadialGradient(r, r, 0, r, r, r); g.addColorStop(0, c.c2); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; drawSigil(ctx, p.seed, r, r, r * 0.9, 0.012);
  }
  // título arriba, como el logo del juego en un UMD
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = S * 0.085; ctx.font = `900 ${size}px "Grenze Gotisch", serif`;
  while (ctx.measureText(p.title[lang]).width > S * 0.6 && size > S * 0.045) { size -= 2; ctx.font = `900 ${size}px "Grenze Gotisch", serif`; }
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(p.title[lang], r, S * 0.2);
  ctx.fillStyle = '#fff'; ctx.fillText(p.title[lang], r, S * 0.2);
  ctx.fillStyle = c.glow; ctx.font = `700 ${S * 0.03}px "Space Mono", monospace`;
  ctx.fillText(`${c[lang].toUpperCase()} · ${p.year}`, r, S * 0.2 + size * 0.75);
  // letra pequeña en arco (como el texto legal de los UMD)
  const fine = `josÚ · jooosuu.github.io/Portafolio · ${p.title[lang]} · ${c[lang]} · ${p.year} · `.toUpperCase();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `${S * 0.022}px "Space Mono", monospace`;
  const rr = r * 0.9, a0 = Math.PI * 0.62, span = Math.PI * 1.76;
  for (let i = 0; i < fine.length; i++) {
    const a = a0 + (i / fine.length) * span;
    ctx.save(); ctx.translate(r + Math.cos(a) * rr, r + Math.sin(a) * rr); ctx.rotate(a + Math.PI / 2); ctx.fillText(fine[i], 0, 0); ctx.restore();
  }
  // círculo blanco central (la "etiqueta" del disco)
  const lr = r * 0.36;
  ctx.fillStyle = '#f4f4f2'; ctx.beginPath(); ctx.arc(r, r, lr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r, r, lr * 0.97, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.font = `${lr * 0.62}px UnifrakturMaguntia, serif`; ctx.fillText('josÚ', r, r - lr * 0.08);
  ctx.fillStyle = '#e3122d'; ctx.font = `700 ${lr * 0.13}px "Space Mono", monospace`;
  ctx.fillText(lang === 'es' ? 'PORTAFOLIO · 2026' : 'PORTFOLIO · 2026', r, r + lr * 0.45);
  if (p.locked) {
    ctx.fillStyle = '#e3122d'; ctx.font = `700 ${S * 0.04}px "Space Mono", monospace`;
    ctx.fillText(lang === 'es' ? '🔒 BLOQUEADO' : '🔒 LOCKED', r, S * 0.8);
  }
  // aro interno transparente del disco
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = S * 0.006;
  ctx.beginPath(); ctx.arc(r, r, r * 0.985, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/* stand: base negra con frente inclinado, ranuras de adelante hacia atrás y josÚ en rojo (como el stand real) */
export function createStand(n, gap) {
  const L = 1.4 + n * gap + 0.6, Hh = 1.0, Wd = UMD_W + 0.9;
  const prof = new THREE.Shape();
  prof.moveTo(0, 0); prof.lineTo(L, 0); prof.lineTo(L, Hh); prof.lineTo(1.1, Hh); prof.lineTo(0, 0.35); prof.closePath();
  const geo = new THREE.ExtrudeGeometry(prof, { depth: Wd, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
  geo.rotateY(Math.PI / 2); geo.translate(-Wd / 2, 0, 0);       // largo del stand hacia -Z (de frente hacia atrás)
  const base = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  const g = new THREE.Group(); g.add(base);
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (let i = 0; i < n; i++) {
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(UMD_W + 0.2, D + 0.12), slotMat);
    sl.rotation.x = -Math.PI / 2; sl.position.set(0, Hh + 0.006, -(1.6 + i * gap));
    g.add(sl);
  }
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, 1024, 220);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#e3122d'; ctx.shadowBlur = 26; ctx.fillStyle = '#e3122d';
    ctx.font = '170px UnifrakturMaguntia, serif'; ctx.fillText('josÚ', 512, 120);
    tex.needsUpdate = true;
  };
  draw(); document.fonts.ready.then(draw);
  const slope = Math.hypot(1.1, Hh - 0.35);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.75, slope * 0.95), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  label.position.set(0, (Hh + 0.35) / 2 + 0.02, -0.55 + 0.012);
  label.rotation.x = -Math.atan2(1.1, Hh - 0.35);
  g.add(label);
  return { group: g, top: Hh, width: Wd, depth: L, slotPos: (i) => new THREE.Vector3(0, Hh, -(1.6 + i * gap)) };
}

export function createUMDs() {
  const group = new THREE.Group();
  const items = PROJECTS.map((p, i) => {
    const pivot = new THREE.Group();
    const body = new THREE.Group();              // se inclina/levanta dentro del pivot
    pivot.add(body);

    const disc = new THREE.Group(); disc.position.set(0, YC, 0);
    disc.add(new THREE.Mesh(discGeo, discMat));
    const dc = document.createElement('canvas'); dc.width = dc.height = 768;
    const dtex = new THREE.CanvasTexture(dc); dtex.colorSpace = THREE.SRGBColorSpace; dtex.anisotropy = 8;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: dtex, roughness: 0.32, metalness: 0.05 }));
    face.position.z = 0.03;
    disc.add(face);

    const frame = new THREE.Mesh(frameGeo, frameMats);
    const back = new THREE.Mesh(backGeo, whiteMat);
    const win = new THREE.Mesh(windowGeo, windowMat); win.renderOrder = 2;
    body.add(back, disc, frame, win);
    body.traverse((m) => { if (m.isMesh) m.userData.umd = i; });
    group.add(pivot);

    const img = new Image();
    const paint = () => { drawDisc(dc.getContext('2d'), p, img); dtex.needsUpdate = true; };
    img.onload = paint;
    if (p.images[0] && !p.locked) img.src = p.images[0];
    document.fonts.ready.then(paint);
    paint();
    return {
      i, p, pivot, body, disc, paint,
      state: 'slot',                 // slot | flying | inside | return
      hover: 0,
      slot: new THREE.Vector3(), slotQ: new THREE.Quaternion(), slotScale: 1,
    };
  });
  const meshes = [];
  group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { group, items, meshes, relabel: () => items.forEach((it) => it.paint()) };
}
