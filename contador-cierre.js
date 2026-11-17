/* ═══════════════════════════════════════════════════════════════════
   CONTADOR DE CIERRE DE INSCRIPCIONES (por visita)
   ───────────────────────────────────────────────────────────────────
   Visita 1 → 12 h · visita 2 → 10 h · visita 3 → 8 h · 4 → 6 h
   5 → 4 h · 6 → 2 h · 7 en adelante → "Últimas horas" (sin números).
   No importa la hora ni cuánto tiempo pase entre visitas: solo cuenta
   el número de visita.

   · Una "visita" = una sesión del navegador en esta página. Recargar la
     misma pestaña NO cuenta como visita nueva: el reloj sigue corriendo
     desde donde iba. Cerrar y volver a entrar sí cuenta.
   · Se cuenta por curso (cada landing lleva su propio conteo).
   · Si el navegador bloquea localStorage (modo privado estricto), se
     muestra la cuenta de la visita 1 y la página sigue funcionando.

   USO: poner <div data-cierre></div> donde va el contador y cargar
        <script src="/contador-cierre.js" defer></script>
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var HORAS = [12, 10, 8, 6, 4, 2];
  var curso = (document.body && document.body.getAttribute('data-slug')) ||
              location.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/^\/+|\/+$/g, '') || 'inicio';
  var K_VISITAS = 'cierre_visitas_' + curso;
  var K_SESION  = 'cierre_sesion_' + curso;   // { visita, inicio }

  function leer(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function guardar(store, k, v) { try { store.setItem(k, v); } catch (e) {} }

  // ── ¿Qué visita es esta? ───────────────────────────────────────────
  var sesion = null;
  try { sesion = JSON.parse(leer(sessionStorage, K_SESION) || 'null'); } catch (e) { sesion = null; }

  if (!sesion || typeof sesion.visita !== 'number' || typeof sesion.inicio !== 'number') {
    var previas = parseInt(leer(localStorage, K_VISITAS), 10);
    var visita = (isFinite(previas) && previas > 0 ? previas : 0) + 1;
    guardar(localStorage, K_VISITAS, String(visita));
    sesion = { visita: visita, inicio: Date.now() };
    guardar(sessionStorage, K_SESION, JSON.stringify(sesion));
  }

  var horas = HORAS[sesion.visita - 1];                 // undefined desde la visita 7
  var fin = horas ? sesion.inicio + horas * 3600000 : 0;

  // ── Estilos (una sola vez) ─────────────────────────────────────────
  var css =
    '.cierre{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;' +
    'margin:14px auto;padding:12px 16px;max-width:520px;border-radius:14px;background:#1b1b1b;color:#fff;' +
    'font-family:inherit;box-shadow:0 6px 20px rgba(0,0,0,.18);box-sizing:border-box;text-align:center}' +
    '.cierre__txt{font-size:14px;font-weight:700;letter-spacing:.2px;line-height:1.3}' +
    '.cierre__txt b{color:#ffb020}' +
    '.cierre__reloj{display:flex;gap:6px}' +
    '.cierre__caja{min-width:52px;padding:6px 4px;border-radius:9px;background:rgba(255,255,255,.1);line-height:1}' +
    '.cierre__caja b{display:block;font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}' +
    '.cierre__caja span{display:block;margin-top:3px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;opacity:.75}' +
    '.cierre__dot{width:9px;height:9px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 0 rgba(255,77,77,.7);animation:cierrePulso 1.6s infinite}' +
    '.cierre--ultimas .cierre__txt{font-size:16px}' +
    '@keyframes cierrePulso{0%{box-shadow:0 0 0 0 rgba(255,77,77,.7)}70%{box-shadow:0 0 0 9px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}' +
    '@media (max-width:480px){.cierre{margin:12px 8px;padding:10px 12px}.cierre__caja{min-width:46px}.cierre__caja b{font-size:19px}.cierre__txt{font-size:13px}}' +
    '@media (prefers-reduced-motion:reduce){.cierre__dot{animation:none}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  var huecos = [];

  function pintarUltimas(el) {
    el.className = 'cierre cierre--ultimas';
    el.innerHTML = '<span class="cierre__dot" aria-hidden="true"></span>' +
                   '<span class="cierre__txt"><b>Últimas horas</b> para inscribirte</span>';
  }

  function montar(el) {
    el.setAttribute('role', 'timer');
    el.setAttribute('aria-live', 'off');
    if (!horas) { pintarUltimas(el); return; }
    el.className = 'cierre';
    el.innerHTML =
      '<span class="cierre__dot" aria-hidden="true"></span>' +
      '<span class="cierre__txt">Las inscripciones <b>cierran en</b></span>' +
      '<span class="cierre__reloj">' +
        '<span class="cierre__caja"><b data-h>--</b><span>hrs</span></span>' +
        '<span class="cierre__caja"><b data-m>--</b><span>min</span></span>' +
        '<span class="cierre__caja"><b data-s>--</b><span>seg</span></span>' +
      '</span>';
    huecos.push({ el: el, h: el.querySelector('[data-h]'), m: el.querySelector('[data-m]'), s: el.querySelector('[data-s]') });
  }

  function tick() {
    var resta = fin - Date.now();
    if (resta <= 0) {                     // se agotó dentro de la misma visita
      huecos.forEach(function (x) { pintarUltimas(x.el); });
      huecos = [];
      return;
    }
    var t = Math.ceil(resta / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    huecos.forEach(function (x) { x.h.textContent = pad(h); x.m.textContent = pad(m); x.s.textContent = pad(s); });
    setTimeout(tick, 1000);
  }

  function iniciar() {
    var els = document.querySelectorAll('[data-cierre]');
    for (var i = 0; i < els.length; i++) montar(els[i]);
    if (huecos.length) tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
