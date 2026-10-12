// tr — confianza: descuento, stock, entrega y medios de pago
'use strict';

const Trust = (() => {
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Avisar "quedan N" solo cuando de verdad queda poco.
  const UMBRAL_STOCK = 5;

  /* ── Descuento ─────────────────────────────────────────────────────────── */
  // Sin precio anterior, o si no es mayor al actual, no hay chip. Nunca se
  // inventa un descuento.
  function descuento(precio, antes) {
    const p = Number(precio), a = Number(antes);
    if (!p || !a || a <= p) return null;
    return { pct: Math.round((1 - p / a) * 100), antes: a };
  }

  function descuentoHTML(precio, antes) {
    const d = descuento(precio, antes);
    if (!d) return '';
    return `<span class="dcto"><span class="dcto-chip">-${d.pct}%</span><s class="dcto-antes">${fmt(d.antes)}</s></span>`;
  }

  /* ── Stock ─────────────────────────────────────────────────────────────── */
  function stockHTML(qty) {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0 || n > UMBRAL_STOCK) return '';
    return `<p class="stock-aviso">Quedan <strong>${n}</strong> ${n === 1 ? 'unidad' : 'unidades'}</p>`;
  }

  /* ── Entrega ───────────────────────────────────────────────────────────── */
  // Suma días hábiles saltando sábado y domingo.
  function masHabiles(desde, dias) {
    const d = new Date(desde);
    let quedan = dias;
    while (quedan > 0) {
      d.setDate(d.getDate() + 1);
      const s = d.getDay();
      if (s !== 0 && s !== 6) quedan--;
    }
    return d;
  }

  const corto = d => `${d.getDate()} ${MESES[d.getMonth()]}`;

  // Ordenado (hoy) → En camino (+1 a +2) → Entregado (+3 a +5), en días hábiles.
  function entregaHTML() {
    const hoy = new Date();
    const camino1 = masHabiles(hoy, 1), camino2 = masHabiles(hoy, 2);
    const ent1 = masHabiles(hoy, 3),    ent2 = masHabiles(hoy, 5);
    const pasos = [
      { icono:'carro',  fecha: corto(hoy),                          label:'Ordenado'  },
      { icono:'camion', fecha: `${corto(camino1)} – ${corto(camino2)}`, label:'En camino' },
      { icono:'caja',   fecha: `${corto(ent1)} – ${corto(ent2)}`,   label:'Entregado' },
    ];
    return `<div class="entrega" aria-label="Tiempo estimado de entrega">
        <div class="entrega-linea" aria-hidden="true"></div>
        ${pasos.map(p => `<div class="entrega-paso">
            <span class="entrega-icono">${ICONOS[p.icono]}</span>
            <span class="entrega-fecha">${p.fecha}</span>
            <span class="entrega-label">${p.label}</span>
          </div>`).join('')}
      </div>`;
  }

  /* ── Iconos ────────────────────────────────────────────────────────────── */
  const ICONOS = {
    carro : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.25L20 7H5.3"/></svg>',
    camion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h11v9H2zM13 10h4.2l2.8 3v2.5h-7z"/><circle cx="6.5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    caja  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
    envio : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h11v9H2zM13 10.5h4l3 3V16h-7z"/><circle cx="6.5" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>',
    candado:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
    estrella:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8z"/></svg>',
  };

  /* ── Medios de pago ────────────────────────────────────────────────────── */
  // Marcas dibujadas, no imágenes. No hay que subir ningún archivo.
  function pagosHTML(titulo = true) {
    const marcas = [
      '<span class="pay-pill pay-visa">VISA</span>',
      '<span class="pay-pill pay-mc"><span class="mc-a"></span><span class="mc-b"></span>Mastercard</span>',
      '<span class="pay-pill">Webpay</span>',
      '<span class="pay-pill">Mercado Pago</span>',
      '<span class="pay-pill">Transferencia</span>',
    ].join('');
    return `${titulo ? '<p class="pay-titulo">Medios de pago</p>' : ''}<div class="pay-row">${marcas}</div>`;
  }

  /* ── Tira de confianza ─────────────────────────────────────────────────── */
  function tiraHTML() {
    const { media, total } = Reviews.resumen();
    const items = [
      { i:'envio',   t:'Envío a todo Chile',   s:'Despacho en 24 h hábiles' },
      { i:'escudo',  t:'Calidad garantizada',  s:'Cambio por falla de fábrica' },
      { i:'candado', t:'Pago seguro',          s:'Procesado por Mercado Pago' },
      { i:'estrella',t:`${Number(media).toFixed(1).replace('.', ',')} de 5 estrellas`, s:`${total} clientes ya opinaron` },
    ];
    const uno = items.map(x => `<div class="tira-item">
        <span class="tira-icono">${ICONOS[x.i]}</span>
        <div><p class="tira-t">${x.t}</p><p class="tira-s">${x.s}</p></div>
      </div>`).join('');
    // Duplicada, porque en el teléfono se desliza sola de 0 a -50% y sin la
    // copia se vería el salto al reiniciar. En escritorio la segunda mitad
    // queda oculta: ahí es una rejilla de cuatro y no hay movimiento.
    return `<div class="tira-pista">${uno}${uno}</div>`;
  }

  /* ── Decorar tarjetas ya pintadas ──────────────────────────────────────── */
  // Corre sobre la grilla y el carrusel, vengan del fallback o de Supabase.
  function decorarTarjetas() {
    document.querySelectorAll('.product-card, .csl-slide').forEach(card => {
      const slug   = card.dataset.id;
      const precio = Number(card.dataset.price);
      const antes  = card.dataset.compare;
      const stock  = card.dataset.stock;

      const precioEl = card.querySelector('.card-price, .csl-price');
      if (precioEl && !card.querySelector('.dcto')) {
        const html = descuentoHTML(precio, antes);
        if (html) precioEl.insertAdjacentHTML('afterend', html);
      }

      const info = card.querySelector('.card-info');
      // El hueco de las estrellas ya está en la tarjeta y mide siempre lo
      // mismo, tenga o no reseñas: así las tarjetas quedan parejas entre sí.
      if (info && !card.querySelector('.card-stars')) {
        const hueco = info.querySelector('.card-stars-wrap');
        const estrellas = Reviews.miniEstrellas(slug);
        if (hueco) hueco.innerHTML = estrellas;
        else if (estrellas) info.querySelector('.card-name')?.insertAdjacentHTML('afterend', estrellas);
      }

      if (info && !card.querySelector('.stock-aviso')) {
        const html = stockHTML(stock);
        if (html) info.querySelector('.card-foot')?.insertAdjacentHTML('beforebegin', html);
      }
    });
  }

  function init() {
    const tira = document.getElementById('tiraConfianza');
    if (tira) tira.innerHTML = tiraHTML();

    const pagos = document.getElementById('footerPagos');
    if (pagos) pagos.innerHTML = pagosHTML();

    decorarTarjetas();
  }

  return { init, decorarTarjetas, descuento, descuentoHTML, stockHTML, entregaHTML, pagosHTML, ICONOS };
})();
