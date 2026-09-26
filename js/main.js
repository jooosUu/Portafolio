/* Arranque: pantalla de carga #ÜMAMI, idioma, invertir, sigilos, apariciones y la PSP. */
import { setLang, getLang, onLang } from './i18n.js';
import { sigilSVG } from './sigil.js';
import { initPSP } from './psp.js';
import { initTitere } from './titere.js';

const $ = (s) => document.querySelector(s);

/* ---------- boot ---------- */
function drawBootMark() {
  // se dibuja chiquito y se escala con image-rendering: pixelated → look pixelado
  const c = $('#bootMark'), ctx = c.getContext('2d');
  c.width = 64; c.height = 36;
  ctx.fillStyle = '#000';
  ctx.font = '24px Anton, Impact, sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(32, 21); ctx.scale(0.62, 1.05);
  ctx.fillText('#ÜMAMI', 0, 0);
  ctx.restore();
}

let shown = 0, target = 0, bootDone = false, ready = false;
const fill = $('#bootFill'), pct = $('#bootPct');
function finishBoot() {
  if (bootDone) return;
  bootDone = true;
  fill.style.right = '0%';
  pct.textContent = '100';
  setTimeout(() => { $('#boot').classList.add('is-done'); document.body.classList.remove('is-booting'); }, 250);
}
function tickBoot() {
  if (bootDone) return;
  target = ready ? 1 : Math.max(target, Math.min(0.96, target + 0.002));
  shown = Math.min(target, shown + Math.max((target - shown) * 0.12, 0.004));
  fill.style.right = `${(1 - shown) * 100}%`;
  pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
  if (ready && shown >= 1) return finishBoot();
  requestAnimationFrame(tickBoot);
}
document.fonts.load('26px Anton').finally(drawBootMark);
requestAnimationFrame(tickBoot);
const markReady = () => { if (ready) return; ready = true; setTimeout(finishBoot, 1500); };   // respaldo si rAF va lento
setTimeout(markReady, 12000);   // por si el modelo no carga, no bloquear el sitio

/* ---------- idioma e invertir ---------- */
setLang(getLang());
$('#langToggle').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
const renderLangBtn = (l) => { $('#langToggle').innerHTML = l === 'es' ? '<b>es</b> / en' : 'es / <b>en</b>'; };
renderLangBtn(getLang()); onLang(renderLangBtn);
$('#invertToggle').addEventListener('click', () => toggleInvert());

/* ---------- sigilos y apariciones ---------- */
document.querySelectorAll('[data-sigil]').forEach((el) => { el.innerHTML = sigilSVG(+el.dataset.sigil, 0.011); });
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')), { threshold: 0.2 });
document.querySelectorAll('.sec').forEach((s) => io.observe(s));
$('#year').textContent = new Date().getFullYear();

initTitere({ canvas: $('#titereCanvas'), stage: $('.titere') });

/* ---------- PSP ---------- */
const toggleInvert = () => {
  const on = document.body.classList.toggle('is-invert');
  $('#invertToggle').setAttribute('aria-pressed', on);
};
const railIdx = $('#railIdx'), railTot = $('#railTot'), railCat = $('#railCat'), railTitle = $('#railTitle');
const paintRail = (s) => {
  railIdx.textContent = String(s.idx).padStart(2, '0');
  railTot.textContent = '/' + String(s.tot).padStart(2, '0');
  railCat.textContent = s.label;
  railTitle.textContent = s.title;
};

const psp = initPSP({
  canvas: $('#pspCanvas'),
  stage: $('.machine__stage'),
  onProgress: (f) => { target = Math.max(target, f * 0.96); },
  onReady: markReady,
  onState: paintRail,
  onAction: (type, url) => {
    if (type === 'link' && url) window.open(url, '_blank', 'noopener');
    else if (type === 'lang') setLang(getLang() === 'es' ? 'en' : 'es');
    else if (type === 'invert') toggleInvert();
  },
});
onLang(() => paintRail(psp.info()));

document.querySelectorAll('[data-btn]').forEach((b) => b.addEventListener('click', () => psp.press(b.dataset.btn)));
const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'cross', x: 'cross', Escape: 'circle', Backspace: 'circle', o: 'circle',
  t: 'triangle', s: 'square', h: 'home',
};
addEventListener('keydown', (e) => {
  const r = $('#work').getBoundingClientRect();
  if (r.bottom < innerHeight * 0.3 || r.top > innerHeight * 0.7) return;   // solo con la PSP en pantalla
  const b = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  if (!b) return;
  e.preventDefault();
  psp.press(b);
});
