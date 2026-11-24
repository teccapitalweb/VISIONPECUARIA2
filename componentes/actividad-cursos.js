// Este archivo se integra en el módulo de las dos landings mediante inyectar.py.
function clasificarDispositivoCurso(navegador) {
  const ua = navegador.userAgent || '';
  const plataforma = navegador.userAgentData?.platform || '';
  const android = /Android/i.test(ua) || /^Android$/i.test(plataforma);
  const movil = /Mobile/i.test(ua) || navegador.userAgentData?.mobile === true;
  const ipadEscritorio = /Macintosh/i.test(ua) && navegador.maxTouchPoints > 1;
  if (ipadEscritorio || /iPad|Tablet|PlayBook|Silk/i.test(ua) || android && !movil) return 'tableta';
  if (movil || /iPhone|iPod|Windows Phone|IEMobile/i.test(ua)) return 'telefono';
  if (/Windows NT|Macintosh|X11|CrOS/i.test(ua) || /^(?:Windows|macOS|Linux|Chrome OS)$/i.test(plataforma)) return 'computadora';
  return 'desconocido';
}

function crearActividadCursos() {
  const origen = new URL(location.href).searchParams.get('vp_desde');
  const permitido = { 'gallinas-de-postura': 'embutidos-artesanales', 'embutidos-artesanales': 'gallinas-de-postura' };
  const atribucionOrigen = permitido[SLUG] === origen ? origen : null;
  const nombreOrigen = { 'gallinas-de-postura': 'Gallinas de Postura', 'embutidos-artesanales': 'Embutidos Artesanales y Chorizos' };
  const visitaId = crypto.randomUUID();
  const dispositivo = clasificarDispositivoCurso(navigator);
  const relojes = new Set();
  let cotizacion = null, revisionOferta = 0;
  let enlace = null, yaPague = null, stripe = null, pagoAbierto = false;
  const esperaSesion = Promise.race([auth.authStateReady?.() || Promise.resolve(), espera(1500)]);

  async function contexto() {
    await esperaSesion.catch(() => {});
    const alumno = auth.currentUser;
    const token = alumno?.emailVerified ? await alumno.getIdToken().catch(() => null) : null;
    return {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      datos: { visitaId, dispositivo, ...(atribucionOrigen ? { origenSlug: atribucionOrigen } : {}) },
      uid: token ? alumno.uid : null
    };
  }

  async function evento(ctx, tipo, eventoId, datos = {}) {
    const { headers, datos: visita } = await ctx;
    const body = JSON.stringify({ ...visita, destinoSlug: SLUG, tipo, eventoId, ...datos });
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(API + '/publico/cursos/actividad', { method: 'POST', headers, body, keepalive: true });
        if (r.ok) return true;
        if (r.status < 500 && r.status !== 429) return false;
      } catch (_) { /* Un reintento, siempre con el mismo eventoId. */ }
    }
    return false;
  }

  function medir(ctx, inicio, tiempo, eventoId, datos = {}) {
    let acumulado = 0, desde = null, enviado = 0, cerrado = false;
    const registrado = evento(ctx, inicio, eventoId, datos);
    const reloj = {
      cambiar(activo) {
        if (cerrado) return;
        const ahora = performance.now();
        if (desde !== null) acumulado += ahora - desde;
        desde = activo && document.visibilityState !== 'hidden' ? ahora : null;
      },
      actualizar() {
        const ms = acumulado + (desde === null ? 0 : performance.now() - desde);
        const duracionSeg = Math.min(3600, Math.floor(ms / 1000));
        if (duracionSeg <= enviado) return;
        enviado = duracionSeg;
        registrado.then(ok => {
          if (ok) return evento(ctx, tiempo, eventoId, { duracionSeg, ...(datos.sessionId ? { sessionId: datos.sessionId } : {}) });
        });
      },
      cerrar() {
        if (cerrado) return;
        reloj.cambiar(false);
        reloj.actualizar();
        cerrado = true;
        relojes.delete(reloj);
      }
    };
    relojes.add(reloj);
    return reloj;
  }

  function observarVideo(video, botonSonido) {
    if (!video) return () => {};
    let visible = false, reproduciendo = false, reloj = null, modoInicio = 'automatico';
    let intencionManualEn = null;
    const marcarManual = evento => {
      if (evento.isTrusted && video.paused) intencionManualEn = performance.now();
    };
    const sincronizar = () => {
      const activo = visible && reproduciendo && !ABIERTO && !pagoAbierto && document.visibilityState !== 'hidden';
      if (activo && !reloj) {
        reloj = medir(contexto(), 'video_reproducido', 'video_tiempo', crypto.randomUUID(), {
          modo: modoInicio
        });
      }
      reloj?.cambiar(activo);
      if (!activo) reloj?.actualizar();
    };
    const observer = new IntersectionObserver(([entrada]) => {
      visible = entrada.intersectionRatio >= .35;
      sincronizar();
    }, { threshold: [.35] });
    observer.observe(video);
    const cerrar = () => {
      reloj?.cerrar();
      reloj = null;
      reproduciendo = false;
      intencionManualEn = null;
    };
    // La propiedad autoplay y el sonido no indican quién inició la reproducción.
    video.addEventListener('pointerdown', marcarManual, { capture: true });
    video.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' || evento.key === ' ') marcarManual(evento);
    }, { capture: true });
    botonSonido?.addEventListener('click', marcarManual, { capture: true });
    video.addEventListener('play', () => {
      modoInicio = intencionManualEn !== null && performance.now() - intencionManualEn <= 1800 ? 'manual' : 'automatico';
      intencionManualEn = null;
    });
    video.addEventListener('playing', () => { reproduciendo = true; sincronizar(); });
    video.addEventListener('waiting', () => { reproduciendo = false; sincronizar(); });
    video.addEventListener('pause', cerrar);
    video.addEventListener('ended', cerrar);
    video.addEventListener('emptied', cerrar);
    if (!video.paused && video.readyState >= 3) reproduciendo = true;
    return sincronizar;
  }

  const esGallinas = SLUG === 'gallinas-de-postura';
  const video = document.getElementById(esGallinas ? 'hero-video' : 'preview-video');
  const botonSonido = document.getElementById(esGallinas ? 'btn-activar-sonido' : 'btn-sound');
  const sincronizarVideo = observarVideo(video, botonSonido);
  const pagina = medir(contexto(), 'pagina_visitada', 'pagina_tiempo', visitaId);
  function sincronizar() {
    window.vpRegalo?.sincronizar();
    sincronizarVideo();
    const viendoLanding = !ABIERTO && !pagoAbierto;
    pagina.cambiar(viendoLanding);
    enlace?.cambiar(viendoLanding);
    yaPague?.cambiar(ABIERTO);
    stripe?.cambiar(pagoAbierto);
    relojes.forEach(r => r.actualizar());
  }
  document.addEventListener('visibilitychange', sincronizar);
  window.addEventListener('pagehide', () => {
    relojes.forEach(r => { r.cambiar(false); r.actualizar(); });
  });
  window.addEventListener('pageshow', sincronizar);
  const tick = setInterval(() => relojes.forEach(r => r.actualizar()), 15000);
  window.addEventListener('pagehide', e => { if (!e.persisted) clearInterval(tick); });

  if (atribucionOrigen) {
    enlace = medir(contexto(), 'enlace_abierto', 'enlace_tiempo', crypto.randomUUID());
  }
  sincronizar();

  async function precioAlumno() {
    if (!atribucionOrigen || !auth.currentUser?.emailVerified) return null;
    const uid = auth.currentUser.uid;
    if (cotizacion?.uid === uid && Date.now() - cotizacion.en < 60000) return cotizacion.precio;
    const query = new URLSearchParams({ origenSlug: atribucionOrigen, destinoSlug: SLUG });
    try {
      const precio = await api('/alumno/promociones/cotizacion?' + query);
      if (auth.currentUser?.uid !== uid || auth.currentUser.emailVerified !== true ||
          precio?.origenSlug !== atribucionOrigen || precio.destinoSlug !== SLUG ||
          ![precio.precioBaseCentavos, precio.descuentoCentavos, precio.montoCentavos].every(n => Number.isSafeInteger(n) && n > 0)) return null;
      cotizacion = { uid, precio, en: Date.now() };
      return precio;
    } catch (err) {
      if (auth.currentUser?.uid === uid && err.codigo === 'curso_adquirido') return { yaComprado: true };
      return null;
    }
  }

  async function mostrarOfertaAlumno() {
    document.getElementById('vp-oferta-alumno')?.remove();
    const revision = ++revisionOferta;
    if (!atribucionOrigen) return;
    await esperaSesion.catch(() => {});
    const verificado = auth.currentUser?.emailVerified === true;
    const precio = await precioAlumno();
    if (revision !== revisionOferta || verificado && !precio?.montoCentavos) return;
    const ancla = document.querySelector('[data-action="inscribir"]:not(.hdr__cta):not(.sticky-bar__cta)');
    if (!ancla) return;
    const tarjeta = document.createElement('div');
    tarjeta.id = 'vp-oferta-alumno';
    tarjeta.className = 'vp-oferta-alumno';
    const titulo = document.createElement('strong');
    const detalle = document.createElement('span');
    if (precio?.montoCentavos) {
      titulo.textContent = 'Precio de alumno: ' + mxn(precio.montoCentavos);
      detalle.textContent = 'Precio regular ' + mxn(precio.precioBaseCentavos) + ' · Ahorras ' + mxn(precio.descuentoCentavos) +
        ' por haber comprado ' + (precio.origenNombre || nombreOrigen[atribucionOrigen]) + '.';
    } else {
      titulo.textContent = 'Precio especial para alumnos de ' + nombreOrigen[atribucionOrigen];
      detalle.textContent = 'Usa el mismo correo con el que compraste ese curso para confirmar tu descuento.';
    }
    tarjeta.append(titulo, detalle);
    ancla.before(tarjeta);
  }

  return {
    sincronizar,
    mostrarOfertaAlumno,
    abrirYaPague() {
      yaPague?.cerrar();
      yaPague = medir(contexto(), 'ya_pague', 'ya_pague_tiempo', crypto.randomUUID());
      yaPague.cambiar(true);
    },
    cerrarYaPague() {
      yaPague?.cerrar();
      yaPague = null;
      sincronizar();
    },
    async prepararPago() {
      const ctx = await contexto();
      const precio = ctx.uid && ctx.uid === auth.currentUser?.uid ? await precioAlumno() : null;
      const usarOferta = precio?.montoCentavos && cotizacion?.uid === ctx.uid && ctx.uid === auth.currentUser?.uid;
      return {
        headers: ctx.headers,
        body: { slug: SLUG, visitaId, dispositivo, ...window.vpRegalo?.datosCheckout(SLUG),
          ...(atribucionOrigen ? { atribucionOrigen } : {}),
          ...(usarOferta ? { origenSlug: atribucionOrigen } : {}) },
        contexto: ctx,
        yaComprado: Boolean(precio?.yaComprado)
      };
    },
    abrirPago() {
      pagoAbierto = true;
      sincronizar();
    },
    abrirStripe(sessionId, ctx) {
      if (!sessionId || !ctx) return;
      stripe?.cerrar();
      stripe = medir(ctx, 'checkout_montado', 'checkout_tiempo', sessionId, { sessionId });
      stripe.cambiar(true);
      sincronizarVideo();
    },
    cerrarStripe() {
      pagoAbierto = false;
      stripe?.cerrar();
      stripe = null;
      sincronizar();
    }
  };
}
