// ═══════════════════════════════════════════════════════════════════════════
// VISIÓN PECUARIA · Módulo de checkout de curso
// Patrón: Google Sign-In → Stripe embedded → acceso otorgado por webhook
// Failure-tolerant: la landing debe verse bien aunque Firebase/Stripe fallen
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ─── CONFIG (idéntica al portal principal) ───────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDQXkIo-BWPIeLZzHeTMN986WMDn0TrTJU",
  authDomain: "visionpecuaria-vip.firebaseapp.com",
  projectId: "visionpecuaria-vip",
  storageBucket: "visionpecuaria-vip.firebasestorage.app",
  messagingSenderId: "978318807782",
  appId: "1:978318807782:web:626e67bb30795c15b02127"
};

const WEBHOOK_URL = "https://visionpecuaria-webhook-production.up.railway.app";

// ⚠️ PUBLISHABLE KEY DE STRIPE
// La leemos del <meta name="stripe-pk"> del HTML para que sea editable
// sin tocar código. Fallback a la que había puesto por defecto.
const STRIPE_PUB_KEY = (
  document.querySelector('meta[name="stripe-pk"]')?.content ||
  "pk_live_TU_PUBLISHABLE_KEY_AQUI"
);

// El slug lo lee del atributo data-slug del <body> — un solo JS sirve para N cursos
const SLUG = document.body.dataset.slug || 'embutidos-artesanales';

// ─── INIT FIREBASE (defensivo, no rompe si falla) ────────────────────────────
let app, auth, db;
try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  setPersistence(auth, browserLocalPersistence).catch(e => console.warn('setPersistence:', e));
} catch (err) {
  console.error('Firebase init falló:', err);
}

// Estado global
let currentUser  = null;
let stripe       = null;
let checkoutInstance = null;
let cursoData    = null;

// ─── UTILIDADES DE UI ─────────────────────────────────────────────────────────
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

function fmtMxn(centavos) {
  return '$' + (centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MXN';
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthState();
  });
}

function updateAuthState() {
  const inscritaLabels = $$('[data-authed]');
  inscritaLabels.forEach(el => {
    el.textContent = currentUser
      ? (currentUser.displayName || currentUser.email || 'Inscrito')
      : 'Aún no has iniciado sesión';
  });
}

async function signInGoogle() {
  const btn = $('#btn-google-signin');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="loader loader--dark"></div> Conectando...'; }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    currentUser = cred.user;
    // Ya autenticado → cerrar modal auth, abrir modal checkout
    closeModal('modal-auth');
    setTimeout(() => openCheckout(), 300);
  } catch (err) {
    console.error('Sign-in error:', err);
    toast('No pudimos iniciar sesión. Intenta de nuevo.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = googleBtnHTML();
    }
  }
}

function googleBtnHTML() {
  return `
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" aria-hidden="true">
    <span>Continuar con Google</span>
  `;
}

// ─── MODALES ──────────────────────────────────────────────────────────────────
function openModal(id) {
  const m = $('#' + id);
  if (!m) return;
  m.setAttribute('data-open', '');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const m = $('#' + id);
  if (!m) return;
  m.removeAttribute('data-open');
  document.body.style.overflow = '';
  // Si es el checkout, destruir el iframe embebido
  if (id === 'modal-checkout' && checkoutInstance) {
    try { checkoutInstance.destroy(); } catch(e){}
    checkoutInstance = null;
  }
}

// ─── FLUJO DE INSCRIPCIÓN ─────────────────────────────────────────────────────
async function iniciarInscripcion() {
  if (!auth) {
    toast('El sistema de pago no está disponible. Escríbenos por WhatsApp.', 'error');
    return;
  }
  if (!currentUser) {
    openModal('modal-auth');
    return;
  }
  openCheckout();
}

async function openCheckout() {
  openModal('modal-checkout');
  const container = $('#checkout-container');
  container.innerHTML = `
    <div class="center-y">
      <div class="loader loader--dark"></div>
      <span>Preparando el pago seguro...</span>
    </div>
  `;

  try {
    // 1) Stripe — cargar desde CDN oficial (js.stripe.com)
    if (!stripe) {
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://js.stripe.com/v3/';
          s.onload = resolve;
          s.onerror = () => reject(new Error('No se pudo cargar Stripe.js'));
          document.head.appendChild(s);
        });
      }
      if (!STRIPE_PUB_KEY || STRIPE_PUB_KEY.includes('TU_PUBLISHABLE')) {
        throw new Error('Publishable key de Stripe no configurada. Contacta al administrador.');
      }
      stripe = window.Stripe(STRIPE_PUB_KEY);
    }

    // 2) Crear checkout session en el backend
    const resp = await fetch(`${WEBHOOK_URL}/crear-checkout-curso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: SLUG,
        uid:  currentUser.uid,
        email: currentUser.email,
        nombre: currentUser.displayName || '',
        whatsapp: ''
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      if (data.yaComprado) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px 0;">
            <div class="auth-hero__ico" style="margin:0 auto 20px;background:linear-gradient(135deg,#16a34a,#0f7a37);color:#fff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h3 style="font-family:var(--font-display);font-weight:800;font-size:1.2rem;margin-bottom:8px;">Ya tienes acceso 🎉</h3>
            <p style="color:var(--muted);margin-bottom:20px;">Ya compraste este curso antes. Puedes ver el contenido cuando quieras.</p>
            <a href="/curso-acceso.html?slug=${encodeURIComponent(SLUG)}" class="btn-primary" style="text-decoration:none;display:inline-flex;">
              Ir al contenido
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
          </div>
        `;
        return;
      }
      throw new Error(data.error || 'No pudimos iniciar el pago');
    }

    // 3) Montar el embedded checkout
    container.innerHTML = '';
    checkoutInstance = await stripe.initEmbeddedCheckout({
      clientSecret: data.clientSecret
    });
    checkoutInstance.mount('#checkout-container');

  } catch (err) {
    console.error('Checkout error:', err);
    container.innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <p style="color:var(--red);margin-bottom:16px;font-weight:600;">${err.message || 'No pudimos iniciar el pago.'}</p>
        <button class="btn-primary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

// ─── CONTADOR DE CUPO EN VIVO ────────────────────────────────────────────────
async function actualizarCupo() {
  if (!db) return;
  try {
    // Suscripción realtime al doc del curso (para reflejar cambios en vivo)
    const cursoRef = doc(db, 'cursosVenta', SLUG);
    onSnapshot(cursoRef, (snap) => {
      if (!snap.exists()) return;
      cursoData = snap.data();
      pintarCupoYPrecio(cursoData);
    }, (err) => {
      console.warn('Cupo snapshot error:', err);
    });
  } catch (err) {
    console.warn('No pudimos cargar el cupo:', err);
  }
}

function pintarCupoYPrecio(c) {
  const precioNormal   = Number(c.precioNormalCentavos)     || 0;
  const precioLanz     = Number(c.precioLanzamientoCentavos) || precioNormal;
  const cupoMax        = Number(c.cupoLanzamientoMax)     || 0;
  const cupoTomados    = Number(c.cupoLanzamientoTomados) || 0;
  const restantes      = Math.max(cupoMax - cupoTomados, 0);
  const hayDescuento   = precioLanz < precioNormal && cupoTomados < cupoMax;

  // Precio principal
  const precioActual = hayDescuento ? precioLanz : precioNormal;

  $$('[data-precio]').forEach(el => el.textContent = fmtMxn(precioActual).replace(' MXN',''));
  $$('[data-precio-full]').forEach(el => el.textContent = fmtMxn(precioActual));
  $$('[data-precio-normal]').forEach(el => {
    el.textContent = fmtMxn(precioNormal);
    el.style.display = hayDescuento ? '' : 'none';
  });
  $$('[data-ahorro]').forEach(el => {
    const ahorro = precioNormal - precioLanz;
    el.textContent = `Ahorras ${fmtMxn(ahorro)}`;
    el.style.display = hayDescuento ? '' : 'none';
  });

  // Contador
  $$('[data-cupo-restantes]').forEach(el => el.textContent = restantes);
  $$('[data-cupo-max]').forEach(el => el.textContent = cupoMax);
  $$('[data-cupo-tomados]').forEach(el => el.textContent = cupoTomados);
  const pct = cupoMax > 0 ? Math.min(100, (cupoTomados / cupoMax) * 100) : 0;
  $$('[data-cupo-fill]').forEach(el => el.style.width = pct + '%');

  // Bloque de cupo se oculta si ya no hay descuento
  $$('[data-cupo-block]').forEach(el => {
    el.style.display = hayDescuento ? '' : 'none';
  });

  // Datos generales editables
  if (c.fechaInicioTexto) $$('[data-fecha]').forEach(el => el.textContent = c.fechaInicioTexto);
  if (c.duracionHoras)    $$('[data-duracion]').forEach(el => el.textContent = c.duracionHoras + 'h');
  if (c.modalidad)        $$('[data-modalidad]').forEach(el => el.textContent = c.modalidad);
}

// ─── STICKY CTA — mostrar al hacer scroll pasando el hero ────────────────────
function initStickyCTA() {
  const cta = $('#sticky-cta');
  const hero = $('#hero');
  if (!cta || !hero) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        cta.removeAttribute('data-visible');
      } else {
        cta.setAttribute('data-visible', 'true');
      }
    });
  }, { threshold: 0.1 });
  obs.observe(hero);
}

// ─── SISTEMA DE PESTAÑAS ─────────────────────────────────────────────────────
function initTabs() {
  const tabs = $$('.tabs__btn');
  const panels = $$('.tabs__panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
      panels.forEach(p => {
        if (p.id === 'panel-' + target) p.setAttribute('data-active','');
        else p.removeAttribute('data-active');
      });
      // Scroll suave al inicio de las pestañas si el usuario está por debajo
      const nav = btn.closest('.tabs');
      if (nav) {
        const rect = nav.getBoundingClientRect();
        if (rect.top < 0) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ─── ACORDEÓN DEL TEMARIO: solo uno abierto ──────────────────────────────────
function initAccordion() {
  const modules = $$('.module');
  modules.forEach(m => {
    m.addEventListener('toggle', () => {
      if (m.open) modules.forEach(o => { if (o !== m) o.open = false; });
    });
  });
}

// ─── REVEAL ON SCROLL ────────────────────────────────────────────────────────
function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  // Activar el modo reveal SOLO cuando el JS lo puede manejar
  document.documentElement.setAttribute('data-reveal-init', '');
  const els = $$('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.setAttribute('data-revealed', '');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
  els.forEach(el => obs.observe(el));
  // Fallback: si por alguna razón el observer no dispara, marcar todo como revelado
  setTimeout(() => {
    $$('.reveal:not([data-revealed])').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.setAttribute('data-revealed','');
    });
  }, 400);
}

// ─── MODAL: eventos globales ─────────────────────────────────────────────────
function initModals() {
  document.addEventListener('click', (e) => {
    // Botones que abren
    if (e.target.closest('[data-action="inscribir"]')) {
      e.preventDefault();
      iniciarInscripcion();
    }
    // Botones que cierran
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      const id = closeBtn.dataset.closeModal;
      closeModal(id);
    }
    // Click en el overlay (fuera del card) cierra
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
    // Google sign-in
    if (e.target.closest('#btn-google-signin')) {
      e.preventDefault();
      signInGoogle();
    }
  });
  // ESC cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal[data-open]').forEach(m => closeModal(m.id));
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function boot() {
  // Inyectar HTML del botón Google si aún no tiene texto
  const gbtn = $('#btn-google-signin');
  if (gbtn && !gbtn.innerHTML.trim()) gbtn.innerHTML = googleBtnHTML();

  initTabs();
  initAccordion();
  initReveal();
  initStickyCTA();
  initModals();
  actualizarCupo();

  // Detectar retorno de Stripe (return_url)
  const params = new URLSearchParams(location.search);
  if (params.get('session_id')) {
    // El return_url va directo a curso-acceso.html, pero si por alguna razón
    // Stripe regresa aquí, redirigimos.
    location.href = '/curso-acceso.html' + location.search;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Exponer al scope global para debugging manual
window.__vp = { iniciarInscripcion, openCheckout, currentUser: () => currentUser, cursoData: () => cursoData };
