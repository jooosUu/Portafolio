/* 'estela_' de TODOS.toe (Tunhouse, fondo de SYS ENTROPY) traducido nodo a nodo a three.js:
   line1 (25 pts) → transform1 (audio) → particle1 → render1 → comp1 = render + transform2(rot -280°)(level1(feedback))
   → rgbaDelay (R-3 G-4 B-2) → mirror1 + tile1 (reflejo) → bloom (16, 0.72, brillo del color elegido)
   → rgbaDelay1 (R-5 G-4 B-2) → out. */
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const GLOW = new THREE.Color(0.18, 0.36, 1.0);       // selector_de_color: el azul que se ve en la fiesta

// comp1 = render1 + transform2( level1( feedback ) )
const FEEDBACK = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uRender, uPrev; uniform float uAspect, uOpacity;
  void main(){
    vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
    float a = radians(-280.0); mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));   // transform2 rotate -280
    vec2 q = (R * c) / vec2(uAspect, 1.0) + 0.5;
    vec3 prev = vec3(0.0);
    if (q.x >= 0.0 && q.x <= 1.0 && q.y >= 0.0 && q.y <= 1.0) prev = texture2D(uPrev, q).rgb;
    prev = pow(clamp(prev, 0.0, 1.0), vec3(1.0 / 0.57)) * uOpacity * 0.94;        // level1: gamma2 0.57, opacity = high
    gl_FragColor = vec4(min(texture2D(uRender, vUv).rgb + prev, vec3(1.0)), 1.0);   // comp1: add
  }`;
// rgbaDelay: cada canal viene de un cuadro distinto
const DELAY = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uR, uG, uB;
  void main(){ gl_FragColor = vec4(texture2D(uR, vUv).r, texture2D(uG, vUv).g, texture2D(uB, vUv).b, 1.0); }`;
// mirror1 (rotate 270) + tile1 (reflectx, flipy, overlapu 0.5): simetría izquierda-derecha y vuelta vertical
const MIRROR = /* glsl */`
  precision highp float; varying vec2 vUv; uniform sampler2D uIn;
  void main(){ vec2 q = vec2(0.5 - abs(vUv.x - 0.5), 1.0 - vUv.y); gl_FragColor = texture2D(uIn, q); }`;
const BLUR = /* glsl */`
  precision highp float; varying vec2 vUv; uniform sampler2D uIn; uniform vec2 uDir;
  void main(){
    vec3 s = vec3(0.0); float w = 0.0;
    for (int i = -12; i <= 12; i++){ float k = exp(-float(i*i) / 60.0); s += texture2D(uIn, vUv + uDir * float(i)).rgb * k; w += k; }
    gl_FragColor = vec4(s / w, 1.0);
  }`;
// bloom: Intensity 0.72, Bloom = high, Glow = high (0.5..0.9) con el color del selector
const BLOOM = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uIn, uBlur; uniform float uBloom, uGlow; uniform vec3 uGlowColor;
  void main(){
    vec3 c = texture2D(uIn, vUv).rgb, b = texture2D(uBlur, vUv).rgb;
    float lb = dot(b, vec3(0.333));
    gl_FragColor = vec4(c + b * 0.72 * (0.4 + uBloom) + uGlowColor * lb * uGlow * 2.2, 1.0);
  }`;

export function createEstela({ host, audio }) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 1);

  /* ---------- escena 3D: line1 → transform1 → particle1 ---------- */
  const scene3 = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);      // cam1: aperture 41.42 ≈ fov 45
  cam.position.set(3.2, -1.6, 4.6); cam.lookAt(0, 1.4, 0);
  const MAX = 9000;
  const pos = new Float32Array(MAX * 3), vel = new Float32Array(MAX * 3), age = new Float32Array(MAX), life = new Float32Array(MAX);
  life.fill(-1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  // como en TD: puntos de ~2 px (no cuadros con tamaño 3D), blancos con alpha 0.382
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 2.0; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(vec3(0.85), 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  pts.frustumCulled = false;
  scene3.add(pts);
  const A = new THREE.Vector3(-1, -0.5, -0.5), B = new THREE.Vector3(0.5, 0, 0);   // line1 pa → pb, 25 puntos
  const linePts = Array.from({ length: 25 }, (_, i) => A.clone().lerp(B, i / 24));
  const xf = new THREE.Matrix4(), e = new THREE.Euler(), tmp = new THREE.Vector3();
  let next = 0;

  /* ---------- post: render targets ---------- */
  let W = 2, H = 2, rtRender, fb = [], histA = [], histB = [], rtMirror, rtBlur1, rtBlur2;
  const RT = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const quadScene = new THREE.Scene(), quadCam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quadScene.add(quad);
  const M = (f, u) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: f, uniforms: u, depthTest: false });
  const mFeed = M(FEEDBACK, { uRender: { value: null }, uPrev: { value: null }, uAspect: { value: 1 }, uOpacity: { value: 0.7 } });
  const mDelay = M(DELAY, { uR: { value: null }, uG: { value: null }, uB: { value: null } });
  const mMirror = M(MIRROR, { uIn: { value: null } });
  const mBlur = M(BLUR, { uIn: { value: null }, uDir: { value: new THREE.Vector2() } });
  const mBloom = M(BLOOM, { uIn: { value: null }, uBlur: { value: null }, uBloom: { value: 0 }, uGlow: { value: 0 }, uGlowColor: { value: GLOW } });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };

  function build() {
    [rtRender, rtMirror, rtBlur1, rtBlur2, ...fb, ...histA, ...histB].forEach((t) => t && t.dispose());
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    W = Math.max(64, Math.round(w * 0.75)); H = Math.max(64, Math.round(h * 0.75));
    rtRender = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
    fb = [RT(), RT()]; histA = Array.from({ length: 6 }, RT); histB = Array.from({ length: 6 }, RT);
    rtMirror = RT(); rtBlur1 = RT(); rtBlur2 = RT();
    cam.aspect = w / h; cam.updateProjectionMatrix();
    mFeed.uniforms.uAspect.value = w / h;
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 1 / 30), t = clock.elapsedTime;
    audio.update(t);
    // canales de audioAnalysis → select1 (snare kick high mid low) → math1 (high a 0.5..0.9)
    const kick = audio.low, snare = audio.mid, high = audio.high, highR = 0.5 + 0.4 * Math.min(1, high * 1.6);
    const lfo = Math.sin(t * Math.PI * 2 * 0.3);                       // lfo1: 0.3 Hz → turbulencia x

    // transform1: t(high, snare, high) · r(0, high°, 0) · s 0.274 × 1.58 · pivot x = kick
    const s = 0.274 * 1.58;
    xf.compose(new THREE.Vector3(highR - 0.7, snare * 0.9, high * 0.6), new THREE.Quaternion().setFromEuler(e.set(0, high * 0.9, 0)), new THREE.Vector3(s, s, s));
    xf.multiply(new THREE.Matrix4().makeTranslation(-kick * 0.8, 0, 0));

    // particle1: nacen de los puntos de la línea; fuerza externa y viento hacia arriba, turbulencia, drag 0.15
    const births = Math.round(3000 * dt);
    for (let b = 0; b < births; b++) {
      const k = next; next = (next + 1) % MAX;
      tmp.copy(linePts[(Math.random() * 25) | 0]).applyMatrix4(xf);
      pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
      vel[k * 3] = (Math.random() - 0.5) * 0.2; vel[k * 3 + 1] = 0.6; vel[k * 3 + 2] = (Math.random() - 0.5) * 0.2;
      age[k] = 0; life[k] = 2.2 + Math.random() * 1.0;                 // lifevar 1
    }
    for (let k = 0; k < MAX; k++) {
      if (life[k] < 0) continue;
      age[k] += dt;
      if (age[k] > life[k]) { life[k] = -1; pos[k * 3 + 1] = 1e5; continue; }
      const i = k * 3;
      // turbulencia coherente (periodo 2.33): un campo que varía suave en el espacio y el tiempo
      const px = pos[i], py = pos[i + 1], pz = pos[i + 2], ph = t / 2.33;
      vel[i] += Math.sin(py * 2.1 + ph * 6.3 + pz * 1.3) * lfo * 2.4 * dt;                    // turbx = lfo
      vel[i + 1] += (1.4 + Math.sin(px * 1.7 + ph * 5.1) * 1.0) * dt;                          // external y + wind y + turby 1
      vel[i + 2] += Math.cos(px * 2.3 + py * 1.1 + ph * 4.7) * 0.8 * 2.4 * dt;                 // turbz 0.8
      const dr = 1 - 0.15 * dt * 3;                                     // drag 0.15
      vel[i] *= dr; vel[i + 1] *= dr; vel[i + 2] *= dr;
      pos[i] += vel[i] * dt; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true;

    // render1
    renderer.setRenderTarget(rtRender); renderer.render(scene3, cam);
    // feedback1 → level1 → transform2 → comp1
    mFeed.uniforms.uRender.value = rtRender.texture; mFeed.uniforms.uPrev.value = fb[0].texture; mFeed.uniforms.uOpacity.value = highR;
    pass(mFeed, fb[1]); fb.reverse();
    // rgbaDelay: R -3, G -4, B -2
    histA.unshift(histA.pop()); copy(fb[0], histA[0]);
    mDelay.uniforms.uR.value = histA[3].texture; mDelay.uniforms.uG.value = histA[4].texture; mDelay.uniforms.uB.value = histA[2].texture;
    pass(mDelay, rtBlur2);
    // mirror1 + tile1
    mMirror.uniforms.uIn.value = rtBlur2.texture; pass(mMirror, rtMirror);
    // bloom: blur 16 (2 pasadas) + brillo azul
    mBlur.uniforms.uIn.value = rtMirror.texture; mBlur.uniforms.uDir.value.set(1.3 / W, 0); pass(mBlur, rtBlur1);
    mBlur.uniforms.uIn.value = rtBlur1.texture; mBlur.uniforms.uDir.value.set(0, 1.3 / H); pass(mBlur, rtBlur2);
    mBloom.uniforms.uIn.value = rtMirror.texture; mBloom.uniforms.uBlur.value = rtBlur2.texture;
    mBloom.uniforms.uBloom.value = high; mBloom.uniforms.uGlow.value = highR;
    histB.unshift(histB.pop()); pass(mBloom, histB[0]);
    // rgbaDelay1: R -5, G -4, B -2 → out
    mDelay.uniforms.uR.value = histB[5].texture; mDelay.uniforms.uG.value = histB[4].texture; mDelay.uniforms.uB.value = histB[2].texture;
    pass(mDelay, null);
  }
  const copyMat = new THREE.MeshBasicMaterial();
  function copy(src, dst) { copyMat.map = src.texture; quad.material = copyMat; renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }

  const ro = new ResizeObserver(build); ro.observe(host);
  build(); loop();
  return {
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      [rtRender, rtMirror, rtBlur1, rtBlur2, ...fb, ...histA, ...histB].forEach((t) => t && t.dispose());
      geo.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
