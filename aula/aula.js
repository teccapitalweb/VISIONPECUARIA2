// ═══════════════════════════════════════════════════════════════════════════
// VISIÓN PECUARIA · Aula virtual (compras individuales de cursos)
//
// · La identidad la da Firebase Auth (mismas cuentas que Élite Pecuario).
// · Todo el contenido llega del backend (/alumno/*) después de verificar
//   el derecho de acceso. Aquí no hay datos simulados ni URLs de video fijas.
// · El progreso se guarda en el backend; nada depende de localStorage.
// ═══════════════════════════════════════════════════════════════════════════
import * as A from '/aula/firebase-aula.js';

const API = 'https://visionpecuaria-webhook-production.up.railway.app';
const WA = 'https://wa.me/522361049715';
const RANCHO = '/VisionPecuaria/rancho.html';
const PORTADAS = {
  'gallinas-de-postura': '/assets/curso-gallinas-postura/instructor-gomez-800.jpg',
  'embutidos-artesanales': '/assets/curso-chorizo/hero-chef-1024.jpg'
};
const PORTADA_DEFAULT = '/assets/brand/banner.jpg';

// ─── Iconos (trazo fino) ───────────────────────────────────────────────────
const P = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  cursos: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
  clases: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  materiales: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  progreso: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  certificados: '<circle cx="12" cy="9" r="5"/><path d="m8.5 13-1.5 8 5-3 5 3-1.5-8"/>',
  cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  candado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  atras: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  descarga: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  libro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  vivo: '<circle cx="12" cy="12" r="3"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  corona: '<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5z"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
};
const ico = (n) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg></span>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('is-err', !!err);
  t.classList.add('is-on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('is-on'), 3600);
}
$$('[data-ico]').forEach(el => { el.outerHTML = ico(el.dataset.ico); });

// ─── Estado ─────────────────────────────────────────────────────────────────
const S = {
  user: null,
  estado: null,          // { usuario, cursos, elite }
  detalle: {},           // slug → respuesta de /alumno/curso
  cursoActual: null,
  cursoPedido: new URLSearchParams(location.search).get('curso') || null,
  modoAuth: 'entrar'
};

// ─── API ────────────────────────────────────────────────────────────────────
async function api(path, { method = 'GET', body, keepalive = false } = {}, reintento = true) {
  const token = await A.getToken();
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 });
  const r = await fetch(API + path, {
    method,
    keepalive,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await r.json(); } catch (_) {}
  if (r.status === 401 && reintento) { await A.getToken(true); return api(path, { method, body, keepalive }, false); }
  if (!r.ok) throw Object.assign(new Error((data && data.error) || 'Error ' + r.status), { status: r.status, data });
  return data;
}

// ─── Arranque / autenticación ───────────────────────────────────────────────
function mostrar(id) {
  ['boot', 'auth', 'shell'].forEach(x => { $('#' + x).hidden = x !== id; });
}

A.onUser(async (u) => {
  S.user = u;
  if (!u) {
    detenerSeguimiento(true);
    S.estado = null; S.detalle = {};
    prepararAuth();
    mostrar('auth');
    return;
  }
  mostrar('boot');
  await cargarEstado();
  mostrar('shell');
  pintarShell();
  if (S.cursoPedido && !location.hash) {
    const ok = S.estado?.cursos?.some(c => c.slug === S.cursoPedido);
    location.hash = ok ? `#/curso/${S.cursoPedido}` : '#/inicio';
  }
  router();
});

async function cargarEstado() {
  try {
    S.estado = await api('/alumno/estado');
    if (!S.cursoActual || !S.estado.cursos.find(c => c.slug === S.cursoActual)) {
      S.cursoActual = (S.cursoPedido && S.estado.cursos.find(c => c.slug === S.cursoPedido)?.slug) || S.estado.cursos[0]?.slug || null;
    }
  } catch (e) {
    console.error(e);
    S.estado = { usuario: { email: S.user?.email, verificado: S.user?.verificado }, cursos: [], elite: { vigente: false }, error: true };
  }
}

function prepararAuth() {
  const titulo = $('#auth-titulo'), sub = $('#auth-sub'), btn = $('#btn-email'), modo = $('#lnk-modo'), pass = $('#in-pass');
  const crear = S.modoAuth === 'crear';
  titulo.textContent = crear ? 'Crea tu contraseña' : 'Entra a tu curso';
  sub.innerHTML = crear
    ? 'Escribe el <b>mismo correo</b> con el que pagaste. Te enviaremos un enlace para verificarlo.'
    : 'Usa el <b>mismo correo</b> con el que pagaste tu curso.';
  btn.textContent = crear ? 'Crear cuenta' : 'Entrar';
  modo.textContent = crear ? 'Ya tengo cuenta · Entrar' : '¿Primera vez? Crear mi contraseña';
  pass.autocomplete = crear ? 'new-password' : 'current-password';
  const nombres = { 'gallinas-de-postura': 'Gallinas de Postura', 'embutidos-artesanales': 'Embutidos Artesanales' };
  const c = $('#auth-curso');
  if (S.cursoPedido && nombres[S.cursoPedido]) {
    c.innerHTML = `Al entrar te llevaremos a <b>${esc(nombres[S.cursoPedido])}</b>.`;
    c.hidden = false;
  }
}

function msgAuth(texto, ok = false) {
  const m = $('#auth-msg');
  m.textContent = texto;
  m.classList.toggle('is-ok', ok);
  m.hidden = !texto;
}

function errorAuth(e) {
  const c = e && e.code || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if (c === 'auth/invalid-email') return 'Escribe un correo válido.';
  if (c === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
  if (c === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  if (c === 'auth/network-request-failed') return 'Sin conexión. Revisa tu internet.';
  if (c === 'auth/email-already-in-use') return 'No pudimos crear la cuenta. Si ya tienes una, entra o restablece tu contraseña.';
  if (c === 'auth/account-exists-with-different-credential') return 'Ese correo entra con otro método. Prueba con Google o con tu contraseña.';
  return 'No pudimos iniciar sesión. Revisa tus datos o restablece tu contraseña.';
}

$('#btn-google').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  b.disabled = true; msgAuth('');
  try { await A.loginGoogle(); }
  catch (e) { const m = errorAuth(e); if (m) msgAuth(m); }
  finally { b.disabled = false; }
});

$('#form-email').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = $('#in-email').value.trim(), pass = $('#in-pass').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msgAuth('Escribe un correo válido.');
  if (pass.length < 6) return msgAuth('La contraseña debe tener al menos 6 caracteres.');
  const b = $('#btn-email'); b.disabled = true; msgAuth('');
  try {
    if (S.modoAuth === 'crear') await A.registrar(email, pass);
    else await A.loginEmail(email, pass);
  } catch (e) { const m = errorAuth(e); if (m) msgAuth(m); }
  finally { b.disabled = false; }
});

$('#lnk-modo').addEventListener('click', () => { S.modoAuth = S.modoAuth === 'crear' ? 'entrar' : 'crear'; msgAuth(''); prepararAuth(); });
$('#lnk-reset').addEventListener('click', async () => {
  const email = $('#in-email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msgAuth('Escribe tu correo arriba y vuelve a tocar «Olvidé mi contraseña».'); $('#in-email').focus(); return; }
  try { await A.resetPassword(email); } catch (_) { /* respuesta neutra a propósito */ }
  msgAuth('Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam.', true);
});

// ─── Shell ──────────────────────────────────────────────────────────────────
const NAV = [
  { r: 'inicio', t: 'Mi inicio', i: 'inicio' },
  { r: 'cursos', t: 'Mis cursos', i: 'cursos' },
  { r: 'curso', t: 'Mis clases', i: 'clases' },
  { r: 'materiales', t: 'Materiales', i: 'materiales' },
  { r: 'progreso', t: 'Mi progreso', i: 'progreso' },
  { r: 'certificados', t: 'Certificados', i: 'certificados' },
  { r: 'cuenta', t: 'Mi cuenta', i: 'cuenta' }
];
const hrefNav = (n) => n.r === 'curso' ? (S.cursoActual ? `#/curso/${S.cursoActual}` : '#/cursos') : `#/${n.r}`;

function pintarShell() {
  $('#side-nav').innerHTML = NAV.map(n => `<a class="side__item" data-r="${n.r}" href="${hrefNav(n)}">${ico(n.i)}<span>${n.t}</span></a>`).join('');
  const movil = ['inicio', 'cursos', 'curso', 'materiales', 'cuenta'];
  $('#bottom-nav').innerHTML = NAV.filter(n => movil.includes(n.r)).map(n =>
    `<a data-r="${n.r}" href="${hrefNav(n)}">${ico(n.i)}<span>${{ inicio: 'Inicio', cursos: 'Cursos', curso: 'Clases', materiales: 'Materiales', cuenta: 'Cuenta' }[n.r]}</span></a>`).join('');
  const em = S.user?.email || '';
  $('#topbar-user').innerHTML = `<span class="topbar__email">${esc(em)}</span><span class="avatar" aria-hidden="true">${esc((S.user?.nombre || em || '?').trim()[0]?.toUpperCase() || '?')}</span>`;

  const e = S.estado?.elite;
  const el = $('#side-elite');
  if (e && e.vigente) {
    el.innerHTML = `<b>Élite Pecuario</b>Membresía vigente${e.plan ? ' · ' + esc(e.plan) : ''}. Es independiente de tus cursos comprados.<br><a href="${RANCHO}">Ir a Élite Pecuario →</a>`;
    el.hidden = false;
  } else el.hidden = true;

  const v = $('#verif');
  if (S.user && !S.user.verificado) {
    v.innerHTML = `${ico('correo')}<p><b>Verifica tu correo</b> para ver los cursos que pagaste con <b>${esc(em)}</b>. Abre el enlace que te enviamos y luego toca «Ya lo verifiqué».</p>
      <button class="btn btn--sm btn--ghost" id="btn-reenviar">Reenviar enlace</button>
      <button class="btn btn--sm btn--primary" id="btn-ya">Ya lo verifiqué</button>`;
    v.hidden = false;
    $('#btn-reenviar').onclick = async () => { try { await A.enviarVerificacion(); toast('Te enviamos el enlace de verificación'); } catch (_) { toast('Espera un momento antes de pedir otro enlace', true); } };
    $('#btn-ya').onclick = async () => {
      const u = await A.recargarUsuario();
      if (u && u.verificado) { S.user = u; await cargarEstado(); pintarShell(); router(); toast('Correo verificado'); }
      else toast('Aún no aparece verificado. Abre el enlace del correo.', true);
    };
  } else v.hidden = true;
  pintarTema();
}

function marcarNav(r) {
  $$('[data-r]').forEach(a => a.classList.toggle('is-active', a.dataset.r === r || (r === 'clase' && a.dataset.r === 'curso')));
  $$('#side-nav [data-r="curso"], #bottom-nav [data-r="curso"]').forEach(a => { a.href = hrefNav({ r: 'curso' }); });
}

function pintarTema() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#btn-tema').innerHTML = `${ico(dark ? 'sol' : 'luna')}<span>${dark ? 'Modo claro' : 'Modo oscuro'}</span>`;
}
$('#btn-tema').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('vp_aula_tema', t); } catch (_) {}
  pintarTema();
});
$('#btn-salir').addEventListener('click', async () => { await detenerSeguimiento(); await A.logout(); location.hash = ''; });
const menu = (abrir) => { $('#side').classList.toggle('is-open', abrir); $('#scrim').hidden = !abrir; };
$('#btn-menu').addEventListener('click', () => menu(true));
$('#scrim').addEventListener('click', () => menu(false));
$('#side').addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });

// ─── Router ─────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', () => { if (S.user) router(); });

async function router() {
  await detenerSeguimiento();
  const [, r = 'inicio', a, b] = (location.hash || '#/inicio').split('/');
  const view = $('#view');
  marcarNav(r);
  const titulos = { inicio: 'Mi inicio', cursos: 'Mis cursos', curso: 'Mis clases', clase: 'Clase', materiales: 'Materiales', progreso: 'Mi progreso', certificados: 'Certificados', cuenta: 'Mi cuenta' };
  $('#topbar-title').textContent = titulos[r] || 'Mi inicio';
  view.innerHTML = '';
  try {
    if (r === 'cursos') vistaCursos(view);
    else if (r === 'curso') await vistaCurso(view, decodeURIComponent(a || S.cursoActual || ''));
    else if (r === 'clase') await vistaClase(view, decodeURIComponent(a || ''), decodeURIComponent(b || ''));
    else if (r === 'materiales') await vistaMateriales(view);
    else if (r === 'progreso') await vistaProgreso(view);
    else if (r === 'certificados') await vistaCertificados(view);
    else if (r === 'cuenta') vistaCuenta(view);
    else await vistaInicio(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card empty">${ico('libro')}<h3>No pudimos cargar esta sección</h3><p>${esc(e.message || 'Error inesperado')}. Revisa tu conexión e intenta de nuevo.</p><button class="btn btn--primary" onclick="location.reload()">Reintentar</button></div>`;
  }
  view.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

async function detalle(slug, forzar = false) {
  if (!slug) return null;
  if (!S.detalle[slug] || forzar) S.detalle[slug] = await api('/alumno/curso/' + encodeURIComponent(slug));
  S.cursoActual = slug;
  return S.detalle[slug];
}

const portada = (c) => c?.portada || PORTADAS[c?.slug] || PORTADA_DEFAULT;
const imgFallback = (slug) => `onerror="this.onerror=null;this.src='${PORTADAS[slug] || PORTADA_DEFAULT}'"`;
const fecha = (iso) => { try { return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

function sinCursos() {
  const pedido = S.cursoPedido;
  const verif = S.user && !S.user.verificado;
  return `<div class="card empty">${ico('cursos')}
    <h3>${verif ? 'Verifica tu correo para ver tus cursos' : 'No encontramos cursos en esta cuenta'}</h3>
    <p>${verif
      ? 'Por seguridad solo mostramos compras de correos verificados. Usa el enlace que te enviamos.'
      : `Entraste como <b>${esc(S.user?.email)}</b>. Si pagaste con otro correo, cierra sesión y entra con ese. ${pedido ? 'Si acabas de pagar, espera un minuto y recarga.' : ''}`}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn--ghost" id="btn-otra">Entrar con otro correo</button>
      <a class="btn btn--primary" href="${WA}?text=${encodeURIComponent('Hola, pagué un curso de Visión Pecuaria y necesito ayuda para entrar a mi aula')}" target="_blank" rel="noopener">Pedir ayuda por WhatsApp</a>
    </div></div>`;
}
document.addEventListener('click', async (e) => { if (e.target.closest('#btn-otra')) { await A.logout(); } });

// ─── Vistas ─────────────────────────────────────────────────────────────────
async function vistaInicio(v) {
  const cursos = S.estado?.cursos || [];
  const nombre = (S.user?.nombre || '').split(' ')[0];
  let html = `<h1 class="h-page">Hola${nombre ? ', ' + esc(nombre) : ''}</h1><p class="lead">Este es tu resumen de aprendizaje.</p>`;
  if (S.estado?.error) html += `<div class="card empty"><h3>No pudimos conectar con el servidor</h3><p>Tus cursos están seguros. Intenta de nuevo en unos segundos.</p><button class="btn btn--primary" onclick="location.reload()">Reintentar</button></div>`;
  else if (S.cursoPedido && cursos.length && !cursos.some(c => c.slug === S.cursoPedido)) {
    html += `<div class="card empty" style="margin-bottom:20px"><h3>Esta cuenta no tiene ese curso</h3><p>Entraste como <b>${esc(S.user?.email)}</b>. Si lo pagaste con otro correo, entra con ese correo.</p><button class="btn btn--ghost" id="btn-otra">Entrar con otro correo</button></div>`;
  }
  if (!cursos.length) { v.innerHTML = html + (S.estado?.error ? '' : sinCursos()); return; }

  const ult = cursos.find(c => c.progreso?.ultimaClaseId) || cursos[0];
  const totalComp = cursos.reduce((s, c) => s + (c.progreso?.completadas || 0), 0);
  html += `<div class="stats">
    <div class="card stat"><b>${cursos.length}</b><span>${cursos.length === 1 ? 'curso' : 'cursos'}</span></div>
    <div class="card stat"><b>${totalComp}</b><span>clases vistas</span></div>
    <div class="card stat"><b>${Math.round(cursos.reduce((s, c) => s + (c.progreso?.porcentaje || 0), 0) / cursos.length)}%</b><span>avance promedio</span></div>
  </div>`;
  const href = ult.progreso?.ultimaClaseId ? `#/clase/${ult.slug}/${ult.progreso.ultimaClaseId}` : `#/curso/${ult.slug}`;
  html += `<div class="section"><div class="card continue">
    <div class="continue__media"><img src="${esc(portada(ult))}" alt="" ${imgFallback(ult.slug)}></div>
    <div class="continue__body">
      <small>${ult.progreso?.ultimaClaseId ? 'Continúa donde te quedaste' : 'Empieza tu curso'}</small>
      <h2>${esc(ult.nombre)}</h2>
      <p>${ult.progreso?.completadas || 0} de ${ult.progreso?.total || 0} clases vistas</p>
      <div class="bar"><i style="width:${ult.progreso?.porcentaje || 0}%"></i></div>
      <div><a class="btn btn--primary" href="${href}">${ico('play')} ${ult.progreso?.ultimaClaseId ? 'Continuar' : 'Empezar'}</a></div>
    </div></div></div>`;
  html += `<div class="section"><div class="section__head"><h2>Mis cursos</h2><a class="link" href="#/cursos">Ver todos</a></div><div class="grid cursos">${cursos.map(tarjetaCurso).join('')}</div></div>`;
  v.innerHTML = html;
}

function tarjetaCurso(c) {
  const p = c.progreso || {};
  return `<a class="card curso-card" href="#/curso/${esc(c.slug)}">
    <div class="curso-card__cover"><img src="${esc(portada(c))}" alt="" loading="lazy" ${imgFallback(c.slug)}><span class="chip">Curso adquirido</span></div>
    <div class="curso-card__body">
      <h3>${esc(c.nombre)}</h3>
      ${c.instructorNombre ? `<div class="curso-card__meta">${esc(c.instructorNombre)}</div>` : ''}
      <div class="bar"><i style="width:${p.porcentaje || 0}%"></i></div>
      <div class="curso-card__foot"><span>${p.completadas || 0}/${p.total || 0} clases · ${p.porcentaje || 0}%</span><span class="link">${p.completadas ? 'Continuar' : 'Empezar'}</span></div>
    </div></a>`;
}

function vistaCursos(v) {
  const cursos = S.estado?.cursos || [];
  const e = S.estado?.elite;
  let html = `<h1 class="h-page">Mis cursos</h1><p class="lead">Cursos que adquiriste de forma individual. Cada uno tiene su propio progreso, materiales y certificado.</p>`;
  html += cursos.length ? `<div class="grid cursos">${cursos.map(tarjetaCurso).join('')}</div>` : sinCursos();
  html += `<div class="section"><div class="section__head"><h2>Otros accesos</h2></div>
    <div class="card cert"><div class="cert__top"><div><h3>Membresía Élite Pecuario</h3>
    <p>${e?.vigente ? `Vigente${e.plan ? ' · ' + esc(e.plan) : ''}${e.vence ? ' · hasta ' + esc(e.vence) : ''}. Da acceso al catálogo del club; tus cursos comprados se conservan aunque la membresía termine.` : 'Esta cuenta no tiene una membresía vigente. Tus cursos comprados no dependen de ella.'}</p></div>
    <span class="chip ${e?.vigente ? 'chip--gold' : ''}">${ico('corona')} ${e?.vigente ? 'Vigente' : 'Sin membresía'}</span></div>
    ${e?.vigente ? `<div><a class="btn btn--gold btn--sm" href="${RANCHO}">Ir a Élite Pecuario</a></div>` : ''}</div></div>`;
  v.innerHTML = html;
}

function selectorCurso(slugActual, destino) {
  const cursos = S.estado?.cursos || [];
  if (cursos.length < 2) return '';
  return `<div class="curso-switch" role="tablist">${cursos.map(c =>
    `<button role="tab" class="${c.slug === slugActual ? 'is-active' : ''}" data-ir="${destino}${esc(c.slug)}">${esc(c.nombre)}</button>`).join('')}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if (b) location.hash = b.dataset.ir; });

async function vistaCurso(v, slug) {
  if (!slug) { v.innerHTML = sinCursos(); return; }
  if (!(S.estado?.cursos || []).some(c => c.slug === slug)) { v.innerHTML = sinCursos(); return; }
  v.innerHTML = `<div class="empty"><div class="spinner spinner--dark" style="margin:0 auto"></div></div>`;
  const d = await detalle(slug);
  const c = d.curso, p = d.progreso;
  const continuarId = p.ultimaClaseId || d.clases.find(x => x.estado === 'publicada')?.id;
  let html = selectorCurso(slug, '#/curso/');
  html += `<section class="curso-hero"><img src="${esc(portada(c))}" alt="" ${imgFallback(slug)}>
    <div class="curso-hero__body"><div>
      <span class="chip chip--gold">${ico('libro')} Curso adquirido</span>
      <h1 style="margin-top:10px">${esc(c.nombre)}</h1>
      <p>${c.instructorNombre ? esc(c.instructorNombre) + ' · ' : ''}${d.clases.length} ${d.clases.length === 1 ? 'clase' : 'clases'}${d.acceso?.fechaCompra ? ' · adquirido el ' + esc(fecha(d.acceso.fechaCompra)) : ''}</p>
      ${continuarId ? `<a class="btn btn--gold" style="margin-top:16px" href="#/clase/${esc(slug)}/${esc(continuarId)}">${ico('play')} ${p.ultimaClaseId ? 'Continuar' : 'Empezar'}</a>` : ''}
    </div>
    <div class="ring" style="--p:${p.porcentaje}"><div>${p.porcentaje}%<small>${p.completadas}/${p.total}</small></div></div></div></section>`;

  if (c.claseEnVivo) {
    html += `<div class="section"><div class="card vivo"><div><b>${ico('vivo')} Sesión en vivo</b><p style="color:var(--ink-soft);font-size:.88rem;margin-top:4px">${c.claseEnVivo.fecha ? esc(c.claseEnVivo.fecha) : 'Enlace de la sesión en vivo de tu curso'}</p></div>
      <a class="btn btn--primary btn--sm" href="${esc(c.claseEnVivo.url)}" target="_blank" rel="noopener">Entrar a la sesión</a></div></div>`;
  }

  if (!d.clases.length) {
    html += `<div class="section card empty">${ico('clases')}<h3>Las grabaciones aún no están publicadas</h3><p>Aparecerán aquí en cuanto se publiquen. Tu acceso ya está activo.</p></div>`;
  } else {
    html += `<div class="section"><div class="section__head"><h2>Clases</h2><span class="chip">${d.clases.filter(x => x.estado === 'publicada').length} publicadas</span></div>`;
    let modulo = null;
    const grupos = [];
    d.clases.forEach((cl, i) => {
      if (cl.modulo !== modulo || !grupos.length) { grupos.push({ modulo: cl.modulo, items: [] }); modulo = cl.modulo; }
      grupos[grupos.length - 1].items.push({ cl, i });
    });
    grupos.forEach(g => {
      if (g.modulo) html += `<h3 class="modulo-titulo">${esc(g.modulo)}</h3>`;
      html += `<div class="grid clases">${g.items.map(({ cl, i }) => tarjetaClase(slug, cl, i, p, c)).join('')}</div>`;
    });
    html += `</div>`;
  }

  const mats = d.materiales.filter(m => m.disponible);
  if (mats.length) html += `<div class="section"><div class="section__head"><h2>Materiales del curso</h2><a class="link" href="#/materiales">Ver todos</a></div><div class="grid mats">${mats.map(m => tarjetaMaterial(slug, m)).join('')}</div></div>`;
  v.innerHTML = html;
}

function tarjetaClase(slug, cl, i, p, curso) {
  const pc = p.clases?.[cl.id] || {};
  const vista = pc.completada;
  const pub = cl.estado === 'publicada';
  const pct = cl.duracionMin && pc.segundos ? Math.min(100, Math.round(pc.segundos / (cl.duracionMin * 60) * 100)) : 0;
  const img = cl.miniatura || portada(curso);
  return `<button class="clase" type="button" ${pub ? `data-ir="#/clase/${esc(slug)}/${esc(cl.id)}"` : 'disabled'} aria-label="${esc(cl.titulo)}${pub ? '' : ' (pendiente de publicación)'}">
    <img src="${esc(img)}" alt="" loading="lazy" ${imgFallback(slug)}>
    <div class="clase__body">
      <div class="clase__tags">
        <span class="chip">Clase ${i + 1}</span>
        ${cl.duracionMin ? `<span class="chip">${ico('reloj')} ${cl.duracionMin} min</span>` : ''}
        ${vista ? `<span class="chip chip--vista">${ico('check')} Vista</span>` : ''}
        ${!pub ? `<span class="chip chip--pend">Grabación pendiente</span>` : ''}
      </div>
      <h3>${esc(cl.titulo)}</h3>
    </div>
    ${pub ? `<span class="clase__play"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></span>` : `<span class="clase__lock">${ico('candado')}</span>`}
    ${pct && !vista ? `<span class="clase__barra"><i style="width:${pct}%"></i></span>` : ''}
  </button>`;
}

function tarjetaMaterial(slug, m) {
  const x = m.tipo === 'xlsx' || m.tipo === 'excel';
  return `<button class="card mat" type="button" data-mat="${esc(slug)}|${esc(m.id)}" ${m.disponible ? '' : 'disabled'}>
    ${m.miniatura ? `<img class="mat__cover" src="${esc(m.miniatura)}" alt="" loading="lazy">` : `<span class="mat__ico ${x ? 'mat__ico--xlsx' : ''}">${ico('materiales')}</span>`}
    <span><b>${esc(m.titulo)}</b><small>${esc(m.descripcion || (x ? 'Excel' : 'PDF'))}</small></span>
    <span class="mat__go">${ico('descarga')}</span></button>`;
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-mat]');
  if (!b) return;
  const [slug, id] = b.dataset.mat.split('|');
  const w = window.open('', '_blank');   // abrir en el gesto del usuario (evita bloqueo de popups)
  try {
    const r = await api(`/alumno/curso/${encodeURIComponent(slug)}/material`, { method: 'POST', body: { materialId: id } });
    if (w) { w.opener = null; w.location.href = r.url; } else location.href = r.url;
  } catch (err) {
    if (w) w.close();
    toast(err.message || 'No pudimos abrir el material', true);
  }
});

// ─── Reproductor ────────────────────────────────────────────────────────────
let SEG = null; // seguimiento de la clase abierta

async function vistaClase(v, slug, claseId) {
  if (!(S.estado?.cursos || []).some(c => c.slug === slug)) { v.innerHTML = sinCursos(); return; }
  const d = await detalle(slug);
  const idx = d.clases.findIndex(c => c.id === claseId);
  const cl = d.clases[idx];
  if (!cl) { location.hash = `#/curso/${slug}`; return; }
  $('#topbar-title').textContent = d.curso.nombre;
  const pubs = d.clases.filter(c => c.estado === 'publicada');
  const posPub = pubs.findIndex(c => c.id === cl.id);
  const prev = pubs[posPub - 1], next = pubs[posPub + 1];
  const pc = d.progreso.clases?.[cl.id] || {};
  const mats = d.materiales.filter(m => m.disponible && (m.claseId === cl.id || cl.materialesIds.includes(m.id)));

  v.innerHTML = `<a class="link" href="#/curso/${esc(slug)}" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:14px">${ico('atras')} Volver al curso</a>
  <div class="player-layout">
    <div>
      <div class="player" id="player"><div class="player__estado"><div class="spinner"></div><span>Cargando la clase…</span></div></div>
      <div class="leccion-head"><div>
        <small>${cl.modulo ? esc(cl.modulo) + ' · ' : ''}Clase ${idx + 1} de ${d.clases.length}</small>
        <h1>${esc(cl.titulo)}</h1></div>
        <span class="chip ${pc.completada ? 'chip--ok' : ''}" id="chip-vista">${pc.completada ? ico('check') + ' Vista' : (cl.duracionMin ? ico('reloj') + ' ' + cl.duracionMin + ' min' : 'En curso')}</span>
      </div>
      <div class="leccion-nav">
        ${prev ? `<a class="btn btn--ghost" href="#/clase/${esc(slug)}/${esc(prev.id)}">${ico('atras')} Anterior</a>` : ''}
        <button class="btn ${pc.completada ? 'btn--ghost' : 'btn--gold'}" id="btn-vista" ${pc.completada ? 'disabled' : ''}>${ico('check')} ${pc.completada ? 'Clase vista' : 'Marcar como vista'}</button>
        ${next ? `<a class="btn btn--primary" href="#/clase/${esc(slug)}/${esc(next.id)}">Siguiente ${ico('flecha')}</a>` : ''}
      </div>
      ${cl.descripcion ? `<p class="leccion-desc">${esc(cl.descripcion)}</p>` : ''}
      ${mats.length ? `<div class="section"><div class="section__head"><h2>Materiales de esta clase</h2></div><div class="grid mats">${mats.map(m => tarjetaMaterial(slug, m)).join('')}</div></div>` : ''}
    </div>
    <aside class="card lista" aria-label="Clases del curso">
      <h3>${esc(d.curso.nombre)}</h3><p>${d.progreso.completadas} de ${d.progreso.total} clases vistas</p>
      ${d.clases.map((x, i) => {
        const vx = d.progreso.clases?.[x.id]?.completada;
        const pub = x.estado === 'publicada';
        return `<button class="lista__item ${x.id === cl.id ? 'is-active' : ''} ${vx ? 'is-vista' : ''}" ${pub ? `data-ir="#/clase/${esc(slug)}/${esc(x.id)}"` : 'disabled'}>
          <span class="lista__n">${vx ? ico('check') : i + 1}</span>
          <span>${esc(x.titulo)}<small>${pub ? (x.duracionMin ? x.duracionMin + ' min' : 'Grabación') : 'Grabación pendiente de publicación'}</small></span></button>`;
      }).join('')}
    </aside>
  </div>`;

  $('#btn-vista').onclick = () => guardarProgreso({ completada: true }, true);

  SEG = { slug, clase: cl, base: Number(pc.segundos) || 0, sesion: 0, completada: !!pc.completada, posicion: Number(pc.posicion) || 0, enviado: 0, timer: null, video: null };
  try {
    const src = await api(`/alumno/curso/${encodeURIComponent(slug)}/video`, { method: 'POST', body: { claseId: cl.id } });
    const pl = $('#player');
    if (!pl || !SEG || SEG.clase.id !== cl.id) return;
    if (src.tipo === 'video') {
      const vid = document.createElement('video');
      vid.controls = true; vid.playsInline = true; vid.preload = 'metadata';
      vid.setAttribute('controlsList', 'nodownload');
      vid.addEventListener('contextmenu', e => e.preventDefault());
      vid.src = src.url;
      vid.addEventListener('loadedmetadata', () => { if (SEG && SEG.posicion > 5 && SEG.posicion < vid.duration - 10) vid.currentTime = SEG.posicion; });
      vid.addEventListener('ended', () => guardarProgreso({ completada: true }, true));
      pl.innerHTML = ''; pl.appendChild(vid);
      SEG.video = vid;
    } else {
      pl.innerHTML = `<iframe src="${esc(src.url)}" title="${esc(cl.titulo)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    }
    iniciarSeguimiento();
  } catch (e) {
    const pl = $('#player');
    if (pl) pl.innerHTML = `<div class="player__estado">${ico('candado')}<b>${esc(e.message || 'No pudimos abrir el video')}</b><button class="btn btn--gold btn--sm" onclick="location.reload()">Reintentar</button></div>`;
  }
}

function iniciarSeguimiento() {
  if (!SEG) return;
  SEG.timer = setInterval(() => {
    if (!SEG || document.hidden) return;
    const reproduciendo = SEG.video ? !SEG.video.paused : true;
    if (!reproduciendo) return;
    SEG.sesion += 1;
    if (SEG.video) SEG.posicion = Math.floor(SEG.video.currentTime || 0);
    const meta = SEG.clase.duracionMin ? SEG.clase.duracionMin * 60 * 0.8 : null;
    if (!SEG.completada && meta && !SEG.video && SEG.base + SEG.sesion >= meta) guardarProgreso({ completada: true });
    if (SEG.sesion - SEG.enviado >= 20) guardarProgreso({});
  }, 1000);
}

async function guardarProgreso({ completada = false }, avisar = false) {
  if (!SEG) return;
  const s = SEG;
  s.enviado = s.sesion;
  if (completada) s.completada = true;
  const body = { claseId: s.clase.id, segundos: s.base + s.sesion, completada: s.completada, posicion: s.posicion, clientTs: Date.now() };
  try {
    const r = await api(`/alumno/curso/${encodeURIComponent(s.slug)}/progreso`, { method: 'POST', body, keepalive: true });
    const d = S.detalle[s.slug];
    if (d && r.progreso) {
      d.progreso = r.progreso;
      const c = S.estado?.cursos?.find(x => x.slug === s.slug);
      if (c) c.progreso = { completadas: r.progreso.completadas, total: r.progreso.total, porcentaje: r.progreso.porcentaje, ultimaClaseId: r.progreso.ultimaClaseId };
    }
    if (completada && SEG === s) {
      const b = $('#btn-vista'); if (b) { b.disabled = true; b.className = 'btn btn--ghost'; b.innerHTML = ico('check') + ' Clase vista'; }
      const ch = $('#chip-vista'); if (ch) { ch.className = 'chip chip--ok'; ch.innerHTML = ico('check') + ' Vista'; }
      if (avisar) toast('Clase marcada como vista');
    }
  } catch (e) {
    if (avisar) toast('No pudimos guardar tu progreso. Revisa tu conexión.', true);
  }
}

async function detenerSeguimiento(sinGuardar = false) {
  if (!SEG) return;
  clearInterval(SEG.timer);
  if (!sinGuardar && SEG.sesion > SEG.enviado) await guardarProgreso({});
  if (SEG.video) { try { SEG.video.pause(); } catch (_) {} }
  SEG = null;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && SEG && SEG.sesion > SEG.enviado) guardarProgreso({}); });
window.addEventListener('pagehide', () => { if (SEG && SEG.sesion > SEG.enviado) guardarProgreso({}); });

// ─── Materiales / progreso / certificados / cuenta ─────────────────────────
async function todosLosDetalles() {
  const cursos = S.estado?.cursos || [];
  const ds = await Promise.all(cursos.map(c => detalle(c.slug).catch(() => null)));
  return cursos.map((c, i) => ({ c, d: ds[i] })).filter(x => x.d);
}

async function vistaMateriales(v) {
  if (!(S.estado?.cursos || []).length) { v.innerHTML = `<h1 class="h-page">Materiales</h1>` + sinCursos(); return; }
  const lista = await todosLosDetalles();
  let html = `<h1 class="h-page">Materiales</h1><p class="lead">Guías y archivos de tus cursos. Se abren solo desde tu cuenta.</p>`;
  lista.forEach(({ c, d }) => {
    const mats = d.materiales;
    html += `<div class="section"><div class="section__head"><h2>${esc(c.nombre)}</h2></div>${mats.length
      ? `<div class="grid mats">${mats.map(m => tarjetaMaterial(c.slug, m)).join('')}</div>`
      : `<div class="card empty"><p>Este curso aún no tiene materiales publicados en el aula.</p></div>`}</div>`;
  });
  v.innerHTML = html;
}

async function vistaProgreso(v) {
  if (!(S.estado?.cursos || []).length) { v.innerHTML = `<h1 class="h-page">Mi progreso</h1>` + sinCursos(); return; }
  const lista = await todosLosDetalles();
  let html = `<h1 class="h-page">Mi progreso</h1><p class="lead">Tu avance se guarda en tu cuenta y lo ves igual en cualquier dispositivo.</p><div class="grid">`;
  lista.forEach(({ c, d }) => {
    const p = d.progreso;
    const ult = d.clases.find(x => x.id === p.ultimaClaseId);
    const vistas = d.clases.filter(x => p.clases?.[x.id]?.completada);
    html += `<div class="card prog"><div class="ring" style="--p:${p.porcentaje}"><div>${p.porcentaje}%<small>${p.completadas}/${p.total}</small></div></div>
      <div><h3>${esc(c.nombre)}</h3>
      <p style="color:var(--ink-soft);font-size:.86rem;margin-top:4px">${ult ? 'Última clase vista: <b>' + esc(ult.titulo) + '</b>' : 'Aún no empiezas este curso'}</p>
      ${vistas.length ? `<ul>${vistas.map(x => `<li>${ico('check')} ${esc(x.titulo)}</li>`).join('')}</ul>` : ''}
      <div style="margin-top:12px"><a class="btn btn--primary btn--sm" href="${ult ? `#/clase/${esc(c.slug)}/${esc(ult.id)}` : `#/curso/${esc(c.slug)}`}">${ult ? 'Continuar' : 'Empezar'}</a></div></div></div>`;
  });
  v.innerHTML = html + '</div>';
}

async function vistaCertificados(v) {
  if (!(S.estado?.cursos || []).length) { v.innerHTML = `<h1 class="h-page">Certificados</h1>` + sinCursos(); return; }
  const lista = await todosLosDetalles();
  let html = `<h1 class="h-page">Certificados</h1><p class="lead">Cada curso tiene su propio certificado con folio y QR verificable.</p><div class="grid mats">`;
  lista.forEach(({ c, d }) => {
    const ce = d.certificado || { estado: 'pendiente' };
    const emit = ce.estado === 'emitido';
    html += `<div class="card cert"><div class="cert__top"><h3>${esc(c.nombre)}</h3>
      <span class="chip ${emit ? 'chip--ok' : 'chip--pend'}">${emit ? 'Emitido' : 'Pendiente'}</span></div>
      <p>${emit ? `Folio <b>${esc(ce.folio || '')}</b>. Puedes verlo, descargarlo y compartir su verificación pública.` : 'Tu certificado aún no se emite. Se genera conforme a las condiciones de tu curso y te llegará por correo.'}</p>
      ${emit && ce.url ? `<div><a class="btn btn--primary btn--sm" href="${esc(ce.url)}" target="_blank" rel="noopener">Ver certificado</a></div>` : ''}</div>`;
  });
  v.innerHTML = html + '</div>';
}

function vistaCuenta(v) {
  const u = S.user || {};
  const prov = (u.proveedores || []).map(p => p === 'google.com' ? 'Google' : p === 'password' ? 'Correo y contraseña' : p).join(', ') || '—';
  v.innerHTML = `<h1 class="h-page">Mi cuenta</h1><p class="lead">Tus cursos están ligados a tu correo verificado.</p>
  <div class="card cuenta"><dl>
    <dt>Correo</dt><dd>${esc(u.email || '—')}</dd>
    <dt>Verificación</dt><dd>${u.verificado ? '<span class="chip chip--ok">' + ico('check') + ' Verificado</span>' : '<span class="chip chip--pend">Pendiente</span>'}</dd>
    <dt>Forma de entrar</dt><dd>${esc(prov)}</dd>
    <dt>Cursos</dt><dd>${(S.estado?.cursos || []).length}</dd>
  </dl>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    ${(u.proveedores || []).includes('password') ? '<button class="btn btn--ghost btn--sm" id="btn-cambiar">Cambiar contraseña</button>' : ''}
    <button class="btn btn--ghost btn--sm" id="btn-salir2">${ico('salir')} Cerrar sesión</button>
  </div></div>
  <div class="section card cuenta"><h3>¿No ves un curso que pagaste?</h3>
    <p style="color:var(--ink-soft);font-size:.9rem;line-height:1.55">Entra con el mismo correo que usaste al pagar. Si ya no tienes acceso a ese correo o pagaste con otro, escríbenos con tu comprobante y lo vinculamos a esta cuenta.</p>
    <div><a class="btn btn--primary btn--sm" href="${WA}?text=${encodeURIComponent('Hola, necesito vincular mi compra de un curso de Visión Pecuaria a mi cuenta del aula')}" target="_blank" rel="noopener">Escribir por WhatsApp</a></div></div>`;
  const c = $('#btn-cambiar');
  if (c) c.onclick = async () => { try { await A.resetPassword(u.email); } catch (_) {} toast('Te enviamos un enlace para cambiar tu contraseña'); };
  $('#btn-salir2').onclick = () => $('#btn-salir').click();
}
