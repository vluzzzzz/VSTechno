'use strict';
// ap
function freshWork(p){
  // Precio al por mayor: 10 tramos fijos (1..10), se rellenan desde la BD.
  const tiers = [];
  for (let q = 1; q <= 10; q++) tiers.push({ qty:q, price:0, active:false });
  (p.price_tiers || []).forEach(t => {
    if (t.qty >= 1 && t.qty <= 10) {
      tiers[t.qty-1].price = t.price || 0;
      tiers[t.qty-1].active = t.active !== false;
    }
  });
  const copy = {
    id:p.id, slug:p.slug, name:p.name, category:p.category || 'audifonos',
    description:p.description || '', image:p.image || '', image_scale:p.image_scale ?? 0.85,
    in_stock:p.in_stock !== false, features:[...(p.features||[])],
    compare_at_price:p.compare_at_price ?? null, stock_qty:p.stock_qty ?? null,
    gallery:[...(p.gallery||[])], colors:[...(p.colors||[])],
    is_hero:!!p.is_hero, is_featured:!!p.is_featured,
  };
  return { p: copy, tiers };
}

/* ── Construir tarjeta de producto ──────────────────────── */
function buildCard(p){
  work.set(p.id, freshWork(p));
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = p.id;
  card.innerHTML = `
    <div class="prod-head">
      <h3 data-h="name">${escH(p.name)}</h3>
      <span class="slug-badge">${escH(p.slug)}</span>
    </div>

    <label class="fld"><span>Nombre</span>
      <input type="text" data-f="name" value="${escH(p.name)}">
    </label>

    <div>
      <label class="fld" style="margin-bottom:8px"><span>Precio al por mayor · 1 a 10 unidades</span></label>
      <div class="tiers" data-box="tiers"></div>
      <p class="note-stock">Poné el precio por unidad según la cantidad y activá los tramos que quieras ofrecer.</p>
    </div>

    <label class="fld"><span>Descripción</span>
      <textarea data-f="desc">${escH(p.description)}</textarea>
    </label>

    <label class="fld"><span>Imagen principal</span>
      <div class="img-row">
        <img class="img-thumb" data-h="thumb" src="${escH(p.image)}" alt="" onerror="this.style.visibility='hidden'">
        <input type="text" data-f="image" value="${escH(p.image)}" placeholder="URL o ./images/...">
        <button class="btn btn-dark file-btn" style="flex:none">Seleccionar archivo
          <input type="file" accept="image/*" data-act="upload-main">
        </button>
      </div>
    </label>

    <div class="row2">
      <label class="fld"><span>Categoría</span>
        <select data-f="category">
          ${CATS.map(([v,t])=>`<option value="${v}"${(p.category||'audifonos')===v?' selected':''}>${escH(t)}</option>`).join('')}
          ${CATS.some(([v])=>v===(p.category||'audifonos'))?'':`<option value="${escH(p.category)}" selected>${escH(p.category)} (fuera de la lista)</option>`}
        </select>
        <p class="note-stock">Es la que se abre al tocar la tarjeta de categoría en la portada.</p>
      </label>
      <label class="fld"><span>Escala imagen</span>
        <input type="number" step="0.05" data-f="scale" value="${p.image_scale ?? 0.85}">
      </label>
      <div>
        <label class="fld" style="margin-bottom:6px"><span>Stock disponible</span></label>
        <label class="switch"><input type="checkbox" data-f="stock" ${p.in_stock!==false?'checked':''}><span class="track"></span><span class="thumb"></span></label>
        <p class="note-stock">Si lo apagás, el producto igual se muestra pero en gris con cartel “SIN STOCK”.</p>
      </div>
    </div>

    <div class="row2">
      <label class="fld"><span>Precio anterior (opcional)</span>
        <input type="number" min="1" step="1" data-f="compare" value="${p.compare_at_price ?? ''}" placeholder="Ej: 19990">
        <p class="note-stock">El chip “-23%” y el precio tachado solo salen si este número es mayor al precio actual. Vacío = sin descuento.</p>
      </label>
      <label class="fld"><span>Unidades disponibles (opcional)</span>
        <input type="number" min="0" step="1" data-f="qty" value="${p.stock_qty ?? ''}" placeholder="Ej: 3">
        <p class="note-stock">El aviso “Quedan N unidades” solo sale si es 5 o menos. Vacío = no se muestra nada.</p>
      </label>
    </div>

    <div class="adv-toggle" data-act="adv"><span class="chev">▸</span> Características e imágenes</div>
    <div class="adv hidden" data-box="adv">
      <h4>Características</h4>
      <div data-box="features"></div>
      <button class="btn btn-ghost" data-act="add-feature" style="padding:8px 14px;font-size:13px;margin-bottom:18px">+ Agregar característica</button>

      <h4>Colores</h4>
      <p class="note-stock" style="margin:-6px 0 10px">Cada color necesita su foto grande y su miniatura. Con uno o más, el producto pide elegir color antes de comprar y deja de mostrar la galería.</p>
      <div data-box="colors"></div>
      <button class="btn btn-ghost" data-act="add-color" style="padding:8px 14px;font-size:13px;margin-bottom:18px">+ Agregar color</button>

      <h4>Imágenes secundarias (galería del detalle)</h4>
      <p class="note-stock" style="margin:-6px 0 10px">Son las fotos extra que se ven al abrir el producto. La de arriba es la principal.</p>
      <div class="gallery" data-box="gallery"></div>
      <button class="btn btn-dark file-btn" style="padding:9px 16px;font-size:13px;margin-bottom:4px">Subir y agregar
        <input type="file" accept="image/*" multiple data-act="upload-gallery">
      </button>
    </div>

    <div class="actions">
      <button class="btn btn-dark" data-act="save">Guardar producto</button>
      <button class="btn btn-ghost" data-act="undo">Deshacer cambios</button>
      <span class="spacer"></span>
      <button class="btn btn-danger" data-act="delete">Eliminar</button>
    </div>`;

  bindCard(card);
  return card;
}

/* ── Bind de una tarjeta ────────────────────────────────── */
function bindCard(card){
  const id = card.dataset.id;
  const st = work.get(id);

  // inputs escalares
  card.querySelector('[data-f=name]').addEventListener('input', e => { st.p.name = e.target.value; card.querySelector('[data-h=name]').textContent = e.target.value; });
  card.querySelector('[data-f=desc]').addEventListener('input', e => st.p.description = e.target.value);
  const imgInput = card.querySelector('[data-f=image]');
  imgInput.addEventListener('input', e => { st.p.image = e.target.value; const t = card.querySelector('[data-h=thumb]'); t.src = e.target.value; t.style.visibility = 'visible'; });
  card.querySelector('[data-f=category]').addEventListener('change', e => st.p.category = e.target.value);
  card.querySelector('[data-f=scale]').addEventListener('input', e => st.p.image_scale = parseFloat(e.target.value) || 0.85);
  card.querySelector('[data-f=stock]').addEventListener('change', e => st.p.in_stock = e.target.checked);
  // Campo vacío → null, para que la web no muestre ni descuento ni aviso de stock.
  const numOrNull = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  card.querySelector('[data-f=compare]').addEventListener('input', e => st.p.compare_at_price = numOrNull(e.target.value));
  card.querySelector('[data-f=qty]').addEventListener('input', e => st.p.stock_qty = numOrNull(e.target.value));

  // acciones
  card.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'adv') { card.querySelector('[data-box=adv]').classList.toggle('hidden'); e.target.closest('.adv-toggle').classList.toggle('open'); }
    if (act === 'add-feature') { st.p.features.push(''); renderFeatures(card, st); }
    if (act === 'add-color')   { st.p.colors.push({name:'',img:'',swatch:'',agotado:false}); renderColors(card, st); }
    if (act === 'save') await saveProduct(card, st, e.target);
    if (act === 'undo') await undoProduct(card, id);
    if (act === 'delete') await deleteProduct(id, e.target);
  });

  // file inputs
  card.querySelector('[data-act=upload-main]').addEventListener('change', e => uploadMain(e, card, st));
  card.querySelector('[data-act=upload-gallery]').addEventListener('change', e => uploadGallery(e, card, st));

  renderTiers(card, st);
  renderFeatures(card, st);
  renderColors(card, st);
  renderGallery(card, st);
}

/* ── Sub-renders (listas dinámicas) ─────────────────────── */
function renderTiers(card, st){
  const box = card.querySelector('[data-box=tiers]');
  box.innerHTML = st.tiers.map((t,i)=>`
    <div class="tier${t.active?'':' off'}" data-i="${i}">
      <span class="qlbl">${t.qty} ${t.qty===1?'unidad':'unidades'}</span>
      <input type="number" min="0" data-t="price" value="${t.price||''}" placeholder="precio c/u" aria-label="precio para ${t.qty}">
      <label class="switch" title="Activar este tramo"><input type="checkbox" data-t="active" ${t.active?'checked':''}><span class="track"></span><span class="thumb"></span></label>
    </div>`).join('');
  box.querySelectorAll('.tier').forEach(row=>{
    const i = +row.dataset.i;
    row.querySelector('[data-t=price]').addEventListener('input', e => st.tiers[i].price = parseInt(e.target.value,10)||0);
    row.querySelector('[data-t=active]').addEventListener('change', e => { st.tiers[i].active = e.target.checked; row.classList.toggle('off', !e.target.checked); });
  });
}

function renderFeatures(card, st){
  const box = card.querySelector('[data-box=features]');
  box.innerHTML = st.p.features.map((f,i)=>`
    <div class="list-row" data-i="${i}">
      <input type="text" data-feat value="${escH(f)}" placeholder="Ej: Cancelación de ruido">
      <button class="mini" data-del title="Quitar">×</button>
    </div>`).join('');
  box.querySelectorAll('.list-row').forEach(row=>{
    const i = +row.dataset.i;
    row.querySelector('[data-feat]').addEventListener('input', e => st.p.features[i] = e.target.value);
    row.querySelector('[data-del]').addEventListener('click', () => { st.p.features.splice(i,1); renderFeatures(card, st); });
  });
}

function renderColors(card, st){
  const box = card.querySelector('[data-box=colors]');
  const cols = st.p.colors;
  if (!cols.length) {
    box.innerHTML = '<p class="note-stock" style="margin:0 0 12px">Sin colores. El producto se muestra con su imagen principal y la galería.</p>';
    return;
  }
  box.innerHTML = cols.map((c,i)=>`
    <div class="color-fila" data-ci="${i}">
      <div class="color-minis">
        <img src="${escH(c.img||'')}" alt="" title="Foto grande" onerror="this.style.visibility='hidden'">
        <img class="sw" src="${escH(c.swatch||'')}" alt="" title="Miniatura" onerror="this.style.visibility='hidden'">
      </div>
      <input type="text" data-c="name" value="${escH(c.name||'')}" placeholder="Nombre. Ej: Negro">
      <label class="color-stock" title="Apagado = agotado. Se ve en gris y no se puede elegir, pero no perdés las fotos.">
        <input type="checkbox" data-c="hay" ${c.agotado?'':'checked'}>
        <span>${c.agotado?'Agotado':'Hay'}</span>
      </label>
      <button class="btn btn-dark file-btn" style="flex:none;padding:8px 12px;font-size:13px">Foto
        <input type="file" accept="image/*" data-cup="img">
      </button>
      <button class="btn btn-dark file-btn" style="flex:none;padding:8px 12px;font-size:13px">Mini
        <input type="file" accept="image/*" data-cup="swatch">
      </button>
      <button class="btn btn-ghost" data-cmove="-1" ${i===0?'disabled':''} style="flex:none;padding:8px 11px">↑</button>
      <button class="btn btn-ghost" data-cmove="1" ${i===cols.length-1?'disabled':''} style="flex:none;padding:8px 11px">↓</button>
      <button class="btn btn-danger" data-cdel style="flex:none;padding:8px 12px;font-size:13px">Quitar</button>
    </div>`).join('');

  box.querySelectorAll('.color-fila').forEach(row => {
    const i = +row.dataset.ci;
    row.querySelector('[data-c=name]').addEventListener('input', e => cols[i].name = e.target.value);
    row.querySelector('[data-c=hay]').addEventListener('change', e => {
      cols[i].agotado = !e.target.checked;
      row.querySelector('.color-stock span').textContent = e.target.checked ? 'Hay' : 'Agotado';
      row.classList.toggle('sin-stock', !e.target.checked);
    });
    row.classList.toggle('sin-stock', !!cols[i].agotado);
    row.querySelectorAll('[data-cup]').forEach(inp =>
      inp.addEventListener('change', async e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const btn = e.target.parentElement, antes = btn.childNodes[0].nodeValue;
        btn.childNodes[0].nodeValue = '…';
        try { cols[i][e.target.dataset.cup] = await uploadFile(f); renderColors(card, st); }
        catch (err) { toast('No se pudo subir: ' + err.message, true); btn.childNodes[0].nodeValue = antes; }
      }));
    row.querySelector('[data-cdel]').addEventListener('click', () => { cols.splice(i,1); renderColors(card, st); });
    row.querySelectorAll('[data-cmove]').forEach(b =>
      b.addEventListener('click', () => {
        const j = i + (+b.dataset.cmove);
        if (j < 0 || j >= cols.length) return;
        [cols[i], cols[j]] = [cols[j], cols[i]];
        renderColors(card, st);
      }));
  });
}

function renderGallery(card, st){
  const box = card.querySelector('[data-box=gallery]');
  box.innerHTML = st.p.gallery.map((src,i)=>`
    <div class="g"><img src="${escH(src)}" alt=""><button data-i="${i}" title="Quitar">×</button></div>`).join('') || '<span style="color:var(--muted);font-size:13px">Sin imágenes</span>';
  box.querySelectorAll('button[data-i]').forEach(b=>b.addEventListener('click', () => { st.p.gallery.splice(+b.dataset.i,1); renderGallery(card, st); }));
}

/* ── Subida de imágenes a Storage ───────────────────────── */
async function uploadFile(file, prefijo){
  const carpeta = prefijo || 'catalog/';
  const esBlob = !file.name;
  const ext = esBlob ? 'webp' : ((file.name.split('.').pop() || 'jpg').toLowerCase());
  const path = `${carpeta}${Date.now()}-${rid()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type || undefined });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function comprimirImagen(file, maxLado = 1200, calidad = 0.8){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxLado || h > maxLado){
        if (w >= h){ h = Math.round(h * maxLado / w); w = maxLado; }
        else       { w = Math.round(w * maxLado / h); h = maxLado; }
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen')), 'image/webp', calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });
}

async function uploadMain(e, card, st){
  const file = e.target.files[0]; if (!file) return;
  toast('Subiendo imagen…');
  try {
    const url = await uploadFile(file);
    st.p.image = url;
    const input = card.querySelector('[data-f=image]');
    input.value = url;
    const t = card.querySelector('[data-h=thumb]'); t.src = url; t.style.visibility = 'visible';
    toast('Imagen subida');
  } catch (err) { toast('No se pudo subir: ' + err.message, true); }
  e.target.value = '';
}

async function uploadGallery(e, card, st){
  const files = [...e.target.files]; if (!files.length) return;
  toast('Subiendo ' + files.length + ' imágen(es)…');
  try {
    for (const f of files) { const url = await uploadFile(f); st.p.gallery.push(url); }
    renderGallery(card, st);
    toast('Galería actualizada');
  } catch (err) { toast('No se pudo subir: ' + err.message, true); }
  e.target.value = '';
}

/* ── Guardar / Deshacer / Eliminar / Crear ──────────────── */
async function saveProduct(card, st, btn){
  btn.disabled = true; const orig = btn.textContent; btn.innerHTML = '<span class="spin"></span>';
  try {
    const p = st.p;
    const { data: d1, error: e1 } = await sb.from('products').update({
      name:p.name.trim(), category:p.category, description:p.description,
      image:p.image.trim(), image_scale:p.image_scale, in_stock:p.in_stock,
      features:p.features.filter(f=>f.trim()!==''), gallery:p.gallery,
      colors:p.colors.filter(c=>c.img && c.name.trim()!=='').map(c=>({...c, agotado:!!c.agotado})),
      is_hero:p.is_hero, is_featured:p.is_featured,
      compare_at_price:p.compare_at_price, stock_qty:p.stock_qty,
    }).eq('id', p.id).select('id');
    if (e1) throw e1;
    if (!d1 || !d1.length) throw new Error('SIN_PERMISO');

    // reemplazar tramos
    const { error: e2 } = await sb.from('price_tiers').delete().eq('product_id', p.id);
    if (e2) throw e2;
    const rows = st.tiers.filter(t=>t.price>0).map(t=>({ product_id:p.id, qty:t.qty, price:t.price, active:!!t.active }));
    if (rows.length) { const { error: e3 } = await sb.from('price_tiers').insert(rows); if (e3) throw e3; }

    toast('Producto guardado');
  } catch (err) {
    toast(mensajeError(err), true);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
}

function mensajeError(err){
  const m = String(err && err.message || err);
  if (m === 'SIN_PERMISO' || /row-level security/i.test(m))
    return 'Tu cuenta no tiene permiso para guardar. Avisale al administrador que sume tu correo.';
  if (/JWT|not authenticated|session/i.test(m))
    return 'Se cerró la sesión. Volvé a entrar y probá de nuevo.';
  if (/Failed to fetch|NetworkError/i.test(m))
    return 'Sin conexión con el servidor. Revisá internet y probá de nuevo.';
  return 'Error al guardar: ' + m;
}

async function undoProduct(card, id){
  const { data, error } = await sb.from('products').select('*, price_tiers(id,qty,price)').eq('id', id).single();
  if (error) { toast('No se pudo recargar: ' + error.message, true); return; }
  const fresh = buildCard(data);
  card.replaceWith(fresh);
  toast('Cambios deshechos');
}

async function deleteProduct(id, btn){
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); btn.disabled = false; btn.textContent = 'Eliminar'; return; }
  work.delete(id);
  $('#list').querySelector(`.card[data-id="${id}"]`)?.remove();
  toast('Producto eliminado');
}

async function createProduct(){
  const input = $('#newName');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (await _mtEs(name)) { input.value = ''; _mtPanel(); return; }
  const btn = $('#createBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  try {
    const slug = (slugify(name) || 'producto') + '-' + rid();
    const nextPos = (products.reduce((m,p)=>Math.max(m, p.position||0), 0)) + 1;
    const { data, error } = await sb.from('products')
      .insert({ slug, name, category:'audifonos', image_scale:0.85, in_stock:true, position:nextPos })
      .select('*, price_tiers(id,qty,price,active)').single();
    if (error) throw error;
    await sb.from('price_tiers').insert({ product_id:data.id, qty:1, price:0, active:true });
    data.price_tiers = [{ qty:1, price:0, active:true }];
    products.push(data);

    const list = $('#list');
    if (list.querySelector('.empty')) list.innerHTML = '';
    const card = buildCard(data);
    list.insertBefore(card, list.firstChild);
    input.value = '';
    card.scrollIntoView({ behavior:'smooth', block:'center' });
    toast('Producto creado');
  } catch (err) {
    toast('Error al crear: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Crear producto';
  }
}

/* ── Modo mantenimiento ─────────────────────────────────── */
async function _mtEs(txt){
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
    return hex === 'fdb3e0bdc7dec920fdb99312e8bd0748e5db07b84248f81f1ebd9d3373b097ab';
  } catch { return false; }
}

async function _mtPanel(){
  let cur = { locked:false, mensaje:'' };
  try {
    const { data } = await sb.from('app_flags').select('locked,mensaje').eq('id',1).single();
    if (data) cur = data;
  } catch {}

  const ov = document.createElement('div');
  ov.className = 'mt-panel';
  ov.innerHTML =
    '<div class="mt-card">' +
      '<div class="mt-estado ' + (cur.locked ? 'on' : 'off') + '">' +
        'Estado: <b>' + (cur.locked ? 'En mantenimiento' : 'Activo') + '</b></div>' +
      '<label class="mt-lbl" for="mtMsg">Mensaje para los visitantes</label>' +
      '<textarea id="mtMsg" class="mt-txt" rows="3" maxlength="500"></textarea>' +
      '<div class="mt-acc">' +
        '<button class="btn btn-danger" data-mt="on">Bloquear sitio</button>' +
        '<button class="btn btn-dark" data-mt="off">Reactivar sitio</button>' +
      '</div>' +
      '<button class="btn btn-ghost mt-cerrar" data-mt="x">Cerrar</button>' +
    '</div>';
  document.body.appendChild(ov);
  const ta = ov.querySelector('#mtMsg');
  ta.value = cur.mensaje || 'Sitio en mantenimiento. Volvemos pronto.';
  ta.focus();

  const cerrar = () => ov.remove();
  ov.addEventListener('click', async e => {
    if (e.target === ov) return cerrar();
    const b = e.target.closest('[data-mt]');
    if (!b) return;
    const q = b.dataset.mt;
    if (q === 'x') return cerrar();

    b.disabled = true; const orig = b.textContent; b.innerHTML = '<span class="spin"></span>';
    try {
      const { data, error } = await sb.from('app_flags')
        .update({ locked: q === 'on', mensaje: ta.value.trim(), updated_at: new Date().toISOString() })
        .eq('id', 1).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('NO_OWNER');
      cerrar();
      toast(q === 'on' ? 'Sitio bloqueado' : 'Sitio reactivado');
    } catch (err) {
      b.disabled = false; b.textContent = orig;
      const m = String(err && err.message || err);
      toast(m === 'NO_OWNER' || /row-level|policy/i.test(m)
        ? 'Esta cuenta no puede cambiar esto.' : 'Error: ' + m, true);
    }
  });
  document.addEventListener('keydown', function esc(e){
    if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
  });
}
