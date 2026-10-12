// hc
'use strict';
const ProductNav=(()=>{
  let floatTween=null;
  function applyWrapVars(p){
    DOM.productWrap.style.setProperty('--product-scale',p.scale??1);
    DOM.productWrap.style.setProperty('--product-x',(p.offsetX??0)+'px');
    DOM.productWrap.style.setProperty('--product-y',(p.offsetY??0)+'px');
    if(window.innerWidth<=768){const cfg=PRODUCT_CONFIG[p.id];if(cfg){[DOM.bgText,DOM.bgTextBlue,DOM.bgTextZoom].forEach(el=>{if(el)el.style.setProperty('--hero-text-size',cfg.fontSize)});DOM.productWrap.style.setProperty('--product-scale',cfg.productScale);DOM.productWrap.style.setProperty('--product-y',cfg.productY+'px');}}
  }
  function buildDots(){DOM.dotsWrap.innerHTML='';PRODUCTS.forEach((_,i)=>{const d=document.createElement('button');d.className='dot'+(i===state.current?' active':'');d.setAttribute('role','tab');d.setAttribute('aria-label',`Producto ${i+1}`);d.addEventListener('click',()=>goTo(i));DOM.dotsWrap.appendChild(d);});}
  function updateDots(){DOM.dotsWrap.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===state.current));}
  function startFloat(){if(floatTween)floatTween.kill();const s=document.querySelector('.product-stage');floatTween=gsap.to(s,{y:-14,duration:2.5,ease:'sine.inOut',repeat:-1,yoyo:true});}
  function stopFloat(){if(floatTween){floatTween.kill();floatTween=null;}gsap.set(document.querySelector('.product-stage'),{y:0});}
  function goTo(index,direction='next'){
    if(state.isTransitioning||index===state.current)return;
    state.isTransitioning=true;
    const product=PRODUCTS[index],stage=document.querySelector('.product-stage'),priceEl=document.getElementById('priceInner');
    const imgSign=direction==='next'?1:-1,textSign=direction==='next'?-1:1;
    new Image().src=product.image; stopFloat();
    gsap.to(stage,{x:70*imgSign,opacity:0,duration:0.32,ease:'power2.inOut'});
    gsap.to(DOM.bgTextPerspective,{x:70*textSign,opacity:0,duration:0.32,ease:'power2.inOut'});
    if(priceEl)gsap.to(priceEl,{y:'-110%',opacity:0,duration:0.24,ease:'power2.in'});
    gsap.delayedCall(0.32,()=>{
      state.current=index; applyWrapVars(product);
      DOM.bgText.textContent=DOM.bgTextBlue.textContent=DOM.bgTextZoom.textContent=product.bgLabel;
      DOM.productPrice.textContent=HERO_STOCK[product.name] !== false ? product.price : 'SIN STOCK'; updateDots();
      gsap.set(stage,{x:-70*imgSign,opacity:0}); gsap.set(DOM.bgTextPerspective,{x:-70*textSign,opacity:0});
      if(priceEl)gsap.set(priceEl,{y:'110%',opacity:1});
      function runEntrance(){
        gsap.to(stage,{x:0,opacity:1,duration:0.44,ease:'power2.out',onComplete(){startFloat();state.isTransitioning=false;setHeroAddToCartState(HERO_STOCK[product.name] !== false);if(window.innerWidth<=768&&typeof MaskReveal!=='undefined')MaskReveal.refreshMobile();}});
        gsap.to(DOM.bgTextPerspective,{x:0,opacity:1,duration:0.44,ease:'power2.out'});
        if(priceEl)gsap.to(priceEl,{y:'0%',duration:0.36,ease:'power2.out',delay:0.06});
      }
      const img=DOM.productImg; img.onload=()=>{img.onload=null;runEntrance();};
      img.src=product.image; if(img.complete){img.onload=null;runEntrance();}
    });
  }
  function init(){
    buildDots();
    DOM.nextBtn.addEventListener('click',()=>goTo((state.current+1)%PRODUCTS.length,'next'));
    DOM.prevBtn.addEventListener('click',()=>goTo((state.current-1+PRODUCTS.length)%PRODUCTS.length,'prev'));
    let tsx=0;
    document.addEventListener('touchstart',e=>{tsx=e.touches[0].clientX;},{passive:true});
    document.addEventListener('touchend',e=>{const d=tsx-e.changedTouches[0].clientX;if(Math.abs(d)>50)d>0?goTo((state.current+1)%PRODUCTS.length,'next'):goTo((state.current-1+PRODUCTS.length)%PRODUCTS.length,'prev');});
    document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')goTo((state.current+1)%PRODUCTS.length,'next');if(e.key==='ArrowLeft')goTo((state.current-1+PRODUCTS.length)%PRODUCTS.length,'prev');});
    applyWrapVars(PRODUCTS[0]); startFloat();
    setHeroAddToCartState(HERO_STOCK[PRODUCTS[0].name] !== false);
  }
  return{init};
})();
