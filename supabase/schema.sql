-- ============================================================================
--  Tienda — Esquema Supabase (Catálogo)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--  Reemplaza la config por Excel (Google Sheet CSV) por una base en Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  category      text not null default 'audifonos'
                  check (category in ('audifonos','relojes','accesorios')),
  description   text default '',
  image         text default '',
  image_scale   numeric default 0.85,
  in_stock      boolean default true,
  features      text[] default '{}',
  gallery       text[] default '{}',
  colors        jsonb  default '[]'::jsonb,
  position      int    default 0,
  -- presentación en el HERO (carrusel principal). Si is_hero = false se ignora.
  is_hero       boolean default false,
  hero_name     text,
  hero_bg_label text,
  hero_image    text,
  hero_scale    numeric,
  hero_offset_x int,
  hero_offset_y int,
  hero_order    int,
  -- presentación en el carrusel DESTACADOS. Si is_featured = false se ignora.
  is_featured   boolean default false,
  featured_tag  text,
  featured_name text,
  featured_image text,
  featured_order int,
  created_at    timestamptz default now()
);

create table if not exists public.price_tiers (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  qty         int  not null,            -- cantidad (1..10) — precio al por mayor
  price       int  not null,
  active      boolean not null default true,  -- si el tramo está habilitado
  unique (product_id, qty)
);
-- por si la tabla ya existía sin la columna:
alter table public.price_tiers add column if not exists active boolean not null default true;

create index if not exists price_tiers_product_idx on public.price_tiers(product_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
--    Lectura pública (anon) para que el sitio cargue el catálogo.
--    Escritura solo para usuarios autenticados (el panel /admin).
-- ---------------------------------------------------------------------------

alter table public.products    enable row level security;
alter table public.price_tiers enable row level security;

-- products
drop policy if exists "products public read"  on public.products;
create policy "products public read"  on public.products
  for select using (true);

drop policy if exists "products auth write"   on public.products;
create policy "products auth write"   on public.products
  for all to authenticated using (true) with check (true);

-- price_tiers
drop policy if exists "tiers public read"     on public.price_tiers;
create policy "tiers public read"     on public.price_tiers
  for select using (true);

drop policy if exists "tiers auth write"      on public.price_tiers;
create policy "tiers auth write"      on public.price_tiers
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. Storage — bucket público para imágenes subidas desde el admin
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "site-images public read"  on storage.objects;
create policy "site-images public read"  on storage.objects
  for select using (bucket_id = 'site-images');

drop policy if exists "site-images auth write"   on storage.objects;
create policy "site-images auth write"   on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images');

drop policy if exists "site-images auth update"  on storage.objects;
create policy "site-images auth update"  on storage.objects
  for update to authenticated using (bucket_id = 'site-images');

drop policy if exists "site-images auth delete"  on storage.objects;
create policy "site-images auth delete"  on storage.objects
  for delete to authenticated using (bucket_id = 'site-images');

-- ---------------------------------------------------------------------------
-- 4. Seed — los 11 productos actuales (idempotente)
-- ---------------------------------------------------------------------------

insert into public.products
  (slug, name, category, description, image, image_scale, position,
   features, is_hero, hero_name, hero_bg_label, hero_image, hero_scale,
   hero_offset_x, hero_offset_y, hero_order,
   is_featured, featured_tag, featured_name, featured_image, featured_order)
values
  ('apple-watch-ultra-3','Apple Watch Ultra 3','relojes',
   'El Apple Watch más resistente. Titanio de grado aeroespacial, pantalla Always-On de 49mm y hasta 60 horas de batería.',
   'images/apple-watch-ultra-3.webp',0.75,1,
   array['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
   false,null,null,null,null,null,null,null,
   true,'Mejor Calificado','Ultra 3','images/apple-watch-ultra-3.webp',5),

  ('apple-watch-serie-10','Apple Watch Serie 10','relojes',
   'El Apple Watch más delgado hasta la fecha. Pantalla OLED más grande, detección de apnea del sueño y carga rápida.',
   'images/serie-10.webp',0.75,2,
   array['Pantalla OLED más grande','Detección de apnea del sueño','Carga rápida','Diseño más delgado'],
   false,null,null,null,null,null,null,null,
   true,'The new Apple','Series 10','images/serie10desta.webp',4),

  ('apple-watch-black-ultra-2','Apple Watch Black Ultra 2','relojes',
   'Edición Black del Ultra 2. Acabado en negro carbón, titanio negro y cristal de zafiro. Máxima resistencia y estilo.',
   'images/black-ultra-2.webp',0.75,3,
   array['Acabado negro carbón','Titanio negro premium','Cristal de zafiro','Hasta 60 horas de batería'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('airpods-4','AirPods 4ta Generación','audifonos',
   'Diseño completamente rediseñado, audio adaptable y cancelación activa de ruido. La mejor experiencia sin cables.',
   'images/airpods-4gen.webp',0.75,4,
   array['Audio adaptativo','Cancelación activa de ruido','Diseño rediseñado','Hasta 30 horas con estuche'],
   true,'AirPods 4','AIRPODS 4','images/airpods4.webp',0.8,0,0,2,
   true,'Mas Rentable','AirPods 4','images/airpods-4ta-generacion-v2.webp',3),

  ('airpods-pro-2','AirPods Pro 2','audifonos',
   'Cancelación activa de ruido de siguiente nivel, audio espacial personalizado y hasta 30 horas de batería con el estuche.',
   'images/airpods-pro-2.webp',0.75,5,
   array['Cancelación activa de ruido','Audio espacial personalizado','Hasta 30 horas de batería','Resistencia al agua IPX4'],
   true,'AirPods Pro 2','AIRPODS PRO 2','images/airpods.webp',1,0,0,1,
   true,'Nuevo','AirPods Pro 2','images/airpods2unidad.webp',2),

  ('airpods-3','AirPods 3ra Generación','audifonos',
   'Audio espacial, audio adaptativo y resistencia al agua IPX4. Diseño rediseñado y cómodo para uso diario.',
   'images/airpods-3gen.webp',0.75,6,
   array['Audio espacial','Resistencia al agua IPX4','Carga MagSafe','Hasta 30 horas con estuche'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('bateria-magsafe','Batería MagSafe','accesorios',
   'Batería externa magnética para iPhone. Se adhiere perfectamente y carga de forma inalámbrica sin cables. Compacta y ligera.',
   'images/bateria-magsafe.webp',0.75,7,
   array['Carga magnética MagSafe','Compacta y liviana','Compatible iPhone 12 en adelante','Sin cables'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('airpods-max','Max Magnéticos','accesorios',
   'Accesorios magnéticos premium compatibles con MagSafe. Fijación perfecta y carga inalámbrica optimizada.',
   'images/max-negros.webp',0.75,8,
   array['Compatibles con MagSafe','Fijación magnética perfecta','Carga inalámbrica optimizada','Múltiples colores'],
   true,'AirPods Max','AIRPODS MAX','images/airpodsmax.webp',1.4,50,-20,3,
   true,'Más vendido','AirPods Max','images/airpodsmax.webp',1),

  ('cargador-lightning','Cargador Completo Lightning','accesorios',
   'Cargador completo con cable Lightning y adaptador de corriente. Compatible con iPhone, iPad y AirPods.',
   'images/cargador-lightning.webp',0.75,9,
   array['Cable Lightning incluido','Adaptador de corriente','Compatible iPhone/iPad/AirPods','Carga rápida'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('cargador-tipo-c','Cargador Completo Tipo C','accesorios',
   'Cargador completo con cable USB-C. Compatible con iPhone 15 en adelante, iPad Pro y MacBook. Carga rápida.',
   'images/cargador-tipo-c.webp',0.75,10,
   array['Cable USB-C incluido','Compatible iPhone 15+','iPad Pro y MacBook','Carga rápida 20W'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('cargador-samsung-45w','Cargador Samsung 45W','accesorios',
   'Cargador ultra rápido Samsung 45W. Compatible con toda la línea Galaxy. Carga completa en menos de una hora.',
   'images/cargador-samsung-45w.webp',0.75,11,
   array['Carga ultra rápida 45W','Compatible línea Galaxy','Cable USB-C incluido','Carga completa en ~1 hora'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null)
on conflict (slug) do nothing;

-- Tramos de precio por cantidad (1 / 3 / 5 / 10 unidades)
insert into public.price_tiers (product_id, qty, price)
select p.id, t.qty, t.price
from public.products p
join (values
  ('apple-watch-ultra-3',1,29990),('apple-watch-ultra-3',3,27990),('apple-watch-ultra-3',5,25990),('apple-watch-ultra-3',10,23990),
  ('apple-watch-serie-10',1,29990),('apple-watch-serie-10',3,27990),('apple-watch-serie-10',5,25990),('apple-watch-serie-10',10,23990),
  ('apple-watch-black-ultra-2',1,29990),('apple-watch-black-ultra-2',3,27990),('apple-watch-black-ultra-2',5,25990),('apple-watch-black-ultra-2',10,23990),
  ('airpods-4',1,15000),('airpods-4',3,13500),('airpods-4',5,12500),('airpods-4',10,11500),
  ('airpods-pro-2',1,14000),('airpods-pro-2',3,12500),('airpods-pro-2',5,11500),('airpods-pro-2',10,10500),
  ('airpods-3',1,14000),('airpods-3',3,12500),('airpods-3',5,11500),('airpods-3',10,10500),
  ('bateria-magsafe',1,13000),('bateria-magsafe',3,11500),('bateria-magsafe',5,10500),('bateria-magsafe',10,9500),
  ('airpods-max',1,26990),('airpods-max',3,24990),('airpods-max',5,22990),('airpods-max',10,20990),
  ('cargador-lightning',1,5000),('cargador-lightning',3,4500),('cargador-lightning',5,4000),('cargador-lightning',10,3500),
  ('cargador-tipo-c',1,5000),('cargador-tipo-c',3,4500),('cargador-tipo-c',5,4000),('cargador-tipo-c',10,3500),
  ('cargador-samsung-45w',1,6000),('cargador-samsung-45w',3,5500),('cargador-samsung-45w',5,5000),('cargador-samsung-45w',10,4500)
) as t(slug, qty, price) on t.slug = p.slug
on conflict (product_id, qty) do nothing;

-- Imágenes secundarias (galería del detalle) — solo si están vacías.
update public.products p set gallery = g.imgs
from (values
  ('apple-watch-ultra-3',       array['images/apple-watch-ultra-3-v2.webp','images/apple-watch-ultra-3-v3.webp']),
  ('apple-watch-serie-10',      array['images/apple-watch-serie-10-v2.webp','images/apple-watch-serie-10-v3.webp']),
  ('apple-watch-black-ultra-2', array['images/apple-watch-black-ultra-2-v2.webp','images/apple-watch-black-ultra-2-v3.webp']),
  ('airpods-4',                 array['images/airpods-4ta-generacion-v2.webp','images/airpods-4ta-generacion-v3.webp']),
  ('airpods-pro-2',             array['images/airpods-pro-2-v2.webp','images/airpods-pro-2-v3.webp']),
  ('airpods-3',                 array['images/airpods-3ra-generacion-v2.webp','images/airpods-3ra-generacion-v3.webp']),
  ('airpods-max',               array['images/max-magneticos-v2.webp','images/max-magneticos-v3.webp']),
  ('bateria-magsafe',           array['images/bateria-magsafe-v2.webp']),
  ('cargador-lightning',        array['images/cargador-lightning-completo-v2.webp']),
  ('cargador-tipo-c',           array['images/cargador-tipo-c-completo-v2.webp']),
  ('cargador-samsung-45w',      array['images/cargador-samsung-45w-v2.webp'])
) as g(slug, imgs)
where p.slug = g.slug and (p.gallery is null or p.gallery = '{}');

-- ============================================================================
--  Después de ejecutar esto:
--   1. Authentication → Users → Add user  (crear el usuario admin email/clave)
--   2. (Opcional) Authentication → Providers → Email: desactivar "Confirm email"
--      para que el usuario admin pueda entrar sin verificar correo.
--   3. Settings → API: copiar Project URL y anon public key a js/supabase-config.js
-- ============================================================================
