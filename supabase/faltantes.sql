-- ============================================================================
--  Productos que faltan en la base
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  La base tenía 8 productos y la web espera 12. Los 4 que faltaban existían
--  solo en los archivos, así que aparecían un instante y desaparecían cuando
--  Supabase contestaba con su lista.
-- ============================================================================

insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('apple-watch-ultra-3', 'Apple Watch Ultra 3', 'smartwatch',
   'El Apple Watch más resistente. Titanio de grado aeroespacial, pantalla Always-On de 49mm y hasta 60 horas de batería.',
   'images/ultra3black.webp', 0.75, true,
   array['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
   '[{"name":"Negro","hex":"#1A1A1A","img":"images/ultra3black.webp","swatch":"images/miniultra3correablack.webp"},
     {"name":"Negro total","hex":"#000000","img":"images/ultra3blackcorreablack.webp","swatch":"images/miniblackultra3.webp"},
     {"name":"Gris","hex":"#8E8E93","img":"images/ultra3gris.webp","swatch":"images/minigrisultra3.webp"},
     {"name":"Naranja","hex":"#F26513","img":"images/ultra3orange.webp","swatch":"images/miniorangeultra3.webp"}]'::jsonb,
   1),

  ('airpods-3', 'AirPods Pro 3', 'audifonos',
   'Cancelación activa de ruido, audio espacial y resistencia al agua. La generación más avanzada, cómoda para todo el día.',
   'images/airpods-3gen.webp', 0.75, true,
   array['Cancelación activa de ruido','Audio espacial personalizado','Resistencia al agua','Hasta 30 horas con estuche'],
   '[]'::jsonb, 4),

  ('buds4-pro', 'Galaxy Buds4 Pro', 'audifonos',
   'Audífonos inalámbricos Samsung con cancelación de ruido y audio de alta resolución. Compatibles con toda la línea Galaxy.',
   'images/buds4-pro.webp', 0.75, true,
   array['Cancelación de ruido activa','Audio de alta resolución','Compatible con Galaxy','Estuche con carga inalámbrica'],
   '[]'::jsonb, 7),

  ('buds2-pro', 'Galaxy Buds2 Pro', 'audifonos',
   'Audífonos inalámbricos Samsung, compactos y livianos, con cancelación de ruido y sonido envolvente.',
   'images/buds2-pro.webp', 0.75, true,
   array['Cancelación de ruido activa','Diseño compacto y liviano','Sonido envolvente','Resistencia al agua IPX7'],
   '[]'::jsonb, 8)

on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  image       = excluded.image,
  features    = excluded.features,
  colors      = excluded.colors;

-- ── Precios ─────────────────────────────────────────────────────────────────
-- Los tramos se borran y se rehacen, así correr esto dos veces no duplica.
delete from public.price_tiers
where product_id in (select id from public.products
                     where slug in ('apple-watch-ultra-3','airpods-3','buds4-pro','buds2-pro'));

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values
  ('apple-watch-ultra-3', 1, 27500), ('apple-watch-ultra-3', 3, 27500),
  ('apple-watch-ultra-3', 5, 27500), ('apple-watch-ultra-3',10, 27500),
  ('airpods-3',  1, 25000), ('airpods-3',  3, 15500),
  ('airpods-3',  5, 15000), ('airpods-3', 10, 14500),
  ('buds4-pro',  1, 16000), ('buds4-pro',  3, 16000),
  ('buds4-pro',  5, 16000), ('buds4-pro', 10, 16000),
  ('buds2-pro',  1, 14000), ('buds2-pro',  3, 14000),
  ('buds2-pro',  5, 14000), ('buds2-pro', 10, 14000)
) as t(slug, qty, price) on t.slug = p.slug;

-- ── Revisar cómo quedó ──────────────────────────────────────────────────────
select p.slug, p.name, p.category,
       jsonb_array_length(coalesce(p.colors,'[]'::jsonb)) as colores,
       count(t.id) as tramos
from public.products p
left join public.price_tiers t on t.product_id = p.id
group by p.id, p.slug, p.name, p.category, p.colors, p.position
order by p.position;
