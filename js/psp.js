/* PSP flotante en three.js.
   El modelo viene inclinado sobre una base: se oculta la base y se reorienta
   a partir del plano de la pantalla, así no dependemos de cómo fue exportado. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ScreenUI } from './screen.js';

const CRT_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const CRT_FRAG = /* glsl */`
  uniform sampler2D map;
  uniform float time;
  uniform vec2 res;
  varying vec2 vUv;
  vec2 warp(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 o = abs(uv.yx) / vec2(7.0, 5.0);
    uv += uv * o * o;
    return uv * 0.5 + 0.5;
  }
  void main() {
    vec2 uv = warp(vUv);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float ca = 0.0016;
    vec3 c = vec3(texture2D(map, uv + vec2(ca, 0.0)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(ca, 0.0)).b);
    float scan = 0.82 + 0.18 * sin(uv.y * res.y * 3.14159);
    float grille = 0.9 + 0.1 * sin(uv.x * res.x * 2.094);
    vec2 e = smoothstep(0.0, 0.12, uv) * smoothstep(1.0, 0.88, uv);
    float vig = 0.55 + 0.45 * e.x * e.y;
    float roll = 0.04 * smoothstep(0.0, 0.02, abs(fract(uv.y * 0.5 - time * 0.12) - 0.5) - 0.48);
    c = c * scan * grille * vig * 1.3 + roll;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

/* número de botón del modelo (button1…button15) → acción del sistema */
const BUTTONS = {
  1: 'up', 2: 'right', 3: 'down', 4: 'left',
  5: 'triangle', 6: 'circle', 7: 'cross', 8: 'square',
  9: 'home', 10: 'voldown', 11: 'volup', 12: 'display', 13: 'sound', 14: 'select', 15: 'start',
};

export function initPSP({ canvas, stage, onProgress = () => {}, onReady = () => {}, onState = () => {}, onAction = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, 0, 28);

  const spin = new THREE.Group();          // giro del usuario + flotación
  scene.add(spin);

  const rim = new THREE.DirectionalLight(0xb9c8ff, 2.2); rim.position.set(8, 6, -6); scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-6, 8, 10); scene.add(key);
  const screenLight = new THREE.PointLight(0xffffff, 18, 14, 1.6); screenLight.position.set(0, 0.5, 2.5);
  spin.add(screenLight);

  const ui = new ScreenUI();
  ui.onAction = onAction;
  ui.onState = onState;
  const screenTex = new THREE.CanvasTexture(ui.canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;
  const crt = new THREE.ShaderMaterial({
    uniforms: { map: { value: screenTex }, time: { value: 0 }, res: { value: new THREE.Vector2(ui.W / 2, ui.H / 2) } },
    vertexShader: CRT_VERT, fragmentShader: CRT_FRAG, toneMapped: false,
  });

  /* ---------- carga del modelo ---------- */
  const loader = new GLTFLoader();
  loader.load('assets/models/psp.glb', (gltf) => {
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    let screen = null;
    const body = new THREE.Box3();
    // sin soporte: la base se elimina (no solo se oculta) para que no cuente en los tamaños
    const ground = [];
    model.traverse((o) => { if (o.isMesh && /ground/i.test(o.name + ' ' + (o.parent ? o.parent.name : ''))) ground.push(o); });
    ground.forEach((o) => o.removeFromParent());
    model.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name + ' ' + (o.parent ? o.parent.name : '');
      if (/screen/i.test(name)) screen = o;
      const m = name.match(/button(\d+)/i);
      if (m && BUTTONS[m[1]]) { o.userData.btn = BUTTONS[m[1]]; buttons.push(o); }
      body.expandByObject(o);
    });

    // normal y centro de la pantalla en espacio mundo
    const g = screen.geometry, pos = g.attributes.position;
    const n = new THREE.Vector3(), sc = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const idx = g.index ? g.index.array : [...Array(pos.count).keys()];
    for (let i = 0; i < idx.length; i += 3) {
      a.fromBufferAttribute(pos, idx[i]).applyMatrix4(screen.matrixWorld);
      b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(screen.matrixWorld);
      c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(screen.matrixWorld);
      n.add(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)));
    }
    n.normalize();
    new THREE.Box3().setFromObject(screen).getCenter(sc);
    const center = body.getCenter(new THREE.Vector3());
    if (n.dot(new THREE.Vector3().subVectors(sc, center)) < 0) n.negate();   // que apunte hacia afuera

    // base de la pantalla: u = ancho (eje X del modelo), v = hacia arriba del aparato
    const u = new THREE.Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize();
    let v = new THREE.Vector3().crossVectors(n, u);
    if (v.dot(new THREE.Vector3().subVectors(sc, center)) < 0) { u.negate(); v.negate(); }

    // UV nuevos para la pantalla, proyectando sobre (u, v)
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    const P = new THREE.Vector3(), uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      P.fromBufferAttribute(pos, i).applyMatrix4(screen.matrixWorld);
      const pu = P.dot(u), pv = P.dot(v);
      uvs[i * 2] = pu; uvs[i * 2 + 1] = pv;
      minU = Math.min(minU, pu); maxU = Math.max(maxU, pu); minV = Math.min(minV, pv); maxV = Math.max(maxV, pv);
    }
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = (uvs[i * 2] - minU) / (maxU - minU);
      uvs[i * 2 + 1] = (uvs[i * 2 + 1] - minV) / (maxV - minV);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    screen.material = crt;

    // rotar para que u→X, v→Y, n→Z (pantalla mirando a cámara) y centrar
    const basis = new THREE.Matrix4().makeBasis(u, v, n);
    const holder = new THREE.Group();
    holder.quaternion.setFromRotationMatrix(basis).invert();
    model.position.sub(center);
    holder.add(model);
    const size = body.getSize(new THREE.Vector3()).length();
    holder.scale.setScalar(19 / size);
    spin.add(holder);
    modelW = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3()).x;
    resize();

    // recorrido de cada botón al hundirse, en el espacio local de su padre
    spin.updateMatrixWorld(true);
    const inward = new THREE.Vector3(0, 0, -1).transformDirection(spin.matrixWorld).multiplyScalar(0.09);
    for (const bt of buttons) {
      const wp = bt.getWorldPosition(new THREE.Vector3());
      bt.userData.rest = bt.position.clone();
      bt.userData.push = bt.parent.worldToLocal(wp.add(inward)).sub(bt.position);
      bt.userData.t = 0;
    }
    pickables = [...buttons, screen];

    stage.classList.add('is-ready');
    onState(ui.info());
    onReady();
  }, (e) => { if (e.total) onProgress(e.loaded / e.total); }, (err) => { console.error(err); onReady(); });

  /* ---------- interacción: arrastrar para girar, clic en los botones para usarla ---------- */
  const buttons = [];
  let pickables = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object : null;
  };
  const press = (b) => {
    const bt = buttons.find((o) => o.userData.btn === b);
    if (bt) bt.userData.t = 1;
    ui.press(b);
  };

  const rot = { x: 0, y: 0, vx: 0, vy: 0 };
  let drag = null, down = null, lastInput = -10;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      const o = pick(e);
      canvas.style.cursor = o ? 'pointer' : '';
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    rot.vy = dx * 0.008; rot.vx = dy * 0.008;
    rot.y += rot.vy; rot.x += rot.vx;
    lastInput = clock.getElapsedTime();
  });
  canvas.addEventListener('pointerup', (e) => {
    drag = null;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 450) {
      const o = pick(e);
      if (o && o.userData.btn) { rot.vx = rot.vy = 0; press(o.userData.btn); }
      else if (o) ui.press('cross');                 // tocar la pantalla = ✕
    }
    down = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = down = null; });

  /* ---------- tamaño y visibilidad ---------- */
  let modelW = 17;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // distancia para que el ancho de la PSP ocupe ~70% del ancho visible (y no pase del alto)
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(modelW / (0.92 * 2 * tan * camera.aspect), modelW * 0.5 / (0.8 * 2 * tan));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage); resize();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const glow = new THREE.Color();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!drag) {
      rot.y += rot.vy; rot.x += rot.vx; rot.vx *= 0.94; rot.vy *= 0.94;
      if (t - lastInput > 2.5) {            // vuelve suave al frente cuando nadie la toca
        const ty = Math.round(rot.y / (Math.PI * 2)) * Math.PI * 2;
        rot.y += (ty - rot.y) * 0.02; rot.x += (0 - rot.x) * 0.02;
      }
    }
    spin.rotation.set(rot.x + Math.sin(t * 0.7) * 0.06, rot.y + Math.sin(t * 0.5) * 0.12, Math.sin(t * 0.6) * 0.03);
    spin.position.y = Math.sin(t * 0.9) * 0.25;
    ui.draw(t); screenTex.needsUpdate = true;
    crt.uniforms.time.value = t;
    screenLight.color.lerp(glow.set(ui.info().glow), 0.08);
    for (const bt of buttons) {                       // animación de hundirse y volver
      const d = bt.userData;
      if (!d.rest) continue;
      d.t = Math.max(0, d.t - 0.09);
      bt.position.copy(d.rest).addScaledVector(d.push, Math.sin(Math.min(1, d.t) * Math.PI * 0.5));
    }
    renderer.render(scene, camera);
  });

  return { press, info: () => ui.info(), open: (k) => { ui.openGallery(k, false); onState(ui.info()); } };
}
