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
    id: 'desconexion', cat: 'vj', year: '2026', seed: 61, link: 'https://www.instagram.com/p/DbhNtfcKNMf/',
    fx: { kind: 'flores', source: 'assets/works/desconexion/flores-src.mp4' },   // 'floresss' sobre el mismo video de flores del evento
    images: ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.jpg', '06.jpg', '07.mp4'].map((f) => `assets/works/desconexion/${f}`),
    tools: ['TouchDesigner', 'Video mapping', 'Proyección', 'Visuales en vivo'],
    title: { es: 'Desconexión', en: 'Desconexión' },
    desc:  { es: 'Visuales en vivo para Desconexión: proyecciones sobre el techo y los muros de un espacio íntimo de velas y cojines, generadas y mezcladas en tiempo real en TouchDesigner.',
             en: 'Live visuals for Desconexión: projections on the ceiling and walls of an intimate space of candles and cushions, generated and mixed in real time in TouchDesigner.' },
    features: {
      es: ['Proyección sobre el techo y los muros del lugar: el espacio entero se vuelve pantalla.',
           'Visuales generados y mezclados en vivo en TouchDesigner durante todo el evento.',
           'Texturas orgánicas y florales que acompañan el ambiente tranquilo de la noche.',
           'Montaje y ajuste de la proyección en el lugar antes de abrir.'],
      en: ['Projection on the ceiling and walls: the whole room becomes the screen.',
           'Visuals generated and mixed live in TouchDesigner throughout the event.',
           'Organic, floral textures that match the calm mood of the night.',
           'On-site setup and projection alignment before doors opened.'],
    },
  },
  {
    id: 'tunhouse', cat: 'vj', year: '2026', seed: 77, link: 'https://www.instagram.com/p/DYYJrbeqpoL/',
    fx: { kind: 'estela' },                                               // 'estela_' de TODOS.toe: fondo de SYS ENTROPY
    links: [
      { es: 'post del evento', en: 'event post', url: 'https://www.instagram.com/p/DXXtWagCsoK/' },
      { es: 'post de agradecimiento', en: 'thank-you post', url: 'https://www.instagram.com/p/DYYJrbeqpoL/' },
    ],
    images: ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.jpg', '06.jpg', '07.jpg', '08.mp4', '09.mp4', '10.mp4'].map((f) => `assets/works/tunhouse/${f}`),
    tools: ['TouchDesigner', 'Kinect', 'Audio reactivo', 'Visuales en vivo'],
    title: { es: 'Aniversario Tunhouse', en: 'Tunhouse Anniversary' },
    desc:  { es: 'Visuales para la fiesta de aniversario de Tunhouse: reaccionan al audio y al movimiento de la gente con un Kinect, todo en tiempo real en TouchDesigner.',
             en: "Visuals for Tunhouse's anniversary party: they react to the music and to people's movement through a Kinect, all in real time in TouchDesigner." },
    features: {
      es: ['Visuales audio-reactivos: cambian con el ritmo y la energía de la música.',
           'Interacción con Kinect: siluetas y partículas que siguen el movimiento del público.',
           'Programado en TouchDesigner y operado en vivo durante la fiesta.'],
      en: ['Audio-reactive visuals that follow the rhythm and energy of the music.',
           'Kinect interaction: silhouettes and particles that follow the crowd.',
           'Built in TouchDesigner and performed live during the party.'],
    },
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
