// cc
'use strict';
const Cart=(()=>{
  let isOpen=false;
  function open(){
    if(isOpen)return;isOpen=true;
    DOM.cartDrawer.style.display='flex';DOM.cartDrawer.style.position='fixed';DOM.cartDrawer.style.top='0';DOM.cartDrawer.style.right='0';DOM.cartDrawer.style.height='100%';DOM.cartDrawer.style.zIndex='9999';DOM.cartDrawer.style.visibility='visible';
    void DOM.cartDrawer.offsetHeight;
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
    DOM.cartOverlay.classList.add('visible');
    gsap.to(DOM.cartOverlay,{opacity:1,duration:0.4,ease:'power2.out'});
    gsap.fromTo(DOM.cartDrawer,{x:'100%'},{x:'0%',duration:0.6,ease:'power4.out'});
    const items=DOM.cartItems.querySelectorAll('.cart-item');
    if(items.length)gsap.fromTo(items,{opacity:0,x:30},{opacity:1,x:0,duration:0.4,stagger:0.07,ease:'power3.out',delay:0.25});
  }
  function close(){
    if(!isOpen)return;
    gsap.to(DOM.cartOverlay,{opacity:0,duration:0.35,ease:'power2.in',onComplete:()=>DOM.cartOverlay.classList.remove('visible')});
    gsap.to(DOM.cartDrawer,{x:'100%',duration:0.45,ease:'power4.in',onComplete:()=>{isOpen=false;DOM.cartDrawer.style.zIndex='';DOM.cartDrawer.style.visibility='';DOM.cartDrawer.style.display='';document.body.style.overflow='';document.documentElement.style.overflow='';}});
  }
  function addItem(product){const p={...product,key:product.key||null};const ex=state.cart.find(i=>String(i.product.id)===String(p.id));if(ex)ex.qty++;else state.cart.push({product:p,qty:1});render();updateBadge();}
  function removeItem(id,skipRender){const s=String(id);state.cart=state.cart.filter(i=>String(i.product.id)!==s);if(!skipRender){render();updateBadge();}}
  function changeQty(id,delta,skipRender){const s=String(id);const item=state.cart.find(i=>String(i.product.id)===s);if(!item)return;item.qty=Math.max(0,item.qty+delta);if(item.qty===0)removeItem(id,skipRender);else{if(!skipRender){render();updateBadge();const el=DOM.cartItems.querySelector(`.cart-item[data-id="${id}"] .cart-item-qty span`);if(el)gsap.fromTo(el,{scale:1.45,opacity:.5},{scale:1,opacity:1,duration:.25,ease:'back.out(2)'});}}}
  function updateBadge(){const t=state.cart.reduce((s,i)=>s+i.qty,0);DOM.cartCount.textContent=t;DOM.cartCount.classList.toggle('visible',t>0);}
  const fmt=n=>'$'+n.toLocaleString('es-AR');
  function render(){
    if(!state.cart.length){DOM.cartItems.innerHTML='<p class="cart-empty">Tu carrito está vacío</p>';DOM.cartFooter.style.display='none';return;}
    DOM.cartFooter.style.display='block';
    DOM.cartTotal.textContent=fmt(state.cart.reduce((s,i)=>s+getUnitPrice(i.product.key,i.qty)*i.qty,0));
    DOM.cartItems.innerHTML=state.cart.map(({product,qty})=>{const up=getUnitPrice(product.key,qty);return`<div class="cart-item" data-id="${product.id}"><img class="cart-item-img" src="${product.image||''}" alt="${product.name}"><div class="cart-item-info"><p class="cart-item-name">${product.name}${product.colorName?` <span class="cart-item-color">${product.colorName}</span>`:''}</p><p class="cart-item-price">${fmt(up)}</p></div><div class="cart-item-qty"><button class="qty-btn" data-id="${product.id}" data-delta="-1">−</button><span>${qty}</span><button class="qty-btn" data-id="${product.id}" data-delta="1">+</button></div></div>`;}).join('');
    DOM.cartItems.querySelectorAll('.qty-btn').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.id,Number(btn.dataset.delta))));
    const fi=DOM.cartItems.querySelector('.cart-item');if(fi)gsap.fromTo(fi,{opacity:0,x:24},{opacity:1,x:0,duration:0.4,ease:'power3.out'});
  }
  function openMercadoPago(){
    if(!state.cart.length)return;
    Checkout.open();
  }
  function openWhatsApp(){
    if(!state.cart.length)return;
    const f=n=>'$'+n.toLocaleString('es-AR');
    const lines=state.cart.map(({product,qty})=>{const up=getUnitPrice(product.key,qty);return`\u25b8 ${qty}x ${product.name}${product.colorName?` (${product.colorName})`:''}\n  ${f(up)} c/u = *${f(up*qty)}*`;});
    const total=state.cart.reduce((s,i)=>s+getUnitPrice(i.product.key,i.qty)*i.qty,0);
    const msg=['*\u00a1Hola!* Me interesa hacer un pedido:','',...lines,'',`Total: *${f(total)}*`,'','\u00bfTienen stock disponible?'].join('\n');
    window.open(`https://wa.me/5492645506676?text=${encodeURIComponent(msg)}`,'_blank');
  }
  function init(){
    document.body.appendChild(DOM.cartDrawer);document.body.appendChild(DOM.cartOverlay);
    DOM.cartTrigger.addEventListener('click',open);DOM.closeCart.addEventListener('click',close);DOM.cartOverlay.addEventListener('click',close);
    document.getElementById('checkoutBtn')?.addEventListener('click',openWhatsApp);
    document.getElementById('mpBtn')?.addEventListener('click',openMercadoPago);
  }
  return{init,addItem,open,close};
})();

const Checkout=(()=>{
  const modal=document.getElementById('checkoutModal');
  const panel=document.querySelector('.checkout-panel');
  const itemsEl=document.getElementById('checkoutItems');
  const totalEl=document.getElementById('checkoutTotal');
  const payBtn=document.getElementById('checkoutPayBtn');
  let isOpen=false;
  const f=n=>'$'+n.toLocaleString('es-AR');

  function getEmail(){
    const u=document.getElementById('chkEmailUser')?.value.trim()||'';
    const d=document.getElementById('edsValue')?.textContent||'@gmail.com';
    return u+d;
  }
  function getPhone(){
    const n=document.getElementById('chkPhone')?.value.trim()||'';
    return '+54 '+n;
  }
  function getRaw(id){return document.getElementById(id)?.value.trim()||''}

  function isValid(){
    return getRaw('chkName')&&getEmail()&&getPhone()&&getRaw('chkCity');
  }

  function updatePayBtn(){
    payBtn.disabled=!isValid()||!state.cart.length;
  }

  function calcTotals(){
    let total=0;
    state.cart.forEach(i=>{const up=getUnitPrice(i.product.key,i.qty);total+=up*i.qty;});
    return total;
  }

  function updateBadge(){
    const t=state.cart.reduce((s,i)=>s+i.qty,0);
    const el=document.getElementById('cartCount');
    if(el){el.textContent=t;el.classList.toggle('visible',t>0);}
  }

  function renderItems(){
    if(!state.cart.length){itemsEl.innerHTML='<p style="text-align:center;color:var(--gray-mid);padding:20px 0">Carrito vacío</p>';return;}
    itemsEl.innerHTML=state.cart.map(({product,qty})=>{
      const up=getUnitPrice(product.key,qty);
      return`<div class="checkout-item" data-id="${product.id}">
        <img class="checkout-item-img" src="${product.image||''}" alt="${product.name}" loading="lazy">
        <div class="checkout-item-info">
          <div class="checkout-item-name">${product.name}${product.colorName?` · ${product.colorName}`:''}</div>
          <div class="checkout-item-unit-price">${f(up)} c/u</div>
        </div>
        <div class="checkout-item-qty-wrap">
          <button class="checkout-qty-btn" data-id="${product.id}" data-delta="-1">−</button>
          <span class="checkout-qty-num">${qty}</span>
          <button class="checkout-qty-btn" data-id="${product.id}" data-delta="1">+</button>
        </div>
        <div class="checkout-item-subtotal">${f(up*qty)}</div>
        <button class="checkout-item-remove" data-id="${product.id}" aria-label="Eliminar">×</button>
      </div>`;
    }).join('');
    itemsEl.querySelectorAll('.checkout-qty-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const s=String(btn.dataset.id),delta=Number(btn.dataset.delta);
      const item=state.cart.find(i=>String(i.product.id)===s);
      if(!item)return;
      item.qty=Math.max(0,item.qty+delta);
      if(item.qty===0)state.cart=state.cart.filter(i=>String(i.product.id)!==s);
      updateBadge();
      renderItems();
      totalEl.textContent=f(calcTotals());
      updatePayBtn();
      if(!state.cart.length)close();
    }));
    itemsEl.querySelectorAll('.checkout-item-remove').forEach(btn=>btn.addEventListener('click',()=>{
      const s=String(btn.dataset.id);
      state.cart=state.cart.filter(i=>String(i.product.id)!==s);
      updateBadge();
      renderItems();
      totalEl.textContent=f(calcTotals());
      updatePayBtn();
      if(!state.cart.length)close();
    }));
    totalEl.textContent=f(calcTotals());
  }

  function formatRut(v){
    let d=v.replace(/[^0-9kK]/g,'').toUpperCase();
    if(d.length<=1)return d;
    const body=d.slice(0,-1),checker=d.slice(-1);
    let formatted='';
    for(let i=0;i<body.length;i++){
      if(i>0&&(body.length-i)%3===0)formatted+='.';
      formatted+=body[i];
    }
    return formatted+'-'+checker;
  }

  function clearForm(){
    ['chkName','chkRut','chkCity','chkAddress'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.value='';el.classList.remove('error');}
    });
    const eu=document.getElementById('chkEmailUser');
    if(eu)eu.value='';
    const ev=document.getElementById('edsValue');
    if(ev)ev.textContent='@gmail.com';
    const ph=document.getElementById('chkPhone');
    if(ph)ph.value='';
  }

  function open(){
    if(isOpen){
      isOpen=false;
      modal.style.display='none';
    }
    isOpen=true;

    renderItems();
    totalEl.textContent=f(calcTotals());
    updatePayBtn();
    clearForm();

    if(modal.parentElement!==document.body) document.body.appendChild(modal);

    gsap.set(modal,{display:'flex',opacity:0});
    gsap.set(panel,{x:'100%'});

    gsap.to(modal,{opacity:1,duration:.3,ease:'power2.out'});
    gsap.to(panel,{x:'0%',duration:.4,ease:'power3.out'});

    document.body.style.overflow='hidden';
    document.documentElement.style.overflow='hidden';
  }

  function close(){
    if(!isOpen)return;
    isOpen=false;
    gsap.killTweensOf(modal);gsap.killTweensOf(panel);
    gsap.to(panel,{x:'100%',duration:0.35,ease:'power3.in'});
    gsap.to(modal,{opacity:0,duration:0.2,ease:'power2.in',delay:0.1,onComplete:()=>{
      modal.style.display='none';gsap.set(panel,{x:'100%'});
    }});
    document.body.style.overflow='';
    document.documentElement.style.overflow='';
  }

  async function pay(){
    if(!isValid()||!state.cart.length)return;
    payBtn.disabled=true;
    payBtn.classList.add('loading');
    payBtn.textContent='Procesando...';
    try{
      const customer={
        name:getRaw('chkName'),email:getEmail(),phone:getPhone(),
        rut:getRaw('chkRut'),city:getRaw('chkCity'),address:getRaw('chkAddress'),
      };
      const items=state.cart.map(({product,qty})=>({name:product.name+(product.colorName?` (${product.colorName})`:''),qty,price:getUnitPrice(product.key,qty),img:product.image||''}));
      const res=await fetch('/api/create-preference',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({items,customer}),
      });
      const data=await res.json();
      if(data.init_point)window.location.href=data.init_point;
      else throw new Error(data.error||'Error al crear preferencia');
    }catch{
      payBtn.textContent='Error, intenta de nuevo';
      payBtn.disabled=false;
      payBtn.classList.remove('loading');
    }
  }

  function init(){
    document.getElementById('checkoutClose')?.addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    modal?.addEventListener('click',e=>{if(e.target===modal)close();});
    ['chkName','chkEmailUser','chkPhone','chkCity','chkAddress'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.addEventListener('input',updatePayBtn);
    });
    document.getElementById('chkRut')?.addEventListener('input',function(){
      const s=this.selectionStart||0,c=this.value.length;
      this.value=formatRut(this.value);
      const d=this.value.length-c;
      this.setSelectionRange(s+d,s+d);
    });
    (()=>{
      const eds=document.getElementById('eds'),trigger=document.getElementById('edsTrigger'),menu=document.getElementById('edsMenu'),value=document.getElementById('edsValue');
      if(!eds||!trigger||!menu)return;
      let open=false;
      function closeMenu(){if(!open)return;open=false;gsap.to(menu,{opacity:0,y:-6,duration:.15,ease:'power2.out',onComplete:()=>{menu.classList.remove('open');}});document.querySelector('.eds-chevron')?.classList.remove('open');}
      trigger.addEventListener('click',e=>{e.stopPropagation();if(open){closeMenu();return;}open=true;menu.classList.add('open');gsap.set(menu,{opacity:0,y:-6});gsap.to(menu,{opacity:1,y:0,duration:.2,ease:'power2.out'});document.querySelector('.eds-chevron')?.classList.add('open');});
      menu.querySelectorAll('.eds-opt').forEach(opt=>{opt.addEventListener('click',()=>{value.textContent=opt.dataset.value;menu.querySelectorAll('.eds-opt').forEach(o=>o.classList.remove('selected'));opt.classList.add('selected');closeMenu();updatePayBtn();});});
      document.addEventListener('click',e=>{if(!eds.contains(e.target))closeMenu();});
    })();
    payBtn?.addEventListener('click',pay);
    document.getElementById('checkoutWaBtn')?.addEventListener('click',e=>{e.preventDefault();close();openWhatsApp();});
  }

  function openWhatsApp(){
    if(!state.cart.length)return;
    const lines=state.cart.map(({product,qty})=>{const up=getUnitPrice(product.key,qty);return`▸ ${qty}x ${product.name}${product.colorName?` (${product.colorName})`:''}\n  ${f(up)} c/u = *${f(up*qty)}*`;});
    const total=state.cart.reduce((s,i)=>s+getUnitPrice(i.product.key,i.qty)*i.qty,0);
    const msg=['*¡Hola!* Me interesa hacer un pedido:','',...lines,'',`Total: *${f(total)}*`,'','¿Tienen stock disponible?'].join('\n');
    window.open(`https://wa.me/5492645506676?text=${encodeURIComponent(msg)}`,'_blank');
  }

  return{init,open,close};
})();
