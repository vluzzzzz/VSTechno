-- ============================================================================
--  Teléfonos — iPhone 15, iPhone 16 y Galaxy S26 Plus
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  Van sin precio mayorista: un solo tramo, el de una unidad. La ficha
--  muestra ese precio y nada de tabla por cantidad.
--
--  Las fotos van al final de este archivo: una principal y dos de galería
--  para cada teléfono.
-- ============================================================================

insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('iphone-15-128', 'iPhone 15 128 GB', 'celulares',
   'iPhone 15 de 128 GB. Pantalla Super Retina XDR, Dynamic Island, cámara de 48 MP y puerto USB-C.',
   'images/iphone15uno.webp', 0.75, true,
   array['128 GB de almacenamiento','Pantalla Super Retina XDR','Cámara principal de 48 MP','Puerto USB-C'],
   '[]'::jsonb, 20),

  ('iphone-16-128', 'iPhone 16 128 GB', 'celulares',
   'iPhone 16 de 128 GB. Chip A18, botón de Control de Cámara, cámara de 48 MP y batería de mayor duración.',
   'images/iphone16uno.webp', 0.75, true,
   array['128 GB de almacenamiento','Chip A18','Botón de Control de Cámara','Cámara principal de 48 MP'],
   '[]'::jsonb, 21),

  ('s26-plus-256', 'Galaxy S26 Plus 256 GB', 'celulares',
   'Samsung Galaxy S26 Plus de 256 GB. Pantalla Dynamic AMOLED, cámara de alta resolución y carga rápida.',
   'images/samsumg26uno.webp', 0.75, true,
   array['256 GB de almacenamiento','Pantalla Dynamic AMOLED','Cámara de alta resolución','Carga rápida'],
   '[]'::jsonb, 22)

on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  features    = excluded.features;

delete from public.price_tiers
where product_id in (select id from public.products
                     where slug in ('iphone-15-128','iphone-16-128','s26-plus-256'));

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values
  ('iphone-15-128', 1, 480000),
  ('iphone-16-128', 1, 580000),
  ('s26-plus-256',  1, 580000)
) as t(slug, qty, price) on t.slug = p.slug;

select p.slug, p.name, p.category, count(t.id) as tramos, min(t.price) as precio
from public.products p
left join public.price_tiers t on t.product_id = p.id
where p.slug in ('iphone-15-128','iphone-16-128','s26-plus-256')
group by p.id, p.slug, p.name, p.category;

-- ── Fotos del iPhone 15 ─────────────────────────────────────────────────────
-- La primera es la principal; las otras dos van a la galería de la ficha, la
-- que se recorre con la flecha.
update public.products set
  image   = 'images/iphone15uno.webp',
  gallery = array['images/iphone15dos.webp','images/iphone15tres.webp']
where slug = 'iphone-15-128';

-- ── Fotos del iPhone 16 ─────────────────────────────────────────────────────
update public.products set
  image   = 'images/iphone16uno.webp',
  gallery = array['images/iphone16dos.webp','images/iphone16tres.webp']
where slug = 'iphone-16-128';

-- ── Fotos del Galaxy S26 Plus ───────────────────────────────────────────────
update public.products set
  image   = 'images/samsumg26uno.webp',
  gallery = array['images/samsumg26dos.webp','images/samsumg26tres.webp']
where slug = 's26-plus-256';
