// sc — nav pegada, filas de productos y sección de categoría
'use strict';
const NavScroll=(()=>{function init(){const nav=document.querySelector('.nav');window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>40),{passive:true});}return{init};})();

/* ════════════════════════════════════════════════════════════════════════════
   ZONA EDITABLE — qué productos salen en cada fila de la portada, y en qué
   orden. Son los slugs del catálogo (js/sd.js); si ponés uno que no existe,
   se saltea sin romper nada.

   ⚠ Desde que existe /admin, esta lista es solo el punto de partida: si hay
   algo guardado en el panel, eso gana y lo de acá no se usa. Editá en el
   panel salvo que quieras cambiar el valor de arranque.
   ════════════════════════════════════════════════════════════════════════════ */

// Fila de arriba, con la imagen al costado. Va antes de las categorías.
let OFERTAS = [
  'airpods-pro-2',
  'apple-watch-ultra-3',
  'airpods-4',
  'bateria-magsafe',
  'cargador-tipo-c',
];

// Fila de abajo, a lo ancho. Va después de las categorías. Acá están los seis
// que no salen arriba, así que entre las dos filas se ve todo el catálogo.
let MAS_PRODUCTOS = [
  'iphone-15-128',
  'iphone-16-128',
  's26-plus-256',
  'apple-watch-serie-10',
  'airpods-3',
  'airpods-max',
  'buds4-pro',
  'buds2-pro',
  'cargador-lightning',
  'cargador-samsung-45w',
];
/* ═══════════════════════════ FIN ZONA EDITABLE ═════════════════════════════ */

// Pinta una lista de productos dentro de un contenedor y la deja lista para
// usar: escala de imagen, estrellas, descuento y stock.
function pintarProductos(el, lista, opts){
  if(!el) return false;
  // Si lo que hay que pintar es idéntico a lo que ya está, no se toca nada.
  // Esto corre dos veces: al arrancar con lo de los archivos y de nuevo
  // cuando contesta Supabase. Sin esta comparación, la segunda vuelta borra
  // y rehace tarjetas iguales, y se ve el parpadeo.
  const nuevo = lista.map(p=>cardHTML(p, opts)).join('');
  if (nuevo.replace(/\s+/g,'') === (el.dataset.pintado||'')) return false;
  el.innerHTML = nuevo;
  el.dataset.pintado = nuevo.replace(/\s+/g,'');
  el.querySelectorAll('.product-card').forEach(c=>c.style.setProperty('--card-img-scale',c.dataset.imgScale??0.75));
  if(typeof Trust!=='undefined') Trust.decorarTarjetas();
  return true;
}

// Entrada suave de las tarjetas al aparecer en pantalla.
function animarProductos(el){
  if(!el || typeof gsap==='undefined') return;
  const cards=el.querySelectorAll('.product-card');
  if(!cards.length) return;
  if(reduceMotion()){gsap.set(cards,{opacity:1,y:0});return;}
  // La entrada se anima una sola vez. Si se repite en cada repintado, las
  // tarjetas que el visitante ya estaba mirando se apagan de golpe y vuelven:
  // eso es lo que se veía como un parpadeo al contestar Supabase.
  if(el.dataset.animado){gsap.set(cards,{opacity:1,y:0});return;}
  el.dataset.animado='1';
  gsap.set(cards,{opacity:0,y:40});
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const c=e.target,i=[...cards].indexOf(c);
      gsap.to(c,{opacity:1,y:0,duration:.6,ease:'power3.out',delay:(i%5)*.07});
      obs.unobserve(c);
    });
  },{threshold:.1});
  cards.forEach(c=>obs.observe(c));
}

// Las dos filas de la portada. Se vuelve a llamar cuando contesta Supabase,
// así que pintar de nuevo tiene que ser inofensivo: lo es, porque cada fila
// se rehace desde cero.
/* Carrusel horizontal de tarjetas. No usa Swiper: la pista es un contenedor
   con desplazamiento nativo, así en el teléfono se arrastra con el dedo y con
   la inercia del sistema. Las flechas solo empujan ese desplazamiento. */
const Carru=(()=>{
  function paso(pista){
    const card=pista.querySelector('.product-card');
    if(!card)return pista.clientWidth;
    const est=getComputedStyle(pista);
    const gap=parseFloat(est.columnGap||est.gap)||14;
    const ancho=card.getBoundingClientRect().width+gap;
    // Avanza casi una pantalla, dejando una tarjeta a la vista como pista de
    // que la fila sigue. Con una sola visible, avanza de a una.
    const caben=Math.max(1,Math.floor(pista.clientWidth/ancho));
    return ancho*(caben>1?caben-1:1);
  }

  // Las flechas se esconden en las puntas: una flecha que no hace nada
  // enseña mal dónde termina la fila.
  function actualizar(pista){
    const caja=pista.closest('.carru');
    if(!caja)return;
    const prev=caja.querySelector('.carru-prev'),next=caja.querySelector('.carru-next');
    const sobra=pista.scrollWidth-pista.clientWidth;
    const x=pista.scrollLeft;
    if(prev)prev.hidden=sobra<8||x<8;
    if(next)next.hidden=sobra<8||x>=sobra-8;
  }

  function conectar(pista){
    if(!pista||pista.dataset.carruListo)return;
    const caja=pista.closest('.carru');
    if(!caja)return;
    pista.dataset.carruListo='1';
    caja.querySelectorAll('.carru-arr').forEach(b=>b.addEventListener('click',()=>{
      const d=b.classList.contains('carru-next')?1:-1;
      pista.scrollBy({left:paso(pista)*d,behavior:reduceMotion()?'auto':'smooth'});
    }));
    pista.addEventListener('scroll',()=>actualizar(pista),{passive:true});
    window.addEventListener('resize',()=>actualizar(pista),{passive:true});
  }

  // Después de pintar hay que esperar un cuadro: hasta que el navegador no
  // calcula posiciones, scrollWidth y clientWidth valen lo mismo y las
  // flechas quedarían escondidas siempre.
  function revisar(pista){
    if(!pista)return;
    conectar(pista);
    requestAnimationFrame(()=>requestAnimationFrame(()=>actualizar(pista)));
  }

  return{revisar};
})();

const Filas=(()=>{
  function una(id, slugs, reserva, opts){
    const row=document.getElementById(id);
    if(!row)return;
    const elegidos=slugs.map(findProduct).filter(Boolean);
    // Si ningún slug de la lista existe en el catálogo, la fila no se queda
    // vacía: se rellena con los primeros del catálogo.
    const lista=elegidos.length?elegidos:CATALOGO.slice(0,reserva);
    pintarProductos(row,lista,opts);
    animarProductos(row);
    Carru.revisar(row);
  }
  function init(){
    // La fila de ofertas muestra el precio desde 3 unidades y el descuento.
    una('ofertasRow', OFERTAS, 5, {oferta:true});
    una('masRow', MAS_PRODUCTOS, 6);
  }
  return{init};
})();

// Sección de categoría. No es otra ventana ni una franja más de la home: se
// abre encima, en blanco, con el banner de esa categoría arriba de todo y
// nada más. Debajo van sus productos y, más abajo, el resto del catálogo.
// La misma sección sirve para los resultados del buscador.
const CatPage=(()=>{
  let sec,overlay,banner,sub,titulo,grid,masWrap,masGrid,vacio;
  let abierta=false;

  const NOMBRES={
    smartwatch:'Smartwatch',
    audifonos:'Audífonos',
    celulares:'Celulares',
    cargadores:'Cargadores',
    todos:'Todo el catálogo',
  };

  const lock  =()=>{document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';};
  const unlock=()=>{document.documentElement.style.overflow='';document.body.style.overflow='';};

  function mostrar(){
    if(!sec||abierta)return;
    abierta=true;
    sec.style.display='block';
    overlay.classList.add('active');
    sec.classList.add('active');
    sec.scrollTop=0;
    lock();
    if(typeof gsap!=='undefined'&&!reduceMotion()){
      gsap.fromTo(overlay,{opacity:0},{opacity:1,duration:.25,ease:'power2.out'});
      gsap.fromTo(sec,{opacity:0,y:26},{opacity:1,y:0,duration:.4,ease:'power3.out'});
    }
  }

  function cerrar(){
    if(!sec||!abierta)return;
    abierta=false;
    const fin=()=>{
      sec.style.display='none';sec.classList.remove('active');
      overlay.classList.remove('active');
      if(typeof gsap!=='undefined')gsap.set(sec,{clearProps:'opacity,transform'});
      unlock();
    };
    if(typeof gsap!=='undefined'&&!reduceMotion()){
      gsap.to(overlay,{opacity:0,duration:.2,ease:'power2.in'});
      gsap.to(sec,{opacity:0,y:20,duration:.25,ease:'power2.in',onComplete:fin});
    }else fin();
  }

  // Pinta el contenido. 'dentro' es lo que se pidió, 'fuera' el resto.
  function pintar(subT,titT,dentro,fuera,vacioT,cat){
    clonarPieEn('cpageFooter');
    banner.innerHTML = cat ? Banners.bannerCategoria(cat) : '';
    banner.hidden = !cat;
    sub.textContent=subT;
    titulo.textContent=titT;
    vacio.hidden=dentro.length>0;
    if(!dentro.length)vacio.textContent=vacioT;

    pintarProductos(grid,dentro);
    masWrap.hidden=!fuera.length;
    if(fuera.length)pintarProductos(masGrid,fuera);
    else masGrid.innerHTML='';
    animarProductos(grid);animarProductos(masGrid);
  }

  function abrir(cat){
    if(!sec)return;
    const dentro = cat==='todos' ? CATALOGO.slice() : porCategoria(cat);
    const fuera  = cat==='todos' ? []               : CATALOGO.filter(p=>p.cat!==cat);
    pintar(
      cat==='todos' ? 'Catálogo Mayor 2026' : 'Categoría',
      NOMBRES[cat]||cat, dentro, fuera,
      'Todavía no hay productos en esta categoría.', cat
    );
    mostrar();
  }

  // Sin acentos ni mayúsculas: "Batería" encuentra "bateria".
  const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();

  function buscar(q){
    if(!sec)return;
    const t=norm(q);
    if(!t){cerrar();return;}
    const hit=CATALOGO.filter(p=>norm(`${p.name} ${p.slug} ${p.desc||''}`).includes(t));
    pintar('Resultados de búsqueda',`"${q.trim()}"`,hit,[],`Sin resultados para "${q.trim()}"`,'');
    mostrar();
  }

  function init(){
    sec=document.getElementById('cpage');
    if(!sec)return;
    overlay=document.getElementById('cpageOverlay');
    banner =document.getElementById('cpageBanner');
    sub    =document.getElementById('cpageSub');
    titulo =document.getElementById('cpageTitulo');
    grid   =document.getElementById('cpageGrid');
    masWrap=document.getElementById('cpageMas');
    masGrid=document.getElementById('cpageMasGrid');
    vacio  =document.getElementById('cpageVacio');
    sec.style.display='none';

    document.getElementById('cpageBack')?.addEventListener('click',cerrar);
    overlay?.addEventListener('click',cerrar);

    // Los enlaces del pie apuntan a la home, que está detrás. Sin cerrar
    // primero, el visitante se quedaría acá mientras la página de abajo salta
    // a otra parte. "Productos" es la excepción: sirve para abrir esto mismo.
    document.getElementById('cpageFooter')?.addEventListener('click',e=>{
      const a=e.target.closest('a');
      if(a&&!a.dataset.catAbrir)cerrar();
    });
    // Escape cierra, salvo que arriba esté abierta la ficha de un producto.
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(document.getElementById('ppage')?.classList.contains('active'))return;
      cerrar();
    });

    // Las tarjetas de categoría y el enlace "Productos" de la nav abren esto.
    document.addEventListener('click',e=>{
      const t=e.target.closest('[data-cat-abrir]');
      if(!t)return;
      e.preventDefault();
      abrir(t.dataset.catAbrir);
    });
  }

  return{init,abrir,buscar,cerrar,mostrar,estaAbierta:()=>abierta};
})();

const Carousel3D=(()=>{
  function init(){
    if(typeof Swiper==='undefined')return;
    const sw=new Swiper('.csl-swiper',{effect:'coverflow',grabCursor:true,centeredSlides:true,slidesPerView:'auto',loop:false,initialSlide:2,mousewheel:{forceToAxis:true},keyboard:{enabled:true,onlyInViewport:true},coverflowEffect:{rotate:50,stretch:0,depth:50,modifier:1,slideShadows:false},navigation:{prevEl:'.csl-arr-prev',nextEl:'.csl-arr-next'},pagination:{el:'.csl-pagination',clickable:true}});
    const slides=document.querySelectorAll('.csl-swiper .swiper-slide');
    gsap.set(slides,{opacity:0,y:50});
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){gsap.to([...slides],{opacity:1,y:0,duration:.7,ease:'power3.out',stagger:.08});obs.disconnect();}});},{threshold:.2});
    obs.observe(document.querySelector('.csl-swiper'));
    let drag=false,pend=null;
    sw.on('sliderMove',()=>{drag=true;});sw.on('touchStart',()=>{drag=false;});
    sw.on('slideChangeTransitionEnd',()=>{if(pend!==null&&!pend.classList.contains('out-of-stock')){const s=pend;pend=null;ProductModal.open(s);}else{pend=null;}});
    document.querySelectorAll('.csl-swiper .swiper-slide[data-name]').forEach((slide,i)=>{
      slide.addEventListener('click',()=>{if(drag||slide.classList.contains('out-of-stock'))return;if(!slide.classList.contains('swiper-slide-active')){pend=slide;sw.slideTo(i);return;}ProductModal.open(slide);});
    });
  }
  return{init};
})();
