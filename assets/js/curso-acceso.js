// ═══════════════════════════════════════════════════════════════════════════
// VISIÓN PECUARIA · Página de acceso al curso (post-pago)
//
// Flujo:
//   1. onAuthStateChanged: si no hay usuario → mostrar acceso-denegado
//   2. Si hay usuario: leer accesosCurso/{uid}/cursos/{slug}
//      - si !exists o !activo → acceso-denegado
//      - si activo → cargar curso desde cursosVenta/{slug} y renderizar todo
//   3. Video player: modal con signed URL de Firebase Storage (Fase 3.2)
//   4. Reenvío de certificado: llama a /reenviar-certificado del webhook
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, onSnapshot,
  collection, query, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// ─── CONFIG (idéntica al resto del sistema) ──────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDQXkIo-BWPIeLZzHeTMN986WMDn0TrTJU",
  authDomain: "visionpecuaria-vip.firebaseapp.com",
  projectId: "visionpecuaria-vip",
  storageBucket: "visionpecuaria-vip.firebasestorage.app",
  messagingSenderId: "978318807782",
  appId: "1:978318807782:web:626e67bb30795c15b02127"
};

const WEBHOOK_URL = "https://visionpecuaria-webhook-production.up.railway.app";
const SLUG = document.body.dataset.slug || 'embutidos-artesanales';

// ─── INIT FIREBASE (defensivo) ───────────────────────────────────────────────
let app, auth, db, storage;
try {
  app     = initializeApp(firebaseConfig);
  auth    = getAuth(app);
  db      = getFirestore(app);
  storage = getStorage(app);
  setPersistence(auth, browserLocalPersistence).catch(e => console.warn('setPersistence:', e));
} catch (err) {
  console.error('Firebase init falló:', err);
}

// Estado
let currentUser = null;
let cursoData   = null;
let accesoData  = null;
let certificadoData = null;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function toast(msg, kind = '') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (kind ? ` toast--${kind}` : '');
  t.setAttribute('data-visible', '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.removeAttribute('data-visible'), 3600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showState(state) {
  // state: 'loading' | 'denegado' | 'ok'
  $('#acceso-loading').hidden = state !== 'loading';
  $('#acceso-denegado').hidden = state !== 'denegado';
  $('#acceso-main').hidden = state !== 'ok';
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) {
      // No autenticado → mostrar pantalla con botón login
      const hi = $('[data-user-hi]');
      if (hi) hi.textContent = '';
      mostrarAccesoDenegado({
        titulo: 'Inicia sesión para ver tu curso',
        msg: 'Necesitamos verificar que la cuenta con la que iniciaste sesión coincide con la que usaste al pagar.'
      });
      return;
    }
    // Autenticado → saludo
    const nombreCorto = (user.displayName || user.email || 'Alumno').split(' ')[0];
    const hi = $('[data-user-hi]');
    if (hi) hi.textContent = 'Hola, ' + nombreCorto;
    // Verificar acceso al curso
    await verificarAcceso();
  });
}

async function loginGoogle() {
  const btn = $('#btn-signin-acceso');
  if (btn) { btn.disabled = true; btn.textContent = 'Conectando...'; }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
    // onAuthStateChanged se dispara solo
  } catch (err) {
    console.error(err);
    toast('No pudimos iniciar sesión', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Iniciar sesión con Google'; }
  }
}

async function logout() {
  try {
    await signOut(auth);
    location.href = '/';
  } catch (err) {
    console.error(err);
  }
}

// ─── VERIFICAR ACCESO ─────────────────────────────────────────────────────────
async function verificarAcceso() {
  if (!db || !currentUser) return;
  showState('loading');
  try {
    // 1) Leer accesosCurso/{uid}/cursos/{slug}
    const accesoRef = doc(db, 'accesosCurso', currentUser.uid, 'cursos', SLUG);
    const accesoSnap = await getDoc(accesoRef);

    if (!accesoSnap.exists() || accesoSnap.data().activo !== true) {
      mostrarAccesoDenegado({
        titulo: 'Aún no tienes acceso a este curso',
        msg: 'Si acabas de pagar, espera unos segundos y refresca. Si iniciaste sesión con otra cuenta, entra con la cuenta que usaste al inscribirte.'
      });
      return;
    }
    accesoData = accesoSnap.data();

    // 2) Leer datos del curso
    const cursoRef = doc(db, 'cursosVenta', SLUG);
    const cursoSnap = await getDoc(cursoRef);
    if (!cursoSnap.exists()) {
      mostrarAccesoDenegado({
        titulo: 'Curso no encontrado',
        msg: 'El curso no está disponible en este momento. Escríbenos por WhatsApp para resolverlo.'
      });
      return;
    }
    cursoData = cursoSnap.data();

    // 3) Todo bien → renderizar
    showState('ok');
    renderContenido();
    // Cargar certificado en paralelo
    cargarCertificado();

  } catch (err) {
    console.error('verificarAcceso error:', err);
    mostrarAccesoDenegado({
      titulo: 'Algo salió mal',
      msg: 'No pudimos verificar tu acceso. Refresca la página o escríbenos por WhatsApp.'
    });
  }
}

function mostrarAccesoDenegado({ titulo, msg }) {
  const t = $('[data-denegado-title]');
  const m = $('[data-denegado-msg]');
  if (t) t.textContent = titulo;
  if (m) m.textContent = msg;
  showState('denegado');
}

// ─── RENDER: contenido principal ─────────────────────────────────────────────
function renderContenido() {
  // Título del curso en el hero
  const t = $('[data-curso-titulo]');
  if (t) t.textContent = cursoData.nombre || 'Tu curso';

  // Meta del hero: duración
  const dur = $('[data-curso-duracion]');
  if (dur) dur.textContent = cursoData.duracionHoras ? cursoData.duracionHoras + ' horas de contenido' : 'Contenido on-demand';

  // Meta del hero: instructor
  const ins = $('[data-curso-instructor]');
  if (ins) ins.textContent = cursoData.instructorNombre || 'Instructor certificado';

  renderClases();
  renderRecursos();
}

// ─── RENDER: clases ──────────────────────────────────────────────────────────
function renderClases() {
  const grid = $('#clases-grid');
  const clases = Array.isArray(cursoData.clases) ? cursoData.clases : [];
  const poster = cursoData.posterPath || '/assets/curso-chorizo/hero-chef-640.jpg';
  const infoEl = $('[data-clases-info]');

  if (clases.length === 0) {
    grid.innerHTML = `
      <div class="empty-block">
        <div class="empty-block__ico">🎬</div>
        <div class="empty-block__title">Videoclases próximamente</div>
        <div class="empty-block__desc">El contenido se habilita el día del arranque. Te avisaremos por WhatsApp y correo cuando esté listo.</div>
      </div>
    `;
    if (infoEl) infoEl.textContent = 'Los videos se habilitarán en la fecha de arranque del curso.';
    return;
  }

  if (infoEl) infoEl.textContent = `${clases.length} clase${clases.length === 1 ? '' : 's'} · Reproduce cuando quieras, en el orden que prefieras.`;

  grid.innerHTML = clases.map((c, i) => {
    const disponible = !!c.storagePath;
    const orden = c.orden || (i + 1);
    return `
      <button class="clase-card"
              data-clase-index="${i}"
              ${disponible ? '' : 'disabled'}
              type="button">
        <div class="clase-card__thumb">
          <img class="clase-card__thumb-poster" src="${escapeHtml(c.posterPath || poster)}" alt="" loading="lazy">
          <div class="clase-card__num">${orden}</div>
          ${disponible ? `
            <div class="clase-card__play">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          ` : `
            <div class="clase-card__locked">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Próximamente
            </div>
          `}
        </div>
        <div class="clase-card__body">
          <div class="clase-card__title">${escapeHtml(c.titulo || 'Clase ' + orden)}</div>
          <div class="clase-card__meta">
            ${c.duracionMin ? `<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${c.duracionMin} min</span>` : ''}
          </div>
        </div>
      </button>
    `;
  }).join('');

  // Wire up clicks
  $$('.clase-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.claseIndex);
      const clase = clases[idx];
      if (!clase || !clase.storagePath) return;
      abrirVideo(clase);
    });
  });
}

// ─── RENDER: recursos descargables ───────────────────────────────────────────
function renderRecursos() {
  const grid = $('#recursos-grid');
  const recursos = Array.isArray(cursoData.recursosDescargables) ? cursoData.recursosDescargables : [];

  if (recursos.length === 0) {
    grid.innerHTML = `
      <div class="empty-block">
        <div class="empty-block__ico">📎</div>
        <div class="empty-block__title">Sin materiales por ahora</div>
        <div class="empty-block__desc">Cuando el instructor suba el recetario y las herramientas, aparecerán aquí para descargar.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = recursos.map(r => {
    const tipo = (r.tipo || '').toLowerCase();
    const ico = tipo === 'pdf' ? 'pdf' : (tipo === 'xlsx' || tipo === 'excel') ? 'xlsx' : 'pdf';
    const iconSvg = tipo === 'xlsx' || tipo === 'excel'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

    return `
      <a href="${escapeHtml(r.url)}" class="recurso-card" target="_blank" rel="noopener" download>
        <div class="recurso-card__ico recurso-card__ico--${ico}">${iconSvg}</div>
        <div class="recurso-card__body">
          <div class="recurso-card__title">${escapeHtml(r.titulo || 'Descargar')}</div>
          <div class="recurso-card__desc">${escapeHtml(r.descripcion || (tipo === 'xlsx' ? 'Archivo Excel · Calculadora' : 'Archivo PDF descargable'))}</div>
        </div>
        <div class="recurso-card__arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </a>
    `;
  }).join('');
}

// ─── CARGAR CERTIFICADO ──────────────────────────────────────────────────────
async function cargarCertificado() {
  if (!db || !currentUser) return;
  const estado = $('[data-cert-estado]');
  const folio  = $('[data-cert-folio]');
  const btnVer = $('#btn-ver-certificado');

  try {
    // Buscar por email + cursoSlug
    const email = (currentUser.email || '').toLowerCase();
    const q = query(
      collection(db, 'certificados'),
      where('email', '==', email),
      where('cursoSlug', '==', SLUG),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      // Puede que aún no se haya emitido (segundos después del pago)
      // Reintentar en 5s
      if (estado) estado.textContent = 'Generando tu certificado...';
      setTimeout(cargarCertificado, 5000);
      return;
    }
    certificadoData = snap.docs[0].data();
    if (estado) estado.textContent = '¡Tu certificado ya está listo!';
    if (folio)  folio.textContent  = 'Folio: ' + certificadoData.folio;
    if (btnVer) {
      btnVer.href = `/ver-certificado.html?folio=${encodeURIComponent(certificadoData.folio)}`;
      btnVer.hidden = false;
    }
  } catch (err) {
    console.warn('cargarCertificado:', err);
    if (estado) estado.textContent = 'No pudimos cargar tu certificado. Refresca la página.';
  }
}

// ─── VIDEO PLAYER MODAL ──────────────────────────────────────────────────────
async function abrirVideo(clase) {
  const modal = $('#modal-video');
  const wrap  = $('.video-player-wrap');
  const titulo = $('[data-video-titulo]');
  const info = $('[data-video-info]');

  if (titulo) titulo.textContent = clase.titulo || 'Clase';
  if (info) info.innerHTML = `
    <b style="font-family:var(--font-display);font-weight:800;color:var(--text);display:block;margin-bottom:4px;">${escapeHtml(clase.titulo || '')}</b>
    ${clase.descripcion ? `<div>${escapeHtml(clase.descripcion)}</div>` : ''}
    ${clase.duracionMin ? `<div style="margin-top:4px;font-size:.78rem;color:var(--muted);">Duración: ${clase.duracionMin} min</div>` : ''}
  `;

  // Limpiar contenido previo del reproductor
  if (wrap) wrap.innerHTML = '';

  document.body.style.overflow = 'hidden';
  modal.setAttribute('data-open', '');

  try {
    if (clase.videoTipo === 'drive' && clase.embedUrl) {
      // Reproductor de Drive vía iframe
      wrap.innerHTML = `<iframe src="${escapeHtml(clase.embedUrl)}" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:0;background:#000;"></iframe>`;
    } else if (clase.storagePath) {
      // Firebase Storage
      const video = document.createElement('video');
      video.id = 'clase-video';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      wrap.appendChild(video);
      const storageRef = ref(storage, clase.storagePath);
      const url = await getDownloadURL(storageRef);
      video.src = url;
      video.play().catch(() => {});
    } else {
      throw new Error('Sin fuente de video');
    }
  } catch (err) {
    console.error('Error cargando video:', err);
    toast('No pudimos cargar el video. Intenta de nuevo.', 'error');
    cerrarVideo();
  }
}

function cerrarVideo() {
  const modal = $('#modal-video');
  const wrap  = $('.video-player-wrap');
  if (wrap) wrap.innerHTML = ''; // detiene cualquier iframe/video
  if (modal) modal.removeAttribute('data-open');
  document.body.style.overflow = '';
}

// ─── REENVIAR EMAIL DEL CERTIFICADO ──────────────────────────────────────────
async function reenviarEmailCertificado() {
  if (!currentUser?.email) {
    toast('Necesitas iniciar sesión', 'error');
    return;
  }
  const btn = $('#btn-reenviar-email');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const resp = await fetch(`${WEBHOOK_URL}/reenviar-certificado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, slug: SLUG })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Fallo al enviar');
    toast('📧 Email enviado a ' + currentUser.email, 'success');
  } catch (err) {
    console.error(err);
    toast(err.message || 'No pudimos enviar el email', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Reenviar por email
      `;
    }
  }
}

// ─── MODALES: eventos globales ───────────────────────────────────────────────
function initEvents() {
  document.addEventListener('click', (e) => {
    // Cerrar modales
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      const id = closeBtn.dataset.closeModal;
      if (id === 'modal-video') cerrarVideo();
      else document.getElementById(id)?.removeAttribute('data-open');
      document.body.style.overflow = '';
    }
    if (e.target.classList.contains('modal')) {
      if (e.target.id === 'modal-video') cerrarVideo();
      else e.target.removeAttribute('data-open');
      document.body.style.overflow = '';
    }
    // Sign in
    if (e.target.closest('#btn-signin-acceso')) {
      e.preventDefault();
      loginGoogle();
    }
    // Logout
    if (e.target.closest('#btn-logout')) {
      e.preventDefault();
      logout();
    }
    // Reenviar email
    if (e.target.closest('#btn-reenviar-email')) {
      e.preventDefault();
      reenviarEmailCertificado();
    }
  });
  // ESC cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal[data-open]').forEach(m => {
        if (m.id === 'modal-video') cerrarVideo();
        else { m.removeAttribute('data-open'); document.body.style.overflow = ''; }
      });
    }
  });
}

initEvents();

// Debug helper
window.__vpAcceso = {
  currentUser: () => currentUser,
  cursoData: () => cursoData,
  accesoData: () => accesoData,
  certificadoData: () => certificadoData
};
