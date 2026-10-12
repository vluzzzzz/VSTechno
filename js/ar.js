'use strict';

const Resenas = (() => {

  const MAX_FOTOS = 2;

  let reviews = [];
  let catalogo = [];
  let cargado = false;
  const abiertos = new Set();

  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ICONO_TACHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  function setCatalogo(c){ catalogo = c || []; }

  function nombreProd(slug){ return (catalogo.find(p => p.slug === slug) || {}).name || slug; }

  function imgsDe(r){ return Array.isArray(r.images) ? r.images : []; }

  async function cargar(){
    const cont = $('#listResenas');
    if (!cont) return;
    cont.innerHTML = '<div class="empty">Cargando reseñas…</div>';
    const { data, error } = await sb.from('reviews').select('*')
      .order('product_slug', { ascending: true })
      .order('position', { ascending: true });
    if (error){
      if (error.code === '42P01' || /reviews/i.test(error.message || '')){
        cont.innerHTML = '<div class="card aviso-sql"><h2>Falta un paso en la base de datos</h2>' +
          '<p class="hint">Las reseñas se guardan en la tabla <code>reviews</code>, que todavía no existe. ' +
          'Abrí Supabase → SQL Editor, pegá <code>supabase/add-reviews.sql</code> y tocá <b>Run</b>. Después recargá.</p></div>';
        return;
      }
      cont.innerHTML = '<div class="empty">Error: ' + escH(error.message) + '</div>';
      return;
    }
    reviews = data || [];
    cargado = true;
    pintar();
  }

  function colorOpciones(r){
    const cv = (typeof COLOR_VARIANTS !== 'undefined') ? COLOR_VARIANTS[r.product_slug] : null;
    if (!cv || !cv.length) return '';
    const suelto = r.color && !cv.some(c => c.name === r.color)
      ? '<option value="' + escH(r.color) + '" selected>' + escH(r.color) + ' (ya no existe)</option>' : '';
    return '<label class="rr-fld"><span>Color</span><select data-f="color">' +
      '<option value=""' + (!r.color ? ' selected' : '') + '>Sin especificar</option>' +
      cv.map(c => '<option value="' + escH(c.name) + '"' + (r.color === c.name ? ' selected' : '') + '>' + escH(c.name) + '</option>').join('') +
      suelto + '</select></label>';
  }

  function fotosHTML(r){
    const imgs = imgsDe(r);
    const minis = imgs.map((u, i) =>
      '<span class="rr-foto"><img src="' + escH(u) + '" alt=""><button type="button" data-act="quitarFoto" data-foto="' + i + '" title="Quitar">×</button></span>').join('');
    const puede = imgs.length < MAX_FOTOS;
    const subir = puede
      ? '<label class="rr-subir"><input type="file" accept="image/*" data-act="subirFoto" hidden><span>+ Subir foto</span></label>'
      : '<span class="rr-tope">Máximo ' + MAX_FOTOS + ' fotos</span>';
    return '<div class="rr-fotos">' + minis + subir + '</div>';
  }

  function estrellasHTML(n){
    const v = Number(n) || 5;
    let out = '<div class="rr-stars" data-f="stars" data-val="' + v + '">';
    for (let i = 1; i <= 5; i++) out += '<button type="button" class="rr-star' + (i <= v ? ' on' : '') + '" data-star="' + i + '" aria-label="' + i + ' estrellas">★</button>';
    return out + '</div>';
  }

  function tarjeta(r){
    const cv = (typeof COLOR_VARIANTS !== 'undefined') ? COLOR_VARIANTS[r.product_slug] : null;
    return '<div class="rr-card" data-id="' + escH(r.id) + '">' +
      '<div class="rr-top">' +
        '<input class="rr-nombre" data-f="name" value="' + escH(r.name) + '" placeholder="Nombre">' +
        estrellasHTML(r.stars) +
      '</div>' +
      '<textarea class="rr-text" data-f="text" rows="2" placeholder="Comentario">' + escH(r.text) + '</textarea>' +
      '<div class="rr-fila">' +
        '<label class="rr-fld"><span>Fecha</span><input type="date" data-f="fecha" value="' + escH(r.fecha || '') + '"></label>' +
        (cv && cv.length ? colorOpciones(r) : '') +
      '</div>' +
      '<label class="rr-check"><input type="checkbox" data-f="verified"' + (r.verified ? ' checked' : '') + '><span>Compra verificada</span></label>' +
      fotosHTML(r) +
      '<div class="rr-pie">' +
        '<button class="btn btn-dark rr-guardar" data-act="guardar">Guardar</button>' +
        '<button class="btn btn-danger rr-elim" data-act="borrar">Eliminar</button>' +
      '</div>' +
      '<div class="rr-borrar" hidden></div>' +
    '</div>';
  }

  function pendientesHTML(){
    const pend = reviews.filter(r => r.status === 'pendiente');
    if (!pend.length) return '';
    return '<div class="rr-pend"><h2 class="rr-pend-t">Pendientes de aprobar (' + pend.length + ')</h2>' +
      '<div class="rr-pend-grid">' + pend.map(p => {
        const img = (Array.isArray(p.images) && p.images[0]) ? '<img class="rr-pend-img" src="' + escH(p.images[0]) + '" alt="" loading="lazy">' : '';
        return '<div class="rr-pend-card" data-id="' + escH(p.id) + '">' +
          '<p class="rr-pend-prod">' + escH(nombreProd(p.product_slug)) + '</p>' +
          '<p class="rr-pend-nom">' + escH(p.name) + ' · ' + '★'.repeat(Number(p.stars) || 0) + '</p>' +
          '<p class="rr-pend-txt">' + escH(p.text) + '</p>' + img +
          '<div class="rr-pend-acc">' +
            '<button class="btn btn-dark" data-act="aprobar">✓ Aprobar</button>' +
            '<button class="btn btn-danger" data-act="rechazar">✗ Rechazar</button>' +
          '</div></div>';
      }).join('') + '</div></div>';
  }

  function grupoHTML(slug){
    const lista = reviews.filter(r => r.product_slug === slug && r.status !== 'pendiente');
    const abierto = abiertos.has(slug);
    const prod = catalogo.find(p => p.slug === slug);
    const img = prod && prod.image ? '<img src="' + escH(prod.image) + '" alt="" loading="lazy">' : '';
    return '<div class="rr-grupo' + (abierto ? ' abierto' : '') + '" data-slug="' + escH(slug) + '">' +
      '<button class="rr-gcab" data-act="toggle" aria-expanded="' + (abierto ? 'true' : 'false') + '">' +
        '<span class="rr-gimg">' + img + '</span>' +
        '<span class="rr-gnom">' + escH(nombreProd(slug)) + '</span>' +
        '<span class="rr-gcount">' + lista.length + (lista.length === 1 ? ' reseña' : ' reseñas') + '</span>' +
        '<span class="rr-gflecha">' + (abierto ? '▾' : '▸') + '</span>' +
      '</button>' +
      (abierto
        ? '<div class="rr-glista">' + lista.map(tarjeta).join('') +
          '<button class="btn btn-ghost rr-add" data-act="agregar">+ Agregar reseña</button></div>'
        : '') +
    '</div>';
  }

  function pintar(){
    const cont = $('#listResenas');
    if (!cont) return;
    const slugs = catalogo.map(p => p.slug);
    reviews.forEach(r => { if (!slugs.includes(r.product_slug)) slugs.push(r.product_slug); });
    if (!slugs.length){ cont.innerHTML = '<div class="empty">No hay productos.</div>'; return; }
    cont.innerHTML = pendientesHTML() + slugs.map(grupoHTML).join('');

    const res = $('#resumenResenas');
    if (res){
      const n = reviews.length;
      const media = n ? (reviews.reduce((a, r) => a + Number(r.stars || 0), 0) / n).toFixed(1).replace('.', ',') : '—';
      res.innerHTML = 'Promedio general <b>' + media + '</b> sobre ' + n + (n === 1 ? ' reseña.' : ' reseñas.');
    }
  }

  async function guardarCampo(id, campo, valor){
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    r[campo] = valor;
    try {
      const patch = {}; patch[campo] = valor; patch.updated_at = new Date().toISOString();
      const { data, error } = await sb.from('reviews').update(patch).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
    } catch (err){ toast(mensajeError(err), true); }
  }

  async function guardarTodo(card, btn){
    if (!card) return;
    const id = card.dataset.id;
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    const val = f => card.querySelector('[data-f="' + f + '"]');
    const patch = {
      name: (val('name') || {}).value || '',
      stars: Number((val('stars') || {}).dataset?.val) || 5,
      text: (val('text') || {}).value || '',
      fecha: (val('fecha') || {}).value || r.fecha,
      verified: !!(val('verified') || {}).checked,
      updated_at: new Date().toISOString(),
    };
    const col = val('color');
    if (col) patch.color = col.value;
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const { data, error } = await sb.from('reviews').update(patch).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
      Object.assign(r, patch);
      btn.textContent = 'Guardado ✓';
      setTimeout(() => { btn.disabled = false; btn.textContent = orig; }, 1400);
    } catch (err){
      btn.disabled = false; btn.textContent = orig;
      toast(mensajeError(err), true);
    }
  }

  async function aprobar(id, btn){
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    if (btn){ btn.disabled = true; btn.textContent = '…'; }
    try {
      const { data, error } = await sb.from('reviews')
        .update({ status: 'aprobada', updated_at: new Date().toISOString() }).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
      r.status = 'aprobada';
      abiertos.add(r.product_slug);
      pintar();
      toast('Reseña aprobada');
    } catch (err){
      if (btn){ btn.disabled = false; btn.textContent = '✓ Aprobar'; }
      toast(mensajeError(err), true);
    }
  }

  async function agregar(slug){
    const pos = reviews.filter(r => r.product_slug === slug).length;
    const fila = { product_slug: slug, name:'', stars:5, text:'', color:'', verified:false, images:[], fecha:new Date().toISOString().slice(0,10), position:pos };
    try {
      const { data, error } = await sb.from('reviews').insert(fila).select('*').single();
      if (error) throw error;
      if (!data) throw new Error('SIN_PERMISO');
      reviews.push(data);
      abiertos.add(slug);
      pintar();
      const card = $('#listResenas [data-slug="' + slug + '"] .rr-card:last-child .rr-nombre');
      if (card) card.focus();
    } catch (err){ toast(mensajeError(err), true); }
  }

  async function subirFoto(id, file, input){
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    if (imgsDe(r).length >= MAX_FOTOS){ toast('Máximo ' + MAX_FOTOS + ' fotos', true); return; }
    toast('Subiendo foto…');
    try {
      const blob = await comprimirImagen(file);
      const url = await uploadFile(blob, 'reviews/');
      const imgs = imgsDe(r).concat(url);
      const { data, error } = await sb.from('reviews').update({ images:imgs, updated_at:new Date().toISOString() }).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
      r.images = imgs;
      pintar();
      toast('Foto subida');
    } catch (err){ toast(mensajeError(err), true); }
    if (input) input.value = '';
  }

  async function quitarFoto(id, i){
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    const imgs = imgsDe(r).slice(); imgs.splice(i, 1);
    try {
      const { data, error } = await sb.from('reviews').update({ images:imgs, updated_at:new Date().toISOString() }).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
      r.images = imgs;
      pintar();
    } catch (err){ toast(mensajeError(err), true); }
  }

  function zonaBorrar(id){
    const card = $('#listResenas [data-id="' + id + '"]');
    return card ? card.querySelector('.rr-borrar') : null;
  }
  function cerrarBorrar(){
    $$('#listResenas .rr-borrar').forEach(z => { z.innerHTML = ''; z.setAttribute('hidden',''); });
  }
  function preguntarBorrar(id){
    cerrarBorrar();
    const z = zonaBorrar(id);
    if (!z) return;
    z.removeAttribute('hidden');
    z.innerHTML = '<p class="rr-borrar-txt">¿Eliminar esta reseña? No se recupera.</p>' +
      '<div class="rr-borrar-btns"><button class="btn btn-danger" data-act="borrarSi">Sí, eliminar</button>' +
      '<button class="btn btn-ghost" data-act="borrarNo">No</button></div>';
  }
  async function borrarYa(id){
    try {
      const { data, error } = await sb.from('reviews').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('SIN_PERMISO');
      reviews = reviews.filter(r => r.id !== id);
      pintar();
      toast('Reseña eliminada');
    } catch (err){ toast(mensajeError(err), true); }
  }

  function conectar(){
    const cont = $('#listResenas');
    if (!cont) return;

    const idDe = el => { const c = el.closest('[data-id]'); return c ? c.dataset.id : null; };

    cont.addEventListener('click', e => {
      const st = e.target.closest('.rr-star');
      if (st){
        const wrap = st.closest('.rr-stars');
        const v = Number(st.dataset.star);
        wrap.dataset.val = v;
        wrap.querySelectorAll('.rr-star').forEach((x, i) => x.classList.toggle('on', i < v));
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act !== 'borrar' && !String(act).startsWith('borrar')) cerrarBorrar();

      if (act === 'toggle'){
        const slug = b.closest('[data-slug]').dataset.slug;
        if (abiertos.has(slug)) abiertos.delete(slug); else abiertos.add(slug);
        pintar();
      }
      if (act === 'agregar') agregar(b.closest('[data-slug]').dataset.slug);
      if (act === 'aprobar') aprobar(idDe(b), b);
      if (act === 'rechazar') borrarYa(idDe(b));
      if (act === 'guardar') guardarTodo(b.closest('[data-id]'), b);
      if (act === 'quitarFoto') quitarFoto(idDe(b), Number(b.dataset.foto));
      if (act === 'borrar')   preguntarBorrar(idDe(b));
      if (act === 'borrarNo') cerrarBorrar();
      if (act === 'borrarSi') borrarYa(idDe(b));
    });

    cont.addEventListener('change', e => {
      const f = e.target.dataset.f;
      if (f){
        const id = idDe(e.target);
        const v = f === 'verified' ? e.target.checked : f === 'stars' ? Number(e.target.value) : e.target.value;
        guardarCampo(id, f, v);
        if (f === 'verified' || f === 'color') return;
      }
      if (e.target.dataset.act === 'subirFoto'){
        const file = e.target.files[0];
        if (file) subirFoto(idDe(e.target), file, e.target);
      }
    });

    let t = null;
    cont.addEventListener('input', e => {
      const f = e.target.dataset.f;
      if (f !== 'name' && f !== 'text') return;
      const id = idDe(e.target), v = e.target.value;
      clearTimeout(t);
      t = setTimeout(() => guardarCampo(id, f, v), 500);
    });

    $$('.tab').forEach(tb => tb.addEventListener('click', () => {
      if (tb.dataset.tab === 'resenas' && !cargado) cargar().catch(err => console.error('Resenas:', err));
    }));
  }

  return { init: conectar, cargar, setCatalogo };
})();
