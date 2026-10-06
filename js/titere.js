/* El títere de "Encajonado" colgado de hilos, en una capa fija sobre toda la página.
   Arriba de todo se ve grande junto al nombre; al hacer scroll se encoge y baja a la esquina inferior derecha.
   Saluda al entrar (animación de Blender) y después se queda quieto: solo gira la cabeza hacia el cursor.
   Tocarlo lo hace saludar otra vez. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TINT = { piel: 0xc9a27a, camiseta: 0x2447b8, 'interior-boca': 0x5a1c22 };
const ALIAS = { 'Key 2': 'enojado' };
// huesos que cuelgan directamente de CABEZA (la raíz del rig): se les descuenta el giro de la cabeza
const HEAD_CHILDREN = ['cuerpo_1', 'brazo_1_L', 'brazo_1_R'];
// del saludo de Blender solo se usa el brazo que saluda; el resto del cuerpo se queda quieto
const WAVE_BONES = ['brazo_1_L', 'brazo_2_L', 'brazo_3_L'];

export function initTitere({ canvas, stage }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const key = new THREE.SpotLight(0xffe2c0, 160, 40, 0.5, 0.6); key.position.set(-3, 8, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 2.2); rim.position.set(5, 3, -6); scene.add(rim);

  // tela Fabric018 (ambientCG, CC0) repetida x7 como en Blender, teñida por material
  const tl = new THREE.TextureLoader();
  const tex = (f, srgb) => {
    const t = tl.load(`assets/tex/${f}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const cloth = { map: tex('tela_color.jpg', true), normalMap: tex('tela_normal.jpg'), roughnessMap: tex('tela_roughness.jpg') };
  const mat = (name) => {
    if (/ojo/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
    const tint = Object.entries(TINT).find(([k]) => name.startsWith(k));
    return new THREE.MeshPhysicalMaterial({
      ...cloth, color: tint ? tint[1] : TINT.piel, normalScale: new THREE.Vector2(1.2, 1.2),
      sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x808080),   // "pelusa" de tela
    });
  };

  const rig = new THREE.Group(); scene.add(rig);
  const bones = {}, rest = {}, restPos = {}, morphs = [], attach = [];
  let puppet = null, mixer = null, wave = null;
  let state = 'wait';                  // wait → play (saludo) → blend → idle
  let blendT = 0;
  const from = {};

  const expr = (name, v) => {
    for (const m of morphs) {
      for (const [k, i] of Object.entries(m.morphTargetDictionary)) if ((ALIAS[k] || k) === name) m.morphTargetInfluences[i] = v;
    }
  };

  new GLTFLoader().load('assets/models/titere.glb', (gltf) => {
    puppet = gltf.scene;
    puppet.traverse((o) => {
      if (o.isMesh) { o.material = mat(o.material.name || ''); o.frustumCulled = false; if (o.morphTargetDictionary) morphs.push(o); }
      if (o.isBone) { bones[o.name] = o; rest[o.name] = o.quaternion.clone(); restPos[o.name] = o.position.clone(); }
    });
    // medir con los vértices deformados (Box3.setFromObject no sirve con mallas con esqueleto)
    puppet.updateMatrixWorld(true);
    const box = new THREE.Box3(), v = new THREE.Vector3();
    const eachVertex = (fn) => puppet.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) fn(o.localToWorld(o.getVertexPosition(i, v)));
    });
    eachVertex((p) => box.expandByPoint(p));
    const s = 4.2 / box.getSize(new THREE.Vector3()).y;
    puppet.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    puppet.position.set(-c.x, -box.max.y * s + 1.2, -c.z);
    rig.add(puppet);

    // puntos donde se amarran los hilos (coronilla y punta de cada mano), en espacio local de su hueso
    rig.updateMatrixWorld(true);
    const top = new THREE.Vector3(0, -Infinity, 0), hl = new THREE.Vector3(-Infinity), hr = new THREE.Vector3(Infinity);
    eachVertex((p) => { if (p.y > top.y) top.copy(p); if (p.x > hl.x) hl.copy(p); if (p.x < hr.x) hr.copy(p); });
    attach.push([bones.CABEZA, bones.CABEZA.worldToLocal(top.clone())]);
    attach.push([bones.brazo_3_L, bones.brazo_3_L.worldToLocal(hl.clone())]);
    attach.push([bones.brazo_3_R, bones.brazo_3_R.worldToLocal(hr.clone())]);

    const clip = gltf.animations.find((a) => a.name === 'saludo');
    if (clip) {
      clip.tracks = clip.tracks.filter((tr) => WAVE_BONES.includes(tr.name.split('.')[0]));
      mixer = new THREE.AnimationMixer(puppet);
      wave = mixer.clipAction(clip);
      wave.setLoop(THREE.LoopOnce, 1);
      wave.clampWhenFinished = true;
    }
    stillPose();
    stage.classList.add('has-titere');
  });

  /* ---------- hilos: rectos hacia arriba, fuera de cuadro ---------- */
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.5 });
  const lines = [0, 1, 2].map(() => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
    scene.add(l); return l;
  });

  /* ---------- pose quieta: brazos colgando, todo en reposo ---------- */
  const target = {};
  const q = new THREE.Quaternion(), e3 = new THREE.Euler();
  const set = (n, x = 0, y = 0, z = 0) => (target[n] = rest[n].clone().multiply(q.setFromEuler(e3.set(x, y, z))));
  function stillPose() {
    for (const n in rest) set(n);
    set('brazo_1_L', 0.05, 0, -1.2);   // de pose T a colgando
    set('brazo_1_R', 0.05, 0, 1.2);
    set('brazo_2_L', 0, 0, -0.08);
    set('brazo_2_R', 0, 0, 0.08);
  }

  /* ---------- mirar al cursor ---------- */
  const cursor = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', (e) => { cursor.x = e.clientX; cursor.y = e.clientY; });
  const look = { yaw: 0, pitch: 0 };
  const headScreen = new THREE.Vector3();
  const D = new THREE.Quaternion(), Dinv = new THREE.Quaternion();

  // tocarlo: vuelve a saludar
  const ray = new THREE.Raycaster();
  addEventListener('pointerdown', (e) => {
    if (!puppet || !wave || state === 'play') return;
    ray.setFromCamera(new THREE.Vector2((e.clientX / document.documentElement.clientWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    if (ray.intersectObject(puppet, true).length) {
      wave.reset().play(); state = 'play';
    }
  });

  /* ---------- tamaño ---------- */
  /* ---------- tamaño: posición grande (portada) y pequeña (esquina), se mezclan con el scroll ---------- */
  let topY = 3.4;
  const big = { x: 0, y: 0, s: 1 }, small = { x: 0, y: 0, s: 0.3 };
  function resize() {
    const w = document.documentElement.clientWidth, h = innerHeight;   // sin la barra de scroll
    if (!w || !h) return;                                            // ventana sin tamaño (cargando): evita NaN
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const vh = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = vh * camera.aspect / 2, px = vh / h;          // px = unidades de mundo por pixel
    topY = vh / 2;
    // el títere mide ~4.2·s de alto: coronilla en y+1.2·s, pies en y-3.0·s
    if (w > 1100) Object.assign(big, { x: halfW * 0.66, y: 0.55, s: THREE.MathUtils.clamp(w / 1800, 0.62, 0.8) });
    else Object.assign(big, { x: 0, y: 2.15, s: 0.38 });
    if (w <= 700) {                                                   // celular: arriba a la derecha, sin tapar el nombre
      const bs = 170 * px / 4.2;
      Object.assign(big, { x: halfW - 95 * px, y: topY - 60 * px - 1.2 * bs, s: bs });
    }
    small.s = (w > 700 ? 130 : 96) * px / 4.2;
    small.x = halfW - (w > 700 ? 70 : 44) * px;
    small.y = -topY + (w > 700 ? 64 : 150) * px + 3.0 * small.s;                   // deja libre la barra de idioma de abajo
  }
  addEventListener('resize', resize);

  /* ---------- loop ---------- */
  resize();
  const clock = new THREE.Clock();
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  let prog = 0;
  let blinkAt = 2, blink = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!puppet) return;
    const t = clock.elapsedTime;

    // scroll: 0 = portada (grande), 1 = esquina inferior derecha (pequeño)
    const goal = THREE.MathUtils.clamp(scrollY / (innerHeight * 0.75), 0, 1);
    prog += (goal - prog) * 0.12;
    const k = prog * prog * (3 - 2 * prog);
    rig.position.set(THREE.MathUtils.lerp(big.x, small.x, k), THREE.MathUtils.lerp(big.y, small.y, k), 0);
    rig.scale.setScalar(THREE.MathUtils.lerp(big.s, small.s, k));
    lineMat.opacity = 0.5 - 0.25 * k;

    if (state === 'wait' && !document.body.classList.contains('is-booting')) {
      if (wave) { wave.play(); state = 'play'; } else state = 'idle';
    }

    // hacia dónde mirar: del centro de la cabeza en pantalla al cursor
    bones.CABEZA.getWorldPosition(headScreen).project(camera);
    const r = canvas.getBoundingClientRect();
    const hx = r.left + (headScreen.x + 1) / 2 * r.width, hy = r.top + (1 - headScreen.y) / 2 * r.height;
    const yaw = THREE.MathUtils.clamp(Math.atan2(cursor.x - hx, 220), -1.0, 1.0);
    const pitch = THREE.MathUtils.clamp(Math.atan2(cursor.y - hy, 450), -0.35, 0.4);
    look.yaw += (yaw - look.yaw) * 0.2; look.pitch += (pitch - look.pitch) * 0.2;
    D.setFromEuler(e3.set(look.pitch, look.yaw, 0)); Dinv.copy(D).invert();

    if (state !== 'wait') {
      // pose quieta + giro de cabeza; los hijos directos de CABEZA reciben el giro inverso.
      // durante el saludo el brazo que saluda sale del clip y la cabeza sigue mirando al cursor
      if (state === 'play') mixer.update(dt);
      const k = state === 'blend' ? (blendT = Math.min(1, blendT + dt / 0.6)) : 1;
      const e = k * k * (3 - 2 * k);
      for (const n in target) {
        if (state === 'play' && WAVE_BONES.includes(n)) {
          if (HEAD_CHILDREN.includes(n)) bones[n].quaternion.premultiply(Dinv);
          continue;
        }
        const f = target[n].clone();
        if (n === 'CABEZA') f.multiply(D);
        if (HEAD_CHILDREN.includes(n)) f.premultiply(Dinv);
        if (state === 'blend' && from[n]) bones[n].quaternion.slerpQuaternions(from[n], f, e);
        else bones[n].quaternion.copy(f);
      }
      for (const n of HEAD_CHILDREN) bones[n].position.copy(restPos[n]).applyQuaternion(Dinv);
      if (state === 'play' && wave.time >= wave.getClip().duration - 0.01) {
        for (const n of WAVE_BONES) from[n] = bones[n].quaternion.clone();
        state = 'blend'; blendT = 0;
      }
      if (state === 'blend' && k >= 1) state = 'idle';
    }

    // cara: expresión base del modelo (todas las shape keys en 0), solo parpadea de vez en cuando
    if (t > blinkAt) { blink = 1; blinkAt = t + 2 + Math.random() * 3.5; }
    blink = Math.max(0, blink - 0.12);
    for (const k of ['risa', 'boca-abierta', 'abre-cierra', 'asustado', 'enojado']) expr(k, 0);
    expr('pestañeo', Math.sin(blink * Math.PI));

    // hilos verticales hasta arriba del lienzo
    puppet.updateMatrixWorld(true);
    attach.forEach(([b, local], i) => {
      A.copy(local); b.localToWorld(A);
      B.set(A.x, topY + 0.5, A.z);
      lines[i].geometry.setFromPoints([B, A]);
    });
    renderer.render(scene, camera);
  });
}
