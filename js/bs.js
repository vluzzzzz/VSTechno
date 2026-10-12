// bs — buscador de la nav
'use strict';

/* Mientras se escribe, los resultados salen en una lista que cuelga de la
   misma barra, con la miniatura del producto. Nada de pantalla completa:
   eso recién pasa si se aprieta Enter o "Ver los N resultados". */
const Buscador = (() => {
  let input, limpiar, caja;
  let lista = [];      // lo que se está mostrando ahora
  let sel = -1;        // fila marcada con las flechas del teclado

  const MAX_SUGERENCIAS = 6;

  // Sin acentos ni mayúsculas: "Batería" encuentra "bateria".
  const norm = s => String(s == null ? '' : s)
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  // Los que empiezan con lo escrito van primero: buscar "air" tiene que
  // poner los AirPods antes que un producto que lo lleva en la descripción.
  function buscar(q) {
    const t = norm(q);
    if (!t) return [];
    const pesa = p => {
      const n = norm(p.name);
      if (n.startsWith(t)) return 0;
      if (n.includes(t)) return 1;
      if (norm(p.slug).includes(t)) return 2;
      if (norm(p.desc || '').includes(t)) return 3;
      return 9;
    };
    return CATALOGO.map(p => ({ p, w: pesa(p) }))
      .filter(x => x.w < 9)
      .sort((a, b) => a.w - b.w)
      .map(x => x.p);
  }

  function cerrar() {
    if (!caja) return;
    caja.hidden = true;
    caja.innerHTML = '';
    sel = -1;
    input.setAttribute('aria-expanded', 'false');
  }

  function pintar(q, hits) {
    lista = hits.slice(0, MAX_SUGERENCIAS);
    sel = -1;

    if (!q.trim()) { cerrar(); return; }

    if (!hits.length) {
      caja.innerHTML = `<p class="bsc-vacio">Sin resultados para "${escTxt(q.trim())}"</p>`;
      caja.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    const filas = lista.map((p, i) => `
      <button class="bsc-fila" type="button" role="option" id="bsc-op-${i}" data-slug="${escAttr(p.slug)}">
        <span class="bsc-img">${p.image ? `<img src="${escAttr(p.image)}" alt="" loading="lazy">` : ''}</span>
        <span class="bsc-txt">
          <span class="bsc-nombre">${escTxt(p.name)}</span>
          <span class="bsc-precio">${fmt(tierOne(p.slug))} <small>c/u</small></span>
        </span>
      </button>`).join('');

    const sobran = hits.length - lista.length;
    const todos = `<button class="bsc-todos" type="button" data-todos="1">
        Ver los ${hits.length} resultados${sobran ? '' : ''}
      </button>`;

    caja.innerHTML = filas + todos;
    caja.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function marcar(i) {
    const filas = [...caja.querySelectorAll('.bsc-fila')];
    if (!filas.length) return;
    sel = (i + filas.length) % filas.length;
    filas.forEach((f, n) => f.classList.toggle('activa', n === sel));
    filas[sel].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'bsc-op-' + sel);
  }

  // Abrir un producto de la lista: la ficha sale directo, sin pasar por la
  // sección de resultados.
  function abrirProducto(slug) {
    const p = findProduct(slug);
    if (!p) return;
    cerrar();
    input.blur();
    ProductModal.abrirSlug(slug);
  }

  function verTodos() {
    cerrar();
    input.blur();
    CatPage.buscar(input.value);
  }

  const alEscribir = () => {
    const q = input.value;
    limpiar.hidden = !q.trim();
    pintar(q, buscar(q));
  };

  function init() {
    input   = document.getElementById('buscadorInput');
    limpiar = document.getElementById('buscadorClear');
    caja    = document.getElementById('buscadorSug');
    if (!input || !caja) return;
    cerrar();

    input.addEventListener('input', debounce(alEscribir, 130));
    input.addEventListener('focus', alEscribir);

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar(sel + 1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); marcar(sel - 1); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (sel >= 0 && lista[sel]) abrirProducto(lista[sel].slug);
        else if (input.value.trim()) verTodos();
        return;
      }
      if (e.key === 'Escape') {
        if (!caja.hidden) { cerrar(); return; }
        if (input.value) { input.value = ''; limpiar.hidden = true; }
      }
    });

    caja.addEventListener('click', e => {
      if (e.target.closest('[data-todos]')) { verTodos(); return; }
      const fila = e.target.closest('.bsc-fila');
      if (fila) abrirProducto(fila.dataset.slug);
    });

    // Un clic fuera la cierra. Se escucha en la fase de captura para que
    // corra aunque algo más adelante detenga el evento.
    document.addEventListener('click', e => {
      if (!caja.hidden && !e.target.closest('.buscador')) cerrar();
    }, true);

    limpiar?.addEventListener('click', () => {
      input.value = '';
      limpiar.hidden = true;
      cerrar();
      input.focus();
    });
  }

  return { init, cerrar };
})();
