/* "josÚ OS": lo que corre dentro de la pantalla de la PSP.
   Un canvas 2D con menú tipo XMB que después pasa por el shader CRT.
   Se controla con press('up'|'down'|'left'|'right'|'cross'|'circle'|'triangle'|'square'|'home'|'start'|'select'|'display'|...) */
import { CATS, PROJECTS, XMB, LINKS } from './data.js';
import { drawSigil } from './sigil.js';
import { getLang, t } from './i18n.js';

const OS = { c1: '#14032a', c2: '#5b2a86', glow: '#c89bff' };
const L = (o) => (typeof o === 'string' ? o : o[getLang()]);

export class ScreenUI {
  constructor(w = 960, h = 544) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W = w;
    this.canvas.height = this.H = h;
    this.ctx = this.canvas.getContext('2d');
    this.mode = 'xmb';                 // xmb | gallery | about
    this.col = 0; this.colAnim = 0;
    this.rowSel = XMB.map(() => 0);
    this.gal = { p: 0, i: 0, full: false, info: true };
    this.fx = -10;                     // momento del último cambio (glitch)
    this.now = 0;
    this.imgs = new Map();
    this.onAction = () => {};          // ('link', url) | ('lang') | ('invert')
    this.onState = () => {};
    PROJECTS.forEach((p) => this.img(p.images[0]));
  }

  // imágenes y videos (.mp4 se reproducen en silencio y en bucle dentro de la pantalla)
  img(src) {
    if (!src) return null;
    if (!this.imgs.has(src)) {
      let m;
      if (/\.mp4$/i.test(src)) {
        m = document.createElement('video');
        Object.assign(m, { src, muted: true, loop: true, playsInline: true, preload: 'auto' });
        m.play().catch(() => {});
      } else { m = new Image(); m.src = src; }
      this.imgs.set(src, m);
    }
    const m = this.imgs.get(src);
    if (m.tagName === 'VIDEO') { if (m.paused) m.play().catch(() => {}); return m.readyState >= 2 ? m : null; }
    return m.complete && m.naturalWidth ? m : null;
  }

  /* ---------- filas de cada columna ---------- */
  rows(colId) {
    const lang = getLang();
    switch (colId) {
      case 'projects': return PROJECTS.map((p, k) => ({ title: L(p.title), sub: p.locked ? `🔒 ${CATS[p.cat][lang]}` : `${CATS[p.cat][lang]} · ${p.year}`, thumb: p.images[0], go: () => this.openGallery(k, false) }));
      case 'photos':   return PROJECTS.map((p, k) => ({ title: L(p.title), sub: p.locked ? '🔒' : `${p.images.length} ${lang === 'es' ? 'fotos' : 'photos'}`, thumb: p.images[0], go: () => this.openGallery(k, true) }));
      case 'videos':   return [{ title: lang === 'es' ? 'Próximamente' : 'Coming soon', sub: lang === 'es' ? 'reels, sets de VJ y edición' : 'reels, VJ sets and edits', dim: true }];
      case 'about':    return [{ title: lang === 'es' ? 'Leer' : 'Read', sub: 'josÚ — VJ · 3D · XR', go: () => this.setMode('about') }];
      case 'contact':  return [
        { title: 'Instagram', sub: '@badfacejosu', go: () => this.onAction('link', LINKS.instagram) },
        { title: 'LinkedIn', sub: LINKS.linkedin ? 'linkedin' : t('soon'), dim: !LINKS.linkedin, go: LINKS.linkedin && (() => this.onAction('link', LINKS.linkedin)) },
      ];
      case 'settings': return [
        { title: lang === 'es' ? 'Idioma' : 'Language', sub: lang === 'es' ? 'Español  →  English' : 'English  →  Español', go: () => this.onAction('lang') },
        { title: lang === 'es' ? 'Invertir colores' : 'Invert colors', sub: 'on / off', go: () => this.onAction('invert') },
      ];
    }
    return [];
  }

  setMode(m) { this.mode = m; this.fx = this.now; this.onState(this.info()); }
  openGallery(p, full) { this.gal = { p, i: 0, full, info: true }; this.setMode('gallery'); }

  /* ---------- entrada ---------- */
  press(b) {
    if (b === 'select') return this.onAction('lang');
    if (b === 'display') return this.onAction('invert');
    if (b === 'home') { if (this.mode !== 'xmb') this.setMode('xmb'); return; }
    if (this.mode === 'xmb') {
      const rows = this.rows(XMB[this.col].id);
      if (b === 'left' || b === 'right') {
        this.col = Math.max(0, Math.min(XMB.length - 1, this.col + (b === 'right' ? 1 : -1)));
      } else if (b === 'up' || b === 'down') {
        this.rowSel[this.col] = (this.rowSel[this.col] + (b === 'down' ? 1 : -1) + rows.length) % rows.length;
      } else if (b === 'cross' || b === 'start') {
        const r = rows[this.rowSel[this.col]]; if (r && r.go) r.go();
      }
    } else if (this.mode === 'gallery') {
      const g = this.gal, p = PROJECTS[g.p];
      if ((b === 'left' || b === 'right') && p.images.length) { g.i = (g.i + (b === 'right' ? 1 : -1) + p.images.length) % p.images.length; this.fx = this.now; }
      else if (b === 'up' || b === 'down') { g.p = (g.p + (b === 'down' ? 1 : -1) + PROJECTS.length) % PROJECTS.length; g.i = 0; this.fx = this.now; }
      else if (b === 'triangle' || b === 'cross') g.info = !g.info;
      else if (b === 'square' && p.link) this.onAction('link', p.link);
      else if (b === 'circle') this.setMode('xmb');
    } else if (this.mode === 'about') {
      if (b === 'circle' || b === 'cross') this.setMode('xmb');
    }
    this.onState(this.info());
  }

  /* resumen para el texto fuera de la PSP */
  info() {
    const lang = getLang();
    if (this.mode === 'gallery') {
      const p = PROJECTS[this.gal.p];
      return { idx: this.gal.i + 1, tot: p.images.length || 1, label: CATS[p.cat][lang], title: L(p.title), glow: CATS[p.cat].glow, proj: this.gal.p };
    }
    const c = XMB[this.col];
    const r = this.rows(c.id)[this.rowSel[this.col]];
    return { idx: this.col + 1, tot: XMB.length, label: L(c.label), title: this.mode === 'about' ? L(c.label) : (r ? r.title : ''), glow: OS.glow };
  }

  /* ---------- dibujo ---------- */
  bg(c1, c2, now) {
    const { ctx, W, H } = this;
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = H * (0.58 + k * 0.05) + Math.sin(x * 0.006 + now * (0.4 + k * 0.15) + k) * 26 + Math.sin(x * 0.013 - now * 0.3) * 10;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${0.035 + k * 0.02})`; ctx.fill();
    }
  }

  topbar(title) {
    const { ctx, W } = this;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '26px VT323, monospace';
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText(title, 30, 22);
    const d = new Date();
    ctx.textAlign = 'right';
    ctx.fillText(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}  ▮▮▮▯`, W - 30, 22);
  }

  hint(text) {
    const { ctx, W, H } = this;
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '24px VT323, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, W - 30, H - 20);
  }

  cover(im, x, y, w, h, fit = 'cover') {
    const nw = im.videoWidth || im.naturalWidth, nh = im.videoHeight || im.naturalHeight;
    const s = (fit === 'cover' ? Math.max : Math.min)(w / nw, h / nh);
    const iw = nw * s, ih = nh * s;
    this.ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  wrap(text, x, y, maxW, lh, maxLines = 4) {
    const { ctx } = this; const words = text.split(' '); let line = '', n = 0;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + n * lh); line = w;
        if (++n >= maxLines) return;
      } else line = test;
    }
    ctx.fillText(line, x, y + n * lh);
  }

  icon(name, x, y, s) {
    const { ctx } = this;
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(2, s * 0.07); ctx.strokeStyle = ctx.fillStyle = '#fff';
    ctx.lineJoin = ctx.lineCap = 'round';
    const rr = (x0, y0, w, h, r) => { ctx.beginPath(); ctx.roundRect(x0, y0, w, h, r); ctx.stroke(); };
    const circ = (cx, cy, r, fill) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); };
    if (name === 'pad') {
      rr(-s * 0.8, -s * 0.36, s * 1.6, s * 0.72, s * 0.36);
      ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(-s * 0.22, 0); ctx.moveTo(-s * 0.36, -s * 0.14); ctx.lineTo(-s * 0.36, s * 0.14); ctx.stroke();
      circ(s * 0.3, -s * 0.08, s * 0.06, true); circ(s * 0.46, s * 0.08, s * 0.06, true);
    } else if (name === 'camera') {
      rr(-s * 0.7, -s * 0.4, s * 1.4, s * 0.9, s * 0.12); circ(0, s * 0.05, s * 0.26);
      ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.4); ctx.lineTo(-s * 0.15, -s * 0.56); ctx.lineTo(s * 0.15, -s * 0.56); ctx.lineTo(s * 0.25, -s * 0.4); ctx.stroke();
    } else if (name === 'film') {
      rr(-s * 0.7, -s * 0.5, s * 1.4, s, s * 0.06);
      for (let k = -2; k <= 2; k++) { ctx.fillRect(k * s * 0.26 - s * 0.06, -s * 0.44, s * 0.12, s * 0.1); ctx.fillRect(k * s * 0.26 - s * 0.06, s * 0.34, s * 0.12, s * 0.1); }
    } else if (name === 'user') {
      circ(0, -s * 0.24, s * 0.26);
      ctx.beginPath(); ctx.arc(0, s * 0.6, s * 0.58, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (name === 'globe') {
      circ(0, 0, s * 0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.24, s * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.55, 0); ctx.lineTo(s * 0.55, 0); ctx.moveTo(-s * 0.46, -s * 0.28); ctx.lineTo(s * 0.46, -s * 0.28); ctx.moveTo(-s * 0.46, s * 0.28); ctx.lineTo(s * 0.46, s * 0.28); ctx.stroke();
    } else if (name === 'gear') {
      for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4); ctx.fillRect(-s * 0.08, -s * 0.6, s * 0.16, s * 0.2); ctx.restore(); }
      circ(0, 0, s * 0.42); circ(0, 0, s * 0.16);
    }
    ctx.restore();
  }

  drawXMB(now) {
    const { ctx, W, H } = this;
    this.bg(OS.c1, OS.c2, now);
    this.topbar('josÚ // OS');
    this.colAnim += (this.col - this.colAnim) * 0.18;
    const X0 = 230, GAP = 150, IY = 130;
    // íconos de columnas
    XMB.forEach((c, k) => {
      const x = X0 + (k - this.colAnim) * GAP;
      if (x < -80 || x > W + 80) return;
      const sel = k === this.col;
      ctx.globalAlpha = sel ? 1 : 0.45;
      this.icon(c.icon, x, IY, sel ? 58 : 42);
      if (sel) {
        ctx.font = '600 24px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(L(c.label), x, IY + 44);
      }
    });
    ctx.globalAlpha = 1;
    // filas de la columna activa
    const rows = this.rows(XMB[this.col].id), sel = this.rowSel[this.col];
    const RX = X0 - 30, RY = 240, RH = 70;
    const start = Math.max(0, Math.min(sel - 1, rows.length - 4));
    rows.slice(start, start + 4).forEach((r, j) => {
      const k = start + j, y = RY + j * RH, on = k === sel;
      ctx.globalAlpha = r.dim ? 0.4 : on ? 1 : 0.6;
      let tx = RX;
      const th = r.thumb && this.img(r.thumb);
      if (th) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(RX, y, 96, 54, 6); ctx.clip();
        this.cover(th, RX, y, 96, 54); ctx.restore();
        if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(RX, y, 96, 54, 6); ctx.stroke(); }
        tx = RX + 116;
      }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `${on ? '600 30px' : '26px'} "Space Grotesk", sans-serif`;
      ctx.fillText(r.title, tx, y + 26);
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '22px VT323, monospace';
      ctx.fillText(r.sub, tx, y + 50);
      if (on) { ctx.shadowColor = OS.glow; ctx.shadowBlur = 16; ctx.fillStyle = OS.glow; ctx.fillRect(RX - 18, y + 8, 4, 40); ctx.shadowBlur = 0; }
    });
    ctx.globalAlpha = 1;
    const es = getLang() === 'es';
    this.hint(es ? '← → ↑ ↓ mover   ✕ entrar' : '← → ↑ ↓ move   ✕ enter');
  }

  drawGallery(now) {
    const { ctx, W, H } = this;
    const g = this.gal, p = PROJECTS[g.p], c = CATS[p.cat], es = getLang() === 'es';
    this.bg(c.c1, c.c2, now);
    if (p.locked) return this.drawLocked(now, p, c, es);
    const im = this.img(p.images[g.i]);
    p.images.forEach((s, k) => Math.abs(k - g.i) <= 1 && this.img(s));   // precarga vecinas
    if (im) {
      if (p.images.length === 1) this.cover(im, W * 0.25, H * 0.12, W * 0.5, H * 0.62, 'contain');
      else if ((im.videoHeight || im.naturalHeight) > (im.videoWidth || im.naturalWidth)) {
        ctx.save(); ctx.filter = 'blur(18px) brightness(.5)'; this.cover(im, 0, 0, W, H); ctx.restore();
        this.cover(im, 0, 0, W, H, 'contain');
      } else this.cover(im, 0, 0, W, H);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.9)'; drawSigil(ctx, p.seed, W / 2, H * 0.45, H * 0.3, 0.014);
    }
    const sh = ctx.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(0.18, 'rgba(0,0,0,0)');
    sh.addColorStop(g.info && !g.full ? 0.45 : 0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.85)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    this.topbar(`${L(p.title)}  ${String(g.i + 1).padStart(2, '0')}/${String(p.images.length).padStart(2, '0')}`);
    // puntos de posición
    const n = p.images.length, dw = 14;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k === g.i ? '#fff' : 'rgba(255,255,255,.35)';
      ctx.fillRect(30 + k * dw, H - 48, 8, 3);
    }
    if (g.info && !g.full) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = c.glow; ctx.font = '26px VT323, monospace';
      ctx.fillText(`${c[getLang()]} · ${p.year}`, 30, H - 196);
      ctx.fillStyle = '#fff'; ctx.font = '600 50px "Space Grotesk", sans-serif';
      ctx.fillText(L(p.title), 28, H - 148);
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '21px "Space Grotesk", sans-serif';
      this.wrap(L(p.desc), 30, H - 114, W * 0.7, 26, 2);
    }
    this.hint(es ? `← → fotos  ↑ ↓ proyecto  △ info${p.link ? '  □ link' : ''}  ○ volver`
                 : `← → photos  ↑ ↓ project  △ info${p.link ? '  □ link' : ''}  ○ back`);
  }

  // proyecto bloqueado: candado, sigilo de fondo y ruido; no muestra de qué se trata
  drawLocked(now, p, c, es) {
    const { ctx, W, H } = this;
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
    drawSigil(ctx, p.seed, W / 2, H / 2, H * 0.48, 0.012); ctx.restore();
    for (let i = 0; i < 260; i++) {                                // estática
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1.5);
    }
    const cx = W / 2, cy = H * 0.4, bob = Math.sin(now * 2) * 3;
    ctx.save(); ctx.translate(cx, cy + bob);
    ctx.shadowColor = c.glow; ctx.shadowBlur = 24;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -22, 34, Math.PI, 0); ctx.lineTo(34, 4); ctx.moveTo(-34, -22); ctx.lineTo(-34, 4); ctx.stroke();
    ctx.fillStyle = c.glow; ctx.beginPath(); ctx.roundRect(-54, 0, 108, 82, 10); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 32, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-4, 34, 8, 26);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = '600 44px "Space Grotesk", sans-serif';
    ctx.fillText(es ? 'Bloqueado' : 'Locked', cx, H * 0.78);
    ctx.fillStyle = c.glow; ctx.font = '26px VT323, monospace';
    ctx.fillText(L(p.desc), cx, H * 0.86);
    this.topbar(`${L(p.title)}  ${p.year}`);
    this.hint(es ? '↑ ↓ proyecto  ○ volver' : '↑ ↓ project  ○ back');
  }

  drawAbout(now) {
    const { ctx, W, H } = this;
    this.bg('#050505', '#2a0a14', now);
    this.topbar(getLang() === 'es' ? 'sobre mí' : 'about me');
    ctx.save(); ctx.shadowColor = '#ff4d6a'; ctx.shadowBlur = 20; ctx.fillStyle = 'rgba(255,255,255,.9)';
    drawSigil(ctx, 88, W * 0.8, H * 0.47, H * 0.34, 0.013); ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = '600 56px "Space Grotesk", sans-serif';
    ctx.fillText('josÚ', 30, 130);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '22px "Space Grotesk", sans-serif';
    this.wrap(t('bio1'), 32, 180, W * 0.58, 30, 7);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    this.wrap(t('bio2'), 32, 410, W * 0.58, 30, 3);
    this.hint(getLang() === 'es' ? '○ volver' : '○ back');
  }

  draw(now) {
    this.now = now;
    if (this.mode === 'gallery') this.drawGallery(now);
    else if (this.mode === 'about') this.drawAbout(now);
    else this.drawXMB(now);

    // glitch al cambiar de vista
    const dt = now - this.fx, { ctx, W, H } = this;
    if (dt < 0.3) {
      const k = 1 - dt / 0.3;
      for (let i = 0; i < 10; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 30, off = (Math.random() - 0.5) * 120 * k;
        ctx.drawImage(this.canvas, 0, y, W, h, off, y, W, h);
      }
      ctx.fillStyle = `rgba(255,255,255,${0.2 * k})`; ctx.fillRect(0, 0, W, H);
    }
  }
}
