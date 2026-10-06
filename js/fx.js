/* Efectos de TouchDesigner recreados en WebGL para las fichas de proyecto.
   - 'entropy'  (Tunhouse): el fondo de SYS ENTROPY — estallido radial de ruido con feedback de bordes
                (red 'nubeeeee' de todoslosdehoy.toe, basada en el Audio-Reactive Cosmic Cloud de SOLA).
   - 'flores'   (Desconexión): el filtro 'floresss' — bordes rosados + umbral, feedback "burn",
                radial blur (mismo GLSL del .toe), retraso RGB y blob tracking.
   Los dos reaccionan al audio: micrófono si la persona lo activa; si no, un pulso simulado a 124 bpm. */
import * as THREE from 'three';

/* ---------------- audio: micrófono o pulso simulado ---------------- */
class Audio {
  constructor() { this.low = 0; this.mid = 0; this.high = 0; this.an = null; }
  async enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.an = ctx.createAnalyser(); this.an.fftSize = 512; this.an.smoothingTimeConstant = 0.6;
    ctx.createMediaStreamSource(stream).connect(this.an);
    this.buf = new Uint8Array(this.an.frequencyBinCount);
    this.stream = stream; this.ctx = ctx;
  }
  update(t) {
    let l, m, h;
    if (this.an) {
      this.an.getByteFrequencyData(this.buf);
      const band = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this.buf[i]; return s / ((b - a) * 255); };
      l = band(1, 6); m = band(6, 40); h = band(40, 120);
    } else {                                                  // 124 bpm: bombo, caja y brillo
      const beat = (t * 124 / 60) % 1, half = (t * 124 / 60 + 0.5) % 2;
      l = Math.pow(1 - beat, 6) * 0.9 + 0.08;
      m = Math.pow(Math.max(0, 1 - Math.abs(half - 1) * 4), 3) * 0.6 + 0.15 + 0.1 * Math.sin(t * 0.7);
      h = 0.2 + 0.15 * Math.sin(t * 3.1) * Math.sin(t * 1.3);
    }
    // "lag" como en TD: sube rápido, baja lento
    const lag = (cur, v) => cur + (v - cur) * (v > cur ? 0.5 : 0.08);
    this.low = lag(this.low, l); this.mid = lag(this.mid, m); this.high = lag(this.high, h);
  }
  stop() { this.stream?.getTracks().forEach((t) => t.stop()); this.ctx?.close(); }
}

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const NOISE = /* glsl */`
  vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
  float noise(vec3 p){ vec3 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i),f), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++){ s += a*noise(p); p *= 2.02; a *= 0.5; } return s; }`;

/* ---------------- ENTROPY: estallido radial con feedback ---------------- */
const ENTROPY_SIM = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uPrev; uniform float uTime, uLow, uMid, uHigh, uAspect; uniform vec2 uMouse;
  ${NOISE}
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) - (uMouse - 0.5) * 0.15;
    float r = length(p), a = atan(p.y, p.x);
    // rampa circular desplazada por ruido perlin (harmon alto) que avanza en z con el tiempo
    float n = fbm(vec3(p * 2.2, uTime * 0.12));
    float spikes = fbm(vec3(cos(a) * 1.6, sin(a) * 1.6, uTime * 0.25 + uMid));
    float d = r + (n - 0.0) * (0.22 + uLow * 0.22) - spikes * (0.18 + uMid * 0.25);
    float burst = smoothstep(0.48 + uLow * 0.16, 0.02, d);
    // feedback: la imagen anterior se expande un poco hacia afuera y se apaga (bordes de humo)
    vec2 c = vUv - 0.5;
    vec2 fuv = 0.5 + c * (0.986 - uLow * 0.01) + vec2(noise(vec3(vUv * 6.0, uTime * 0.3)), noise(vec3(vUv * 6.0 + 7.0, uTime * 0.3))) * 0.003;
    float prev = texture2D(uPrev, fuv).r * (0.93 + uHigh * 0.04);
    gl_FragColor = vec4(max(burst, prev), burst, 0.0, 1.0);
  }`;
const ENTROPY_SHOW = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uSim; uniform float uTime, uLow; uniform vec2 uTexel;
  vec3 palette(float v){                       // colores del fondo de SYS ENTROPY en Tunhouse
    vec3 c0 = vec3(0.02,0.01,0.06), c1 = vec3(0.16,0.10,0.66), c2 = vec3(0.54,0.24,0.88),
         c3 = vec3(1.00,0.37,0.72), c4 = vec3(1.00,0.82,0.23), c5 = vec3(1.00,0.97,0.80);
    if (v < 0.2) return mix(c0, c1, v / 0.2);
    if (v < 0.42) return mix(c1, c2, (v - 0.2) / 0.22);
    if (v < 0.62) return mix(c2, c3, (v - 0.42) / 0.2);
    if (v < 0.82) return mix(c3, c4, (v - 0.62) / 0.2);
    return mix(c4, c5, (v - 0.82) / 0.18);
  }
  void main(){
    float v = texture2D(uSim, vUv).r;
    // brillo de bordes (feedbackEdge) y un bloom barato con 8 muestras
    float gx = texture2D(uSim, vUv + vec2(uTexel.x, 0)).r - texture2D(uSim, vUv - vec2(uTexel.x, 0)).r;
    float gy = texture2D(uSim, vUv + vec2(0, uTexel.y)).r - texture2D(uSim, vUv - vec2(0, uTexel.y)).r;
    float edge = length(vec2(gx, gy)) * 6.0;
    float glow = 0.0;
    for (int i = 0; i < 8; i++){ float an = float(i) * 0.785; glow += texture2D(uSim, vUv + vec2(cos(an), sin(an)) * uTexel * 14.0).r; }
    glow /= 8.0;
    vec3 col = palette(clamp(v * 0.95 + edge * 0.25, 0.0, 1.0)) + palette(glow) * 0.35 * (0.6 + uLow);
    gl_FragColor = vec4(col, 1.0);
  }`;

/* ---------------- FLORES: filtro floresss ---------------- */
const FLORES_SIM = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uSrc, uPrev; uniform vec2 uTexel; uniform float uTime, uLow, uMid;
  float lum(vec2 uv){ return dot(texture2D(uSrc, uv).rgb, vec3(0.299, 0.587, 0.114)); }
  void main(){
    // edge1: bordes de la imagen (fuerza 1.54 + bombo) en rosado claro, luego thresh 0.301 suave
    vec2 t = uTexel * 1.5;
    float gx = lum(vUv + vec2(t.x, 0)) - lum(vUv - vec2(t.x, 0)) + 0.5 * (lum(vUv + t) - lum(vUv - t) + lum(vUv + vec2(t.x, -t.y)) - lum(vUv + vec2(-t.x, t.y)));
    float gy = lum(vUv + vec2(0, t.y)) - lum(vUv - vec2(0, t.y)) + 0.5 * (lum(vUv + t) - lum(vUv - t) - lum(vUv + vec2(t.x, -t.y)) + lum(vUv + vec2(-t.x, t.y)));
    float e = length(vec2(gx, gy)) * (1.54 + uLow * 1.6);
    e = smoothstep(0.301 - 0.25, 0.301 + 0.25, e);
    vec3 edge = e * vec3(0.984, 0.834, 0.877);
    // edge2 desplazado hacia arriba con el tiempo (transform1: py = absTime * 0.02)
    float e2 = length(vec2(lum(fract(vUv + vec2(0.0, uTime * 0.02)) + vec2(t.x, 0)) - lum(fract(vUv + vec2(0.0, uTime * 0.02)) - vec2(t.x, 0)), 0.0)) * uMid * 2.5;
    vec3 src = texture2D(uSrc, vUv).rgb;
    // feedback con "burn": lo anterior se oscurece y se quema sobre lo nuevo
    vec3 prev = texture2D(uPrev, 0.5 + (vUv - 0.5) * 0.995).rgb * 0.9;
    vec3 base = edge + vec3(e2) * vec3(0.6, 0.9, 0.7) + src * 0.18;
    vec3 burn = 1.0 - (1.0 - prev) / max(base + 0.35, vec3(0.05));
    gl_FragColor = vec4(clamp(max(base, burn * 0.85), 0.0, 1.0), 1.0);
  }`;
// radial blur: mismo GLSL del .toe (pixel DAT), con menos muestras para la web
const RADIAL = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uIn; uniform vec2 uCenter; uniform float uStrength;
  void main(){
    vec2 dir = vUv - uCenter; vec4 color = vec4(0.0);
    const int S = 40;
    for (int i = 0; i < S; i++) color += texture2D(uIn, vUv + float(i) / float(S) * dir * -uStrength);
    gl_FragColor = color / float(S);
  }`;
// retraso RGB: rojo = ahora, verde = hace 4 cuadros, azul = hace 8 + bloom
const FLORES_SHOW = /* glsl */`
  precision highp float; varying vec2 vUv;
  uniform sampler2D uNow, uD4, uD8, uBlur; uniform float uLow;
  void main(){
    vec3 c = vec3(texture2D(uNow, vUv).r, texture2D(uD4, vUv).g, texture2D(uD8, vUv).b);
    vec3 b = texture2D(uBlur, vUv).rgb;
    gl_FragColor = vec4(c + b * (0.55 + uLow * 0.6), 1.0);
  }`;

export function createFX({ kind, host, source }) {
  const canvas = document.createElement('canvas');
  const overlay = document.createElement('canvas');      // cajas del blob tracking
  host.append(canvas, overlay);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: false });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scene.add(quad);
  const audio = new Audio();
  const mouse = new THREE.Vector2(0.5, 0.5);
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height); });

  let W = 2, H = 2;
  const rt = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(scene, cam); };

  let targets = [], sim, show, radial, srcTex, history = [], frame = 0, raf = 0, video = null;
  const copyMat = new THREE.MeshBasicMaterial();

  function build() {
    targets.forEach((t) => t.dispose()); history.forEach((t) => t.dispose());
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); overlay.width = w; overlay.height = h;
    const scale = kind === 'entropy' ? 0.5 : 0.6;                     // simulación a menor resolución
    W = Math.max(64, Math.round(w * scale)); H = Math.max(64, Math.round(h * scale));
    targets = [rt(), rt()];
    if (kind === 'entropy') {
      sim = mat(ENTROPY_SIM, { uPrev: { value: null }, uTime: { value: 0 }, uLow: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uAspect: { value: w / h }, uMouse: { value: mouse } });
      show = mat(ENTROPY_SHOW, { uSim: { value: null }, uTime: { value: 0 }, uLow: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } });
    } else {
      history = Array.from({ length: 9 }, rt);
      targets.push(rt());
      sim = mat(FLORES_SIM, { uSrc: { value: srcTex }, uPrev: { value: null }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) }, uTime: { value: 0 }, uLow: { value: 0 }, uMid: { value: 0 } });
      radial = mat(RADIAL, { uIn: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0.125 } });
      show = mat(FLORES_SHOW, { uNow: { value: null }, uD4: { value: null }, uD8: { value: null }, uBlur: { value: null }, uLow: { value: 0 } });
    }
  }

  // fuente del filtro de flores: video, imagen o cámara
  function setSource(el) {
    if (srcTex) srcTex.dispose();
    srcTex = el.tagName === 'VIDEO' ? new THREE.VideoTexture(el) : new THREE.Texture(el);
    srcTex.needsUpdate = true; srcTex.colorSpace = THREE.SRGBColorSpace;
    if (sim && sim.uniforms.uSrc) sim.uniforms.uSrc.value = srcTex;
  }
  if (kind === 'flores') {
    video = document.createElement('video');
    Object.assign(video, { src: source, muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous' });
    video.play().catch(() => {});
    setSource(video);
  }

  /* blob tracking: busca zonas brillantes en una versión chiquita del cuadro y dibuja cajas */
  const probe = document.createElement('canvas'); probe.width = 48; probe.height = 27;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  let blobs = [];
  function trackBlobs() {
    if (!video || video.readyState < 2) return;
    pctx.drawImage(video, 0, 0, 48, 27);
    const d = pctx.getImageData(0, 0, 48, 27).data, seen = new Uint8Array(48 * 27), found = [];
    const bright = (i) => (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 > 150;
    for (let i = 0; i < 48 * 27; i++) {
      if (seen[i] || !bright(i)) continue;
      let x0 = 99, y0 = 99, x1 = -1, y1 = -1, n = 0; const st = [i]; seen[i] = 1;
      while (st.length) {
        const k = st.pop(), x = k % 48, y = (k / 48) | 0; n++;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, nk = ny * 48 + nx;
          if (nx >= 0 && ny >= 0 && nx < 48 && ny < 27 && !seen[nk] && bright(nk)) { seen[nk] = 1; st.push(nk); }
        }
      }
      if (n > 6) found.push({ x0: x0 / 48, y0: y0 / 27, x1: (x1 + 1) / 48, y1: (y1 + 1) / 27, n });
    }
    blobs = found.sort((a, b) => b.n - a.n).slice(0, 7);
  }
  function drawBlobs() {
    const c = overlay.getContext('2d'), w = overlay.width, h = overlay.height;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.fillStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1;
    c.font = '11px "Space Mono", monospace';
    blobs.forEach((b, i) => {
      const x = b.x0 * w, y = b.y0 * h, bw = (b.x1 - b.x0) * w, bh = (b.y1 - b.y0) * h;
      c.strokeRect(x, y, bw, bh);
      c.beginPath(); c.moveTo(x + bw / 2 - 5, y + bh / 2); c.lineTo(x + bw / 2 + 5, y + bh / 2); c.moveTo(x + bw / 2, y + bh / 2 - 5); c.lineTo(x + bw / 2, y + bh / 2 + 5); c.stroke();
      c.fillStyle = i === 0 ? '#e3122d' : 'rgba(255,255,255,.85)';
      c.fillText(`id${i} ${(b.x0 + b.x1).toFixed(2)},${(b.y0 + b.y1).toFixed(2)}`, x + 3, y - 4);
      c.fillStyle = 'rgba(255,255,255,.85)';
    });
  }

  const clock = new THREE.Clock();
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    audio.update(t);
    const [a, b] = targets;
    if (kind === 'entropy') {
      sim.uniforms.uPrev.value = a.texture; sim.uniforms.uTime.value = t;
      sim.uniforms.uLow.value = audio.low; sim.uniforms.uMid.value = audio.mid; sim.uniforms.uHigh.value = audio.high;
      pass(sim, b);
      show.uniforms.uSim.value = b.texture; show.uniforms.uLow.value = audio.low;
      pass(show, null);
      targets = [b, a];
    } else {
      if (srcTex && srcTex.image && srcTex.image.tagName !== 'VIDEO') srcTex.needsUpdate = false;
      sim.uniforms.uPrev.value = a.texture; sim.uniforms.uTime.value = t; sim.uniforms.uLow.value = audio.low; sim.uniforms.uMid.value = audio.mid;
      pass(sim, b);
      const h0 = history.pop(); radial.uniforms.uIn.value = b.texture;
      radial.uniforms.uStrength.value = 0.08 + audio.mid * 0.12;
      radial.uniforms.uCenter.value.set(0.5 + Math.sin(t * 0.3) * 0.08, 0.5 + Math.cos(t * 0.23) * 0.08);
      pass(radial, targets[2]);
      // historia para el retraso RGB
      copyMat.map = b.texture; quad.material = copyMat; renderer.setRenderTarget(h0); renderer.render(scene, cam);
      history.unshift(h0);
      show.uniforms.uNow.value = history[0].texture; show.uniforms.uD4.value = history[4].texture; show.uniforms.uD8.value = history[8].texture;
      show.uniforms.uBlur.value = targets[2].texture; show.uniforms.uLow.value = audio.low;
      pass(show, null);
      targets = [b, a, targets[2]];
      if (frame++ % 5 === 0) { trackBlobs(); drawBlobs(); }
    }
  }

  const ro = new ResizeObserver(build); ro.observe(host);
  build(); loop();

  return {
    async mic() { await audio.enableMic(); },
    async camera() {                                           // solo para flores: la cámara como entrada del filtro
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      video.srcObject = s; video.removeAttribute('src'); await video.play();
      this.camStream = s;
    },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); audio.stop();
      this.camStream?.getTracks().forEach((t) => t.stop());
      if (video) { video.pause(); video.removeAttribute('src'); video.srcObject = null; }
      targets.forEach((t) => t.dispose()); history.forEach((t) => t.dispose());
      renderer.dispose(); canvas.remove(); overlay.remove();
    },
  };
}
