// mn
'use strict';
document.querySelectorAll('.porque-card').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('flipped')));

document.addEventListener('DOMContentLoaded', () => {
  // Refuerzo del arranque arriba: si la URL no trae ancla, se sube del todo.
  if (!location.hash) window.scrollTo(0, 0);

  // ── 1. YA. Nada de esto depende de Supabase, así que no espera a la red.
  //    Antes todo iba detrás de `await loadCatalog()` y la página se quedaba
  //    en blanco varios segundos: cinta, banners, categorías y buscador
  //    aparecían recién cuando contestaba la base de datos.
  document.body.classList.add('sheet-ready');
  Banners.init();Reviews.init();Buscador.init();
  Cart.init();NavScroll.init();ProductModal.init();Checkout.init();
  Trust.init();                       // pinta la tira de confianza
  CatPage.init();
  Filas.init();
  ProtegerImagenes.init();

  // ── 2. Después, sin bloquear. Las dos consultas salen juntas, no una tras
  //    otra: no dependen entre sí y en serie tardarían el doble.
  //
  //    El catálogo se aplica primero porque las filas de la portada guardan
  //    slugs, y esos slugs tienen que existir en el catálogo nuevo antes de
  //    que la configuración mande a repintarlas.
  loadCatalog()
    .then(ok => { if (ok) Filas.init(); })
    .catch(err => console.error('Catálogo:', err));

  SiteConfig.cargar()
    .catch(err => console.error('Configuración:', err));

  SiteConfig.cargarReviews()
    .catch(err => console.error('Reseñas:', err));
});
