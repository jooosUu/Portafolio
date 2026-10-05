/* Discos UMD: uno por proyecto, hechos por código.
   Cartucho de plástico ahumado (translúcido), disco iridiscente que gira adentro
   y una etiqueta tipo carátula generada a partir de data.js (imagen, título, categoría, año). */
import * as THREE from 'three';
import { CATS, PROJECTS } from './data.js';
import { getLang } from './i18n.js';
import { drawSigil } from './sigil.js';

// medidas reales de un UMD en cm: 6.4 de ancho × 6.5 de alto × 0.42 de grosor
export const UMD_W = 6.4, UMD_H = 6.5;

function cartridgeGeometry() {
  const W = UMD_W / 2, R = 0.35, side = -3.3;
  const s = new THREE.Shape();
  s.moveTo(-W + R, 0);
  s.lineTo(W - R, 0);
  s.quadraticCurveTo(W, 0, W, -R);
  s.lineTo(W, side);
  s.absarc(0, side, W, 0, Math.PI, true);      // parte de abajo redondeada alrededor del disco
  s.lineTo(-W, -R);
  s.quadraticCurveTo(-W, 0, -W + R, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2, curveSegments: 40 });
  g.translate(0, UMD_H / 2, -0.18);
  return g;
}

const shellGeo = cartridgeGeometry();
const discGeo = new THREE.CylinderGeometry(2.85, 2.85, 0.05, 72).rotateX(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.09, 40).rotateX(Math.PI / 2);
const labelGeo = new THREE.PlaneGeometry(5.7, 2.55);

const shellMat = new THREE.MeshPhysicalMaterial({
  color: 0x2c2c36, roughness: 0.2, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false,
});
const discMat = new THREE.MeshPhysicalMaterial({
  color: 0xf0f0f6, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 820],
});
const hubMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.5 });

/* etiqueta: carátula estilo juego de PSP */
function drawLabel(ctx, p, img) {
  const W = ctx.canvas.width, H = ctx.canvas.height, c = CATS[p.cat], lang = getLang();
  ctx.fillStyle = c.c1; ctx.fillRect(0, 0, W, H);
  if (img && img.naturalWidth) {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    ctx.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    drawSigil(ctx, p.seed, W * 0.75, H * 0.5, H * 0.42, 0.015);
  }
  const g = ctx.createLinearGradient(0, 0, W * 0.75, 0);
  g.addColorStop(0, 'rgba(0,0,0,.88)'); g.addColorStop(0.55, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // franja superior tipo carátula
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = '#fff'; ctx.font = '26px VT323, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('josÚ', 16, 21);
  ctx.textAlign = 'right'; ctx.fillStyle = c.glow;
  ctx.fillText(`${c[lang].toUpperCase()} · ${p.year}`, W - 16, 21);
  // título
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
  let size = 54; ctx.font = `600 ${size}px "Space Grotesk", sans-serif`;
  while (ctx.measureText(p.title[lang]).width > W * 0.88 && size > 26) { size -= 2; ctx.font = `600 ${size}px "Space Grotesk", sans-serif`; }
  ctx.fillText(p.title[lang], 16, H - 34);
  ctx.fillStyle = c.glow; ctx.fillRect(0, H - 12, W, 12);
}

export function createUMDs() {
  const group = new THREE.Group();
  const items = PROJECTS.map((p, i) => {
    const pivot = new THREE.Group();
    const body = new THREE.Group();            // se inclina/flota dentro del pivot
    pivot.add(body);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.renderOrder = 2;
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -0.05, 0);
    const hub = new THREE.Mesh(hubGeo, hubMat); disc.add(hub);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 228;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const label = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
    label.position.set(0, 1.62, 0.235);
    label.renderOrder = 3;
    body.add(disc, shell, label);
    for (const m of [shell, disc, hub, label]) m.userData.umd = i;
    group.add(pivot);
    const img = new Image();
    const paint = () => { drawLabel(canvas.getContext('2d'), p, img); tex.needsUpdate = true; };
    img.onload = paint; img.src = p.images[0];
    paint();
    return {
      i, p, pivot, body, disc, paint,
      state: 'slot',                 // slot | flying | inside | return
      hover: 0, spin: 0,
      slot: new THREE.Vector3(), slotScale: 1,
    };
  });
  const meshes = [];
  group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { group, items, meshes, relabel: () => items.forEach((it) => it.paint()) };
}
