"""Inyecta componentes/mi-curso.html en las landings (las landings se sirven solas, sin assets propios).
Uso: python3 componentes/inyectar.py   (idempotente: reemplaza el bloque entre MI-CURSO:INICIO y MI-CURSO:FIN)"""
import re, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
comp = (raiz / 'componentes/mi-curso.html').read_text(encoding='utf-8').strip()
for nombre in ('gallinas-de-postura.html', 'embutidos-artesanales.html'):
    p = raiz / nombre
    s = p.read_text(encoding='utf-8')
    s = re.sub(r'<!-- MI-CURSO:INICIO.*?<!-- MI-CURSO:FIN -->\n?', '', s, flags=re.S)
    # «Ya compré» abre el aula del curso dentro de la misma landing
    s = re.sub(r'href="/aula/\?curso=[a-z\-]+"', 'href="#mi-curso"', s)
    # Sin botón «Detener movimiento» en el carrusel
    s = s.replace('  <div class="vt__controls"><button type="button" class="vt__toggle" aria-pressed="false" hidden>Detener movimiento</button></div>\n', '')
    i = s.rindex('</body>')
    s = s[:i] + comp + '\n' + s[i:]
    p.write_text(s, encoding='utf-8')
    print(nombre, 'ok', s.count('href="#mi-curso"'), 'enlaces', s.count('vt__toggle" aria'), 'toggle')
