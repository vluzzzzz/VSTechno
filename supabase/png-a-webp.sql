-- ============================================================================
--  Pasar las rutas de .png a .webp en la base
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Es seguro correrlo varias veces.
--
--  Todas las imágenes del sitio se convirtieron a webp y los .png se borraron.
--  La base seguía guardando las rutas viejas, así que esos productos salían
--  sin foto: Supabase pisa al catálogo del código, y mandaba una ruta muerta.
--
--  Esto cambia la terminación en los tres lugares donde hay rutas: la imagen
--  principal, la galería y los colores. No toca ningún otro dato.
-- ============================================================================

-- ── Imagen principal ────────────────────────────────────────────────────────
update public.products
set image = replace(image, '.png', '.webp')
where image like '%.png';

-- ── Galería (lista de rutas) ────────────────────────────────────────────────
update public.products
set gallery = (
  select array_agg(replace(g, '.png', '.webp') order by orden)
  from unnest(gallery) with ordinality as t(g, orden)
)
where exists (select 1 from unnest(gallery) as g where g like '%.png');

-- ── Colores (JSON con img y swatch) ─────────────────────────────────────────
update public.products
set colors = replace(colors::text, '.png', '.webp')::jsonb
where colors::text like '%.png%';

-- ── Banners y demás, si ya guardaste algo desde el panel ────────────────────
update public.site_config
set value = replace(value::text, '.png', '.webp')::jsonb
where value::text like '%.png%';

-- ── Revisar que no quede ninguna ────────────────────────────────────────────
select slug, name, image,
       (select count(*) from unnest(coalesce(gallery,'{}')) g where g like '%.png') as galeria_png,
       case when colors::text like '%.png%' then 1 else 0 end as colores_png
from public.products
where image like '%.png'
   or colors::text like '%.png%'
   or exists (select 1 from unnest(coalesce(gallery,'{}')) g where g like '%.png');
-- Si esta consulta no devuelve filas, quedó todo en webp.
