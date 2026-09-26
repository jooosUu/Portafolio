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
};

const imgs = (id, n) => Array.from({ length: n }, (_, i) => `assets/works/${id}/${String(i + 1).padStart(2, '0')}.jpg`);

export const PROJECTS = [
  {
    id: 'museo', cat: 'xr', year: '2026', seed: 23, link: null,
    images: imgs('museo', 8),
    title: { es: 'Museo Autista VR', en: 'Autistic Museum VR' },
    desc:  { es: 'Museo de intereses especiales en VR (Unity + Cardboard): aviones, dinosaurios, hongos y carros, con misión y tutorial.',
             en: 'Special-interests museum in VR (Unity + Cardboard): jets, dinosaurs, mushrooms and cars, with a mission and tutorial.' },
  },
  {
    id: 'luar', cat: 'xr', year: '2026', seed: 11, link: null,
    images: imgs('luar', 7),
    title: { es: 'Luar Café VR', en: 'Luar Café VR' },
    desc:  { es: 'Cafetería en VR (Unity + Cardboard): preparas café y sirves pedidos en las mesas. Escenas generadas por código.',
             en: 'VR café (Unity + Cardboard): brew coffee and serve orders to tables. Scenes generated in code.' },
  },
  {
    id: 'armonico', cat: 'web', year: '2026', seed: 52, link: null,
    images: imgs('armonico', 1),
    title: { es: 'Armónico Karaoke', en: 'Armónico Karaoke' },
    desc:  { es: 'App de gestión para un karaoke: ventas, caja, inventario, personal y préstamos (Next.js + Supabase).',
             en: 'Management app for a karaoke bar: sales, cash, inventory, staff and loans (Next.js + Supabase).' },
  },
];

export const LINKS = {
  instagram: 'https://www.instagram.com/badfacejosu/',
  linkedin: null,   // pendiente
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
