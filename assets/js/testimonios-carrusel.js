// ═══════════════════════════════════════════════════════════════════════════
// Testimonios · carrusel horizontal de tres filas (reutilizable)
//
// Uso:  <section class="vt" data-testimonios="gallinas-de-postura" hidden>…</section>
// Datos: /data/testimonios/<slug>.json → { "testimonios": [ … ] }
//
// Solo se publican testimonios con  autorizado: true  y  fuente  (de dónde
// salió y quién autorizó su uso). Todo lo demás se ignora. Si no hay ninguno
// autorizado, la sección queda oculta: nunca se rellena con contenido inventado.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  var MIN_MARQUESINA = 9;        // con menos, se muestran estáticas para no repetir de más
  var PX_POR_SEG = 28;           // velocidad lenta y legible

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var estrella = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
  var icoPausa = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var icoPlay = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
  var reducido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function valido(t) {
    return t && t.autorizado === true && typeof t.fuente === 'string' && t.fuente.trim() &&
      typeof t.texto === 'string' && t.texto.trim().length > 0;
  }

  function tarjeta(t, clon) {
    var cal = Number(t.calificacion);
    var estrellas = (cal >= 1 && cal <= 5 && t.calificacionVerificada === true)
      ? '<div class="vt__stars" role="img" aria-label="Calificación ' + cal + ' de 5">' + new Array(Math.round(cal) + 1).join(estrella) + '</div>' : '';
    var detalle = [t.contexto, t.ubicacion].filter(Boolean).map(esc).join(' · ');
    return '<figure class="vt__card' + (clon ? ' vt__clon' : '') + '"' + (clon ? ' aria-hidden="true"' : ' tabindex="0"') + '>' +
      estrellas +
      '<blockquote class="vt__text">' + esc(t.texto.trim()) + '</blockquote>' +
      (t.nombre || detalle ? '<figcaption class="vt__who">' + (t.nombre ? '<b>' + esc(t.nombre) + '</b>' : '') +
        (detalle ? '<span>' + detalle + '</span>' : '') + '</figcaption>' : '') +
      '</figure>';
  }

  function repartir(lista, filas) {
    var out = [];
    for (var i = 0; i < filas; i++) out.push([]);
    lista.forEach(function (t, i) { out[i % filas].push(t); });
    return out;
  }

  function montar(sec, lista) {
    var cont = sec.querySelector('.vt__rows');
    if (!cont) return;
    var marquesina = lista.length >= MIN_MARQUESINA;
    var filas = repartir(lista, marquesina ? 3 : 1);
    cont.innerHTML = filas.map(function (fila, i) {
      var html = fila.map(function (t) { return tarjeta(t, false); }).join('');
      var clon = marquesina ? fila.map(function (t) { return tarjeta(t, true); }).join('') : '';
      return '<div class="vt__row' + (i === 1 ? ' vt__row--der' : '') + '" role="group" aria-label="Testimonios, fila ' + (i + 1) + '">' +
        '<div class="vt__track">' + html + clon + '</div></div>';
    }).join('');
    sec.classList.toggle('is-pocas', !marquesina);
    sec.hidden = false;

    var btn = sec.querySelector('.vt__toggle');
    if (!marquesina) { if (btn) btn.hidden = true; sec.classList.add('is-estatico'); return; }

    // Duración por fila según su ancho real → misma velocidad en todas
    function ajustar() {
      sec.querySelectorAll('.vt__track').forEach(function (tr) {
        var mitad = tr.scrollWidth / 2;
        tr.style.setProperty('--vt-dur', Math.max(30, Math.round(mitad / PX_POR_SEG)) + 's');
      });
    }
    ajustar();
    window.addEventListener('resize', function () { clearTimeout(sec._t); sec._t = setTimeout(ajustar, 200); });

    function estatico(on, manual) {
      sec.classList.toggle('is-estatico', on);
      if (btn) {
        btn.hidden = false;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.innerHTML = on ? icoPlay + '<span>Reanudar movimiento</span>' : icoPausa + '<span>Detener movimiento</span>';
      }
      if (manual) sec._manual = true;
    }
    estatico(!!reducido.matches, false);
    if (reducido.addEventListener) reducido.addEventListener('change', function (e) { if (!sec._manual) estatico(e.matches, false); });
    if (btn) btn.addEventListener('click', function () { estatico(!sec.classList.contains('is-estatico'), true); });

    // Toque: tocar una fila la pausa; tocar fuera la reanuda
    sec.querySelectorAll('.vt__row').forEach(function (row) {
      row.addEventListener('touchstart', function () {
        sec.querySelectorAll('.vt__row.is-tocada').forEach(function (r) { if (r !== row) r.classList.remove('is-tocada'); });
        row.classList.add('is-tocada');
      }, { passive: true });
    });
    document.addEventListener('touchstart', function (e) {
      if (!sec.contains(e.target)) sec.querySelectorAll('.vt__row.is-tocada').forEach(function (r) { r.classList.remove('is-tocada'); });
    }, { passive: true });
  }

  function iniciar(sec) {
    var slug = sec.getAttribute('data-testimonios');
    // 1) Datos incrustados en la página (no dependen de otra petición)
    var incrustado = document.getElementById('vt-datos-' + slug);
    if (incrustado) {
      try {
        var di = JSON.parse(incrustado.textContent);
        var li = (di && Array.isArray(di.testimonios) ? di.testimonios : []).filter(valido);
        if (di && di.curso && di.curso !== slug) li = [];
        if (li.length) { montar(sec, li); return; }
      } catch (e) { /* cae al archivo JSON */ }
    }
    var url = sec.getAttribute('data-fuente') || ('/data/testimonios/' + slug + '.json');
    fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { testimonios: [] }; })
      .then(function (d) {
        var lista = (d && Array.isArray(d.testimonios) ? d.testimonios : []).filter(valido);
        if (d && d.curso && d.curso !== slug) lista = [];   // nunca mezclar cursos
        if (!lista.length) { sec.hidden = true; return; }
        montar(sec, lista);
      })
      .catch(function () { sec.hidden = true; });
  }

  function arrancar() { document.querySelectorAll('.vt[data-testimonios]').forEach(iniciar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
