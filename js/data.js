/* Contenido del "sistema" de la PSP.
   Para agregar fotos: ponerlas en assets/works/<id>/ y listarlas en images.
   link: a dónde lleva □ (reel, YouTube, itch.io, repo…) — null = sin enlace todavía. */

export const CATS = {
  xr:    { es: 'realidad mixta', en: 'mixed reality', c1: '#12021f', c2: '#4a1672', glow: '#b07cff' },
  vj:    { es: 'vj / visuales',  en: 'vj / visuals',  c1: '#1a0206', c2: '#6a0f1d', glow: '#ff4d6a' },
  '3d':  { es: '3d / blender',   en: '3d / blender',  c1: '#020a14', c2: '#133a5c', glow: '#6cc4ff' },
  video: { es: 'video',          en: 'video',         c1: '#0b0b0b', c2: '#3a3a3a', glow: '#e8e8e8' },
  games: { es: 'videojuegos',    en: 'games',         c1: '#03140a', c2: '#0f4a2a', glow: '#5dff9e' },
  web:   { es: 'app web',        en: 'web app',       c1: '#140c02', c2: '#5a3a0c', glow: '#ffc25d' },
  locked:{ es: 'en desarrollo',  en: 'in progress',   c1: '#050505', c2: '#2a070d', glow: '#e3122d' },
};

const imgs = (id, n) => Array.from({ length: n }, (_, i) => `assets/works/${id}/${String(i + 1).padStart(2, '0')}.jpg`);

export const PROJECTS = [
  {
    id: 'museo', cat: 'xr', year: '2026', seed: 23, link: 'https://github.com/jooosUu/Realidad_mixta_parcial_1',
    tools: ['Unity 6', 'C#', 'Google Cardboard XR', 'Android', 'Blender'],
    features: {
      es: ['Movimiento sin mareo: miras un círculo del piso y te teletransportas con fundido a negro.',
           'Las exhibiciones reaccionan a la mirada: los dinosaurios rugen, los aviones despegan.',
           'Misión de piezas perdidas: agarras piezas con la mirada y las llevas a su sala.',
           'Modo contemplar: al mirar fijo una pieza, la sala se oscurece y la pieza gira con música.',
           'Reproductor de música flotante para recorrer el pasillo.'],
      en: ['Motion-sickness-free movement: look at a floor marker and teleport with a fade.',
           'Exhibits react to your gaze: dinosaurs roar, jets take off.',
           'Lost-pieces mission: grab pieces with your gaze and return them to their room.',
           'Contemplate mode: stare at a piece and the room dims while it spins to music.',
           'Floating music player while you walk the hall.'],
    },
    images: imgs('museo', 8),
    title: { es: 'Museo Autista VR', en: 'Autistic Museum VR' },
    desc:  { es: 'Museo de intereses especiales en VR (Unity + Cardboard): aviones, dinosaurios, hongos y carros, con misión y tutorial.',
             en: 'Special-interests museum in VR (Unity + Cardboard): jets, dinosaurs, mushrooms and cars, with a mission and tutorial.' },
  },
  {
    id: 'luar', cat: 'xr', year: '2026', seed: 11, link: 'https://github.com/jooosUu/realidad_mixta_L',
    tools: ['Unity 6', 'URP', 'C#', 'Google Cardboard XR', 'Android'],
    features: {
      es: ['Puntero de mirada (gaze) con anillo de carga y etiqueta de la acción.',
           'Teletransporte entre puntos del piso con fundido suave para no marear.',
           'Agarrar y colocar: preparas café en la cafetera y sirves los pedidos en las mesas.',
           'Tutorial guiado, recorrido con 3 clientes y pantalla de felicitaciones con resumen.',
           'Las 4 escenas se generan por código desde el editor de Unity.'],
      en: ['Gaze pointer with a fill ring and an action label.',
           'Teleport between floor points with a soft fade to avoid motion sickness.',
           'Grab and place: brew coffee and serve orders to the tables.',
           'Guided tutorial, a run with 3 customers and a summary screen.',
           'All 4 scenes are generated in code from the Unity editor.'],
    },
    images: imgs('luar', 7),
    title: { es: 'Luar Café VR', en: 'Luar Café VR' },
    desc:  { es: 'Cafetería en VR (Unity + Cardboard): preparas café y sirves pedidos en las mesas. Escenas generadas por código.',
             en: 'VR café (Unity + Cardboard): brew coffee and serve orders to tables. Scenes generated in code.' },
  },
  {
    // proyecto en curso: no se muestra qué es hasta que esté listo
    id: 'pronto', cat: 'locked', year: '2026', seed: 52, link: null, locked: true,
    images: [],
    title: { es: 'Proyecto bloqueado', en: 'Locked project' },
    desc:  { es: 'Estoy trabajando en esto. Se desbloquea pronto.', en: "I'm working on it. Unlocks soon." },
  },
];

export const LINKS = {
  instagram: 'https://www.instagram.com/badfacejosu/',
  linkedin: 'https://www.linkedin.com/in/jose-ochoa-b12351135/',
};

/* Columnas del menú tipo XMB. icon = nombre de ícono dibujado en screen.js */
export const XMB = [
  { id: 'projects', icon: 'pad',    label: { es: 'Proyectos', en: 'Projects' } },
  { id: 'photos',   icon: 'camera', label: { es: 'Fotos',     en: 'Photos' } },
  { id: 'videos',   icon: 'film',   label: { es: 'Videos',    en: 'Videos' } },
  { id: 'about',    icon: 'user',   label: { es: 'Sobre mí',  en: 'About' } },
  { id: 'contact',  icon: 'globe',  label: { es: 'Contacto',  en: 'Contact' } },
  { id: 'settings', icon: 'gear',   label: { es: 'Ajustes',   en: 'Settings' } },
];
