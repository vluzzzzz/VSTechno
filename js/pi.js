// pi — protección de las imágenes
'use strict';

/* ════════════════════════════════════════════════════════════════════════════
   ZONA EDITABLE

   Hasta dónde llega el bloqueo del clic derecho:

     'imagenes'  solo sobre las fotos. El resto de la página sigue normal: se
                 copia texto, se abre un enlace en otra pestaña, se usa el
                 traductor del navegador. Es la opción recomendada.
     'todo'      en toda la página. Protege igual que la anterior, pero además
                 le quita al visitante el menú de copiar y pegar. Los campos
                 de escritura quedan afuera del bloqueo de todos modos, si no
                 nadie podría pegar su dirección en el checkout.

   OJO — esto detiene al visitante apurado, no a quien de verdad quiere la
   foto: con las herramientas de desarrollador, "ver código fuente", la
   dirección directa de la imagen o una captura de pantalla se saltea. Si te
   importa que no te copien el catálogo, lo que sirve es la marca de agua
   sobre la propia imagen.
   ════════════════════════════════════════════════════════════════════════════ */
const BLOQUEO_CLIC_DERECHO = 'imagenes';
/* ═══════════════════════════ FIN ZONA EDITABLE ═════════════════════════════ */


const ProtegerImagenes = (() => {

  // ¿El clic cayó sobre una foto? Cuenta la imagen misma y también el
  // recuadro que la envuelve, porque en varias tarjetas la foto no llena todo
  // el espacio y el clic al costado igual abriría el menú.
  const esImagen = t => !!(
    t.closest('img, picture, svg') ||
    t.closest('.card-img-wrap, .csl-img, .ppage-img-wrap, .ppage-thumb, .cat-media, .bnr-slide, .promo, .oferta-lateral, .cpage-banner, .bsc-img, .cart-item-img, .sim-img')
  );

  // Donde se escribe nunca se bloquea: sin el menú no se puede pegar.
  const esCampo = t => !!t.closest('input, textarea, [contenteditable="true"]');

  function init() {
    // 1. Clic derecho.
    document.addEventListener('contextmenu', e => {
      if (esCampo(e.target)) return;
      if (BLOQUEO_CLIC_DERECHO === 'todo' || esImagen(e.target)) e.preventDefault();
    });

    // 2. Arrastrar. Alcanza con negar el arranque del arrastre: sin esto se
    //    puede tirar la foto al escritorio y queda guardada.
    document.addEventListener('dragstart', e => {
      if (esImagen(e.target)) e.preventDefault();
    });

    // 3. Pulsación larga en el teléfono. Android y iOS abren ahí su propio
    //    menú de "guardar imagen", que no pasa por 'contextmenu'. Se corta
    //    midiendo el tiempo del toque sobre una foto.
    let reloj = null;
    const limpiar = () => { clearTimeout(reloj); reloj = null; };
    document.addEventListener('touchstart', e => {
      if (!esImagen(e.target)) return;
      limpiar();
      reloj = setTimeout(() => {
        // Un toque quieto de medio segundo sobre una foto es una pulsación
        // larga. Se le saca el foco al elemento para que el sistema no lo
        // tome como objeto guardable.
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      }, 500);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
      document.addEventListener(ev, limpiar, { passive: true }));
  }

  return { init };
})();
