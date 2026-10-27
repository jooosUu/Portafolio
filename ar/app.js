import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

// ───────────────────────── Medidas ─────────────────────────
// El ancla de MindAR mide 1 de ancho = ancho de la tarjeta (tarjeta.jpg, 1063 × 593 px).
// La tarjeta es el plano XY y +Z sale hacia la cámara.
const H = 593 / 1063;
const ROJO = new THREE.Color('#E3122D');
const $ = (id) => document.getElementById(id);
const easeOutBack = (x) => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ───────────────────────── Música (sintetizada en el navegador) ─────────────────────────
// Un beat corto de 112 bpm: bombo, palmas, hi-hat y un bajo en loop. Nada se descarga.
class Beat {
  iniciar() {
    if (this.ctx) return;
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(comp);
    const n = c.sampleRate; this.ruido = c.createBuffer(1, n, c.sampleRate);
    const d = this.ruido.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.paso = 60 / 112 / 4; this.sig = c.currentTime + 0.1; this.i = 0;
    setInterval(() => this._programar(), 25);
  }
  volumen(v, t = 0.4) { if (!this.ctx) return; this.ctx.resume?.(); const g = this.master.gain, a = this.ctx.currentTime; g.cancelScheduledValues(a); g.setTargetAtTime(v, a, t / 3); }
  _ruido(t, dur, tipo, f, vol) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.ruido;
    const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g).connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  _tono(t, f0, f1, dur, vol, tipo = 'sine') {
    const c = this.ctx, o = c.createOscillator(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  _programar() {
    const BAJO = [55, 0, 0, 55, 0, 0, 65.4, 0, 49, 0, 0, 49, 0, 0, 58.3, 0];
    while (this.sig < this.ctx.currentTime + 0.12) {
      const t = this.sig, s = this.i % 16;
      if (s % 4 === 0) this._tono(t, 150, 42, 0.32, 1.0);                 // bombo
      if (s === 4 || s === 12) this._ruido(t, 0.16, 'bandpass', 1800, 0.55); // palmas
      if (s % 2 === 1) this._ruido(t, 0.05, 'highpass', 7000, 0.18);      // hi-hat
      if (BAJO[s]) this._tono(t, BAJO[s], BAJO[s], 0.22, 0.35, 'triangle');
      this.sig += this.paso; this.i++;
    }
  }
  boing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tono(t, 220, 880, 0.18, 0.5, 'square'); this._tono(t + 0.12, 880, 330, 0.22, 0.35, 'triangle');
    navigator.vibrate?.(30);
  }
}
const beat = new Beat();

// ───────────────────────── Texturas dibujadas ─────────────────────────
async function texturaLogo() {
  await document.fonts.load('200px "UnifrakturMaguntia"');
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 420;
  const g = cv.getContext('2d'); g.font = '300px "UnifrakturMaguntia"'; g.textBaseline = 'alphabetic';
  const w1 = g.measureText('jos').width, w2 = g.measureText('Ú').width, x = (cv.width - w1 - w2) / 2;
  g.shadowColor = 'rgba(227,18,45,.55)'; g.shadowBlur = 30;
  g.fillStyle = '#F2F2F2'; g.fillText('jos', x, 320);
  g.fillStyle = '#E3122D'; g.fillText('Ú', x + w1, 320);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaHalo() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(227,18,45,.85)'); r.addColorStop(.45, 'rgba(227,18,45,.25)'); r.addColorStop(1, 'rgba(227,18,45,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
}

// ───────────────────────── Paleto ─────────────────────────
async function cargarPaleto() {
  const gltf = await new GLTFLoader().loadAsync('paleto.glb');
  const modelo = gltf.scene;
  const mixer = new THREE.AnimationMixer(modelo);
  gltf.animations.forEach((a) => mixer.clipAction(a).play());
  mixer.update(0); modelo.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(modelo, true);
  const alto = caja.max.y - caja.min.y, centro = caja.getCenter(new THREE.Vector3());
  modelo.position.set(-centro.x, -caja.min.y, -centro.z);            // pies en el origen
  modelo.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
  const paleto = new THREE.Group(); paleto.add(modelo);
  paleto.rotation.x = Math.PI / 2;                                    // de pie sobre la tarjeta
  const escala = (H * 1.35) / alto; paleto.scale.setScalar(escala);
  return { paleto, mixer, alto: alto * escala, mallas: (() => { const m = []; modelo.traverse((o) => o.isMesh && m.push(o)); return m; })() };
}

// ───────────────────────── Escena sobre la tarjeta ─────────────────────────
async function crearEscena(anchor) {
  const escena = new THREE.Group(); escena.scale.setScalar(0.001); anchor.group.add(escena);

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), new THREE.MeshBasicMaterial({ map: texturaHalo(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = 0.001; escena.add(halo);

  const texSig = await new THREE.TextureLoader().loadAsync('sigilo.png'); texSig.colorSpace = THREE.SRGBColorSpace;
  const sigilo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: texSig, transparent: true, depthWrite: false }));
  sigilo.position.z = 0.003; escena.add(sigilo);

  const { paleto, mixer, alto, mallas } = await cargarPaleto();
  const base = new THREE.Group(); base.add(paleto); escena.add(base);

  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62 * 420 / 1024), new THREE.MeshBasicMaterial({ map: await texturaLogo(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  logo.rotation.x = Math.PI / 2; logo.position.set(0, 0.02, alto + 0.16); escena.add(logo);

  // chispas rojas y blancas que suben desde la tarjeta
  const N = 140, pos = new Float32Array(N * 3), vel = new Float32Array(N), col = new Float32Array(N * 3);
  const reset = (i, inicio) => {
    const a = Math.random() * Math.PI * 2, r = 0.08 + Math.random() * 0.3;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r * 0.8; pos[i * 3 + 2] = inicio ? Math.random() * 0.9 : 0;
    vel[i] = 0.08 + Math.random() * 0.22;
    const c = Math.random() < 0.75 ? ROJO : new THREE.Color('#F2F2F2'); col.set([c.r, c.g, c.b], i * 3);
  };
  for (let i = 0; i < N; i++) reset(i, true);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const chispas = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(chispas);

  let tEntrada = -1, tSalto = -1;
  return {
    mallas,
    entrar() { tEntrada = 0; },
    saltar() { if (tSalto < 0) tSalto = 0; },
    update(dt, t) {
      mixer.update(dt);
      if (tEntrada >= 0) { tEntrada += dt; escena.scale.setScalar(Math.max(0.001, easeOutBack(clamp01(tEntrada / 0.9)))); }
      sigilo.rotation.z -= dt * (0.35 + 2.5 * Math.max(0, 1 - tEntrada));
      sigilo.material.opacity = 0.75 + 0.25 * Math.sin(t * 3.6);
      halo.scale.setScalar(1 + 0.08 * Math.sin(t * 7.3));                // late con el beat (112 bpm ≈ 7,3 rad/s)
      logo.position.z = alto + 0.16 + Math.sin(t * 1.6) * 0.015;
      if (tSalto >= 0) {
        tSalto += dt; const k = clamp01(tSalto / 0.7);
        base.position.z = Math.sin(k * Math.PI) * 0.22; base.rotation.z = easeOutBack(k) * Math.PI * 2;
        if (k >= 1) { tSalto = -1; base.position.z = 0; base.rotation.z = 0; }
      }
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 2] += vel[i] * dt; pos[i * 3] *= 1 + dt * 0.12;
        if (pos[i * 3 + 2] > 0.95) reset(i, false);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Luz frontal suave (la cámara mira la tarjeta desde -Y/+Z) y un contraluz rojo de la marca
function luces(sc) {
  sc.add(new THREE.HemisphereLight(0xffffff, 0x553333, 3.2));
  const frente = new THREE.DirectionalLight(0xffffff, 2.4); frente.position.set(0.4, -2, 1.6); sc.add(frente);
  const contra = new THREE.DirectionalLight(0xe3122d, 2.2); contra.position.set(-0.6, 1.5, 0.6); sc.add(contra);
}

// ───────────────────────── Arranque ─────────────────────────
let iniciado = false;
async function iniciar() {
  if (iniciado) return; iniciado = true;
  $('inicio').classList.add('oculto'); $('cargando').classList.remove('oculto');
  const mindar = new MindARThree({ container: $('ar'), imageTargetSrc: 'tarjeta.mind', uiScanning: 'no', uiLoading: 'no', uiError: 'no', filterMinCF: 0.0005, filterBeta: 1.5 });
  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  luces(scene);

  const anchor = mindar.addAnchor(0);
  const show = await crearEscena(anchor);
  let visto = false;
  anchor.onTargetFound = () => {
    $('escaneo').classList.add('oculto'); $('enlaces').classList.remove('oculto');
    if (!visto) { visto = true; show.entrar(); }
    beat.iniciar(); beat.volumen(0.9);
  };
  anchor.onTargetLost = () => { $('escaneo').classList.remove('oculto'); beat.volumen(0.15); };

  // tocar a Paleto: salta y da una vuelta
  const ray = new THREE.Raycaster(), p = new THREE.Vector2();
  $('ar').addEventListener('pointerdown', (e) => {
    p.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(p, camera);
    if (ray.intersectObjects(show.mallas, false).length) { show.saltar(); beat.boing(); }
  });

  await mindar.start();
  $('cargando').classList.add('oculto'); $('escaneo').classList.remove('oculto');
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => { const dt = Math.min(reloj.getDelta(), 0.05); show.update(dt, reloj.elapsedTime); renderer.render(scene, camera); });
}

const arrancar = () => iniciar().catch((e) => {
  console.error(e);
  $('cargando').classList.add('oculto'); $('error').classList.remove('oculto');
  $('error-msg').textContent = e?.message || 'Dale permiso a la cámara en el navegador y vuelve a intentar.';
});
$('btn-iniciar').addEventListener('click', arrancar);
// El sonido solo puede empezar después de un toque (regla de los navegadores)
addEventListener('pointerdown', () => { beat.iniciar(); beat.ctx?.resume(); }, { once: false });
// La cámara se abre sola al escanear el QR: sin pantalla de inicio
if (!new URLSearchParams(location.search).has('demo')) arrancar();

// ?demo: muestra la escena sin cámara (para revisar en el computador)
if (new URLSearchParams(location.search).has('demo')) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: false }); r.setSize(innerWidth, innerHeight); r.setPixelRatio(devicePixelRatio);
  r.outputColorSpace = THREE.SRGBColorSpace; $('ar').appendChild(r.domElement); $('cargando').classList.add('oculto'); $('enlaces').classList.remove('oculto');
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 20);
  cam.up.set(0, 0, 1); cam.position.set(0.35, -1.35, 0.75); cam.lookAt(0, 0, 0.3);
  luces(sc);
  const tarjeta = new THREE.Mesh(new THREE.PlaneGeometry(1, H), new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('tarjeta.jpg', (t) => (t.colorSpace = THREE.SRGBColorSpace)) }));
  sc.add(tarjeta);
  const anchor = { group: new THREE.Group() }; sc.add(anchor.group);
  crearEscena(anchor).then((show) => {
    show.entrar(); const reloj = new THREE.Clock();
    window.demo = { show, saltar: () => show.saltar() };
    r.setAnimationLoop(() => { const dt = Math.min(reloj.getDelta(), 0.05); show.update(dt, reloj.elapsedTime); r.render(sc, cam); });
  });
}
