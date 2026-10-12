-- ============================================================================
--  Apple Watch Ultra 3 — categoría, imagen principal y colores
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run.
--
--  Por qué hace falta: la web pinta primero con lo que está escrito en los
--  archivos, y después Supabase la repinta con lo suyo. El Ultra 3 estaba en
--  la base con la imagen vieja, la categoría vieja y sin colores, así que los
--  colores aparecían un instante y se borraban.
--
--  Lo mismo se puede hacer desde /admin → Catálogo, en la sección
--  "Características e imágenes". Esto es solo la vía rápida.
-- ============================================================================

update public.products set
  category = 'smartwatch',
  image    = 'images/ultra3black.webp',
  colors   = '[
    {"name":"Negro",       "hex":"#1A1A1A", "img":"images/ultra3black.webp",            "swatch":"images/miniultra3correablack.webp"},
    {"name":"Negro total", "hex":"#000000", "img":"images/ultra3blackcorreablack.webp", "swatch":"images/miniblackultra3.webp"},
    {"name":"Gris",        "hex":"#8E8E93", "img":"images/ultra3gris.webp",             "swatch":"images/minigrisultra3.webp"},
    {"name":"Naranja",     "hex":"#F26513", "img":"images/ultra3orange.webp",           "swatch":"images/miniorangeultra3.webp"}
  ]'::jsonb
where slug = 'apple-watch-ultra-3';

-- El resto de los productos también quedaron con categorías viejas. Estas
-- cuatro son las que usa la web hoy.
update public.products set category = 'smartwatch' where slug in ('apple-watch-ultra-3','apple-watch-serie-10');
update public.products set category = 'audifonos'  where slug in ('airpods-4','airpods-3','airpods-pro-2','airpods-max','buds4-pro','buds2-pro');
update public.products set category = 'celulares'  where slug in ('bateria-magsafe');
update public.products set category = 'cargadores' where slug in ('cargador-lightning','cargador-tipo-c','cargador-samsung-45w');

-- Para revisar cómo quedó todo:
select slug, name, category, image, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products order by category, name;
