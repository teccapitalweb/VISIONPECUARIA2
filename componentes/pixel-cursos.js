(() => {
  const pixelId = '2380050672518265';
  const slug = location.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '');
  if (!['gallinas-de-postura', 'embutidos-artesanales'].includes(slug)) return;
  const datosCurso = { content_name: slug, content_ids: [slug], content_type: 'product' };
  const comprasMedidas = new Set();
  let iniciado = false;
  let checkoutMedido = false;

  function iniciar() {
    if (iniciado || new URLSearchParams(location.search).has('session_id')) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    window.fbq('track', 'ViewContent', datosCurso);
    iniciado = true;
  }

  function datosCheckout() {
    try {
      const cookie = nombre => document.cookie.split(';').map(s => s.trim())
        .find(s => s.startsWith(nombre + '='))?.slice(nombre.length + 1);
      const fbp = cookie('_fbp');
      const fbclid = new URLSearchParams(location.search).get('fbclid') || '';
      const fbc = cookie('_fbc') || (/^[\w.-]{5,450}$/.test(fbclid) ? 'fb.1.' + Date.now() + '.' + fbclid : null);
      return fbp || fbc ? { fbp, fbc } : undefined;
    } catch (_) {}
  }

  function checkoutMontado({ oferta }) {
    if (!iniciado || checkoutMedido) return;
    try {
      const precio = document.querySelector('[data-precio-actual]')?.textContent;
      const value = oferta?.montoCentavos > 0 ? oferta.montoCentavos / 100 : Number(precio?.replace(/[^\d.]/g, ''));
      const currency = oferta?.moneda?.toUpperCase() || 'MXN';
      window.fbq('track', 'InitiateCheckout', { ...datosCurso, ...(value > 0 ? { value, currency } : {}) });
      checkoutMedido = true;
    } catch (_) {}
  }

  function compraConfirmada(pago) {
    const eventID = pago.pixelPurchaseEventId;
    if (!iniciado || pago.pagado !== true || pago.slug !== slug || !Number.isFinite(pago.monto) ||
        pago.monto <= 0 || !/^vp_purchase_[0-9a-f]{64}$/.test(eventID) || comprasMedidas.has(eventID)) return;
    const clave = 'vp_px_compra_' + eventID;
    try { if (localStorage.getItem(clave)) return; } catch (_) {}
    try {
      window.fbq('track', 'Purchase', {
        ...datosCurso, value: pago.monto, currency: pago.moneda?.toUpperCase() || 'MXN'
      }, { eventID });
      comprasMedidas.add(eventID);
      try { localStorage.setItem(clave, '1'); } catch (_) {}
    } catch (_) {}
  }

  window.vpPx = { iniciar() { try { iniciar(); } catch (_) {} }, datosCheckout, checkoutMontado, compraConfirmada };
  window.vpPx.iniciar();
})();
