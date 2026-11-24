const SIGUIENTE = new Map([
  ['gallinas-de-postura', {
    slug: 'embutidos-artesanales',
    nombre: 'Embutidos',
    portada: '/assets/curso-chorizo/hero-chef-640.webp'
  }],
  ['embutidos-artesanales', {
    slug: 'gallinas-de-postura',
    nombre: 'Gallinas de Postura',
    portada: 'https://cdn.jsdelivr.net/gh/teccapitalweb/VISIONPECUARIA2@main/portadas/gallinas-1.jpg'
  }]
]);

const mostrados = new Set();
const estilos = `
  .vp-siguiente { width: min(440px, calc(100% - 28px)); max-width: none; max-height: calc(100% - 28px);
    padding: 0; border: 1px solid #dce6da; border-radius: 18px; background: #fff; color: #193322;
    box-shadow: 0 24px 60px #0b24194d; font: 400 1rem/1.5 Inter, system-ui, sans-serif; }
  .vp-siguiente::backdrop { background: #0e251bb3; }
  .vp-siguiente__portada { display: block; width: 100%; max-height: 165px; aspect-ratio: 2.6; object-fit: cover; }
  .vp-siguiente__contenido { padding: clamp(16px, 6vw, 25px); }
  .vp-siguiente__estado { margin: 0 0 5px; color: #21663d; font-size: .85rem; font-weight: 750; }
  .vp-siguiente h2 { margin: 0; color: inherit; font: 800 clamp(1.25rem, 5vw, 1.65rem)/1.2 Archivo, system-ui, sans-serif; }
  .vp-siguiente__acciones { display: flex; flex-wrap: wrap; justify-content: end; gap: 8px; margin-top: 20px; }
  .vp-siguiente__acciones :is(button, a) { display: inline-flex; min-height: 44px; align-items: center; justify-content: center;
    padding: 0 15px; border: 1px solid #cddcd0; border-radius: 9px; color: #1b4930; background: #fff;
    font: 700 .91rem/1.2 Inter, system-ui, sans-serif; cursor: pointer; text-decoration: none; }
  .vp-siguiente__acciones a { background: #17623d; border-color: #17623d; color: #fff; }
  .vp-siguiente__acciones :is(button, a):focus-visible { outline: 2px solid #275e8d; outline-offset: 2px; }
`;

export function mostrarSiguienteCurso({ slug, uid, cursos, clases, progreso, claseId }) {
  const destino = SIGUIENTE.get(slug);
  const clave = uid + ':' + slug;
  if (!destino || !uid || mostrados.has(clave) || document.querySelector('dialog[open]')) return;
  if (progreso.clases?.[claseId]?.completada !== true || clases.some(clase => clase.estado !== 'publicada')) return;

  const inscrito = cursos.some(curso => curso.slug === destino.slug);
  const enlace = inscrito ? '/aula/#/curso/' + destino.slug :
    '/' + destino.slug + '.html?' + new URLSearchParams({ vp_desde: slug });
  const aviso = document.createElement('dialog');
  if (typeof aviso.showModal !== 'function') return;
  aviso.className = 'vp-siguiente';
  aviso.dataset.vpOfertaCompletado = '';
  aviso.setAttribute('aria-labelledby', 'vp-siguiente-titulo');
  aviso.innerHTML = `<style>${estilos}</style>
    <img class="vp-siguiente__portada" src="${destino.portada}" alt="" width="440" height="165">
    <div class="vp-siguiente__contenido">
      <p class="vp-siguiente__estado">¡Curso completado!</p>
      <h2 id="vp-siguiente-titulo">Ahora continúa con el curso de ${destino.nombre}</h2>
      <form method="dialog" class="vp-siguiente__acciones">
        <button type="submit" autofocus>Ahora no</button><a href="${enlace}">${inscrito ? 'Abrir curso' : 'Ver curso'}</a>
      </form>
    </div>`;
  const cerrar = () => aviso.close();
  aviso.querySelector('img').addEventListener('error', e => e.target.remove(), { once: true });
  aviso.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); });
  aviso.addEventListener('close', () => {
    window.removeEventListener('hashchange', cerrar);
    aviso.remove();
  }, { once: true });
  document.body.appendChild(aviso);
  aviso.showModal();
  mostrados.add(clave);
  window.addEventListener('hashchange', cerrar);
}
