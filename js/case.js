/* Ficha de proyecto: vista completa fuera de la PSP (galería, descripción, herramientas y links).
   Se abre con el botón "ver proyecto" o con un link directo: .../Portafolio/#museo */
import { CATS, PROJECTS } from './data.js';
import { getLang, onLang } from './i18n.js';
import { sigilSVG } from './sigil.js';
import { createFX } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const T = {
  es: { fx: 'efecto en vivo', fxNote: 'recreado en el navegador a partir de mi red de TouchDesigner', mic: 'activar micrófono', micOn: 'micrófono activo', cam: 'usar mi cámara', camOn: 'cámara activa', denied: 'sin permiso', tools: 'herramientas', what: 'qué hace', gallery: 'galería', repo: 'ver en GitHub', ig: 'ver en Instagram', site: 'ver más', close: 'cerrar', locked: 'Este proyecto está en desarrollo. Pronto se desbloquea.' },
  en: { fx: 'live effect', fxNote: 'recreated in the browser from my TouchDesigner network', mic: 'turn on mic', micOn: 'mic on', cam: 'use my camera', camOn: 'camera on', denied: 'no permission', tools: 'tools', what: 'what it does', gallery: 'gallery', repo: 'view on GitHub', ig: 'view on Instagram', site: 'more', close: 'close', locked: 'This project is in progress. Unlocks soon.' },
};

let current = -1;
let fx = null;                                   // efecto de TouchDesigner activo en la ficha
const el = $('#case');

// botones de links: varios (p.links) o uno solo (p.link) con el texto según el sitio
function links(p, lang, t) {
  const list = p.links ? p.links.map((l) => [l[lang], l.url]) : p.link ? [[/instagram\.com/.test(p.link) ? t.ig : /github\.com/.test(p.link) ? t.repo : t.site, p.link]] : [];
  return list.map(([label, url]) => `<a class="case__link mono" href="${url}" target="_blank" rel="noopener">${label} ↗</a>`).join('');
}

function render() {
  fx?.dispose(); fx = null;
  if (current < 0) return;
  const p = PROJECTS[current], c = CATS[p.cat], lang = getLang(), t = T[lang];
  const imgs = p.images.map((src, i) => (/\.mp4$/i.test(src)
    ? `<button class="case__shot is-video" data-i="${i}"><video src="${src}" muted loop playsinline autoplay preload="metadata"></video></button>`
    : `<button class="case__shot" data-i="${i}"><img src="${src}" alt="${p.title[lang]} — ${i + 1}" loading="lazy" /></button>`)).join('');
  el.innerHTML = `
    <div class="case__inner">
      <button class="case__close mono" aria-label="${t.close}">✕ ${t.close}</button>
      <div class="case__sig" aria-hidden="true">${sigilSVG(p.seed, 0.011)}</div>
      <header class="case__head">
        <p class="case__meta mono">${p.locked ? '🔒 ' : ''}${c[lang]} · ${p.year}</p>
        <h2 class="case__title">${p.title[lang]}</h2>
        <p class="case__lead">${p.locked ? t.locked : p.desc[lang]}</p>
        <div class="case__links">${links(p, lang, t)}</div>
      </header>
      ${p.locked ? '' : `
      <div class="case__cols">
        ${p.features ? `<section><h3 class="case__h mono">${t.what}</h3><ul class="case__list">${p.features[lang].map((f) => `<li>${f}</li>`).join('')}</ul></section>` : ''}
        ${p.tools ? `<section><h3 class="case__h mono">${t.tools}</h3><div class="case__chips">${p.tools.map((x) => `<span>${x}</span>`).join('')}</div></section>` : ''}
      </div>
      ${p.fx ? `<h3 class="case__h mono">${t.fx}</h3>
      <div class="case__fx"><div class="case__fxstage"></div>
        <div class="case__fxbar mono"><span>${t.fxNote}</span>
          <button data-fx="mic">● ${t.mic}</button>${p.fx.kind === 'flores' ? `<button data-fx="cam">◎ ${t.cam}</button>` : ''}</div></div>` : ''}
      ${imgs ? `<h3 class="case__h mono">${t.gallery}</h3><div class="case__grid">${imgs}</div>` : ''}`}
    </div>
    <div class="case__zoom" hidden></div>`;
  const stage = $('.case__fxstage', el);
  if (stage) fx = createFX({ kind: p.fx.kind, host: stage, source: p.fx.source });
}

export function openCase(k, { push = true } = {}) {
  current = k;
  render();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  document.body.classList.add('case-open');
  el.scrollTop = 0;
  if (push && location.hash !== '#' + PROJECTS[k].id) history.replaceState(null, '', '#' + PROJECTS[k].id);
  $('.case__close', el).focus({ preventScroll: true });
}

export function closeCase() {
  if (current < 0) return;
  current = -1;
  fx?.dispose(); fx = null;
  el.classList.remove('is-open');
  document.body.classList.remove('case-open');
  setTimeout(() => { if (current < 0) el.hidden = true; }, 350);
  history.replaceState(null, '', location.pathname + location.search);
}

el.addEventListener('click', (e) => {
  const zoom = $('.case__zoom', el);
  if (e.target.closest('.case__close')) return closeCase();
  const fb = e.target.closest('[data-fx]');
  if (fb && fx) {
    const t = T[getLang()], kind = fb.dataset.fx;
    fx[kind === 'mic' ? 'mic' : 'camera']()
      .then(() => { fb.textContent = kind === 'mic' ? `● ${t.micOn}` : `◎ ${t.camOn}`; fb.classList.add('is-on'); })
      .catch(() => { fb.textContent = t.denied; });
    return;
  }
  const shot = e.target.closest('.case__shot');
  if (shot) {
    const v = shot.querySelector('video');
    zoom.innerHTML = v ? `<video src="${v.src}" controls autoplay loop playsinline></video>` : `<img src="${shot.querySelector('img').src}" alt="" />`;
    zoom.hidden = false; return;
  }
  if (e.target.closest('.case__zoom') && e.target.tagName !== 'VIDEO') { zoom.hidden = true; zoom.innerHTML = ''; return; }
  if (e.target === el) closeCase();             // clic fuera del contenido
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || current < 0) return;
  const zoom = $('.case__zoom', el);
  if (zoom && !zoom.hidden) { zoom.hidden = true; zoom.innerHTML = ''; } else closeCase();
});
onLang(render);
export const isCaseOpen = () => current >= 0;
