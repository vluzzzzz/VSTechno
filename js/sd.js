// sd
'use strict';
const HERO_STOCK = {};
// ── FALLBACK hardcodeado ──────────────────────────────────────────────────
// Si Supabase no está configurado o falla, la web usa estos datos y NO se
// rompe. loadCatalog() los sobreescribe cuando Supabase responde.
let PRODUCTS=[
  {id:1,key:'airpods-pro-2',name:'AirPods Pro 2',price:'$14.000',rawPrice:14000,image:'images/airpods.webp',bgLabel:'AIRPODS PRO 2',scale:1,offsetX:0,offsetY:0},
  {id:2,key:'airpods-4',name:'AirPods 4',price:'$15.000',rawPrice:15000,image:'images/airpods4.webp',bgLabel:'AIRPODS 4',scale:0.8,offsetX:0,offsetY:0},
  {id:3,key:'airpods-max',name:'AirPods Max',price:'$26.990',rawPrice:26990,image:'images/airpodsmax.webp',bgLabel:'AIRPODS MAX',scale:1.4,offsetX:50,offsetY:-20},
];
const PRICE_TIERS={
  'apple-watch-ultra-3':[{qty:1,price:27500},{qty:3,price:27500},{qty:5,price:27500},{qty:10,price:27500}],
  'apple-watch-serie-10':[{qty:1,price:27500},{qty:3,price:27500},{qty:5,price:27500},{qty:10,price:27500}],
  'airpods-4':[{qty:1,price:20000},{qty:3,price:13000},{qty:5,price:12000},{qty:10,price:11500}],
  'airpods-3':[{qty:1,price:25000},{qty:3,price:15500},{qty:5,price:15000},{qty:10,price:14500}],
  'airpods-pro-2':[{qty:1,price:14000},{qty:3,price:12500},{qty:5,price:11500},{qty:10,price:10500}],
  'airpods-max':[{qty:1,price:26990},{qty:3,price:24990},{qty:5,price:22990},{qty:10,price:20990}],
  'buds4-pro':[{qty:1,price:16000},{qty:3,price:16000},{qty:5,price:16000},{qty:10,price:16000}],
  'buds2-pro':[{qty:1,price:14000},{qty:3,price:14000},{qty:5,price:14000},{qty:10,price:14000}],
  'iphone-15-128':[{qty:1,price:480000}],
  'iphone-16-128':[{qty:1,price:580000}],
  'iphone-18-pro-max-256':[{qty:1,price:1150000}],
  's26-plus-256':[{qty:1,price:580000}],
  'bateria-magsafe':[{qty:1,price:15000},{qty:3,price:15000},{qty:5,price:15000},{qty:10,price:15000}],
  'cargador-lightning':[{qty:1,price:5000},{qty:3,price:5000},{qty:5,price:5000},{qty:10,price:4500}],
  'cargador-tipo-c':[{qty:1,price:6000},{qty:3,price:6000},{qty:5,price:6000},{qty:10,price:4500}],
  'cargador-samsung-45w':[{qty:1,price:6000},{qty:3,price:6000},{qty:5,price:6000},{qty:10,price:6000}],
};
const getUnitPrice=(key,qty)=>{const t=PRICE_TIERS[key];if(!t||!t.length)return 0;let p=t[0].price;for(const r of t)if(qty>=r.qty)p=r.price;return p;};

/* ── CATÁLOGO ───────────────────────────────────────────────────────────────
   Única fuente de productos de toda la web. De acá salen la fila de ofertas,
   el panel de categorías, el buscador y los productos similares de la ficha.
   Antes las tarjetas estaban escritas a mano en index.html y cada sección
   leía del HTML de la otra; por eso al abrir un similar se armaba una tarjeta
   distinta en vez de reusar la misma. Ahora todas salen del mismo lugar.
   loadCatalog() lo reemplaza entero si Supabase responde.                   */
let CATALOGO = [
  {slug:'apple-watch-ultra-3',      cat:'smartwatch', name:'Apple Watch Ultra 3',        image:'images/ultra3black.webp', desc:'El Apple Watch más resistente. Titanio de grado aeroespacial, pantalla Always-On de 49mm y hasta 60 horas de batería.'},
  {slug:'apple-watch-serie-10',     cat:'smartwatch', name:'Apple Watch Serie 11',       image:'images/serie11black.webp',        desc:'El Apple Watch más delgado hasta la fecha. Pantalla OLED más grande, detección de apnea del sueño y carga rápida.'},
  {slug:'airpods-4',                cat:'audifonos',  name:'AirPods 4ta Generación',     image:'images/airpods-4gen.webp',        desc:'Diseño completamente rediseñado, audio adaptable y cancelación activa de ruido. La mejor experiencia sin cables.'},
  {slug:'airpods-3',                cat:'audifonos',  name:'AirPods Pro 3',              image:'images/airpodspro3uno.webp',        desc:'Cancelación activa de ruido, audio espacial y resistencia al agua. La generación más avanzada, cómoda para todo el día.'},
  {slug:'airpods-pro-2',            cat:'audifonos',  name:'AirPods Pro 2',              image:'images/airpods-pro-2.webp',       desc:'Cancelación activa de ruido de siguiente nivel, audio espacial personalizado y hasta 30 horas de batería con el estuche.'},
  {slug:'airpods-max',              cat:'audifonos',  name:'Max Magnéticos',             image:'images/max-magneticos.webp',      desc:'Accesorios magnéticos premium compatibles con MagSafe. Fijación perfecta y carga inalámbrica optimizada.'},
  {slug:'buds4-pro',                cat:'audifonos',  name:'Galaxy Buds4 Pro',           image:'images/buds4black.webp',           desc:'Audífonos inalámbricos Samsung con cancelación de ruido y audio de alta resolución. Compatibles con toda la línea Galaxy.'},
  {slug:'buds2-pro',                cat:'audifonos',  name:'Galaxy Buds2 Pro',           image:'images/budspro2.webp',           desc:'Audífonos inalámbricos Samsung, compactos y livianos, con cancelación de ruido y sonido envolvente.'},
  {slug:'iphone-15-128',            cat:'celulares',  name:'iPhone 15 128 GB',           image:'images/iphone15uno.webp',           desc:'iPhone 15 de 128 GB. Pantalla Super Retina XDR, Dynamic Island, cámara de 48 MP y puerto USB-C.'},
  {slug:'iphone-16-128',            cat:'celulares',  name:'iPhone 16 128 GB',           image:'images/iphone16uno.webp',           desc:'iPhone 16 de 128 GB. Chip A18, botón de Control de Cámara, cámara de 48 MP y batería de mayor duración.'},
  {slug:'s26-plus-256',             cat:'celulares',  name:'Galaxy S26 Plus 256 GB',     image:'images/samsumg26uno.webp',            desc:'Samsung Galaxy S26 Plus de 256 GB. Pantalla Dynamic AMOLED, cámara de alta resolución y carga rápida.'},
  {slug:'iphone-18-pro-max-256',    cat:'celulares',  name:'iPhone 18 Pro Max 256 GB',   image:'images/iphone18.webp',            desc:'iPhone 18 Pro Max de 256 GB. Pantalla Super Retina XDR, sistema de cámaras Pro y el chip más potente de Apple.'},
  {slug:'bateria-magsafe',          cat:'celulares',     name:'Batería MagSafe',            image:'images/bateria-magsafe.webp',     desc:'Batería externa magnética para iPhone. Se adhiere perfectamente y carga de forma inalámbrica sin cables. Compacta y ligera.'},
  {slug:'cargador-lightning',       cat:'cargadores', name:'Cargador Lightning Completo',image:'images/cargador-lightning.webp',  desc:'Cargador completo con cable Lightning y adaptador de corriente. Compatible con iPhone, iPad y AirPods.'},
  {slug:'cargador-tipo-c',          cat:'cargadores', name:'Cargador Tipo C Completo',   image:'images/cargadorcompletotipoc.webp',     desc:'Cargador completo con cable USB-C. Compatible con iPhone 15 en adelante, iPad Pro y MacBook. Carga rápida.'},
  {slug:'cargador-samsung-45w',     cat:'cargadores', name:'Cargador Samsung 45W',       image:'images/cargador-samsung-45w.webp',desc:'Cargador ultra rápido Samsung 45W. Compatible con toda la línea Galaxy. Carga completa en menos de una hora.'},
];

// Si Supabase no trae categoría, se deduce de la primera palabra del slug.
const FAMILIAS = {airpods:'audifonos', apple:'smartwatch', cargador:'cargadores', bateria:'celulares'};
const familiaDe = slug => FAMILIAS[String(slug||'').split('-')[0]] || 'otros';

const findProduct  = slug => CATALOGO.find(p => p.slug === slug) || null;
const porCategoria = cat  => CATALOGO.filter(p => p.cat === cat);

function fmt(n){ return '$'+n.toLocaleString('es-AR'); }

// ¿El usuario pidió menos movimiento en su sistema? Se respeta.
function reduceMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[áä]/g, 'a')
    .replace(/[éë]/g, 'e')
    .replace(/[íï]/g, 'i')
    .replace(/[óö]/g, 'o')
    .replace(/[úü]/g, 'u')
    .replace(/[^a-z0-9-]/g, '');
}

// ── Catálogo desde Supabase + render dinámico ──────────────────────────────
function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

// Para texto que va DENTRO de una etiqueta. escAttr no alcanza: no escapa < ni >,
// así que un texto escrito a mano con "<" rompería el HTML.
function escTxt(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function colorDots(slug){
  const todos=(typeof COLOR_VARIANTS!=='undefined')?COLOR_VARIANTS[slug]:null;
  if(!todos)return '';
  // En la tarjeta solo van los disponibles: el punto mide doce píxeles y una
  // marca de agotado ahí no se entiende. El aviso va en la ficha.
  const cv=todos.filter(v=>!v.agotado);
  if(!cv.length)return '';
  return '<div class="card-colors">'+cv.map(v=>`<span class="card-color-dot">${v.swatch?`<img src="${escAttr(v.swatch)}" alt="${escAttr(v.name)}">`:`<span style="display:block;width:100%;height:100%;border-radius:50%;background:${v.hex}"></span>`}</span>`).join('')+'</div>';
}

// Precio anterior y stock. Van como data-* para que js/tr.js los lea después.
// Si Supabase no trae la columna, no se escribe el atributo y no se muestra nada.
function extraData(p){
  let out = p.cat ? ` data-cat="${escAttr(p.cat)}"` : '';
  if (p.compare != null && p.compare !== '') out += ` data-compare="${Number(p.compare)}"`;
  if (p.stock   != null && p.stock   !== '') out += ` data-stock="${Number(p.stock)}"`;
  return out;
}

// El pie de la home, copiado dentro de otra sección que se abre encima (la
// ficha de producto y la de categoría). Así se escribe una sola vez: lo que
// cambies en el <footer> de index.html sale en las tres.
// Los id del clon se borran, porque un id repetido rompe getElementById.
function clonarPieEn(destinoId){
  const destino=document.getElementById(destinoId),pie=document.querySelector('body > .footer');
  if(!destino||!pie||destino.childElementCount)return;
  const copia=pie.cloneNode(true);
  copia.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  destino.appendChild(copia);
}

function tierOne(slug){
  const t = PRICE_TIERS[slug] || [];
  return (t.find(x => x.qty === 1) || t[0] || {}).price || 0;
}

// Precio por unidad llevando n unidades (el tramo mayorista que ya se controla
// en el panel). Si no hay un tramo para esa cantidad, devuelve el de 1 unidad.
function tierDesde(slug, n){
  const t = PRICE_TIERS[slug] || [];
  if (!t.length) return 0;
  let p = (t.find(x => x.qty === 1) || t[0]).price || 0;
  t.forEach(r => { if (n >= r.qty) p = r.price; });
  return p;
}

const ICONO_CARRO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.5c.8 0 1.5-.5 1.7-1.2l3-7H6.2L5.3 3H1v2h3l3.6 7.6-1.3 2.4c-.1.2-.2.5-.2.8 0 1.1.9 2 2 2h12v-2H8.4c-.1 0-.2-.1-.2-.2l.03-.12L9.1 14z"/></svg>';

// Tarjeta comercial: nombre, estrellas (las pone js/tr.js), "desde", precio
// grande y botón de carrito. El clic en cualquier otra parte abre la ficha.
function cardHTML(p, opts){
  const oferta = !!(opts && opts.oferta);
  const p1  = tierOne(p.slug);
  const p3  = oferta ? tierDesde(p.slug, 3) : p1;
  const hayDcto = oferta && p3 > 0 && p3 < p1;
  const precioBase = hayDcto ? p3 : p1;
  const sin = p.inStock === false;
  const oos = sin ? '<div class="oos-tag">SIN STOCK</div>' : '';
  const accion = sin
    ? '<span class="card-sinstock">Sin stock</span>'
    : `<button class="card-cart" type="button" aria-label="Agregar ${escAttr(p.name)} al carrito">${ICONO_CARRO}</button>`;
  return `<div class="product-card${sin ? ' out-of-stock' : ''}" data-id="${escAttr(p.slug)}" data-name="${escAttr(p.name)}" data-price="${p1}" data-raw="${p1}"${extraData(p)} data-img-scale="${p.imgScale ?? 0.75}" data-desc="${escAttr(p.desc)}"${sin ? ' aria-disabled="true"' : ''}>
      <div class="card-img-wrap"><img src="${escAttr(p.image)}" alt="${escAttr(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><svg class="card-img-placeholder" style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>${oos}</div>
      <div class="card-info">
        <p class="card-name">${escTxt(p.name)}</p>
        <div class="card-stars-wrap"></div>
        ${colorDots(p.slug)}
        <div class="card-foot">
          <div class="card-precio-col">
            ${oferta ? '<span class="card-desde">Desde</span>' : ''}
            <p class="card-price">${fmt(precioBase)} <span class="card-unit">c/u</span></p>
            ${hayDcto ? `<span class="dcto"><span class="dcto-chip">-${Math.round((1 - p3 / p1) * 100)}%</span><s class="dcto-antes">${fmt(p1)}</s></span>` : ''}
          </div>
          ${accion}
        </div>
      </div>
    </div>`;
}

function slideHTML(p,i){
  const p1 = tierOne(p.slug);
  // Mismo nombre e imagen que el producto → grilla y carrusel quedan conectados.
  const name = p.name;
  const img  = p.image;
  const tag  = p.featured_tag || 'Destacado';   // etiqueta opcional del carrusel
  const out = p.in_stock === false ? ' out-of-stock' : '';
  const dis = p.in_stock === false ? ' aria-disabled="true"' : '';
  const btn = p.in_stock === false ? 'Sin stock' : 'Ver más';
  const oos = p.in_stock === false ? '<div class="oos-tag">SIN STOCK</div>' : '';
  const mid = 'mfx' + i;
  return `<div class="swiper-slide csl-slide${out}" data-id="${escAttr(p.slug)}" data-name="${escAttr(name)}" data-price="${p1}" data-raw="${p1}"${extraData(p)} data-img-scale="${p.image_scale ?? 0.75}" data-desc="${escAttr(p.description)}"${dis}>
      <div class="csl-corner"><svg width="31" height="31" viewBox="0 0 31 31" fill="none"><g opacity="0.35"><mask id="${mid}" fill="white"><path d="M30.6 1L1.6 0L0.7 29L29.7 30L30.6 1Z"/></mask><path d="M30.6 1L30.65 -0.47L32.2 -0.42L32.15 1.09L30.6 1ZM30.55 2.55L1.6 1.59L1.7 -1.43L30.65 -0.47L30.55 2.55ZM28.17 29.98L29.13 0.99L32.15 1.09L31.19 30.08L28.17 29.98Z" fill="white" mask="url(#${mid})"/></g></svg></div>
      <span class="csl-tag">${escAttr(tag)}</span>
      <div class="csl-img"><img src="${escAttr(img)}" alt="${escAttr(name)}" loading="lazy">${oos}</div>
      <h3 class="csl-name">${escAttr(name)}</h3>
      <span class="csl-price">${fmt(p1)}</span>
      <button class="csl-rect">${btn}</button>
    </div>`;
}

async function loadCatalog(){
  if (!window.sb) return false;   // Supabase no configurado → se queda el fallback
  try {
    const { data, error } = await window.sb
      .from('products')
      .select('*, price_tiers(qty,price,active)')
      .order('position', { ascending: true });
    if (error) throw error;
    const products = data || [];
    if (!products.length) return false;   // sin datos → se queda el fallback

    // PRICE_TIERS + FEATURES por slug (solo tramos activos con precio > 0)
    products.forEach(p => {
      const tiers = (p.price_tiers || [])
        .filter(t => t.active !== false && t.price > 0)
        .sort((a,b)=>a.qty-b.qty)
        .map(t=>({ qty:t.qty, price:t.price }));
      if (tiers.length) PRICE_TIERS[p.slug] = tiers;
      FEATURES[p.slug] = p.features || [];
      // imágenes del detalle = principal + secundarias (galería)
      GALLERY[p.slug] = [p.image, ...(p.gallery || [])].filter(Boolean);
      // Colores desde el panel. Sin ellos se respeta lo que esté escrito acá
      // abajo en COLOR_VARIANTS, si no los colores aparecían un instante y se
      // borraban al llegar la respuesta de la base.
      const cols = Array.isArray(p.colors) ? p.colors.filter(c => c && c.img) : [];
      if (cols.length) COLOR_VARIANTS[p.slug] = cols;
    });

    // HERO (carrusel principal)
    PRODUCTS.length = 0;
    products.filter(p => p.is_hero)
      .sort((a,b)=>(a.hero_order||0)-(b.hero_order||0))
      .forEach((p, idx) => {
        const p1 = tierOne(p.slug);
        const heroName = p.hero_name || p.name;
        PRODUCTS.push({
          id: idx + 1, key: p.slug, name: heroName,
          price: fmt(p1), rawPrice: p1, image: p.hero_image || p.image,
          bgLabel: p.hero_bg_label || (p.name || '').toUpperCase(),
          scale: p.hero_scale ?? 1, offsetX: p.hero_offset_x ?? 0, offsetY: p.hero_offset_y ?? 0,
        });
        HERO_STOCK[heroName] = p.in_stock !== false;
      });

    // Catálogo completo. Las secciones se repintan solas desde acá.
    CATALOGO = products.map(p => ({
      slug: p.slug,
      cat: p.category || familiaDe(p.slug),
      name: p.name,
      image: p.image,
      desc: p.description || '',
      imgScale: p.image_scale ?? 0.75,
      compare: p.compare_at_price,
      stock: p.stock_qty,
      inStock: p.in_stock !== false,
    }));

    document.body.classList.add('sheet-ready');
    return true;
  } catch (err) {
    console.error('❗ No se pudo cargar el catálogo desde Supabase:', err);
    document.body.classList.add('sheet-ready');
    return false;
  }
}


const FEATURES={
  'airpods-pro-2':['Cancelación activa de ruido','Audio espacial personalizado','Hasta 30 horas de batería','Resistencia al agua IPX4'],
  'airpods-4':['Audio adaptativo','Cancelación activa de ruido','Diseño rediseñado','Hasta 30 horas con estuche'],
  'airpods-3':['Cancelación activa de ruido','Audio espacial personalizado','Resistencia al agua','Hasta 30 horas con estuche'],
  'apple-watch-ultra-3':['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
  'apple-watch-serie-10':['Pantalla OLED más grande','Detección de apnea del sueño','Carga rápida','Diseño más delgado'],
  'iphone-15-128':['128 GB de almacenamiento','Pantalla Super Retina XDR','Cámara principal de 48 MP','Puerto USB-C'],
  'iphone-16-128':['128 GB de almacenamiento','Chip A18','Botón de Control de Cámara','Cámara principal de 48 MP'],
  'iphone-18-pro-max-256':['256 GB de almacenamiento','Pantalla Super Retina XDR','Sistema de cámaras Pro','Chip de última generación'],
  's26-plus-256':['256 GB de almacenamiento','Pantalla Dynamic AMOLED','Cámara de alta resolución','Carga rápida'],
  'bateria-magsafe':['Carga magnética MagSafe','Compacta y liviana','Compatible iPhone 12 en adelante','Sin cables'],
  'airpods-max':['Compatibles con MagSafe','Fijación magnética perfecta','Carga inalámbrica optimizada','Múltiples colores'],
  'cargador-lightning':['Cable Lightning incluido','Adaptador de corriente','Compatible iPhone/iPad/AirPods','Carga rápida'],
  'cargador-tipo-c':['Cable USB-C incluido','Compatible iPhone 15+','iPad Pro y MacBook','Carga rápida 20W'],
  'cargador-samsung-45w':['Carga ultra rápida 45W','Compatible línea Galaxy','Cable USB-C incluido','Carga completa en ~1 hora'],
  'buds4-pro':['Cancelación de ruido activa','Audio de alta resolución','Compatible con Galaxy','Estuche con carga inalámbrica'],
  'buds2-pro':['Cancelación de ruido activa','Diseño compacto y liviano','Sonido envolvente','Resistencia al agua IPX7'],
};            // fallback — loadCatalog() lo sobreescribe desde Supabase
// { slug: [imgPrincipal, ...secundarias] } — desde Supabase (vacío = usa fallback hardcodeado)
const GALLERY={
  'buds2-pro':['images/budspro2.webp','images/budspro2imagen2.webp'],
  'airpods-3':['images/airpodspro3uno.webp','images/airpodspro3dos.webp'],
  'iphone-15-128':['images/iphone15uno.webp','images/iphone15dos.webp','images/iphone15tres.webp'],
  'iphone-16-128':['images/iphone16uno.webp','images/iphone16dos.webp','images/iphone16tres.webp'],
  'iphone-18-pro-max-256':['images/iphone18.webp','images/iphone18dos.webp'],
  's26-plus-256':['images/samsumg26uno.webp','images/samsumg26dos.webp','images/samsumg26tres.webp'],
};
// Variantes de color — SOLO los slugs listados acá muestran colores (dots + selector + validación).
/* Cada color lleva 'agotado'. En true sigue a la vista pero en gris y no se
   puede elegir, y desde /admin se vuelve a encender sin perder las fotos. */
const COLOR_VARIANTS={
  'apple-watch-serie-10':[
    {name:'Negro', hex:'#1A1A1A', img:'images/serie11black.webp',  swatch:'images/miniblack11.webp'},
    {name:'Oro',   hex:'#E3C08D', img:'images/serie11oro.webp',    swatch:'images/minioro.webp'},
    {name:'Gris',  hex:'#8E8E93', img:'images/grisserie11.webp',   swatch:'images/miniserie11gris.webp'},
  ],
  'apple-watch-ultra-3':[
    {name:'Negro',       hex:'#1A1A1A', img:'images/ultra3black.webp',            swatch:'images/miniultra3correablack.webp'},
    {name:'Negro total', hex:'#000000', img:'images/ultra3blackcorreablack.webp', swatch:'images/miniblackultra3.webp'},
    {name:'Gris',        hex:'#8E8E93', img:'images/ultra3gris.webp',             swatch:'images/minigrisultra3.webp'},
    {name:'Naranja',     hex:'#F26513', img:'images/ultra3orange.webp',           swatch:'images/miniorangeultra3.webp'},
  ],
  'buds4-pro':[
    {name:'Negro', hex:'#1A1A1A', img:'images/buds4black.webp', swatch:'images/minibuds4black.webp'},
    {name:'Gris',  hex:'#8E8E93', img:'images/buds4gris.webp',  swatch:'images/minibuds4gris.webp'},
    {name:'Rosa',  hex:'#E8A0B4', img:'images/buds4pink.webp',  swatch:'images/minibuds4pink.webp'},
  ],
  'airpods-max':[
    {name:'Midnight', hex:'#1A1A1A', img:'images/max-negros.webp',  swatch:'images/black.webp'},
    {name:'Starlight',hex:'#F5F0E8', img:'images/max-blanco.webp',  swatch:'images/mstarlight.webp'},
    {name:'Purple',   hex:'#9B59B6', img:'images/max-morado.webp',  swatch:'images/purple.webp'},
    {name:'Orange',   hex:'#F26513', img:'images/max-naranja.webp', swatch:'images/orange.webp', agotado:true},
    {name:'Blue',     hex:'#3498DB', img:'images/max-azul.webp',    swatch:'images/blue.webp',   agotado:true},
  ],
};
const PRODUCT_CONFIG={
  1:{fontSize:'22vw',productScale:1.1,productY:-15,blobYRatio:0.88,blobSpeed:0.030},
  2:{fontSize:'28vw',productScale:1.1,productY:-10,blobYRatio:0.88,blobSpeed:0.030},
  3:{fontSize:'24vw',productScale:1.1,productY:-20,blobYRatio:0.90,blobSpeed:0.030},
};
const state={current:0,isTransitioning:false,cart:[]};
const DOM={
  productImg:document.getElementById('productImg'),productWrap:document.getElementById('productWrap'),
  bgText:document.getElementById('bgText'),bgTextBlue:document.getElementById('bgTextBlue'),
  bgTextZoom:document.getElementById('bgTextZoom'),bgTextBlueWrap:document.getElementById('bgTextBlueWrap'),
  bgTextPerspective:document.querySelector('.bg-text-perspective'),priceBlock:document.querySelector('.price-block'),
  productPrice:document.getElementById('productPrice'),prevBtn:document.getElementById('prevBtn'),
  nextBtn:document.getElementById('nextBtn'),dotsWrap:document.getElementById('dots'),
  addToCart:document.getElementById('addToCart'),cartDrawer:document.getElementById('cartDrawer'),
  cartOverlay:document.getElementById('cartOverlay'),cartItems:document.getElementById('cartItems'),
  cartFooter:document.getElementById('cartFooter'),cartTotal:document.getElementById('cartTotal'),
  cartCount:document.getElementById('cartCount'),closeCart:document.getElementById('closeCart'),
  cartTrigger:document.querySelector('.cart-trigger'),
};
