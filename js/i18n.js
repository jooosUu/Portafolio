/* Textos ES / EN. Cada elemento con data-i18n="clave" se reemplaza al cambiar de idioma. */

export const STR = {
  es: {
    invert: 'invertir',
    tag: 'ingeniero multimedia',
    skVideo: 'video', skGames: 'videojuegos', skXR: 'realidad mixta',
    work: '/ proyectos',
    hint: 'toca un disco para meterlo en la PSP · arrastra para girar',
    aboutH: 'sobre mí',
    bio1: 'Soy josÚ, ingeniero en multimedia. Me muevo entre la visual en vivo y lo interactivo: hago de VJ, modelo en Blender, edito video, programo videojuegos y construyo experiencias de realidad mixta.',
    bio2: 'Me interesa la estética oscura, los símbolos y la tecnología que se siente física: pantallas, luz, ruido y movimiento.',
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
    bio1: "I'm josÚ, a multimedia engineer. I work between live visuals and interactive media: I VJ, model in Blender, edit video, code games and build mixed reality experiences.",
    bio2: "I'm drawn to dark aesthetics, symbols and technology that feels physical: screens, light, noise and motion.",
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
