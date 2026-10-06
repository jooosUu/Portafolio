/* Discos UMD: uno por proyecto, hechos por código, inspirados en el UMD real de la PSP.
   - Cartucho de plástico transparente (con transmisión) y canto biselado.
   - Disco impreso con el arte del proyecto (la "carátula" es redonda y gira con el disco).
   - Franja superior con josÚ, título y una flecha roja que indica el sentido de inserción. */
import * as THREE from 'three';
import { CATS, PROJECTS } from './data.js';
import { getLang } from './i18n.js';
import { drawSigil } from './sigil.js';

// medidas reales de un UMD en cm: 6.4 de ancho × 6.5 de alto × 0.42 de grosor
export const UMD_W = 6.4, UMD_H = 6.5;
const DISC_R = 2.9, DISC_Y = 0;            // centro del disco respecto al centro del cartucho

function cartridgeGeometry() {
  const W = UMD_W / 2, R = 0.45, side = -3.25;   // lados rectos y abajo un semicírculo alrededor del disco
  const s = new THREE.Shape();
  s.moveTo(-W + R, 0);
  s.lineTo(W - R, 0);
  s.quadraticCurveTo(W, 0, W, -R);
  s.lineTo(W, side);
  s.absarc(0, side, W, 0, Math.PI, true);
  s.lineTo(-W, -R);
  s.quadraticCurveTo(-W, 0, -W + R, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 4, curveSegments: 64 });
  g.translate(0, UMD_H / 2, -0.15);
  return g;
}

const shellGeo = cartridgeGeometry();
const discGeo = new THREE.CylinderGeometry(DISC_R, DISC_R, 0.04, 96).rotateX(Math.PI / 2);
const faceGeo = new THREE.CircleGeometry(DISC_R * 0.985, 96);
const hubGeo = new THREE.RingGeometry(0.42, 0.95, 64);
const holeGeo = new THREE.CircleGeometry(0.42, 48);
const stripGeo = new THREE.PlaneGeometry(5.3, 0.82);
const arrowGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0, -0.26); s.closePath(); return new THREE.ShapeGeometry(s); })();

// caras de plástico transparente brillante (se ve el disco) y canto ahumado, como el UMD real
const faceShellMat = new THREE.MeshPhysicalMaterial({
  color: 0x14161c, roughness: 0.04, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.03,
  depthWrite: false, envMapIntensity: 1.6,
});
const rimShellMat = new THREE.MeshPhysicalMaterial({
  color: 0x2a2d35, roughness: 0.18, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.08,
});
const shellMat = [faceShellMat, rimShellMat];   // grupos de ExtrudeGeometry: 0 = tapas, 1 = canto
const discMat = new THREE.MeshPhysicalMaterial({
  color: 0xe9e9f0, metalness: 1, roughness: 0.14, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 900],
});
const hubMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.25, thickness: 0.05, side: THREE.DoubleSide });
const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xe3122d });

/* cara impresa del disco: el arte del proyecto en un círculo */
function drawDisc(ctx, p, img) {
  const S = ctx.canvas.width, r = S / 2, c = CATS[p.cat], lang = getLang();
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = c.c1; ctx.fillRect(0, 0, S, S);
  if (img && img.naturalWidth && !p.locked) {
    const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
    ctx.drawImage(img, (S - img.naturalWidth * k) / 2, (S - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    const g = ctx.createRadialGradient(r, r, 0, r, r, r); g.addColorStop(0, c.c2); g.addColorStop(1, c.c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; drawSigil(ctx, p.seed, r, r, r * 0.8, 0.013);
  }
  // viñeta y aro exterior del disco
  const v = ctx.createRadialGradient(r, r, r * 0.35, r, r, r);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = c.glow; ctx.lineWidth = S * 0.012;
  ctx.beginPath(); ctx.arc(r, r, r * 0.955, 0, Math.PI * 2); ctx.stroke();
  // texto en arco por el borde: título · categoría · año
  const txt = `${p.title[lang]}  ·  ${c[lang]}  ·  ${p.year}  ·  josÚ  ·  `.toUpperCase();
  ctx.fillStyle = '#fff'; ctx.font = `700 ${S * 0.036}px "Space Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rr = r * 0.88, step = (Math.PI * 2) / Math.max(48, txt.length * 1.05);
  for (let i = 0; i < txt.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save(); ctx.translate(r + Math.cos(a) * rr, r + Math.sin(a) * rr); ctx.rotate(a + Math.PI / 2);
    ctx.fillText(txt[i], 0, 0); ctx.restore();
  }
  ctx.restore();
}

/* franja superior del cartucho */
function drawStrip(ctx, p) {
  const W = ctx.canvas.width, H = ctx.canvas.height, c = CATS[p.cat], lang = getLang();
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e3122d'; ctx.fillRect(0, H - 6, W, 6);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = '44px UnifrakturMaguntia, serif'; ctx.textAlign = 'left';
  ctx.fillText('josÚ', 18, H / 2);
  let size = 34; ctx.font = `900 ${size}px "Grenze Gotisch", serif`;
  const t = p.title[lang];
  while (ctx.measureText(t).width > W * 0.62 && size > 18) { size -= 2; ctx.font = `900 ${size}px "Grenze Gotisch", serif`; }
  ctx.textAlign = 'right'; ctx.fillText(t, W - 18, H / 2 - 9);
  ctx.fillStyle = c.glow; ctx.font = '700 17px "Space Mono", monospace';
  ctx.fillText(`${c[lang].toUpperCase()} · ${p.year}`, W - 18, H / 2 + 20);
}

export function createUMDs() {
  const group = new THREE.Group();
  const items = PROJECTS.map((p, i) => {
    const pivot = new THREE.Group();
    const body = new THREE.Group();            // se inclina/flota dentro del pivot
    pivot.add(body);

    const disc = new THREE.Group();            // gira entero: canto iridiscente + cara impresa + centro
    disc.position.set(0, DISC_Y, 0);
    disc.add(new THREE.Mesh(discGeo, discMat));
    const dc = document.createElement('canvas'); dc.width = dc.height = 512;
    const dtex = new THREE.CanvasTexture(dc); dtex.colorSpace = THREE.SRGBColorSpace; dtex.anisotropy = 4;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: dtex, roughness: 0.35, metalness: 0.1 }));
    face.position.z = 0.022;
    const hub = new THREE.Mesh(hubGeo, hubMat); hub.position.z = 0.03;
    const hole = new THREE.Mesh(holeGeo, holeMat); hole.position.z = 0.031;
    disc.add(face, hub, hole);

    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.renderOrder = 2;

    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 80;
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = 4;
    const strip = new THREE.Mesh(stripGeo, new THREE.MeshStandardMaterial({ map: stex, roughness: 0.5 }));
    strip.position.set(0, UMD_H / 2 - 0.62, 0.245);
    strip.renderOrder = 3;
    const arrow = new THREE.Mesh(arrowGeo, arrowMat); arrow.position.set(0, UMD_H / 2 - 1.12, 0.245);

    body.add(disc, shell, strip, arrow);
    body.traverse((m) => { if (m.isMesh) m.userData.umd = i; });
    group.add(pivot);

    const img = new Image();
    const paint = () => {
      drawDisc(dc.getContext('2d'), p, img); dtex.needsUpdate = true;
      drawStrip(sc.getContext('2d'), p); stex.needsUpdate = true;
    };
    img.onload = paint;
    if (p.images[0] && !p.locked) img.src = p.images[0];
    document.fonts.ready.then(paint);
    paint();
    return {
      i, p, pivot, body, disc, paint,
      state: 'slot',                 // slot | flying | inside | return
      hover: 0,
      slot: new THREE.Vector3(), slotScale: 1,
    };
  });
  const meshes = [];
  group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { group, items, meshes, relabel: () => items.forEach((it) => it.paint()) };
}
