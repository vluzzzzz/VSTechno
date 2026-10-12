// he
'use strict';
function setHeroAddToCartState(inStock){
  if(!DOM.addToCart)return;
  DOM.addToCart.disabled = !inStock;
  if(!inStock){
    DOM.addToCart.style.opacity = '.4';
    DOM.addToCart.style.pointerEvents = 'none';
  } else {
    DOM.addToCart.style.opacity = '';
    DOM.addToCart.style.pointerEvents = '';
  }
}

const CartButton=(()=>{
  let timer=null;
  function trigger(){const btn=DOM.addToCart;if(btn.classList.contains('added'))return;
    const prod=PRODUCTS[state.current];
    // Si el producto del hero tiene colores, abrir el detalle para elegir (no agregar suelto).
    if(prod&&typeof COLOR_VARIANTS!=='undefined'&&COLOR_VARIANTS[prod.key]&&typeof ProductModal!=='undefined'){
      const card=document.querySelector(`.product-card[data-id="${prod.key}"]`);
      if(card){card.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>ProductModal.open(card),320);return;}
    }
    Cart.addItem(prod);btn.classList.add('added');const r=document.createElement('span');r.style.cssText='position:absolute;border-radius:50%;width:10px;height:10px;background:rgba(0,0,0,.08);transform:scale(0);animation:rippleOut .5s ease-out forwards;top:50%;left:50%;margin:-5px 0 0 -5px;pointer-events:none;';btn.appendChild(r);setTimeout(()=>r.remove(),600);clearTimeout(timer);timer=setTimeout(()=>btn.classList.remove('added'),2200);}
  function init(){DOM.addToCart.addEventListener('click',trigger);const s=document.createElement('style');s.textContent='@keyframes rippleOut{to{transform:scale(28);opacity:0}}';document.head.appendChild(s);}
  return{init};
})();

const MaskReveal=(()=>{
  const N=64,RX_DESK=220,RY_DESK=115,RX_MOB=120,RY_MOB=38,AMP_MOB=0.45;
  const isMob=()=>window.innerWidth<=768,rand=()=>Math.random()*Math.PI*2;
  const MODES=[{k:2,amp:46,spd:0.7,ph:rand()},{k:3,amp:30,spd:1.5,ph:rand()},{k:4,amp:20,spd:-0.9,ph:rand()},{k:5,amp:14,spd:2.3,ph:rand()},{k:7,amp:8,spd:-2.0,ph:rand()},{k:1,amp:16,spd:1.2,ph:rand()}];
  const VM=[{k:1,amp:20,spd:1.7,ph:rand()},{k:2,amp:12,spd:2.5,ph:rand()},{k:3,amp:7,spd:0.9,ph:rand()}];
  let rafId=null,mx=0,my=0,bx=0,by=0,inside=false,scale=0,wr=null,started=false,rt=null;
  const cacheRect=()=>{wr=DOM.bgTextBlueWrap.getBoundingClientRect();};
  function getMC(){if(!wr)cacheRect();const cur=PRODUCTS[state.current],cfg=cur?PRODUCT_CONFIG[cur.id]:null,ratio=cfg?cfg.blobYRatio:0.88;return{x:wr.left+wr.width*.5,y:wr.top+wr.height*ratio};}
  function getLerp(){if(!isMob())return 0.055;const cur=PRODUCTS[state.current],cfg=cur?PRODUCT_CONFIG[cur.id]:null;return cfg?cfg.blobSpeed:0.025;}
  function poly(cx,cy,t){const RX=isMob()?RX_MOB:RX_DESK,RY=isMob()?RY_MOB:RY_DESK,amp=isMob()?AMP_MOB:1,pts=[];for(let i=0;i<N;i++){const a=(i/N)*Math.PI*2;let dr=0;for(const m of MODES)dr+=m.amp*amp*Math.sin(m.k*a+m.spd*t+m.ph);let dv=0;for(const m of VM)dv+=m.amp*amp*Math.sin(m.k*a+m.spd*t+m.ph);const rx=(RX+dr)*scale,ry=(RY+dr*.38)*scale;pts.push(`${(cx+rx*Math.cos(a)).toFixed(1)}px ${(cy+ry*Math.sin(a)+dv*scale).toFixed(1)}px`);}return`polygon(${pts.join(',')})`;}
  function animate(ts){const t=ts*.001,lerp=getLerp();scale+=((inside?1:0)-scale)*(inside?.10:.08);if(!inside&&scale<.004){scale=0;DOM.bgTextBlueWrap.style.clipPath='polygon(0px 0px,0px 0px,0px 0px)';rafId=null;return;}if(!started){bx=mx;by=my;started=true;}bx+=(mx-bx)*lerp;by+=(my-by)*lerp;DOM.bgTextBlueWrap.style.clipPath=poly(bx-wr.left,by-wr.top,t);rafId=requestAnimationFrame(animate);}
  const startLoop=()=>{if(!rafId)rafId=requestAnimationFrame(animate);};
  function refreshMobile(){if(!isMob())return;cacheRect();if(!inside){inside=true;started=false;}const c=getMC();mx=c.x;my=c.y;startLoop();}
  function init(){
    document.fonts.ready.then(()=>{cacheRect();if(isMob()){const c=getMC();mx=c.x;my=c.y;bx=c.x;by=c.y;inside=true;started=true;startLoop();}});
    window.addEventListener('resize',()=>{cacheRect();if(isMob()&&!inside)refreshMobile();},{passive:true});
    const hero=document.getElementById('hero');
    hero.addEventListener('mousemove',e=>{if(isMob())return;if(!wr)cacheRect();mx=e.clientX;my=e.clientY;inside=true;startLoop();});
    hero.addEventListener('mouseleave',()=>{if(isMob())return;inside=false;started=false;startLoop();});
    hero.addEventListener('touchstart',e=>{if(!isMob())return;if(!wr)cacheRect();clearTimeout(rt);mx=e.touches[0].clientX;my=e.touches[0].clientY;},{passive:true});
    hero.addEventListener('touchend',()=>{if(!isMob())return;clearTimeout(rt);rt=setTimeout(()=>{const c=getMC();mx=c.x;my=c.y;},1500);},{passive:true});
  }
  return{init,refreshMobile};
})();
