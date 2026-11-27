const ORIGEN = "https://raw.githubusercontent.com/teccapitalweb/VISIONPECUARIA2/main/";
const VERSION_AULA = "85a716d";
const VERSION_EMBUTIDOS = "precio-inicial-20261127";
const EMBUTIDOS = "embutidos-artesanales.html";
const CACHE_PRECIO = 30;
const CAMPOS_PRECIO = new URLSearchParams(
  ["activo", "precioNormalCentavos", "precioLanzamientoCentavos", "precioNormal", "precioLanzamiento"]
    .map(campo => ["mask.fieldPaths", campo])
);
const PRECIO_EMBUTIDOS = "https://firestore.googleapis.com/v1/projects/visionpecuaria-vip/databases/(default)/documents/cursosVenta/embutidos-artesanales?" + CAMPOS_PRECIO;

const RUTAS = {
  "/gallinas-de-postura": "gallinas-de-postura.html",
  "/gallinas-de-postura.html": "gallinas-de-postura.html",
  "/embutidos-artesanales": EMBUTIDOS,
  "/embutidos-artesanales.html": EMBUTIDOS,
  "/contador-cierre.js": "contador-cierre.js",
  "/curso-acceso": "curso-acceso.html",
  "/curso-acceso.html": "curso-acceso.html",
  "/aula": "aula/index.html",
  "/aula/index.html": "aula/index.html",
  "/aula/aula.js": "aula/aula.js",
  "/aula/firebase-aula.js": "aula/firebase-aula.js",
  "/aula/aula.css": "aula/aula.css"
};
const SEGURIDAD = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};
const TIPOS = {
  js: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  html: "text/html; charset=utf-8"
};

async function leerPrecioEmbutidos() {
  try {
    const respuesta = await fetch(PRECIO_EMBUTIDOS, {
      signal: AbortSignal.timeout(1200),
      cf: { cacheEverything: true, cacheTtlByStatus: { "200": CACHE_PRECIO, "400-599": 0 } }
    });
    if (!respuesta.ok) return null;
    const { fields } = await respuesta.json();
    const numero = campo => {
      const valor = fields?.[campo];
      return valor ? Number(valor.integerValue ?? valor.doubleValue ?? valor.stringValue) : undefined;
    };
    const normalC = numero("precioNormalCentavos");
    const normalPesos = Math.round(numero("precioNormal") * 100);
    // La misma prioridad que usa el checkout para documentos actuales y anteriores.
    const actual = (numero("precioLanzamientoCentavos") ?? normalC)
      || Math.round(numero("precioLanzamiento") * 100) || normalPesos;
    return { actual, normal: normalC || normalPesos, activo: fields?.activo?.booleanValue !== false };
  } catch (_) {
    return null;
  }
}

function aplicarPrecio(respuesta, { actual, normal, activo }) {
  const html = new HTMLRewriter();
  const ocultar = { element: el => el.remove() };
  if (!activo || !Number.isSafeInteger(actual) || actual <= 0) {
    return html.on("[data-precio-visible]", ocultar).transform(respuesta);
  }
  const fmt = centavos => (centavos / 100).toLocaleString("es-MX", {
    minimumFractionDigits: centavos % 100 ? 2 : 0,
    maximumFractionDigits: 2
  });
  const monto = fmt(actual);
  const cifras = {
    "precio-actual": monto,
    "precio-actual-full": "$" + monto + " MXN",
    "precio-corto": "$" + monto,
    "precio-btn": "$" + monto
  };
  if (Number.isSafeInteger(normal) && normal > actual) {
    const ahorro = normal - actual;
    cifras["precio-antes"] = "$" + fmt(normal) + " MXN";
    cifras.ahorro = "$" + fmt(ahorro) + " pesos";
    cifras.descuento = Math.round(ahorro / normal * 100) + "%";
  } else {
    html.on("[data-precio-comparacion]", ocultar);
  }
  for (const [atributo, texto] of Object.entries(cifras)) {
    html.on("[data-" + atributo + "]", { element: el => el.setInnerContent(texto) });
  }
  return html.transform(respuesta);
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const ruta = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const archivo = Object.hasOwn(RUTAS, ruta) ? RUTAS[ruta] : null;
    if (!archivo || (req.method !== "GET" && req.method !== "HEAD")) return fetch(req);
    try {
      const origen = new URL(archivo, ORIGEN);
      if (archivo === EMBUTIDOS) {
        origen.searchParams.set("vp-release", VERSION_EMBUTIDOS);
      } else if (archivo.startsWith("aula/") || archivo === "gallinas-de-postura.html") {
        origen.searchParams.set("vp-release", VERSION_AULA);
      }
      const [r, precio] = await Promise.all([
        fetch(origen, { cf: { cacheTtl: 120, cacheEverything: true } }),
        archivo === EMBUTIDOS && req.method === "GET" ? leerPrecioEmbutidos() : null
      ]);
      if (!r.ok) throw new Error("github " + r.status);
      const cuerpo = await r.text();
      if (cuerpo.length < 500) throw new Error("respuesta vacia");
      const tipo = TIPOS[archivo.split(".").pop()];
      const respuesta = new Response(req.method === "HEAD" ? null : cuerpo, {
        headers: {
          "content-type": tipo,
          "cache-control": archivo === EMBUTIDOS ? "public, max-age=" + CACHE_PRECIO : "public, max-age=120",
          "x-vp-landing": "github-main",
          ...SEGURIDAD
        }
      });
      if (!precio) return respuesta;
      respuesta.headers.set("x-vp-precio", "servidor");
      return aplicarPrecio(respuesta, precio);
    } catch (_) {
      return fetch(req);
    }
  }
};
