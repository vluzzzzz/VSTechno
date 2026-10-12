-- ============================================================================
--  Colores de los Galaxy Buds4 Pro · Orange y Blue del Max, agotados
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  "agotado": true deja el color a la vista, en gris y sin poder elegirlo.
--  Para reactivarlo alcanza con el interruptor del panel, sin volver a subir
--  las fotos.
-- ============================================================================

update public.products set
  colors = '[
    {"name":"Negro", "hex":"#1A1A1A", "img":"images/buds4black.webp", "swatch":"images/minibuds4black.webp"},
    {"name":"Gris",  "hex":"#8E8E93", "img":"images/buds4gris.webp",  "swatch":"images/minibuds4gris.webp"},
    {"name":"Rosa",  "hex":"#E8A0B4", "img":"images/buds4pink.webp",  "swatch":"images/minibuds4pink.webp"}
  ]'::jsonb,
  image = 'images/buds4black.webp'
where slug = 'buds4-pro';

update public.products set
  colors = '[
    {"name":"Midnight",  "hex":"#1A1A1A", "img":"images/max-negros.webp",  "swatch":"images/black.webp"},
    {"name":"Starlight", "hex":"#F5F0E8", "img":"images/max-blanco.webp",  "swatch":"images/mstarlight.webp"},
    {"name":"Purple",    "hex":"#9B59B6", "img":"images/max-morado.webp",  "swatch":"images/purple.webp"},
    {"name":"Orange",    "hex":"#F26513", "img":"images/max-naranja.webp", "swatch":"images/orange.webp", "agotado": true},
    {"name":"Blue",      "hex":"#3498DB", "img":"images/max-azul.webp",    "swatch":"images/blue.webp",   "agotado": true}
  ]'::jsonb
where slug = 'airpods-max';

select slug, name, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores,
       (select count(*) from jsonb_array_elements(coalesce(colors,'[]'::jsonb)) c
        where (c->>'agotado')::boolean is true) as agotados
from public.products
where jsonb_array_length(coalesce(colors,'[]'::jsonb)) > 0
order by name;
