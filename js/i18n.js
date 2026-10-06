/* Textos ES / EN. Cada elemento con data-i18n="clave" se reemplaza al cambiar de idioma. */

export const STR = {
  es: {
    invert: 'invertir',
    tag: 'ingeniero multimedia',
    skVideo: 'video', skGames: 'videojuegos', skXR: 'realidad mixta',
    work: '/ proyectos',
    hint: 'toca un disco para meterlo en la PSP · arrastra para girar',
    aboutH: 'sobre mí',
    bio1: 'Soy José, aka josÚ / badfacejosu, ingeniero multimedia. Hago visuales para fiestas y eventos, modelo y animo en Blender, edito video y programo videojuegos y proyectos de realidad mixta.',
    cv: 'hoja de vida', ats: 'hoja de vida ATS (pdf)', rates: 'tarifario', credits: 'créditos',
    contactH: 'contacto',
    credit: 'modelo 3D PSP',
    open: 'abrir', nav: 'navegar', soon: 'pronto',
  },
  en: {
    invert: 'invert',
    tag: 'multimedia engineer',
    skVideo: 'video', skGames: 'games', skXR: 'mixed reality',
    work: '/ work',
    hint: 'tap a disc to load it into the PSP · drag to spin',
    aboutH: 'about me',
    bio1: "I'm José, aka josÚ / badfacejosu, a multimedia engineer. I make visuals for parties and events, model and animate in Blender, edit video, and code games and mixed reality projects.",
    cv: 'résumé', ats: 'ATS résumé (pdf)', rates: 'rates', credits: 'credits',
    contactH: 'contact',
    credit: 'PSP 3D model',
    open: 'open', nav: 'browse', soon: 'soon',
  },
};

let lang = localStorage.getItem('lang') || (navigator.language || 'es').slice(0, 2);
if (!STR[lang]) lang = 'es';
const subs = new Set();

export const getLang = () => lang;
export const t = (k) => STR[lang][k] ?? k;
export const onLang = (f) => subs.add(f);

export function setLang(l) {
  lang = l;
  localStorage.setItem('lang', l);
  document.documentElement.lang = l;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  subs.forEach((f) => f(l));
}
