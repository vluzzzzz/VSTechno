-- ============================================================================
--  Fotos de los Galaxy Buds
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  El Buds2 Pro lleva dos fotos y ningún color: la segunda va a la galería,
--  la que se recorre con la flecha dentro de la ficha.
--  El Buds4 Pro sí tiene colores, así que su foto principal es la negra.
-- ============================================================================

update public.products set
  image   = 'images/budspro2.webp',
  gallery = array['images/budspro2imagen2.webp']
where slug = 'buds2-pro';

update public.products set
  image = 'images/buds4black.webp'
where slug = 'buds4-pro';

select slug, name, image, gallery,
       jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products where slug in ('buds2-pro','buds4-pro');

-- ── Cargador Tipo C ─────────────────────────────────────────────────────────
-- Foto principal nueva. La segunda de la ficha no se toca.
update public.products set
  image = 'images/cargadorcompletotipoc.webp'
where slug = 'cargador-tipo-c';
