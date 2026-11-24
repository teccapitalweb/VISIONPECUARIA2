const GALLO_SALUDO = '¡Hola! Soy Mi Gallo IA. Cuéntame qué estás observando, qué especie manejas o en qué parte del curso necesitas ayuda.';
const PREGUNTAS_GALLO = [
  '¿Qué clases incluye mi curso?',
  '¿Qué datos registro si baja la postura?',
  '¿Cómo descargo un material?'
];

function crearEstadoGallo() {
  return {
    mensajes: [], enviando: false, error: '', borrador: '', parcial: '', revision: 0,
    memoria: false, retencionDisponible: false, preferenciasCargadas: false, consultandoPreferencias: false,
    modeloDisponible: false, usarModelo: false, modificando: false,
    confirmaBorrado: false, abort: null
  };
}

function urlFuenteGallo(valor) {
  try {
    const enlace = new URL(valor);
    return enlace.protocol === 'https:' && !enlace.username && !enlace.password ? enlace.href : '';
  } catch (_) { return ''; }
}

function fuentesGallo(lista) {
  const fuentes = Array.isArray(lista) ? lista.slice(0, 6) : [];
  if (!fuentes.length) return '';
  return `<details class="mc__gallo-fuentes"><summary>Fuentes consultadas (${fuentes.length})</summary><ul>
    ${fuentes.map(f => {
      const titulo = esc(f.titulo || 'Fuente técnica');
      const href = urlFuenteGallo(f.url);
      const detalle = [f.autor, f.fecha, f.version ? 'versión ' + f.version : ''].filter(Boolean).map(esc).join(' · ');
      return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${titulo}</a>` : titulo}${detalle ? ' · ' + detalle : ''}</li>`;
    }).join('')}
  </ul></details>`;
}

async function valorarGallo(i, voto) {
  const chat = GALLO_CHAT;
  const m = chat.mensajes[i];
  if (!m?.turnoId) return;
  const control = view.querySelector('[data-gallo-compartir="' + i + '"]');
  const compartir = Boolean(control?.checked && m.pregunta);
  try {
    await api('/alumno/gallo-ia/valorar', {
      method: 'POST',
      body: { cursoSlug: SLUG, turnoId: m.turnoId, voto, compartir,
        ...(compartir ? { pregunta: m.pregunta, respuesta: m.texto } : {}) }
    });
    if (GALLO_CHAT !== chat) return;
    m.voto = voto;
    m.compartido = compartir;
    chat.error = 'Gracias, registramos tu valoración.';
    chat.revision++;
    actualizarGallo(false);
  } catch (e) {
    if (GALLO_CHAT !== chat) return;
    chat.error = e.status === 400 ? 'La valoración ya venció o la respuesta cambió.' : 'No pudimos registrar tu valoración.';
    actualizarGallo(false);
  }
}

function actualizarGallo(alFinal = true) {
  const registro = view.querySelector('[data-gallo-historial]');
  if (!registro) return;
  const chat = GALLO_CHAT;
  const parcial = view.querySelector('[data-gallo-parcial]');
  if (registro.dataset.revision !== String(chat.revision)) {
    const scroll = registro.scrollTop;
    registro.querySelector('[data-gallo-turnos]').innerHTML = chat.mensajes.map((m, i) => {
      const usuario = m.rol === 'usuario';
      const interaccion = !usuario && m.turnoId ? `<div class="mc__gallo-reaccion">
        <button type="button" data-gallo-voto="util" data-turno="${i}" aria-pressed="${m.voto === 'util'}">Útil</button>
        <button type="button" data-gallo-voto="no_util" data-turno="${i}" aria-pressed="${m.voto === 'no_util'}">No útil</button>
        ${m.pregunta ? `<label><input type="checkbox" data-gallo-compartir="${i}" ${m.compartido ? 'checked' : ''}> Compartir este turno con el equipo</label>` : ''}
      </div>` : '';
      return `<div class="mc__gallo-bloque ${usuario ? 'usuario' : ''}">
        <div class="mc__gallo-mensaje${usuario ? ' mc__gallo-mensaje--usuario' : ''}"><span class="mc__sr">${usuario ? 'Tú' : 'Mi Gallo IA'}: </span>${esc(m.texto)}</div>
        ${usuario ? '' : fuentesGallo(m.fuentes)}
        ${interaccion}
      </div>`;
    }).join('');
    registro.dataset.revision = String(chat.revision);
    if (!alFinal) registro.scrollTop = scroll;
  }
  parcial.textContent = chat.parcial;
  parcial.hidden = !chat.parcial;
  if (alFinal) registro.scrollTop = registro.scrollHeight;
  const estado = view.querySelector('[data-gallo-estado]');
  estado.textContent = chat.enviando ? (chat.parcial ? 'Mostrando respuesta…' : 'Mi Gallo IA está preparando una respuesta…') : chat.error;
  view.querySelector('[data-gallo-enviar]').disabled = chat.enviando || chat.modificando;
  view.querySelector('.mc__gallo-pistas').hidden = chat.mensajes.length > 1;
  const memoria = view.querySelector('[data-gallo-memoria]');
  memoria.checked = chat.memoria;
  memoria.disabled = !chat.retencionDisponible || chat.modificando || chat.enviando;
  const modelo = view.querySelector('[data-gallo-modelo]');
  modelo.checked = chat.usarModelo;
  modelo.disabled = !chat.modeloDisponible || chat.enviando;
  view.querySelector('[data-gallo-modo]').textContent = chat.usarModelo ? 'Respuestas avanzadas' : 'Guía educativa de Visión Pecuaria';
  view.querySelector('[data-gallo-modelo-nota]').hidden = chat.modeloDisponible;
  view.querySelector('[data-gallo-memoria-nota]').hidden = !chat.preferenciasCargadas || chat.retencionDisponible;
  view.querySelector('[data-gallo-borrar]').hidden = !chat.memoria;
  view.querySelector('[data-gallo-confirmar-borrar]').hidden = !chat.confirmaBorrado;
}

async function pedirGallo(body, alRecibir, signal, reintentar = true) {
  const tok = await auth.currentUser?.getIdToken();
  const res = await fetch(API + '/alumno/gallo-ia', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal
  });
  if (res.status === 401 && reintentar) {
    await auth.currentUser?.getIdToken(true);
    return pedirGallo(body, alRecibir, signal, false);
  }
  if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(json?.error || 'Error de conexión'), { status: res.status });
    return json;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 65000) throw new Error('La respuesta supera el tamaño permitido.');
      const bloques = buffer.split(/\r?\n\r?\n/);
      buffer = bloques.pop();
      for (const bloque of bloques) {
        const tipo = bloque.match(/^event:\s*(\S+)/m)?.[1];
        const datos = bloque.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
        if (!datos) continue;
        const evento = JSON.parse(datos);
        if (tipo === 'delta' && typeof evento.texto === 'string') alRecibir(evento.texto);
        if (tipo === 'final') return evento;
        if (tipo === 'error') throw new Error(evento.error || 'La respuesta se interrumpió.');
      }
      if (done) throw new Error('La respuesta se interrumpió.');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function preguntarGallo(texto) {
  const mensaje = texto.trim().slice(0, 1000);
  const chat = GALLO_CHAT;
  if (!mensaje || chat.enviando || chat.modificando) return;
  const historial = chat.mensajes.filter(m => !m.saludo).slice(-8).map(({ rol, texto }) => ({ rol, texto }));
  chat.mensajes.push({ rol: 'usuario', texto: mensaje });
  chat.revision++;
  chat.enviando = true;
  chat.error = '';
  chat.borrador = '';
  chat.parcial = '';
  chat.abort = new AbortController();
  const temporizador = setTimeout(() => chat.abort?.abort(), 40000);
  actualizarGallo();
  try {
    const d = await pedirGallo({ cursoSlug: SLUG, mensaje, historial, usarModelo: chat.usarModelo }, textoParcial => {
      if (GALLO_CHAT === chat) {
        chat.parcial = (chat.parcial + textoParcial).slice(0, 8000);
        actualizarGallo();
      }
    }, chat.abort.signal);
    if (GALLO_CHAT !== chat) return;
    if (typeof d?.respuesta !== 'string' || !d.respuesta.trim()) throw new Error('No recibimos una respuesta.');
    chat.mensajes.push({ rol: 'asistente', texto: d.respuesta, fuentes: d.fuentes, modo: d.modo, turnoId: d.turnoId, pregunta: mensaje });
    if (chat.usarModelo && d.modo === 'guia') chat.error = 'Esta respuesta proviene de la guía educativa.';
  } catch (err) {
    if (GALLO_CHAT !== chat) return;
    chat.mensajes.pop();
    chat.borrador = mensaje;
    chat.error = err.status === 429 ? 'Has enviado varias preguntas. Intenta en unos minutos.' : 'No pudimos responder. Intenta de nuevo o escríbenos por WhatsApp.';
    const entrada = view.querySelector('[data-gallo-pregunta]');
    if (entrada && !entrada.value) entrada.value = mensaje;
  } finally {
    clearTimeout(temporizador);
    if (GALLO_CHAT === chat) {
      chat.abort = null;
      chat.enviando = false;
      chat.parcial = '';
      chat.revision++;
      actualizarGallo();
    }
  }
}

const rutaMemoriaGallo = () => '/alumno/gallo-ia/memoria?cursoSlug=' + encodeURIComponent(SLUG);

async function cargarPreferenciasGallo(chat) {
  if (chat.preferenciasCargadas || chat.consultandoPreferencias) return;
  chat.consultandoPreferencias = true;
  try {
    const d = await api(rutaMemoriaGallo());
    if (GALLO_CHAT !== chat) return;
    chat.preferenciasCargadas = true;
    chat.memoria = Boolean(d.activada);
    chat.retencionDisponible = Boolean(d.retencionDisponible);
    chat.modeloDisponible = Boolean(d.modeloDisponible);
    if (chat.memoria && !chat.enviando && !chat.mensajes.some(m => m.rol === 'usuario') && d.mensajes?.length) {
      chat.mensajes = d.mensajes.filter(m => ['usuario', 'asistente'].includes(m.rol) && typeof m.texto === 'string');
      chat.revision++;
    }
  } catch (_) { /* El chat sigue disponible aunque no se pueda cargar el historial. */ }
  finally {
    if (GALLO_CHAT === chat) {
      chat.consultandoPreferencias = false;
      actualizarGallo();
    }
  }
}

async function cambiarMemoriaGallo(activar) {
  const chat = GALLO_CHAT;
  if (chat.enviando || chat.modificando) return;
  if (!activar && !chat.confirmaBorrado) {
    chat.confirmaBorrado = true;
    actualizarGallo(false);
    return;
  }
  chat.modificando = true;
  chat.error = '';
  actualizarGallo(false);
  try {
    if (activar) await api('/alumno/gallo-ia/memoria', { method: 'PUT', body: { cursoSlug: SLUG, activar: true } });
    else await api(rutaMemoriaGallo(), { method: 'DELETE' });
    if (GALLO_CHAT !== chat) return;
    chat.memoria = activar;
    chat.confirmaBorrado = false;
    if (!activar) {
      chat.mensajes = [{ rol: 'asistente', texto: GALLO_SALUDO, saludo: true }];
      chat.revision++;
    }
    chat.error = activar ? 'Se guardarán los próximos turnos.' : 'Se borró tu historial y se desactivó el guardado.';
  } catch (_) {
    if (GALLO_CHAT === chat) chat.error = 'No pudimos cambiar tu historial. Intenta de nuevo.';
  } finally {
    if (GALLO_CHAT === chat) {
      chat.modificando = false;
      actualizarGallo(false);
    }
  }
}

function vistaGallo() {
  const chat = GALLO_CHAT;
  if (!chat.mensajes.length) chat.mensajes.push({ rol: 'asistente', texto: GALLO_SALUDO, saludo: true });
  view.innerHTML = `<section class="mc__card mc__gallo" aria-labelledby="mc-gallo-title">
    <header class="mc__gallo-header">
      <img src="${GALLO_IMAGEN}" alt="" width="44" height="48">
      <div><h2 id="mc-gallo-title">Mi Gallo IA</h2><p data-gallo-modo></p></div>
      <a class="mc__gallo-ayuda" href="${WA}?text=${encodeURIComponent('Hola, soy alumno de ' + DATA.curso.nombre + ' y tengo una duda.')}" target="_blank" rel="noopener">Soporte humano</a>
    </header>
    <div class="mc__gallo-log" data-gallo-historial role="log" aria-label="Conversación" aria-live="polite" tabindex="0">
      <div class="mc__gallo-turnos" data-gallo-turnos></div>
      <div class="mc__gallo-mensaje" data-gallo-parcial aria-hidden="true" hidden></div>
    </div>
    <div class="mc__gallo-pistas">${PREGUNTAS_GALLO.map(p => `<button type="button" data-gallo-sugerencia>${esc(p)}</button>`).join('')}</div>
    <form class="mc__gallo-form">
      <textarea rows="1" maxlength="1000" data-gallo-pregunta aria-label="Tu pregunta" placeholder="Escribe tu pregunta…"></textarea>
      <button class="mc__btn mc__btn--p" type="submit" data-gallo-enviar>Enviar</button>
    </form>
    <p class="mc__gallo-status" role="status" data-gallo-estado></p>
    <details class="mc__gallo-opciones">
      <summary>Privacidad e historial</summary>
      <label><input type="checkbox" data-gallo-modelo> Usar el modelo avanzado de OpenAI</label>
      <p>Al activarlo, OpenAI procesa tu pregunta y parte de la conversación. Evita escribir nombres, correos, contraseñas o datos de pago. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noopener noreferrer">Uso de datos de OpenAI</a>.</p>
      <p data-gallo-modelo-nota>El modelo avanzado aún no está disponible.</p>
      <label><input type="checkbox" data-gallo-memoria> Guardar mi historial de este curso</label>
      <p>Guarda hasta 24 mensajes durante 30 días desde la última interacción. Puedes desactivar el guardado y borrar el historial.</p>
      <p data-gallo-memoria-nota hidden>El guardado de historial aún no está habilitado.</p>
      <button type="button" data-gallo-borrar hidden>Borrar mi historial guardado</button>
      <div data-gallo-confirmar-borrar hidden>
        <p>Se borrarán los mensajes guardados de este curso y se desactivará el historial.</p>
        <button type="button" data-gallo-confirmar>Confirmar borrado</button>
        <button type="button" data-gallo-cancelar>Cancelar</button>
      </div>
    </details>
  </section>`;
  const form = view.querySelector('.mc__gallo-form');
  const entrada = form.querySelector('[data-gallo-pregunta]');
  entrada.value = chat.borrador;
  entrada.addEventListener('input', () => { chat.borrador = entrada.value; });
  form.onsubmit = e => {
    e.preventDefault();
    if (!entrada.value.trim() || chat.enviando || chat.modificando) return;
    const texto = entrada.value;
    entrada.value = '';
    preguntarGallo(texto);
  };
  view.querySelectorAll('[data-gallo-sugerencia]').forEach(b => { b.onclick = () => preguntarGallo(b.textContent); });
  view.querySelector('[data-gallo-historial]').onclick = e => {
    const boton = e.target.closest('[data-gallo-voto]');
    if (boton) valorarGallo(Number(boton.dataset.turno), boton.dataset.galloVoto);
  };
  view.querySelector('[data-gallo-modelo]').onchange = e => { chat.usarModelo = e.target.checked; actualizarGallo(false); };
  view.querySelector('[data-gallo-memoria]').onchange = e => cambiarMemoriaGallo(e.target.checked);
  view.querySelector('[data-gallo-borrar]').onclick = () => { chat.confirmaBorrado = true; actualizarGallo(false); };
  view.querySelector('[data-gallo-confirmar]').onclick = () => cambiarMemoriaGallo(false);
  view.querySelector('[data-gallo-cancelar]').onclick = () => { chat.confirmaBorrado = false; actualizarGallo(false); };
  actualizarGallo();
  cargarPreferenciasGallo(chat);
}
