'use strict';
/* ============================================================================
 *  as — Panel admin · secciones del sitio
 *  Banners, Categorías, Portada y Reseñas. Todo va a la tabla site_config,
 *  una fila por sección, con el valor en JSON.
 *
 *  Nada se guarda solo: se edita en pantalla y recién al tocar "Guardar" se
 *  escribe. Así un clic de más no deja la tienda sin banners.
 * ========================================================================== */

const Secciones = (() => {

  // Copia de trabajo de cada sección. Lo que está acá es lo que se ve en el
  // panel; lo de Supabase no cambia hasta que se guarda.
  const st = {
    banners: [],
    categorias: [],
    filas: { ofertas: [], mas: [] },
    reviews: [],
  };

  // Qué secciones tienen cambios sin guardar.
  const sucio = new Set();

  let hayTabla = false;       // ¿existe site_config?
  let catalogo = [];          // productos, para los selectores

  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Leer y escribir en site_config ─────────────────────────────────── */

  async function leerTodo() {
    const { data, error } = await sb.from('site_config').select('key,value');
    if (error) {
      // 42P01 = la tabla no existe todavía.
      hayTabla = false;
      $('#avisoSql').classList.remove('hidden');
      return {};
    }
    hayTabla = true;
    const out = {};
    (data || []).forEach(r => { out[r.key] = r.value; });
    return out;
  }

  async function guardar(clave) {
    if (!hayTabla) { toast('Falta crear la tabla site_config', true); return; }
    const barra = $(`[data-save="${clave}"]`);
    const btn = barra?.querySelector('button');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }

    const problema = validar(clave);
    if (problema) {
      if (btn) { btn.disabled = false; btn.textContent = textoBoton(clave); }
      toast(problema, true);
      return;
    }

    const value = clave === 'filas' ? st.filas : st[clave];
    const { error } = await sb.from('site_config')
      .upsert({ key: clave, value }, { onConflict: 'key' });

    if (btn) { btn.disabled = false; btn.textContent = textoBoton(clave); }
    if (error) { toast(mensajeError(error), true); return; }

    sucio.delete(clave);
    pintarBarras();
    toast('Guardado. Recargá la tienda para verlo.');
  }

  const textoBoton = c => ({
    banners:'Guardar banners', categorias:'Guardar categorías',
    filas:'Guardar portada', reviews:'Guardar reseñas',
  })[c] || 'Guardar';

  // Avisos antes de escribir. Mejor frenar acá que dejar la tienda rota.
  function validar(clave) {
    if (clave === 'banners') {
      if (!st.banners.length) return 'Dejá al menos un banner, si no el inicio queda vacío';
      if (st.banners.some(b => !b.desktop)) return 'Hay un banner sin imagen de escritorio';
    }
    if (clave === 'categorias') {
      if (st.categorias.some(c => !c.titulo)) return 'Hay una categoría sin título';
      if (st.categorias.some(c => !c.cat))    return 'Hay una categoría sin categoría del catálogo';
    }
    if (clave === 'reviews') {
      if (st.reviews.some(r => !r.name))    return 'Hay una reseña sin nombre';
      if (st.reviews.some(r => !r.product)) return 'Hay una reseña sin producto';
      if (st.reviews.some(r => !r.text))    return 'Hay una reseña sin comentario';
    }
    return '';
  }

  function marcar(clave) { sucio.add(clave); pintarBarras(); }

  function pintarBarras() {
    ['banners','categorias','filas','reviews'].forEach(c => {
      const b = $(`[data-save="${c}"]`);
      if (b) b.hidden = !sucio.has(c);
    });
  }

  /* ── Subida de imágenes ─────────────────────────────────────────────── */
  // uploadFile() vive en js/ap.js y ya sube al bucket site-images.
  async function subir(input, alTerminar) {
    const file = input.files && input.files[0];
    if (!file) return;
    const btn = input.parentElement;
    const antes = btn.childNodes[0].nodeValue;
    btn.childNodes[0].nodeValue = 'Subiendo… ';
    try {
      const url = await uploadFile(file);
      alTerminar(url);
    } catch (err) {
      toast('No se pudo subir: ' + err.message, true);
    }
    btn.childNodes[0].nodeValue = antes;
    input.value = '';
  }

  /* ── Piezas que se repiten ──────────────────────────────────────────── */

  // Campo de imagen: miniatura, ruta escrita a mano y botón para subir.
  function campoImagen(etiqueta, valor, ayuda) {
    return `<label class="fld"><span>${escH(etiqueta)}</span>
        <div class="img-row">
          <img class="img-thumb" data-h="thumb" src="${escH(valor)}" alt="" onerror="this.style.visibility='hidden'">
          <input type="text" data-f="img" value="${escH(valor)}" placeholder="${escH(ayuda || 'URL o images/...')}">
          <button class="btn btn-dark file-btn" style="flex:none">Subir
            <input type="file" accept="image/*" data-act="subir">
          </button>
        </div>
      </label>`;
  }

  // Flechas para mover y botón de borrar, iguales en las tres listas.
  function controles(i, total) {
    return `<div class="fila-ctrl">
        <button class="btn btn-ghost" data-act="subirOrden" ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
        <button class="btn btn-ghost" data-act="bajarOrden" ${i === total - 1 ? 'disabled' : ''} title="Bajar">↓</button>
        <button class="btn btn-danger" data-act="borrar">Borrar</button>
      </div>`;
  }

  function mover(lista, i, delta) {
    const j = i + delta;
    if (j < 0 || j >= lista.length) return false;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    return true;
  }

  /* ── BANNERS ────────────────────────────────────────────────────────── */

  function pintarBanners() {
    const cont = $('#listBanners');
    if (!st.banners.length) {
      cont.innerHTML = '<div class="empty">No hay banners. Agregá el primero arriba.</div>';
      return;
    }
    cont.innerHTML = st.banners.map((b, i) => `
      <div class="card" data-i="${i}">
        <div class="prod-head">
          <h3>Banner ${i + 1}</h3>
          ${controles(i, st.banners.length)}
        </div>
        ${campoImagen('Imagen de escritorio · 1920 × 560', b.desktop || '')}
        <label class="fld"><span>Imagen de móvil · 1080 × 1080 (opcional)</span>
          <div class="img-row">
            <img class="img-thumb" data-h="thumbMob" src="${escH(b.mobile || '')}" alt="" onerror="this.style.visibility='hidden'">
            <input type="text" data-f="mobile" value="${escH(b.mobile || '')}" placeholder="Si lo dejás vacío se usa el de escritorio">
            <button class="btn btn-dark file-btn" style="flex:none">Subir
              <input type="file" accept="image/*" data-act="subirMob">
            </button>
          </div>
        </label>
        <div class="row2">
          <label class="fld"><span>Texto alternativo</span>
            <input type="text" data-f="alt" value="${escH(b.alt || '')}" placeholder="Qué muestra la imagen">
          </label>
          <label class="fld"><span>A dónde lleva</span>
            <input type="text" data-f="link" value="${escH(b.link || '#ofertas')}" placeholder="#ofertas">
          </label>
        </div>
      </div>`).join('');
  }

  /* ── CATEGORÍAS ─────────────────────────────────────────────────────── */

  // Las categorías que ya usan los productos del catálogo, para no escribirlas
  // a mano y que no se despeguen por una letra de diferencia.
  function catsDelCatalogo() {
    return [...new Set(catalogo.map(p => p.category).filter(Boolean))].sort();
  }

  function pintarCategorias() {
    const cont = $('#listCategorias');
    const usadas = catsDelCatalogo();
    if (!st.categorias.length) {
      cont.innerHTML = '<div class="empty">No hay categorías. Agregá la primera arriba.</div>';
      return;
    }
    cont.innerHTML = st.categorias.map((c, i) => {
      const cuantos = catalogo.filter(p => p.category === c.cat).length;
      const aviso = c.cat && !cuantos
        ? `<p class="note-stock">Ningún producto tiene la categoría <b>${escH(c.cat)}</b>: la sección se abriría vacía.</p>`
        : `<p class="hint" style="margin:0">${cuantos} ${cuantos === 1 ? 'producto' : 'productos'} en esta categoría.</p>`;
      return `
      <div class="card" data-i="${i}">
        <div class="prod-head">
          <h3>${escH(c.titulo || 'Sin título')}</h3>
          ${controles(i, st.categorias.length)}
        </div>
        <div class="row2">
          <label class="fld"><span>Línea de arriba</span>
            <input type="text" data-f="arriba" value="${escH(c.arriba || '')}" placeholder="Lo mejor en">
          </label>
          <label class="fld"><span>Título</span>
            <input type="text" data-f="titulo" value="${escH(c.titulo || '')}" placeholder="Audífonos">
          </label>
        </div>
        <div class="row2">
          <label class="fld"><span>Precio "desde" (vacío = no se muestra)</span>
            <input type="text" data-f="desde" value="${escH(c.desde || '')}" placeholder="$14.000">
          </label>
          <label class="fld"><span>Categoría del catálogo</span>
            <input type="text" data-f="cat" value="${escH(c.cat || '')}" placeholder="audifonos" list="catsUsadas">
          </label>
        </div>
        ${aviso}
        ${campoImagen('Foto de la tarjeta · 800 × 1000', c.img || '')}
        <label class="fld"><span>Banner de la sección · 1920 × 558 (opcional)</span>
          <div class="img-row">
            <img class="img-thumb" data-h="thumbBan" src="${escH(c.banner || '')}" alt="" onerror="this.style.visibility='hidden'">
            <input type="text" data-f="banner" value="${escH(c.banner || '')}" placeholder="Se ve arriba al abrir la categoría">
            <button class="btn btn-dark file-btn" style="flex:none">Subir
              <input type="file" accept="image/*" data-act="subirBan">
            </button>
          </div>
        </label>
        <label class="fld"><span>Banner de móvil · 1080 × 810 (opcional)</span>
          <div class="img-row">
            <img class="img-thumb" data-h="thumbBanMob" src="${escH(c.bannerMobile || '')}" alt="" onerror="this.style.visibility='hidden'">
            <input type="text" data-f="bannerMobile" value="${escH(c.bannerMobile || '')}" placeholder="Si lo dejás vacío se usa el de escritorio">
            <button class="btn btn-dark file-btn" style="flex:none">Subir
              <input type="file" accept="image/*" data-act="subirBanMob">
            </button>
          </div>
        </label>
      </div>`;
    }).join('')
      + `<datalist id="catsUsadas">${usadas.map(c => `<option value="${escH(c)}">`).join('')}</datalist>`;
  }

  /* ── PORTADA ────────────────────────────────────────────────────────── */

  function pintarFilas() {
    const cont = $('#listFilas');
    if (!catalogo.length) {
      cont.innerHTML = '<div class="empty">Primero creá algún producto en la pestaña Catálogo.</div>';
      return;
    }
    cont.innerHTML = [
      unaFila('ofertas', 'Ofertas del mes', 'La fila de arriba, con la imagen al costado. Entran cinco cómodas.'),
      unaFila('mas', 'Más productos', 'La fila de abajo, a lo ancho. Entran seis cómodas.'),
    ].join('');
  }

  function unaFila(cual, titulo, ayuda) {
    const elegidos = st.filas[cual] || [];
    // Primero los elegidos en su orden, después el resto del catálogo.
    const resto = catalogo.filter(p => !elegidos.includes(p.slug));
    const filaHTML = elegidos.map((slug, i) => {
      const p = catalogo.find(x => x.slug === slug);
      const nombre = p ? p.name : slug;
      const falta = p ? '' : ' <span class="slug-badge">ya no existe</span>';
      return `<div class="pick on" data-slug="${escH(slug)}" data-i="${i}">
          <img class="img-thumb" src="${escH(p ? p.image : '')}" alt="" onerror="this.style.visibility='hidden'">
          <span class="pick-nom">${escH(nombre)}${falta}</span>
          <button class="btn btn-ghost" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-ghost" data-act="down" ${i === elegidos.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger" data-act="quitar">Quitar</button>
        </div>`;
    }).join('');

    const restoHTML = resto.map(p => `
        <div class="pick" data-slug="${escH(p.slug)}">
          <img class="img-thumb" src="${escH(p.image)}" alt="" onerror="this.style.visibility='hidden'">
          <span class="pick-nom">${escH(p.name)}</span>
          <button class="btn btn-dark" data-act="agregar">Agregar</button>
        </div>`).join('');

    return `<div class="card" data-fila="${cual}">
        <h2>${escH(titulo)}</h2>
        <p class="hint">${escH(ayuda)}</p>
        <div class="pick-lista">${filaHTML || '<div class="empty">Ninguno elegido todavía.</div>'}</div>
        <p class="hint" style="margin:18px 0 8px"><b>Resto del catálogo</b></p>
        <div class="pick-lista">${restoHTML || '<div class="empty">Ya están todos arriba.</div>'}</div>
      </div>`;
  }

  /* ── RESEÑAS ────────────────────────────────────────────────────────── */

  let filtro = '';   // '' = todas

  function pintarFiltro() {
    const sel = $('#filtroResena');
    const porProd = {};
    st.reviews.forEach(r => { porProd[r.product] = (porProd[r.product] || 0) + 1; });
    const nombre = s => (catalogo.find(p => p.slug === s) || {}).name || s;
    const opciones = catalogo.map(p =>
      `<option value="${escH(p.slug)}"${filtro === p.slug ? ' selected' : ''}>${escH(p.name)} · ${porProd[p.slug] || 0}</option>`);
    // Reseñas de productos que ya no están en el catálogo: se muestran igual,
    // si no quedarían escondidas y sumando al promedio sin que se vean.
    Object.keys(porProd).filter(s => !catalogo.some(p => p.slug === s)).forEach(s =>
      opciones.push(`<option value="${escH(s)}"${filtro === s ? ' selected' : ''}>${escH(s)} · ${porProd[s]} (fuera del catálogo)</option>`));
    sel.innerHTML = `<option value=""${filtro === '' ? ' selected' : ''}>Todas · ${st.reviews.length}</option>` + opciones.join('');

    const n = st.reviews.length;
    const suma = st.reviews.reduce((a, r) => a + Number(r.stars || 0), 0);
    const media = n ? (suma / n).toFixed(1).replace('.', ',') : '—';
    $('#resumenResenas').innerHTML = `Promedio general <b>${media}</b> sobre ${n} ${n === 1 ? 'reseña' : 'reseñas'}.`;
  }

  // Selector del color comprado. Solo aparece si ese producto tiene colores,
  // y las opciones salen de los suyos: así no se escribe un color que no
  // existe y el puntito de la reseña siempre encuentra su muestra.
  function opcionesColor(r) {
    const cv = (typeof COLOR_VARIANTS !== 'undefined') ? COLOR_VARIANTS[r.product] : null;
    if (!cv || !cv.length) return '';
    const sueltos = r.color && !cv.some(c => c.name === r.color)
      ? `<option value="${escH(r.color)}" selected>${escH(r.color)} (ya no existe)</option>` : '';
    return `<label class="fld"><span>Color comprado (opcional)</span>
        <select data-f="color">
          <option value=""${!r.color ? ' selected' : ''}>Sin especificar</option>
          ${cv.map(c => `<option value="${escH(c.name)}"${r.color === c.name ? ' selected' : ''}>${escH(c.name)}${c.agotado ? ' · agotado' : ''}</option>`).join('')}
          ${sueltos}
        </select>
      </label>`;
  }

  function pintarResenas() {
    pintarFiltro();
    const cont = $('#listResenas');
    // Se guarda el índice real, así el filtro no descoloca las ediciones.
    const conIndice = st.reviews.map((r, i) => ({ r, i }))
      .filter(x => !filtro || x.r.product === filtro)
      .sort((a, b) => (a.r.date < b.r.date ? 1 : a.r.date > b.r.date ? -1 : 0));

    if (!conIndice.length) {
      cont.innerHTML = '<div class="empty">No hay reseñas para este filtro.</div>';
      return;
    }

    const opcionesProd = s => catalogo.map(p =>
      `<option value="${escH(p.slug)}"${p.slug === s ? ' selected' : ''}>${escH(p.name)}</option>`).join('')
      + (catalogo.some(p => p.slug === s) || !s ? '' : `<option value="${escH(s)}" selected>${escH(s)} (fuera del catálogo)</option>`);

    cont.innerHTML = conIndice.map(({ r, i }) => `
      <div class="card" data-i="${i}">
        <div class="prod-head">
          <h3>${escH(r.name || 'Sin nombre')}</h3>
          <button class="btn btn-danger" data-act="borrar">Borrar</button>
        </div>
        <div class="row2">
          <label class="fld"><span>Nombre</span>
            <input type="text" data-f="name" value="${escH(r.name || '')}" placeholder="Daniela M.">
          </label>
          <label class="fld"><span>Producto</span>
            <select data-f="product">${opcionesProd(r.product)}</select>
          </label>
        </div>
        <div class="row2">
          <label class="fld"><span>Estrellas</span>
            <select data-f="stars">
              ${[5,4,3,2,1].map(n => `<option value="${n}"${Number(r.stars) === n ? ' selected' : ''}>${'★'.repeat(n)} ${n}</option>`).join('')}
            </select>
          </label>
          <label class="fld"><span>Fecha</span>
            <input type="date" data-f="date" value="${escH(r.date || '')}">
          </label>
        </div>
        ${opcionesColor(r)}
        <label class="fld"><span>Comentario</span>
          <textarea data-f="text">${escH(r.text || '')}</textarea>
        </label>
        <div class="img-row">
          <label class="switch">
            <input type="checkbox" data-f="verified" ${r.verified ? 'checked' : ''}>
            <span class="track"></span><span class="thumb"></span>
          </label>
          <span class="hint" style="margin:0">Compra verificada</span>
        </div>
      </div>`).join('');
  }

  /* ── Eventos ────────────────────────────────────────────────────────── */

  function tarjetaIndice(el) {
    const card = el.closest('[data-i]');
    return card ? Number(card.dataset.i) : -1;
  }

  function conectar() {
    // Pestañas
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.toggle('active', x === t));
      ['catalogo','banners','categorias','filas','resenas','pedidos'].forEach(n =>
        $('#tab-' + n).classList.toggle('hidden', n !== t.dataset.tab));
    }));

    // Agregar
    $$('[data-add]').forEach(b => b.addEventListener('click', () => {
      const q = b.dataset.add;
      if (q === 'banner') {
        st.banners.push({ desktop:'', mobile:'', alt:'', link:'#ofertas' });
        pintarBanners(); marcar('banners');
      }
      if (q === 'categoria') {
        st.categorias.push({ arriba:'', titulo:'', desde:'', cat:'', img:'', banner:'', bannerMobile:'' });
        pintarCategorias(); marcar('categorias');
      }
    }));

    // Guardar
    $$('[data-save]').forEach(b =>
      b.querySelector('button').addEventListener('click', () => guardar(b.dataset.save)));

    conectarLista('#listBanners', pintarBanners, 'banners');
    conectarLista('#listCategorias', pintarCategorias, 'categorias');
    conectarPortada();
  }

  // Banners y categorías comparten estructura, así que comparten los eventos.
  //
  // La lista se pide con st[clave] dentro de cada evento, nunca se guarda en
  // una variable al conectar: init() reemplaza st.banners y st.categorias con
  // lo que viene de la base, y una referencia tomada antes seguiría apuntando
  // al array viejo. Se escribía ahí y la pantalla mostraba otra cosa.
  function conectarLista(sel, repintar, clave) {
    const cont = $(sel);

    cont.addEventListener('input', e => {
      const campo = e.target.dataset.f;
      if (!campo) return;
      const i = tarjetaIndice(e.target);
      const lista = st[clave];
      if (i < 0 || !lista[i]) return;
      const destino = campo === 'img' ? (clave === 'banners' ? 'desktop' : 'img') : campo;
      lista[i][destino] = e.target.value;
      // La miniatura sigue lo que se escribe, sin esperar a guardar.
      const par = e.target.closest('.img-row')?.querySelector('.img-thumb');
      if (par) { par.src = e.target.value; par.style.visibility = e.target.value ? 'visible' : 'hidden'; }
      marcar(clave);
    });

    cont.addEventListener('change', e => {
      const acto = e.target.dataset.act;
      if (!acto || !acto.startsWith('subir')) return;
      const i = tarjetaIndice(e.target);
      if (i < 0 || !st[clave][i]) return;
      const destino = acto === 'subirMob' ? 'mobile'
                    : acto === 'subirBan' ? 'banner'
                    : acto === 'subirBanMob' ? 'bannerMobile'
                    : clave === 'banners' ? 'desktop' : 'img';
      subir(e.target, url => { st[clave][i][destino] = url; repintar(); marcar(clave); });
    });

    cont.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const i = tarjetaIndice(b);
      const lista = st[clave];
      if (i < 0 || !lista[i]) return;
      if (b.dataset.act === 'borrar') {
        if (!confirm('¿Borrar este elemento?')) return;
        lista.splice(i, 1); repintar(); marcar(clave);
      }
      if (b.dataset.act === 'subirOrden' && mover(lista, i, -1)) { repintar(); marcar(clave); }
      if (b.dataset.act === 'bajarOrden' && mover(lista, i,  1)) { repintar(); marcar(clave); }
    });
  }

  function conectarResenas() {
    const cont = $('#listResenas');

    const escribir = e => {
      const campo = e.target.dataset.f;
      if (!campo) return;
      const i = tarjetaIndice(e.target);
      if (i < 0) return;
      const v = campo === 'verified' ? e.target.checked
              : campo === 'stars'    ? Number(e.target.value)
              : e.target.value;
      st.reviews[i][campo] = v;
      marcar('reviews');
      if (campo === 'stars') pintarFiltro();
      // Al cambiar de producto cambian los colores posibles, así que el
      // selector se rehace y el color viejo se descarta.
      if (campo === 'product') { delete st.reviews[i].color; pintarResenas(); }
    };
    cont.addEventListener('input', escribir);
    cont.addEventListener('change', escribir);

    cont.addEventListener('click', e => {
      const b = e.target.closest('[data-act="borrar"]');
      if (!b) return;
      const i = tarjetaIndice(b);
      if (i < 0 || !confirm('¿Borrar esta reseña?')) return;
      st.reviews.splice(i, 1);
      pintarResenas(); marcar('reviews');
    });
  }

  function conectarPortada() {
    $('#listFilas').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const cual = b.closest('[data-fila]')?.dataset.fila;
      const slug = b.closest('[data-slug]')?.dataset.slug;
      if (!cual || !slug) return;
      const lista = st.filas[cual];
      const i = lista.indexOf(slug);

      if (b.dataset.act === 'agregar' && i < 0) lista.push(slug);
      if (b.dataset.act === 'quitar'  && i >= 0) lista.splice(i, 1);
      if (b.dataset.act === 'up'   && !mover(lista, i, -1)) return;
      if (b.dataset.act === 'down' && !mover(lista, i,  1)) return;

      pintarFilas(); marcar('filas');
    });
  }

  /* ── Arranque ───────────────────────────────────────────────────────── */

  async function init() {
    conectar();

    // El catálogo alimenta los selectores de las otras tres secciones.
    const { data } = await sb.from('products')
      .select('slug,name,image,category').order('position', { ascending: true });
    catalogo = data || [];
    if (typeof Resenas !== 'undefined') Resenas.setCatalogo(catalogo);

    const cfg = await leerTodo();

    // Sin fila guardada, se arranca de lo que hay: así el panel no aparece
    // vacío la primera vez y se puede editar sobre lo que ya se ve en la web.
    st.banners    = Array.isArray(cfg.banners)    ? cfg.banners    : [];
    st.categorias = Array.isArray(cfg.categorias) ? cfg.categorias : [];
    st.filas = (cfg.filas && typeof cfg.filas === 'object')
      ? { ofertas: cfg.filas.ofertas || [], mas: cfg.filas.mas || [] }
      : { ofertas: [], mas: [] };

    pintarBanners();
    pintarCategorias();
    pintarFilas();
    pintarBarras();
  }

  return { init };
})();

// Arranca acá, que es el último script: así todas las funciones de ac.js,
// ap.js y este archivo ya están definidas cuando boot() mira la sesión.
boot();
