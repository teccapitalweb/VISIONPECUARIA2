# 🚀 DEPLOY FASE 2 · Landing de venta del curso Chorizo y Embutidos

**Tiempo total: 10-15 min · Riesgo: bajo** (todo se agrega, no reemplaza nada del sitio principal)

---

## 📦 Estructura de archivos a subir

Todo va al repo **`teccapitalweb/VISIONPECUARIA2-main`** (el sitio público `visionpecuariamx.com`).

```
VISIONPECUARIA2-main/                          ← repo raíz
├── embutidos-artesanales.html                 ← 🆕 LANDING PRINCIPAL
├── setup-crear-curso.html                     ← 🆕 SETUP (solo para crear el curso en Firestore)
└── assets/                                    ← 🆕 CARPETA NUEVA
    ├── brand/
    │   ├── logo-vp.png                        ← logo con fondo transparente
    │   ├── logo-vp-300.png
    │   ├── toro-512.png
    │   ├── favicon.ico
    │   ├── favicon-16.png
    │   ├── favicon-32.png
    │   ├── favicon-180.png
    │   ├── favicon-192.png
    │   ├── favicon-512.png
    │   ├── apple-touch-icon.png
    │   └── og-image.jpg                       ← preview WhatsApp/FB
    ├── css/
    │   └── curso-landing.css                  ← estilos de la landing
    ├── js/
    │   └── checkout-curso.js                  ← lógica de checkout
    └── curso-chorizo/
        ├── hero-chef-640.jpg + .webp
        ├── hero-chef-1024.jpg + .webp
        ├── hero-chef-1600.jpg + .webp
        ├── hero-chef-2400.jpg + .webp
        ├── hero-chef-lqip.jpg
        ├── instructor-castillo-400.jpg + .webp
        ├── instructor-castillo-800.jpg + .webp
        ├── preview-recetario.mp4
        ├── recetario-embutidos.pdf
        └── calculadora-embutidos.xlsx
```

---

## ✅ Pasos (en orden)

### PASO 1 · Subir todos los archivos a GitHub

**Forma más rápida (drag & drop):**

1. Abre `github.com/teccapitalweb/VISIONPECUARIA2-main`
2. Botón `Add file → Upload files`
3. Arrastra la carpeta `assets/` completa (con toda su estructura)
4. Arrastra `embutidos-artesanales.html` a la raíz
5. Arrastra `setup-crear-curso.html` a la raíz
6. Mensaje del commit: `Fase 2: landing curso embutidos`
7. Botón verde: `Commit changes`

GitHub Pages auto-publica en 1-2 min.

### PASO 2 · Verificar assets

Abre en el navegador:

- `https://visionpecuariamx.com/assets/brand/logo-vp.png` → debe verse el logo VP con fondo transparente
- `https://visionpecuariamx.com/assets/curso-chorizo/hero-chef-1024.jpg` → debe verse la foto de la chef
- `https://visionpecuariamx.com/assets/curso-chorizo/recetario-embutidos.pdf` → debe abrir el PDF

Si algo da 404, revisa que la ruta esté exacta (case-sensitive).

### PASO 3 · Crear el curso en Firestore (una sola vez)

1. Abre `https://visionpecuariamx.com/setup-crear-curso.html`
2. Inicia sesión con Google (la misma cuenta que sea admin en el proyecto)
3. Debe salir el mensaje verde ✅ "eres admin"
4. Botón **"🚀 Crear los 2 documentos"**
5. Espera a ver:
   - ✅ Instructor creado
   - ✅ Curso creado con cupoLanzamientoTomados=0
6. **⚠️ CIERRA Y BÓRRALA de la vista pública** — esta página solo debía servir para el setup inicial. Podemos:
   - **Opción A:** dejarla ahí (protegida por reglas, cualquier no-admin recibe error)
   - **Opción B:** en un segundo commit, borra `setup-crear-curso.html` del repo

### PASO 4 · Probar la landing

Abre `https://visionpecuariamx.com/embutidos-artesanales.html`

Debe verse:
- ✅ Hero con foto de la chef + badge "Disponible desde 27 de julio 2026"
- ✅ Card de precio con $450 tachado $550 + barra de cupo (15/15 disponibles)
- ✅ Pestañas: Qué aprenderás / Qué incluye / Temario / Dirigido a
- ✅ Temario en acordeón (uno abierto a la vez)
- ✅ Sección del instructor MVZ Castillo García con foto real
- ✅ Video del recetario
- ✅ FAQ colapsable
- ✅ Aviso de privacidad al final
- ✅ En móvil: barra sticky abajo con "Inscribirme"

### PASO 5 · Probar el flujo de compra END-TO-END

**Con tarjeta de prueba Stripe:**
1. Botón "Inscribirme ahora"
2. Debe abrir modal auth → clic "Continuar con Google"
3. Elige cuenta → modal cierra, se abre modal checkout
4. Stripe checkout debe montarse dentro del modal (NO redirect)
5. Pon tarjeta: `4242 4242 4242 4242` · fecha futura · CVC 123 · CP 12345
6. Confirmar → debe redirigir a `curso-acceso.html?slug=...&session_id=...`

**Verificar en Firestore que el webhook procesó:**
- `comprasCurso/{sessionId}` → debe existir con `estado: 'confirmado'`
- `accesosCurso/{tuUID}/cursos/embutidos-artesanales` → debe existir con `activo: true`
- `cursosVenta/embutidos-artesanales.cupoLanzamientoTomados` → debe ser 1

Si algo falla, revisa **Railway → Logs** para ver qué respondió el webhook.

---

## ⚠️ Cosas que quedan pendientes para próxima entrega (Fase 3)

1. **`curso-acceso.html`** — página con el player de videos y descargables (donde llegan los inscritos)
2. **Subir los videos** al bucket `visionpecuaria-vip.firebasestorage.app/cursos/embutidos-artesanales/clase-XX.mp4`
3. **Actualizar la lista de clases** en Firestore con el número real de clases y duración correcta
4. **⚠️ VERIFICAR STRIPE PUBLISHABLE KEY** — en `assets/js/checkout-curso.js` línea 23 puse la publishable key `pk_live_51SJfmz...`. Si Britney ve que el checkout no monta, mándame la **publishable key correcta** de la cuenta de Stripe Live de Visión Pecuaria (empieza con `pk_live_`, no la secret `sk_live_`).

---

## 🔧 Cosas editables desde el admin (Fase 4) sin tocar código

Todo el contenido del curso vive en Firestore `cursosVenta/embutidos-artesanales`. Se puede editar en la consola Firebase o desde el módulo admin (Fase 4):

- `nombre`, `subtitulo`, `descripcion`
- `precioNormalCentavos`, `precioLanzamientoCentavos`
- `cupoLanzamientoMax` (para relanzar el curso: bajar `cupoLanzamientoTomados` a 0 desde Admin SDK)
- `fechaInicioTexto`, `duracionHoras`, `modalidad`
- `queAprenderas`, `queIncluye`, `dirigidoA`, `temario`
- `clases` (lista de videos con storagePath)
- `linkClaseEnVivo` (para el día que quieran hacer sesión Q&A live)
- `estado`: `'publicado'` | `'borrador'` (pausa las ventas)

La landing lee todo esto en tiempo real vía Firestore snapshot — cambias un precio, se actualiza al instante en todos los navegadores abiertos.

---

## 🆘 Troubleshooting

**Landing carga pero el card de precio dice "$450" fijo y no reactivo:**
El JS no puede leer `cursosVenta/embutidos-artesanales`. Verifica que ejecutaste el PASO 3 (setup) y que el doc existe.

**Modal de Google se abre pero no autentica:**
Verifica en Firebase Console → Authentication → Sign-in method → que Google esté habilitado. Ya debería estar (lo usa el portal VIP).

**Checkout muestra "No pudimos iniciar el pago":**
El webhook está rechazando. Ve a Railway → Logs → busca la línea `❌ Error crear-checkout-curso`. Los errores más comunes:
- `Curso no encontrado` → no ejecutaste el setup
- `Este curso no está disponible` → `estado` no es `'publicado'` en Firestore
- `Ya tienes acceso a este curso` → estás probando con una cuenta que ya compró; usa una cuenta distinta

**Stripe muestra "publishable key inválida":**
Ver punto ⚠️ arriba — necesito la publishable key correcta.

**El video preview no reproduce en iPhone:**
Ya lleva `playsinline` y `preload="metadata"`. Si aún así no jala, verifica que el archivo `.mp4` sí se subió a `assets/curso-chorizo/preview-recetario.mp4`.

---

## 📱 Cosas verificadas para móvil (billion-dollar level)

- ✅ Viewport meta con `viewport-fit=cover` para iPhone con notch
- ✅ Touch targets ≥ 44×44px en todos los botones
- ✅ Sticky CTA respeta `env(safe-area-inset-bottom)`
- ✅ Pestañas con scroll horizontal snap para tabs que no quepan
- ✅ Modales estilo bottom-sheet en móvil, centrados en desktop
- ✅ Fuentes con `font-display: swap` (no bloquea render)
- ✅ Hero image con `srcset` a 4 resoluciones (WebP + JPG fallback)
- ✅ Preload del hero para LCP < 2.5s
- ✅ Sin `input[type=date]` ni dropdowns nativos feos
- ✅ Tap highlights limpios (`-webkit-tap-highlight-color: transparent`)
- ✅ Prefers-reduced-motion respetado

---

## 🎯 Estructura de la entrega en el ZIP

Descomprime y arrastra tal cual a GitHub — mantiene la estructura correcta.
