// bn — banners del hero + tarjetas de categoría
'use strict';

/* ════════════════════════════════════════════════════════════════════════════
   ZONA EDITABLE — acá pegás las rutas de tus imágenes.

   Mientras 'desktop' esté vacío se ve el rectángulo punteado con la medida.
   Apenas pegás la ruta, el punteado desaparece solo.

   Medidas:
     desktop → 1920 × 560 px
     mobile  → 1080 × 1080 px  · si lo dejás vacío se usa el de desktop

   Los que faltan muestran el hueco punteado con el nombre de archivo que
   esperan. Guardás la imagen con ese nombre en images/ y la pegás en
   'desktop'. El orden de esta lista es el orden en que se ven.

   'producto' es el slug al que lleva el banner: al hacer clic se abre la
   ficha de ese producto. 'categoria' abre la sección de esa categoría. Si en
   lugar de los dos ponés 'link', va a esa ancla.

   ⚠ Desde que existe /admin, esta lista es solo el punto de partida: si hay
   algo guardado en el panel, eso gana y lo de acá no se usa. Editá en el
   panel salvo que quieras cambiar el valor de arranque.
   ════════════════════════════════════════════════════════════════════════════ */
let BANNERS = [
  // principalhero.png en pausa. Para traerlo de vuelta, borrá las dos barras:
  // { desktop:'images/principalhero.webp', mobile:'', alt:'Essential Tech · Tecnología al por mayor', link:'#ofertas' },
  { desktop:'images/bannerdos.webp',     mobile:'images/bannerdoscelu.webp',    alt:'AirPods Pro 3',        producto:'airpods-3' },
  { desktop:'images/bannertres.webp',    mobile:'images/bannertrescelu.webp',   alt:'Apple Watch Serie 11', producto:'apple-watch-serie-10' },
  { desktop:'images/CUATRO.webp',         mobile:'images/batterypackbannercelu.webp', alt:'Batería MagSafe',      producto:'bateria-magsafe' },
  { desktop:'images/eliguetuproximoiphone.webp',   mobile:'images/medidacelulareliguetuproximoiphone.webp',  alt:'Celulares',            categoria:'celulares' },
];

// Banner ancho de promoción (va entre la grilla y las reseñas) → 2400 × 600 px
const PROMO_BANNER = { desktop:'', mobile:'', archivo:'bannerpromo.webp', alt:'Promoción', link:'#ofertas' };

// Imagen alta de la izquierda en la fila de ofertas → 620 × 714 px
// En el teléfono va arriba y apaisada → 1080 × 470 px
const OFERTA_LATERAL = { desktop:'images/banneroferta.webp', mobile:'images/bannerofertacelu.webp', alt:'Ofertas del mes', link:'#ofertas' };

// Mensajes de la cinta de arriba. Se repiten en bucle, uno tras otro.
const CINTA = [
  'Calidad Garantizada',
  '+500 Clientes',
  'Pago Seguro',
  'Envío Express',
  'Distribución Mayorista',
];

// Velocidad de la cinta, en píxeles por segundo. Más chico = más lenta.
const CINTA_VELOCIDAD = 28;

// Lo que separa un mensaje del otro. Es el mismo archivo que subiste; solo
// cambia el nombre, sin la ñ, porque en una URL da problemas de servidor.
const CINTA_SEPARADOR = 'images/logo-cinta.webp';

/* Tarjetas de categoría en puzzle. El orden de la lista es el de la pantalla:

     ┌─────────┬─────────┬─────────┐
     │         │    2    │         │
     │    1    ├─────────┤    4    │     1 y 4 altas · 2 y 3 bajas
     │         │    3    │         │
     └─────────┴─────────┴─────────┘

   'arriba' es la línea chica y 'titulo' la grande. 'desde' es el precio del
   recuadro; si lo dejás vacío no se muestra el recuadro.
   'cat' es la categoría del catálogo (js/sd.js) que se abre al hacer clic.
   'banner' es la imagen ancha que encabeza esa sección cuando se abre:
   va sola arriba de todo, sin nada más. Medida → 1920 × 558 px.
   'bannerMobile' es la del teléfono → 1080 × 810 px. Vacío = usa la de arriba.
   Cada hueco dice qué archivo espera y en qué medida exportarlo.          */
let CATEGORIAS = [
  { arriba:'Lo mejor en', titulo:'Audífonos',  desde:'$14.000', cat:'audifonos',  img:'images/cat-audifonos.webp',  medida:'800 × 1000', banner:'images/audifonoscategorias.webp', bannerMobile:'images/aurifonoscategoriacelu.webp', bannerArchivo:'banner-audifonos.webp'  },
  { arriba:'Todo en',     titulo:'Smartwatch', desde:'$29.990', cat:'smartwatch', img:'images/smarwacth.webp',      medida:'800 × 500',  banner:'images/categoriasmarwatch.webp', bannerMobile:'images/relojescategoriacelu.webp', bannerArchivo:'banner-smartwatch.webp' },
  { arriba:'Todo en',     titulo:'iPhone',     desde:'$15.000', cat:'celulares',  img:'images/iphone.webp',         medida:'800 × 500',  banner:'images/iphonescategoria.webp', bannerMobile:'images/iphonecategoriacelu.webp', bannerArchivo:'banner-celulares.webp'  },
  { arriba:'Todo en',     titulo:'Cargadores', desde:'$5.000',  cat:'cargadores', img:'images/categoriacargadoress.webp', medida:'800 × 1000', banner:'images/categoriacargadores.webp', bannerMobile:'images/cargadorescelu.webp', bannerArchivo:'banner-cargadores.webp' },
];

// Banner de la sección "todo el catálogo" (el enlace Productos de la nav).
const BANNER_TODOS = { banner:'images/bannertodoelcatalogocelular.webp', bannerMobile:'images/bannertodoelcatalogo.webp', bannerArchivo:'banner-catalogo.webp' };
/* ═══════════════════════════ FIN ZONA EDITABLE ═════════════════════════════ */


const Banners = (() => {
  let swiper = null;

  // Imagen responsive. Sin ruta → hueco punteado con la medida escrita.
  // El primer banner es lo primero que ve el visitante, así que carga con
  // prioridad alta; los demás esperan a que haga falta (lazy).
  function media(item, w, h, clase, primero = false) {
    if (!item.desktop) {
      // El hueco dice qué archivo espera, para no tener que adivinarlo.
      const nombre = item.archivo
        ? `<span class="slot-archivo">${escTxt(item.archivo)}</span>`
        : '';
      return `<div class="slot ${clase}" data-medida="${w} × ${h}">${nombre}</div>`;
    }
    const mob = item.mobile || item.desktop;
    const carga = primero
      ? 'fetchpriority="high" decoding="sync"'
      : 'loading="lazy" decoding="async"';
    return `<picture class="${clase}">
        <source media="(max-width:700px)" srcset="${escAttr(mob)}">
        <img src="${escAttr(item.desktop)}" alt="${escAttr(item.alt || '')}" width="${w}" height="${h}" ${carga}>
      </picture>`;
  }

  function slide(item, i) {
    const inner = media(item, '1920', '560', 'bnr-media', i === 0);
    if (!item.desktop) return `<div class="swiper-slide bnr-slide">${inner}</div>`;

    if (item.producto) {
      return `<div class="swiper-slide bnr-slide">
          <a href="#" class="bnr-link" data-producto="${escAttr(item.producto)}">${inner}</a>
        </div>`;
    }
    if (item.categoria) {
      return `<div class="swiper-slide bnr-slide">
          <a href="#panel" class="bnr-link" data-cat-abrir="${escAttr(item.categoria)}">${inner}</a>
        </div>`;
    }
    return item.link
      ? `<div class="swiper-slide bnr-slide"><a href="${escAttr(item.link)}" class="bnr-link">${inner}</a></div>`
      : `<div class="swiper-slide bnr-slide">${inner}</div>`;
  }

  function categoria(c) {
    const img = c.img
      ? `<img src="${escAttr(c.img)}" alt="${escAttr(c.titulo)}" loading="lazy" decoding="async">`
      : `<div class="slot cat-slot" data-medida="${escAttr(c.medida || '800 × 1000')}">` +
        (c.archivo ? `<span class="slot-archivo">${escTxt(c.archivo)}</span>` : '') +
        `</div>`;
    // No lleva a otra página: abre el panel de esa categoría acá mismo.
    // Solo categoría y nombre: el precio lo decide cada producto, no la tarjeta.
    return `<a href="#panel" class="cat-card" data-cat="${escAttr(c.cat || '')}" data-cat-abrir="${escAttr(c.cat || '')}">
        <div class="cat-media">${img}</div>
        <div class="cat-body">
          <div class="cat-texto">
            <span class="cat-arriba">${escTxt(c.arriba || '')}</span>
            <h3 class="cat-titulo">${escTxt(c.titulo)}</h3>
          </div>
        </div>
      </a>`;
  }

  function renderBanners() {
    const wrap = document.getElementById('bnrWrapper');
    if (!wrap) return;
    wrap.innerHTML = BANNERS.map(slide).join('');

    if (typeof Swiper === 'undefined') return;
    swiper = new Swiper('.bnr-swiper', {
      loop: BANNERS.length > 1,
      speed: 650,
      // Sin pauseOnMouseEnter: la cinta de banners nunca se detiene, ni al
      // pasar el ratón por encima. Antes se frenaba y parecía trabada.
      autoplay: reduceMotion() ? false : { delay: 6000, disableOnInteraction: false },
      keyboard: { enabled: true, onlyInViewport: true },
      navigation: { prevEl: '.bnr-arr-prev', nextEl: '.bnr-arr-next' },
      pagination: { el: '.bnr-pagination', clickable: true },
      a11y: { prevSlideMessage: 'Banner anterior', nextSlideMessage: 'Banner siguiente' },
    });
  }

  function renderPromo() {
    const el = document.getElementById('promoBanner');
    if (!el) return;
    const inner = media(PROMO_BANNER, '2400', '600', 'promo-media');
    el.innerHTML = PROMO_BANNER.link && PROMO_BANNER.desktop
      ? `<a href="${escAttr(PROMO_BANNER.link)}" class="promo-link">${inner}</a>`
      : inner;
  }

  function renderCategorias() {
    const el = document.getElementById('catGrid');
    if (el) el.innerHTML = CATEGORIAS.map(categoria).join('');
  }

  // Banner que encabeza la sección de una categoría. Mientras no haya imagen
  // se ve el hueco punteado con la medida, igual que los demás.
  function bannerCategoria(cat) {
    const c = CATEGORIAS.find(x => x.cat === cat) || BANNER_TODOS;
    const item = { desktop: c.banner || '', mobile: c.bannerMobile || '', archivo: c.bannerArchivo, alt: c.titulo || 'Catálogo' };
    return media(item, '1920', '558', 'cpage-banner-media', true);
  }

  function renderOfertaLateral() {
    const el = document.getElementById('ofertaLateral');
    if (!el) return;
    const inner = media(OFERTA_LATERAL, '620', '714', 'oferta-media');
    el.innerHTML = OFERTA_LATERAL.link && OFERTA_LATERAL.desktop
      ? `<a href="${escAttr(OFERTA_LATERAL.link)}" class="oferta-link">${inner}</a>`
      : inner;
  }

  // La cinta nunca puede quedar con un hueco. La animación corre de 0 a -50%,
  // así que el contenido tiene que estar duplicado Y cada mitad tiene que ser
  // más ancha que la pantalla. En un monitor muy ancho una sola vuelta de
  // mensajes no alcanza, así que se repite hasta cubrirla.
  function renderCinta() {
    const el = document.getElementById('topbarTrack');
    if (!el) return;
    const uno = CINTA.map(t =>
      `<span class="cinta-item">${escTxt(t)}</span>` +
      `<img class="cinta-sep" src="${escAttr(CINTA_SEPARADOR)}" alt="" aria-hidden="true" width="58" height="58">`
    ).join('');

    el.innerHTML = uno + uno;
    el.setAttribute('aria-label', CINTA.join('. '));

    // Se mide una mitad y se agregan vueltas hasta pasar el ancho de pantalla.
    requestAnimationFrame(() => {
      const base = el.scrollWidth / 2;
      if (!base) return;
      const vueltas = Math.max(1, Math.ceil(window.innerWidth / base) + 1);
      if (vueltas > 1) el.innerHTML = uno.repeat(vueltas * 2);

      // La duración se calcula según lo que mide el recorrido. Si fuera fija,
      // al agregar vueltas la cinta pasaría cada vez más rápido: el trayecto
      // crece pero el tiempo no. Así la velocidad es siempre la misma.
      const recorrido = base * vueltas;
      el.style.animationDuration = Math.round(recorrido / CINTA_VELOCIDAD) + 's';
    });
  }

  function init() {
    renderCinta();
    renderBanners();
    renderCategorias();
    renderOfertaLateral();
    renderPromo();
  }

  return { init, bannerCategoria, get swiper(){ return swiper; } };
})();
