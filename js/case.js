/* Ficha de proyecto: vista completa fuera de la PSP (galería, descripción, herramientas y links).
   Se abre con el botón "ver proyecto" o con un link directo: .../Portafolio/#museo */
import { CATS, PROJECTS } from './data.js';
import { getLang, onLang } from './i18n.js';
import { sigilSVG } from './sigil.js';

const $ = (s, r = document) => r.querySelector(s);
const T = {
  es: { tools: 'herramientas', what: 'qué hace', gallery: 'galería', repo: 'ver en GitHub', close: 'cerrar', locked: 'Este proyecto está en desarrollo. Pronto se desbloquea.' },
  en: { tools: 'tools', what: 'what it does', gallery: 'gallery', repo: 'view on GitHub', close: 'close', locked: 'This project is in progress. Unlocks soon.' },
};

let current = -1;
const el = $('#case');

function render() {
  if (current < 0) return;
  const p = PROJECTS[current], c = CATS[p.cat], lang = getLang(), t = T[lang];
  const imgs = p.images.map((src, i) => `<button class="case__shot" data-i="${i}"><img src="${src}" alt="${p.title[lang]} — ${i + 1}" loading="lazy" /></button>`).join('');
  el.innerHTML = `
    <div class="case__inner">
      <button class="case__close mono" aria-label="${t.close}">✕ ${t.close}</button>
      <div class="case__sig" aria-hidden="true">${sigilSVG(p.seed, 0.011)}</div>
      <header class="case__head">
        <p class="case__meta mono">${p.locked ? '🔒 ' : ''}${c[lang]} · ${p.year}</p>
        <h2 class="case__title">${p.title[lang]}</h2>
        <p class="case__lead">${p.locked ? t.locked : p.desc[lang]}</p>
        ${p.link ? `<a class="case__link mono" href="${p.link}" target="_blank" rel="noopener">${t.repo} ↗</a>` : ''}
      </header>
      ${p.locked ? '' : `
      <div class="case__cols">
        ${p.features ? `<section><h3 class="case__h mono">${t.what}</h3><ul class="case__list">${p.features[lang].map((f) => `<li>${f}</li>`).join('')}</ul></section>` : ''}
        ${p.tools ? `<section><h3 class="case__h mono">${t.tools}</h3><div class="case__chips">${p.tools.map((x) => `<span>${x}</span>`).join('')}</div></section>` : ''}
      </div>
      ${imgs ? `<h3 class="case__h mono">${t.gallery}</h3><div class="case__grid">${imgs}</div>` : ''}`}
    </div>
    <div class="case__zoom" hidden><img alt="" /></div>`;
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
  el.classList.remove('is-open');
  document.body.classList.remove('case-open');
  setTimeout(() => { if (current < 0) el.hidden = true; }, 350);
  history.replaceState(null, '', location.pathname + location.search);
}

el.addEventListener('click', (e) => {
  const zoom = $('.case__zoom', el);
  if (e.target.closest('.case__close')) return closeCase();
  const shot = e.target.closest('.case__shot');
  if (shot) { zoom.querySelector('img').src = shot.querySelector('img').src; zoom.hidden = false; return; }
  if (e.target.closest('.case__zoom')) { zoom.hidden = true; return; }
  if (e.target === el) closeCase();             // clic fuera del contenido
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || current < 0) return;
  const zoom = $('.case__zoom', el);
  if (zoom && !zoom.hidden) zoom.hidden = true; else closeCase();
});
onLang(render);
export const isCaseOpen = () => current >= 0;
