// pm
'use strict';
const ProductModal=(()=>{
  let isOpen=false,originCard=null,originRect=null,qty=1,tiers=[],currentProduct=null,tiersOpen=false;
  let imgIndex=0,imgList=[],isTemp=false,openingImage='',isAnimImg=false,_buyTried=false;
  const ppage=document.getElementById('ppage'),overlay=document.getElementById('ppageOverlay'),backBtn=document.getElementById('ppageBack');
  const fmt=n=>'$'+Number(n).toLocaleString('es-AR');
  const getCardImg=c=>c?.querySelector('.card-img-wrap img')||c?.querySelector('.csl-img img')||null;
  const lockScroll=()=>{document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';};
  // Si la ficha se abrió desde la sección de una categoría, esa sección sigue
  // abierta detrás y tiene que quedarse con el scroll bloqueado.
  const unlockScroll=()=>{
    if(typeof CatPage!=='undefined'&&CatPage.estaAbierta())return;
    document.documentElement.style.overflow='';document.body.style.overflow='';
  };

  function cleanAllVT(card){
    const ci=getCardImg(card),pi=document.getElementById('ppageImg');
    if(card){card.style.viewTransitionName='';card.style.visibility='';}
    if(ci){ci.style.viewTransitionName='';ci.style.transition='';}
    ppage.style.viewTransitionName='';
    if(pi){pi.style.viewTransitionName='';pi.style.transition='';pi.style.opacity='';}
  }

  const PRODUCT_IMAGES={'apple-watch-ultra-3':'images/ultra3black.webp','apple-watch-serie-10':'images/serie11black.webp','airpods-4':'images/airpods-4gen.webp','airpods-pro-2':'images/airpods-pro-2.webp','airpods-3':'images/airpodspro3uno.webp','bateria-magsafe':'images/bateria-magsafe.webp','airpods-max':'images/max-magneticos.webp','cargador-lightning':'images/cargador-lightning.webp','cargador-tipo-c':'images/cargadorcompletotipoc.webp','cargador-samsung-45w':'images/cargador-samsung-45w.webp','buds4-pro':'images/buds4black.webp','buds2-pro':'images/budspro2.webp','iphone-15-128':'images/iphone15uno.webp','iphone-16-128':'images/iphone16uno.webp','iphone-18-pro-max-256':'images/iphone18.webp','s26-plus-256':'images/samsumg26uno.webp'};
  const slug=n=>n.toLowerCase().replace(/\s+/g,'-').replace(/[áä]/g,'a').replace(/[éë]/g,'e').replace(/[íï]/g,'i').replace(/[óö]/g,'o').replace(/[úü]/g,'u').replace(/[^a-z0-9-]/g,'');
  const TWO=['bateria-magsafe','cargador-lightning','cargador-tipo-c','cargador-samsung-45w','buds4-pro','buds2-pro','iphone-15-128','iphone-16-128','s26-plus-256'];
  const FILE_PREFIX={'airpods-4':'airpods-4ta-generacion','airpods-3':'airpods-3ra-generacion','airpods-max':'max-magneticos','cargador-lightning':'cargador-lightning-completo','cargador-tipo-c':'cargador-tipo-c-completo'};
  const buildImgList=(src,key)=>{const s=slug(key),fk=FILE_PREFIX[s]||s,v1=PRODUCT_IMAGES[s]||src;return TWO.includes(s)?[v1,`images/${fk}-v2.webp`]:[v1,`images/${fk}-v2.webp`,`images/${fk}-v3.webp`];};
  const IMG_SCALES={'apple-watch-ultra-3':[1,1,1],'apple-watch-serie-10':[1,1,.75],'airpods-4':[1,1,1.3],'airpods-pro-2':[1,1,1],'airpods-3':[1,1,1],'bateria-magsafe':[1,1,1],'airpods-max':[1,1,1],'cargador-lightning':[1,1.4,1],'cargador-tipo-c':[1,1,1],'cargador-samsung-45w':[1,1,1],'buds4-pro':[1,1,1],'buds2-pro':[1,1,1],'iphone-15-128':[1,1,1],'iphone-16-128':[1,1,1],'s26-plus-256':[1,1,1]};
  const colorVars=k=>(typeof COLOR_VARIANTS!=='undefined')?COLOR_VARIANTS[k]:null;
  const _isColorNav=()=>!!(currentProduct&&colorVars(currentProduct.key));

  function renderDots(){const w=document.getElementById('ppageImgDots');if(!w)return;if(_isColorNav()){w.innerHTML='';return;}w.innerHTML=imgList.map((_,i)=>`<div class="ppage-img-dot${i===imgIndex?' active':''}"></div>`).join('');w.querySelectorAll('.ppage-img-dot').forEach((d,i)=>d.addEventListener('click',()=>goToImg(i)));}
  function updateArrow(){const b=document.getElementById('ppageImgNext');if(b)b.classList.toggle('hidden',_isColorNav()||isTemp||imgIndex>=imgList.length-1);}
  function renderTempThumbs(){const w=document.getElementById('ppageThumbs');if(!w)return;w.innerHTML='';imgList.forEach((src,i)=>{const t=document.createElement('div');t.className='ppage-thumb';t.dataset.index=i;t.innerHTML=`<img src="${src}" alt="">`;gsap.set(t,{opacity:0,y:20,scale:.8});w.appendChild(t);gsap.to(t,{opacity:1,y:0,scale:1,duration:.35,delay:i*.06,ease:'back.out(1.5)'});t.addEventListener('click',()=>activateFromTemp(i));});}
  function activateFromTemp(ni){isTemp=false;const ie=document.getElementById('ppageImg'),iw=document.getElementById('ppageImgWrap'),w=document.getElementById('ppageThumbs');w.innerHTML='';for(let i=0;i<ni;i++)addThumb(imgList[i],i);imgIndex=ni;gsap.to(iw,{opacity:0,scale:.88,duration:.25,ease:'power3.in',onComplete:()=>{                    ie.src=imgList[imgIndex];const s=(IMG_SCALES[currentProduct.key]??[1,1,1])[imgIndex]??1;document.getElementById('ppageImgWrap')?.style.setProperty('--ppage-img-scale',s);gsap.fromTo(iw,{opacity:0,scale:.88},{opacity:1,scale:1,duration:.4,ease:'power3.out'});}});renderDots();updateArrow();}
  function addThumb(src,fi){const w=document.getElementById('ppageThumbs');if(!w||w.querySelector(`[data-index="${fi}"]`))return;const t=document.createElement('div');t.className='ppage-thumb';t.dataset.index=fi;t.innerHTML=`<img src="${src}" alt="">`;gsap.set(t,{opacity:0,y:20,scale:.8});w.appendChild(t);gsap.to(t,{opacity:1,y:0,scale:1,duration:.35,ease:'back.out(1.5)'});t.addEventListener('click',()=>goToImg(fi));}
  function goToImg(ni){
    if(_isColorNav())return;
    if(ni===imgIndex||isTemp||isAnimImg||ni<0||ni>=imgList.length)return;
    const ie=document.getElementById('ppageImg'),iw=document.getElementById('ppageImgWrap'),dir=ni>imgIndex?1:-1,pi=ie.src,pI=imgIndex,pre=new Image();
    pre.src=imgList[ni];
    function go(){isAnimImg=true;if(dir>0)addThumb(pi,pI);else{const w=document.getElementById('ppageThumbs');if(w)w.querySelectorAll('.ppage-thumb').forEach(t=>{if(Number(t.dataset.index)>=ni)gsap.to(t,{opacity:0,y:20,scale:.8,duration:.25,ease:'power2.in',onComplete:()=>t.remove()});});}imgIndex=ni;gsap.to(iw,{x:dir>0?-60:60,opacity:0,scale:.88,duration:.3,ease:'power3.in',onComplete:()=>{ie.src=imgList[imgIndex];const s=(IMG_SCALES[currentProduct?.key]??[1,1,1])[imgIndex]??1;document.getElementById('ppageImgWrap')?.style.setProperty('--ppage-img-scale',s);gsap.fromTo(iw,{x:dir>0?80:-80,opacity:0,scale:.88},{x:0,opacity:1,scale:1,duration:.45,ease:'power3.out',onComplete:()=>{isAnimImg=false;}});}});renderDots();updateArrow();}
    if(pre.complete)go();else{pre.onload=go;pre.onerror=go;}
  }
  function resetCarousel(src,name,key){imgIndex=0;const cv=colorVars(key);if(cv){imgList=cv.map(v=>v.img);}else{const g=(typeof GALLERY!=='undefined')?GALLERY[key]:null;imgList=(g&&g.length>1)?g.slice():buildImgList(src,key||name);}const w=document.getElementById('ppageThumbs');if(w)w.innerHTML='';document.getElementById('ppageImgWrap')?.style.setProperty('--ppage-img-scale','1');renderDots();updateArrow();}
  // ── Variantes de color ─────────────────────────────────────
  function _clearColorWarn(){const h=document.getElementById('ppageColorHint');if(h){h.classList.remove('show');h.textContent='Seleccioná tu color';}document.getElementById('ppageColorsRow')?.classList.remove('shake');}
  // El color elegido esta sin stock: se puede ver, pero no comprar.
  function _colorSinStock(){
    const cv=colorVars(currentProduct&&currentProduct.key);
    if(cv&&imgIndex>=0&&cv[imgIndex]&&cv[imgIndex].agotado){
      const h=document.getElementById('ppageColorHint');
      if(h){h.textContent='Ese color está sin stock';h.classList.add('show');}
      _shakeColor();
      return true;
    }
    return false;
  }
  function renderColors(key){
    const wrap=document.getElementById('ppageColors'),row=document.getElementById('ppageColorsRow');
    const cv=colorVars(key);
    if(!wrap||!row)return;
    if(!cv){wrap.style.display='none';return;}
    wrap.style.display='';
    const swatch=(v,i)=>{
      const ag=!!v.agotado;
      return `<button class="ppage-color-swatch${i===imgIndex?' active':''}${ag?' agotado':''}" data-index="${i}" title="${escAttr(v.name)}${ag?' · sin stock':''}" aria-label="${escAttr(v.name)}${ag?', sin stock':''}" style="${v.swatch?'':'background:'+v.hex}">${v.swatch?`<img src="${escAttr(v.swatch)}" alt="">`:''}</button>`;
    };
    let htmlIn='',htmlOut='';
    cv.forEach((v,i)=>{ if(v.agotado) htmlOut+=swatch(v,i); else htmlIn+=swatch(v,i); });
    row.innerHTML = htmlIn + (htmlOut
      ? `<span class="ppage-colors-oos"><span class="oos-cap">Sin stock</span><span class="oos-swatches">${htmlOut}</span></span>`
      : '');
    row.querySelectorAll('.ppage-color-swatch').forEach(s=>s.addEventListener('click',()=>{
      _clearColorWarn();goToImgDirectly(Number(s.dataset.index));
    }));
    const label=document.getElementById('ppageColorName');
    if(label)label.innerHTML=(imgIndex>=0&&cv[imgIndex])
      ? escTxt(cv[imgIndex].name)
      : '';
    _pintarSinStock();
  }
  function goToImgDirectly(ni){if(ni<0||ni>=imgList.length)return;imgIndex=ni;const ie=document.getElementById('ppageImg');if(ie){gsap.killTweensOf(ie);ie.style.opacity='1';ie.src=imgList[ni];}document.getElementById('ppageImgWrap')?.style.setProperty('--ppage-img-scale','1');if(currentProduct)currentProduct.image=imgList[ni];_updateColorActive();const b=document.getElementById('ppageImgNext');if(b)b.classList.add('hidden');}
  function _pintarSinStock(){
    const box=document.querySelector('#ppageColorsRow .ppage-colors-oos');
    if(!box)return;
    const cv=colorVars(currentProduct&&currentProduct.key)||[];
    const ag=imgIndex>=0&&cv[imgIndex]&&cv[imgIndex].agotado;
    box.classList.toggle('show-cap', !!ag);
  }
  function _updateColorActive(){const row=document.getElementById('ppageColorsRow');if(!row)return;row.querySelectorAll('.ppage-color-swatch').forEach((s,i)=>s.classList.toggle('active',i===imgIndex));const label=document.getElementById('ppageColorName'),cv=colorVars(currentProduct&&currentProduct.key)||[];if(label&&cv[imgIndex])label.innerHTML=escTxt(cv[imgIndex].name);_pintarSinStock();}
  // El error de color SIEMPRE sale la 1ª vez que tocás un botón (aunque ya hayas mirado/cambiado colores).
  // Después de tocar un botón una vez (_buyTried) ya no bloquea.
  function _blockColor(){if(currentProduct&&colorVars(currentProduct.key)&&!_buyTried){_buyTried=true;_shakeColor();return true;}_clearColorWarn();return false;}
  function _shakeColor(){const row=document.getElementById('ppageColorsRow'),hint=document.getElementById('ppageColorHint');if(row){row.classList.remove('shake');void row.offsetWidth;row.classList.add('shake');}if(hint)hint.classList.add('show');document.getElementById('ppageColors')?.scrollIntoView({behavior:'smooth',block:'center'});}
  function cartProduct(){const cv=colorVars(currentProduct.key);if(cv&&imgIndex>=0&&cv[imgIndex]){const v=cv[imgIndex];return{...currentProduct,id:currentProduct.id+'::'+imgIndex,image:v.img,colorName:v.name};}return{...currentProduct};}
  const priceForQty=q=>{let u=tiers[0]?.price??0;for(const t of tiers)if(q>=t.qty)u=t.price;return u;};
  function renderTiers(){
    const table=document.getElementById('ppagePricesTable'),base=tiers[0]?.price??1;
    const sel=document.getElementById('ppageTierSelectedText'),sp=document.getElementById('ppageTierSelectedPrice');
    if(sel)sel.textContent=qty===1?'1 unidad':`${qty}+ unidades`;
    if(sp)sp.textContent=fmt(priceForQty(qty));
    table.innerHTML=tiers.map(t=>{const p=Math.round((1-t.price/base)*100);return`<div class="price-row${qty===t.qty?' selected':''}" data-qty="${t.qty}" data-price="${t.price}"><span class="price-row-qty">${t.qty===1?'1 unidad':`${t.qty}+ unidades`}</span><span class="price-row-amount">${fmt(t.price)} <small style="font-family:var(--font-body);font-size:11px;opacity:.5">c/u</small></span><span class="price-row-save">${p>0?`−${p}%`:'Base'}</span></div>`;}).join('');
    table.querySelectorAll('.price-row').forEach(r=>r.addEventListener('click',()=>{qty=Number(r.dataset.qty);document.getElementById('ppageQtyNum').textContent=qty;updateTotal();renderTiers();}));
  }
  function openTiers(){tiersOpen=true;const l=document.getElementById('ppageTiersList'),c=document.getElementById('ppageTierChevron');l.style.height=l.scrollHeight+'px';l.classList.add('open');c.classList.add('open');}
  function closeTiers(){tiersOpen=false;const l=document.getElementById('ppageTiersList'),c=document.getElementById('ppageTierChevron');l.style.height='0';l.classList.remove('open');c.classList.remove('open');}
  function toggleTiers(){tiersOpen?closeTiers():openTiers();}
  function openAccordion(id){const b=document.getElementById(id+'-body'),c=document.getElementById(id+'-chev');if(!b||!c)return;const o=b.style.height!=='0px'&&b.style.height!=='';if(o){b.style.height='0';c.classList.remove('open');}else{b.style.height=b.scrollHeight+'px';c.classList.add('open');}}
  function updateTotal(){document.getElementById('ppageTotal').textContent=fmt(priceForQty(qty)*qty);renderTiers();}
  function renderFeatures(key){const f=FEATURES[key]||[],i=document.getElementById('ppage-features-inner');if(i)i.innerHTML='<ul>'+f.map(x=>`<li>${x}</li>`).join('')+'</ul>';}
  // Productos similares. Primero los de la misma familia (airpods, apple-watch,
  // cargador…), y si faltan se completa con el resto del catálogo.
  // Los similares salen del catálogo, no del HTML de otra sección. Así la
  // ficha siempre muestra el mismo producto, esté o no pintado en la página.
  function renderSimilares(actual){
    const el=document.getElementById('ppageSimilares');
    if(!el)return;
    const yo=findProduct(actual);
    const resto=CATALOGO.filter(p=>p.slug!==actual);
    const mia=yo?yo.cat:'';
    const lista=[...resto.filter(p=>p.cat===mia),...resto.filter(p=>p.cat!==mia)].slice(0,8);
    if(!lista.length){el.innerHTML='';el.hidden=true;return;}
    el.hidden=false;
    // Misma tarjeta que en el resto de la web, no una versión chica aparte.
    el.innerHTML=`<h3 class="ppage-sim-titulo">Productos similares</h3>
      <div class="ppage-sim-row productos-grid">${lista.map(cardHTML).join('')}</div>`;
    el.querySelectorAll('.product-card').forEach(c=>c.style.setProperty('--card-img-scale',c.dataset.imgScale??0.75));
    Trust.decorarTarjetas();
  }

  // Cambiar de producto sin cerrar: se rellena la MISMA ficha y se sube arriba.
  function irA(slug){
    const p=findProduct(slug);
    if(!p)return;
    qty=1;tiersOpen=false;isTemp=false;
    populate(p,false);
    medirResenas();

    // Si ese producto está pintado y visible en la página, la ficha pasa a
    // cerrarse hacia él. Si no está a la vista se deja la tarjeta de origen,
    // porque animar hacia un elemento oculto deja la ficha colapsada en nada.
    const card=[...document.querySelectorAll(`.product-card[data-id="${CSS.escape(slug)}"]`)]
      .find(c=>c.offsetParent!==null||c===originCard);
    if(card&&card!==originCard){
      if(originCard)originCard.style.visibility='';
      originCard=card;originRect=card.getBoundingClientRect();
      card.style.visibility='hidden';
    }
    // El scroll ahora lo lleva la ficha entera, no la columna de datos.
    ppage.scrollTo({top:0,behavior:'smooth'});
  }

  // Estrellas y descuento, bajo el nombre del producto.
  function renderMeta(p){
    const el=document.getElementById('ppageMeta');
    if(!el)return;
    const lista=Reviews.porProducto(p.slug);
    let estrellas='';
    if(lista.length){
      const r=Reviews.resumen(lista);
      estrellas=`<a href="#ppageReviews" class="ppage-stars">${Reviews.estrellas(Math.round(r.media),'sm')}<span>${r.total} ${r.total===1?'reseña':'reseñas'}</span></a>`;
    }
    el.innerHTML=estrellas+Trust.descuentoHTML(tierOne(p.slug),p.compare);
  }

  // Stock, entrega y medios de pago. Los datos salen del catálogo.
  function renderTrust(p){
    const el=document.getElementById('ppageTrust');
    if(!el)return;
    el.innerHTML=`${Trust.stockHTML(p.stock)}${Trust.entregaHTML()}${Trust.pagosHTML()}`;
  }

  // Un producto del catálogo. Si la tarjeta no está en el catálogo (por
  // ejemplo el carrusel viejo), se arma uno al vuelo con sus data-*.
  function datosDe(card){
    return findProduct(card.dataset.id) || {
      slug: card.dataset.id || '',
      cat: card.dataset.cat || '',
      name: card.dataset.name || '',
      image: getCardImg(card)?.src || '',
      desc: card.dataset.desc || '',
      compare: card.dataset.compare,
      stock: card.dataset.stock,
    };
  }

  // El recorte de las reseñas se decide midiendo, y medir necesita que la
  // ficha ya esté en pantalla. Los dos cuadros de espera dejan que el
  // navegador haga el cálculo de posiciones antes de preguntar el alto.
  function medirResenas(){
    requestAnimationFrame(()=>requestAnimationFrame(()=>Reviews.ajustarRecorte()));
  }

  // ── Personas viendo este producto ─────────────────────────
  // Nunca arranca en el mismo numero (minimo 9) y sube de a uno cada cierto
  // rato mientras la ficha sigue abierta. Es un efecto de vitrina, no un dato.
  let _pvN=0,_pvT=null,_pvTope=0;
  function _pvPinta(){
    const el=document.getElementById('ppageViewers');
    if(!el)return;
    const t=el.querySelector('.pv-txt');
    if(t)t.innerHTML='<b>'+_pvN+'</b> Personas viendo este producto';
    el.hidden=false;
  }
  function _pvAgenda(){
    _pvT=setTimeout(function subir(){
      if(!isOpen){stopViewers();return;}
      if(_pvN<_pvTope){_pvN++;_pvPinta();
        const el=document.getElementById('ppageViewers');
        if(el){el.classList.remove('pv-bump');void el.offsetWidth;el.classList.add('pv-bump');}
      }
      _pvAgenda();
    }, 2500+Math.floor(Math.random()*3000));   // entre 2,5 y 5,5 s
  }
  function startViewers(){
    stopViewers();
    _pvN=9+Math.floor(Math.random()*15);        // 9 a 23 al abrir
    _pvTope=_pvN+6+Math.floor(Math.random()*8);  // sube unas cuantas y frena
    _pvPinta();
    _pvAgenda();
  }
  function stopViewers(){
    clearTimeout(_pvT);_pvT=null;
    const el=document.getElementById('ppageViewers');
    if(el){el.hidden=true;el.classList.remove('pv-bump');}
  }

  function populate(p,temp){
    clonarPie();
    const key=p.slug;
    const base=tierOne(key)||Number(p.price)||0;
    tiers = PRICE_TIERS[key] || [{ qty: 1, price: base }];
    currentProduct = {
      id: 'cat-' + key,
      key: key,
      name: p.name,
      price: fmt(tiers[0]?.price ?? base),
      rawPrice: tiers[0]?.price ?? base,
      image: p.image || ''
    };
    openingImage=currentProduct.image;
    document.getElementById('ppageImg').src=currentProduct.image;
    document.getElementById('ppageImg').alt=currentProduct.name;
    document.getElementById('ppageName').textContent=currentProduct.name;
    document.getElementById('ppageDesc').textContent=p.desc||'';
    document.getElementById('ppageQtyNum').textContent='1';
    ['ppage-features'].forEach(id=>{const b=document.getElementById(id+'-body'),c=document.getElementById(id+'-chev');if(b)b.style.height='0';if(c)c.classList.remove('open');});
    document.getElementById('ppageTiersList').style.height='0';
    renderTiers();updateTotal();renderFeatures(key);
    renderMeta(p);renderTrust(p);Reviews.renderProducto(key);renderSimilares(key);
    startViewers();
    resetCarousel(currentProduct.image,p.name,key);
    _buyTried=false;
    if(colorVars(key))imgIndex=-1;            // color: ninguno elegido al abrir
    renderColors(key);
    document.getElementById('ppageColorHint')?.classList.remove('show');
    document.getElementById('ppageColorsRow')?.classList.remove('shake');
    if(temp&&!colorVars(key)){isTemp=true;updateArrow();renderTempThumbs();}
  }

  // El pie se copia al abrir la primera ficha, no al arrancar, porque
  // js/tr.js pinta los medios de pago después y un clon temprano saldría
  // sin ellos. La copia en sí la hace clonarPieEn(), en js/sd.js.
  const clonarPie=()=>clonarPieEn('ppageFooter');

  // Abrir por slug, sin una tarjeta de la que salir: lo usa el buscador de la
  // nav. Si ese producto sí está pintado y a la vista, se abre desde él para
  // conservar la animación; si no, crece desde el centro de la pantalla.
  function abrirSlug(slug){
    if(isOpen)return;
    const card=[...document.querySelectorAll(`.product-card[data-id="${CSS.escape(slug)}"]`)]
      .find(c=>c.offsetParent!==null);
    if(card){open(card);return;}

    const p=findProduct(slug);
    if(!p)return;
    isOpen=true;originCard=null;qty=1;tiersOpen=false;
    populate(p,false);
    ppage.scrollTop=0;
    const w=window.innerWidth,h=window.innerHeight;
    originRect={left:w/2,top:h/2,width:0,height:0};
    ppage.style.cssText='display:block;position:fixed;top:0;right:0;bottom:0;left:0;width:100vw;max-width:100vw;height:100dvh;margin:0;padding:0;border-radius:0;overflow-y:auto;overflow-x:hidden;transform-origin:50% 50%;';
    const ppageInfo=document.getElementById('ppageInfo');
    if(ppageInfo)ppageInfo.style.opacity='1';
    lockScroll();ppage.classList.add('active');overlay.classList.add('active');overlay.style.opacity='0';
    gsap.to(overlay,{opacity:1,duration:.35,ease:'power2.out'});
    gsap.fromTo(ppage,{opacity:0,scale:.94},{opacity:1,scale:1,duration:.4,ease:'power3.out',onComplete(){ppage.style.transformOrigin='';ppage.style.transform='';ppage.style.opacity='';}});
    medirResenas();
  }

  function open(card){
    if(isOpen)return;
    isOpen=true;originCard=card;qty=1;tiersOpen=false;
    populate(datosDe(card),card.classList.contains('csl-slide'));
    ppage.scrollTop=0;          // cada producto abre desde arriba
    originRect=card.getBoundingClientRect();
    const cardImg=getCardImg(card),ppageImgEl=document.getElementById('ppageImg'),ppageInfo=document.getElementById('ppageInfo');

    if(!document.startViewTransition||window.innerWidth<=900){
      const cx=(originRect.left+originRect.width/2)/window.innerWidth*100,cy=(originRect.top+originRect.height/2)/window.innerHeight*100;
      ppage.style.cssText=`display:block;position:fixed;top:0;right:0;bottom:0;left:0;width:100vw;max-width:100vw;height:100dvh;margin:0;padding:0;border-radius:0;overflow-y:auto;overflow-x:hidden;transform-origin:${cx.toFixed(2)}% ${cy.toFixed(2)}%;`;
      if(ppageInfo)ppageInfo.style.opacity='1';
      lockScroll();ppage.classList.add('active');overlay.classList.add('active');overlay.style.opacity='0';card.style.visibility='hidden';
      gsap.to(overlay,{opacity:1,duration:.4,ease:'power2.out'});
      gsap.fromTo(ppage,{scale:0},{scale:1,duration:.52,ease:'expo.out',onComplete(){ppage.style.transformOrigin='';ppage.style.transform='';}});
      medirResenas();
      return;
    }

    if(ppageInfo){ppageInfo.style.opacity='0';ppageInfo.style.transform='scale(1.28) translateY(32px)';}
    const ppageBack=document.getElementById('ppageBack');
    if(ppageBack){ppageBack.style.opacity='0';ppageBack.style.transform='scale(1.04) translateY(-10px)';}

    card.style.viewTransitionName='card-container';
    if(cardImg){cardImg.style.transition='none';void cardImg.offsetHeight;cardImg.style.viewTransitionName='product-hero';}

    const vt=document.startViewTransition(()=>{
      card.style.viewTransitionName='';
      if(cardImg){cardImg.style.viewTransitionName='';cardImg.style.transition='';}
      card.style.visibility='hidden';

      ppage.style.display='block';ppage.style.position='fixed';ppage.style.inset='0';
      ppage.style.width='100vw';ppage.style.height='100dvh';
      ppage.style.margin='0';ppage.style.padding='0';ppage.style.borderRadius='0';ppage.style.overflowY='auto';ppage.style.overflowX='hidden';
      ppage.style.transform='';ppage.style.transformOrigin='';

      ppage.style.viewTransitionName='card-container';
      ppageImgEl.style.transition='none';
      ppageImgEl.style.viewTransitionName='product-hero';

      ppage.classList.add('active');overlay.classList.add('active');overlay.style.opacity='1';
      lockScroll();
    });

    vt.ready.then(()=>{
      if(ppageInfo) gsap.to(ppageInfo,{opacity:1,scale:1,y:0,duration:.38,ease:'power3.out'});

      const els=[
        ppageInfo?.querySelector('.ppage-name'),
        ppageInfo?.querySelector('.ppage-desc'),
        document.getElementById('ppageTierWrap'),
        document.getElementById('ppageActionsWrap'),
        document.getElementById('ppageAccordions'),
      ].filter(Boolean);

      gsap.set(els,{opacity:0,y:14});
      gsap.to(els,{
        opacity:1, y:0,
        duration:.30,
        ease:'power2.out',
        stagger:.06,
        delay:.10,
      });

      if(ppageBack) gsap.to(ppageBack,{opacity:1,scale:1,y:0,duration:.24,ease:'power2.out',delay:.06});
      medirResenas();
    }).catch(()=>{
      if(ppageInfo){ppageInfo.style.opacity='1';ppageInfo.style.transform='';}
      if(ppageBack){ppageBack.style.opacity='1';ppageBack.style.transform='';}
    });

    vt.finished
      .then(()=>{
        ppage.style.viewTransitionName='';
        ppageImgEl.style.viewTransitionName='';ppageImgEl.style.transition='';
        if(ppageInfo){ppageInfo.style.opacity='1';ppageInfo.style.transform='';}
        if(ppageBack){ppageBack.style.opacity='1';ppageBack.style.transform='';}
      })
      .catch(()=>{
        cleanAllVT(card);
        isOpen=false;currentProduct=null;originCard=null;unlockScroll();
        if(ppageInfo){ppageInfo.style.opacity='1';ppageInfo.style.transform='';}
      });
  }

  function close(){
    if(!isOpen||!originRect)return;
    stopViewers();
    const card=originCard,cardImg=getCardImg(card),ppageImgEl=document.getElementById('ppageImg'),iw=document.getElementById('ppageImgWrap');

    const isNormalCard=!card?.classList.contains('csl-slide');

    gsap.killTweensOf(iw);gsap.killTweensOf(ppageImgEl);
    if(iw){iw.style.transform='';iw.style.opacity='';iw.style.setProperty('--ppage-img-scale','1');}

    if(!document.startViewTransition||window.innerWidth<=900){
      let r=originRect;if(card){const f=card.getBoundingClientRect();if(f.width>0)r=f;}
      const cx=(r.left+r.width/2)/window.innerWidth*100,cy=(r.top+r.height/2)/window.innerHeight*100;
      ppage.style.transformOrigin=`${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
      gsap.to(overlay,{opacity:0,duration:.3,ease:'power2.in'});
      gsap.to(ppage,{scale:0,duration:.42,ease:'expo.in',onComplete(){
        ppage.classList.remove('active');overlay.classList.remove('active');overlay.style.opacity='0';
        ppage.style.display='none';ppage.style.transform='';ppage.style.transformOrigin='';
        if(card)card.style.visibility='';
        isOpen=false;currentProduct=null;originCard=null;isTemp=false;isAnimImg=false;openingImage='';
        unlockScroll();
      }});
      return;
    }

    const closingImgSrc=openingImage||ppageImgEl?.src||'';
    const ppageInfo=document.getElementById('ppageInfo');
    const ppageBack=document.getElementById('ppageBack');

    function doClose(){
      if(ppageImgEl){
        ppageImgEl.src=closingImgSrc;
        ppageImgEl.style.transition='none';
        ppageImgEl.style.transform='';
      }
      if(cardImg&&closingImgSrc)cardImg.src=closingImgSrc;
      void ppageImgEl?.offsetHeight;

      if(isNormalCard) document.documentElement.classList.add('vt-closing-card');

      ppage.style.viewTransitionName='card-container';
      ppageImgEl.style.viewTransitionName='product-hero';

      const vt=document.startViewTransition(()=>{
        ppageImgEl.style.opacity='0';
        ppageImgEl.style.viewTransitionName='';
        ppageImgEl.style.transition='';
        iw?.style.setProperty('--ppage-img-scale','1');
        ppage.style.viewTransitionName='';
        ppage.classList.remove('active');overlay.classList.remove('active');overlay.style.opacity='0';
        ppage.style.display='none';ppage.style.transform='';ppage.style.borderRadius='';
        if(card){
          card.style.visibility='';
          card.style.viewTransitionName='card-container';
          if(cardImg){cardImg.style.transition='none';cardImg.style.viewTransitionName='product-hero';}
        }
        unlockScroll();
        isOpen=false;currentProduct=null;originCard=null;isTemp=false;isAnimImg=false;openingImage='';
        ppageInfo?.style.removeProperty('opacity');
        ppageInfo?.style.removeProperty('transform');
        ppageBack?.style.removeProperty('opacity');
      });

      vt.finished
        .then(()=>{
          document.documentElement.classList.remove('vt-closing-card');
          if(card)card.style.viewTransitionName='';
          if(cardImg){cardImg.style.viewTransitionName='';cardImg.style.transition='';}
          if(ppageImgEl)ppageImgEl.style.opacity='';

        })
        .catch(()=>{
          document.documentElement.classList.remove('vt-closing-card');
          cleanAllVT(card);
          if(ppageImgEl)ppageImgEl.style.opacity='';

          isOpen=false;currentProduct=null;originCard=null;unlockScroll();
        });
    }

    if(ppageImgEl?.src)ppageImgEl.decode().then(doClose).catch(doClose);
    else doClose();
  }

  function closeInstant(){
    if(!isOpen)return;
    gsap.killTweensOf(ppage);gsap.killTweensOf(overlay);
    ppage.classList.remove('active');overlay.classList.remove('active');overlay.style.opacity='0';
    ppage.style.display='none';ppage.style.transform='';ppage.style.transformOrigin='';
    if(originCard)originCard.style.visibility='';
    isOpen=false;currentProduct=null;originCard=null;qty=1;tiersOpen=false;isTemp=false;isAnimImg=false;openingImage='';
    unlockScroll();
  }

  function init(){
    ppage.style.display='none';overlay.style.opacity='0';

    backBtn.addEventListener('click',close);overlay.addEventListener('click',close);

    // Los enlaces del pie apuntan a secciones de la home, que está detrás de
    // la ficha. Sin cerrarla primero, el visitante quedaría atrapado mirando
    // una ficha mientras la página de abajo salta a otra parte. Si además hay
    // una sección de categoría abierta, también hay que cerrarla; la
    // excepción es "Productos", que justamente sirve para abrirla.
    document.getElementById('ppageFooter')?.addEventListener('click',e=>{
      const a=e.target.closest('a');
      if(!a)return;
      close();
      if(!a.dataset.catAbrir&&typeof CatPage!=='undefined')CatPage.cerrar();
    });

    // "Ver más reseñas". El botón se pinta con las reseñas, así que el clic
    // se escucha en el contenedor, que sí es fijo.
    document.getElementById('ppageReviews')?.addEventListener('click',e=>{
      if(e.target.closest('#ppageRvMas'))Reviews.verMas();
    });

    // Clic en un producto similar → se rellena la misma ficha, no se abre otra.
    // El botón de carrito de esa tarjeta lo atiende el oyente de abajo.
    document.getElementById('ppageSimilares')?.addEventListener('click',e=>{
      if(e.target.closest('.card-cart'))return;
      const c=e.target.closest('.product-card');
      if(c&&!c.classList.contains('out-of-stock'))irA(c.dataset.id);
    });

    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-producto]');
      if(!b)return;
      e.preventDefault();
      abrirSlug(b.dataset.producto);
    });

    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    document.getElementById('ppageTierSelected')?.addEventListener('click',toggleTiers);
    document.getElementById('ppageImgNext')?.addEventListener('click',()=>goToImg(imgIndex+1));

    const panel=document.getElementById('ppageImgPanel');
    if(panel){
      let tx=0,ty=0;
      panel.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
      panel.addEventListener('touchend',e=>{
        const dx=tx-e.changedTouches[0].clientX;
        const dy=ty-e.changedTouches[0].clientY;
        if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))
          goToImg(dx>0?imgIndex+1:imgIndex-1);
      },{passive:true});
    }
    document.getElementById('ppageQtyMinus').addEventListener('click',()=>{if(qty>1){qty--;document.getElementById('ppageQtyNum').textContent=qty;updateTotal();}});
    document.getElementById('ppageQtyPlus').addEventListener('click',()=>{qty++;document.getElementById('ppageQtyNum').textContent=qty;updateTotal();});
    document.getElementById('ppageWaBtn')?.addEventListener('click',()=>{if(!currentProduct)return;if(_blockColor())return;if(_colorSinStock())return;const u=priceForQty(qty),t=u*qty;const cv=colorVars(currentProduct.key),cn=(cv&&imgIndex>=0&&cv[imgIndex])?cv[imgIndex].name:'';const msg=[`*\u00a1Hola!* Me interesa este producto:`,'',`\u25b8 ${qty}x ${currentProduct.name}${cn?` (${cn})`:''}`,`  Precio: ${fmt(u)} c/u`,`  Total: *${fmt(t)}*`,'','\u00bfTienen stock disponible?'].join('\n');window.open(`https://wa.me/5492645506676?text=${encodeURIComponent(msg)}`,'_blank');});
    document.getElementById('ppageCartBtn').addEventListener('click',()=>{if(!currentProduct)return;if(_blockColor())return;if(_colorSinStock())return;const p=cartProduct();for(let i=0;i<qty;i++)Cart.addItem(p);const b=document.getElementById('ppageCartBtn');b.innerHTML='<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';setTimeout(()=>{b.innerHTML='<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.5c.8 0 1.5-.5 1.7-1.2l3-7H6.2L5.3 3H1v2h3l3.6 7.6-1.3 2.4c-.1.2-.2.5-.2.8 0 1.1.9 2 2 2h12v-2H8.4c-.1 0-.2-.1-.2-.2l.03-.12L9.1 14z"/></svg>';},1800);});
    document.getElementById('ppageMpBtn')?.addEventListener('click',()=>{if(!currentProduct)return;if(_blockColor())return;if(_colorSinStock())return;const p=cartProduct();for(let i=0;i<qty;i++)Cart.addItem(p);Checkout.open();});
    ['ppage-features'].forEach(id=>document.getElementById(id+'-header')?.addEventListener('click',()=>openAccordion(id)));
    // Las tarjetas se pintan y se repintan todo el tiempo (ofertas, panel de
    // categoría, buscador), así que el clic se escucha una sola vez acá arriba
    // en vez de atarlo a cada botón.
    document.addEventListener('click',e=>{
      const carro=e.target.closest('.card-cart');
      if(carro){e.preventDefault();e.stopPropagation();agregarRapido(carro);return;}
      const card=e.target.closest('.product-card');
      if(card&&!card.classList.contains('out-of-stock'))open(card);
    });
  }

  // Botón de carrito de la tarjeta: agrega una unidad sin abrir la ficha.
  // Si el producto tiene colores hay que elegir uno, así que abre la ficha.
  function agregarRapido(btn){
    const card=btn.closest('.product-card');
    if(!card)return;
    const p=datosDe(card);
    if(colorVars(p.slug)){open(card);return;}
    const precio=tierOne(p.slug)||Number(card.dataset.price)||0;
    Cart.addItem({id:'cat-'+p.slug,key:p.slug,name:p.name,price:fmt(precio),rawPrice:precio,image:p.image});
    btn.classList.add('ok');
    setTimeout(()=>btn.classList.remove('ok'),1200);
  }
  return{init,close,open,abrirSlug,closeInstant};
})();
